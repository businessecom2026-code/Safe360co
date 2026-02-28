import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../types';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRegistration, validateLogin } from '../middleware/validate';
import { getPlanLimits } from '../utils/planLimits';
import { logActivity, getUserActivityLogs } from '../utils/activityLog';
import { sendInviteEmail, sendPasswordResetEmail, sendWelcomeEmail, sendGuestActivatedNotification, sendSupportEmail } from '../utils/emailService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

async function readDb(): Promise<any> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: [], vaults: [] };
    }
    throw error;
  }
}

async function readUsers(): Promise<User[]> {
  const db = await readDb();
  return db.users || [];
}

async function writeUsers(users: User[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    // CRITICAL: Preserve existing vaults when writing users
    let db: any = { users: [], vaults: [] };
    try {
      const data = await fs.readFile(dbPath, 'utf-8');
      db = JSON.parse(data);
    } catch { /* file doesn't exist yet */ }
    db.users = users;
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    console.log('Users written to db.json');
  } catch (error) {
    console.error('Error writing to db.json:', error);
  }
}

// Register
router.post('/register', authRateLimiter, validateRegistration, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const users = await readUsers();
  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = `user_${Date.now()}`;

  const newUser: User = {
    id: userId,
    email,
    password: hashedPassword,
    role: email === 'admin@ecom360.co' ? 'master' : 'admin',
    plan: 'Free',
    createdAt: new Date().toISOString(),
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  logActivity(newUser.id, 'REGISTER', `Nova conta criada: ${email}`, req.ip);

  // Send welcome email (fire-and-forget)
  sendWelcomeEmail(email).catch(() => {});

  res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
});

// Login
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const users = await readUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Block unactivated guests from logging in
  if (user.activated === false) {
    return res.status(403).json({ message: 'Account not yet activated. Please use your invite link.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  logActivity(user.id, 'LOGIN', `Login efetuado`, req.ip);

  res.json({ token, user: { id: user.id, email: user.email, role: user.role, plan: user.plan } });
});

// Invite a guest (admin/master only)
router.post('/invite', authMiddleware, async (req: AuthRequest, res) => {
  const inviterRole = req.user?.role;
  const inviterId = req.user?.id;

  if (inviterRole !== 'admin' && inviterRole !== 'master') {
    return res.status(403).json({ message: 'Only admins can invite guests' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const users = await readUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  // Enforce guest limits by plan
  const inviter = users.find(u => u.id === inviterId);
  const limits = getPlanLimits(inviter?.plan);
  const currentGuestCount = users.filter(u => u.invitedBy === inviterId).length;

  if (currentGuestCount >= limits.maxGuests && inviterRole !== 'master') {
    return res.status(403).json({
      message: `Limite de convidados atingido (${limits.maxGuests}). Faca upgrade do plano para convidar mais.`,
      limit: limits.maxGuests,
      current: currentGuestCount,
    });
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const userId = `user_${Date.now()}`;

  const newGuest: User = {
    id: userId,
    email,
    password: placeholderPassword,
    role: 'guest',
    createdAt: new Date().toISOString(),
    invitedBy: inviterId,
    inviteToken,
    activated: false,
  };

  users.push(newGuest);
  await writeUsers(users);

  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const inviteLink = `${appUrl}/#invite=${inviteToken}`;

  // Send invite email to guest
  const inviterEmail = inviter?.email || 'Administrador';
  const emailSent = await sendInviteEmail(email, inviterEmail, inviteToken);

  logActivity(inviterId!, 'INVITE_GUEST', `Convidou ${email}`, req.ip);

  res.status(201).json({
    message: 'Guest invited successfully',
    inviteLink,
    inviteToken,
    guestId: userId,
    guestEmail: email,
    emailSent,
  });
});

// Validate invite token (public)
router.get('/invite/:token', async (req, res) => {
  const { token } = req.params;
  const users = await readUsers();

  const guest = users.find(u => u.inviteToken === token && u.activated === false);
  if (!guest) {
    return res.status(404).json({ message: 'Invalid or expired invite token' });
  }

  const inviter = users.find(u => u.id === guest.invitedBy);

  res.json({
    guestEmail: guest.email,
    adminName: inviter?.email || 'Administrador',
    adminId: guest.invitedBy,
  });
});

// Activate guest account (public)
router.post('/invite/:token/activate', async (req, res) => {
  const { token } = req.params;
  const { pin } = req.body;

  if (!pin || pin.length < 4 || pin.length > 8) {
    return res.status(400).json({ message: 'PIN must be between 4 and 8 digits' });
  }

  const users = await readUsers();
  const guestIndex = users.findIndex(u => u.inviteToken === token && u.activated === false);

  if (guestIndex === -1) {
    return res.status(404).json({ message: 'Invalid or expired invite token' });
  }

  const guest = users[guestIndex];
  const hashedPassword = await bcrypt.hash(pin, 10);

  users[guestIndex] = {
    ...guest,
    password: hashedPassword,
    activated: true,
    inviteToken: undefined,
  };

  await writeUsers(users);

  // Notify the admin that the guest activated
  const inviter = users.find(u => u.id === guest.invitedBy);
  if (inviter?.email) {
    sendGuestActivatedNotification(inviter.email, guest.email).catch(() => {});
  }

  logActivity(guest.id, 'GUEST_ACTIVATED', `Conta ativada: ${guest.email}`);

  const jwtToken = jwt.sign(
    { id: guest.id, role: guest.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    message: 'Account activated successfully',
    token: jwtToken,
    user: { id: guest.id, email: guest.email, role: guest.role },
  });
});

// List owner's guests (admin/master only)
router.get('/guests', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (userRole !== 'admin' && userRole !== 'master') {
    return res.status(403).json({ message: 'Only admins can view guests' });
  }

  const users = await readUsers();
  const guests = users
    .filter(u => u.invitedBy === userId)
    .map(g => ({
      id: g.id,
      email: g.email,
      activated: g.activated ?? true,
      createdAt: g.createdAt,
    }));

  res.json(guests);
});

// Password recovery - Step 1: Request reset (sends email with token)
router.post('/recover', authRateLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email e obrigatorio.' });
  }

  const users = await readUsers();
  const userIndex = users.findIndex(u => u.email === email);

  // Always return success to not reveal if email exists
  if (userIndex === -1) {
    return res.json({ message: 'Se o email existir, um link de recuperacao foi enviado.' });
  }

  // Generate reset token (valid for 30 min)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  users[userIndex].resetToken = resetToken;
  users[userIndex].resetTokenExpiry = resetTokenExpiry;
  await writeUsers(users);

  // Send reset email
  await sendPasswordResetEmail(email, resetToken);

  logActivity(users[userIndex].id, 'PASSWORD_RESET_REQUEST', `Solicitacao de reset de senha`, req.ip);

  res.json({ message: 'Se o email existir, um link de recuperacao foi enviado.' });
});

// Password recovery - Step 2: Validate reset token
router.get('/recover/:token', async (req, res) => {
  const { token } = req.params;
  const users = await readUsers();

  const user = users.find(u => u.resetToken === token);
  if (!user || !user.resetTokenExpiry) {
    return res.status(404).json({ message: 'Token invalido ou expirado.' });
  }

  if (new Date(user.resetTokenExpiry) < new Date()) {
    return res.status(410).json({ message: 'Token expirado. Solicite um novo link.' });
  }

  res.json({ email: user.email, valid: true });
});

// Password recovery - Step 3: Set new password with token
router.post('/recover/:token', authRateLimiter, async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Nova senha deve ter no minimo 8 caracteres.' });
  }

  const users = await readUsers();
  const userIndex = users.findIndex(u => u.resetToken === token);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Token invalido ou expirado.' });
  }

  const user = users[userIndex];
  if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
    return res.status(410).json({ message: 'Token expirado. Solicite um novo link.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  users[userIndex].password = hashedPassword;
  users[userIndex].resetToken = undefined;
  users[userIndex].resetTokenExpiry = undefined;
  await writeUsers(users);

  logActivity(user.id, 'PASSWORD_RESET', `Senha redefinida com sucesso`, req.ip);

  res.json({ message: 'Senha redefinida com sucesso.' });
});

// Upgrade user plan (authenticated)
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const { plan } = req.body;

  if (!plan || !['Free', 'Pro', 'Scale'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan' });
  }

  const users = await readUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  users[userIndex].plan = plan;
  users[userIndex].planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await writeUsers(users);

  res.json({
    message: 'Plan upgraded successfully',
    plan,
    planExpiresAt: users[userIndex].planExpiresAt,
  });
});

// Get current user profile + plan info
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const users = await readUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const limits = getPlanLimits(user.plan);
  const guestCount = users.filter(u => u.invitedBy === userId).length;

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan || 'Free',
    planExpiresAt: user.planExpiresAt,
    createdAt: user.createdAt,
    limits,
    usage: {
      guests: guestCount,
    },
  });
});

// Get activity logs for current user
router.get('/activity', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const logs = await getUserActivityLogs(userId, 50);
  res.json(logs);
});

// Support contact form
router.post('/support', authRateLimiter, async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Nome, email e mensagem sao obrigatorios.' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ message: 'Mensagem muito longa (max 5000 caracteres).' });
  }

  const emailSent = await sendSupportEmail(name, email, message);

  if (emailSent) {
    res.json({ message: 'Mensagem enviada com sucesso!' });
  } else {
    res.status(500).json({ message: 'Erro ao enviar mensagem. Tente novamente.' });
  }
});

export default router;
