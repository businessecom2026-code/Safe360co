import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../types';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRegistration, validateLogin } from '../middleware/validate';
import { getPlanLimits } from '../utils/planLimits';
import {
  getUserByEmail, getUserById, getUserByResetToken, getUserByInviteToken,
  createUser, updateUser, updateUserByIndex, countGuestsByInviter, getGuestsByInviter,
  logActivity, getUserActivityLogs,
} from '../database/db';
import { sendInviteEmail, sendPasswordResetEmail, sendWelcomeEmail, sendGuestActivatedNotification, sendSupportEmail } from '../utils/emailService';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register
router.post('/register', authRateLimiter, validateRegistration, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const existingUser = await getUserByEmail(email);
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: `user_${Date.now()}`,
    email,
    password: hashedPassword,
    role: email === 'admin@ecom360.co' ? 'master' : 'admin',
    plan: 'Free',
    createdAt: new Date().toISOString(),
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  await createUser(newUser);
  logActivity(newUser.id, 'REGISTER', `Nova conta criada: ${email}`, req.ip);
  sendWelcomeEmail(email).catch(() => {});
  res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
});

// Login
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await getUserByEmail(email);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  if (user.activated === false) return res.status(403).json({ message: 'Account not yet activated. Please use your invite link.' });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  logActivity(user.id, 'LOGIN', `Login efetuado`, req.ip);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, plan: user.plan } });
});

// Invite a guest (admin/master only)
router.post('/invite', authMiddleware, async (req: AuthRequest, res) => {
  const inviterRole = req.user?.role;
  const inviterId = req.user?.id;
  if (inviterRole !== 'admin' && inviterRole !== 'master') return res.status(403).json({ message: 'Only admins can invite guests' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const existingUser = await getUserByEmail(email);
  if (existingUser) return res.status(400).json({ message: 'User with this email already exists' });

  const inviter = await getUserById(inviterId!);
  const limits = getPlanLimits(inviter?.plan);
  const currentGuestCount = await countGuestsByInviter(inviterId!);

  if (currentGuestCount >= limits.maxGuests && inviterRole !== 'master') {
    return res.status(403).json({
      message: `Limite de convidados atingido (${limits.maxGuests}). Faca upgrade do plano para convidar mais.`,
      limit: limits.maxGuests, current: currentGuestCount,
    });
  }

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

  const newGuest: User = {
    id: `user_${Date.now()}`,
    email,
    password: placeholderPassword,
    role: 'guest',
    createdAt: new Date().toISOString(),
    invitedBy: inviterId,
    inviteToken,
    activated: false,
  };

  await createUser(newGuest);

  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const inviteLink = `${appUrl}/#invite=${inviteToken}`;
  const inviterEmail = inviter?.email || 'Administrador';
  const emailSent = await sendInviteEmail(email, inviterEmail, inviteToken);

  logActivity(inviterId!, 'INVITE_GUEST', `Convidou ${email}`, req.ip);
  res.status(201).json({ message: 'Guest invited successfully', inviteLink, inviteToken, guestId: newGuest.id, guestEmail: email, emailSent });
});

// Validate invite token (public)
router.get('/invite/:token', async (req, res) => {
  const result = await getUserByInviteToken(req.params.token);
  if (!result) return res.status(404).json({ message: 'Invalid or expired invite token' });

  const inviter = await getUserById(result.user.invitedBy || '');
  res.json({ guestEmail: result.user.email, adminName: inviter?.email || 'Administrador', adminId: result.user.invitedBy });
});

// Activate guest account (public)
router.post('/invite/:token/activate', async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4 || pin.length > 8) return res.status(400).json({ message: 'PIN must be between 4 and 8 digits' });

  const result = await getUserByInviteToken(req.params.token);
  if (!result) return res.status(404).json({ message: 'Invalid or expired invite token' });

  const { user: guest, index } = result;
  const hashedPassword = await bcrypt.hash(pin, 10);
  await updateUserByIndex(index, { password: hashedPassword, activated: true, inviteToken: undefined });

  const inviter = await getUserById(guest.invitedBy || '');
  if (inviter?.email) sendGuestActivatedNotification(inviter.email, guest.email).catch(() => {});
  logActivity(guest.id, 'GUEST_ACTIVATED', `Conta ativada: ${guest.email}`);

  const jwtToken = jwt.sign({ id: guest.id, role: guest.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Account activated successfully', token: jwtToken, user: { id: guest.id, email: guest.email, role: guest.role } });
});

// List owner's guests
router.get('/guests', authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'master') return res.status(403).json({ message: 'Only admins can view guests' });

  const guests = await getGuestsByInviter(req.user!.id);
  res.json(guests.map(g => ({ id: g.id, email: g.email, activated: g.activated ?? true, createdAt: g.createdAt })));
});

// Password recovery - Step 1
router.post('/recover', authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email e obrigatorio.' });

  const user = await getUserByEmail(email);
  if (!user) return res.json({ message: 'Se o email existir, um link de recuperacao foi enviado.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await updateUser(user.id, { resetToken, resetTokenExpiry });
  await sendPasswordResetEmail(email, resetToken);
  logActivity(user.id, 'PASSWORD_RESET_REQUEST', `Solicitacao de reset de senha`, req.ip);
  res.json({ message: 'Se o email existir, um link de recuperacao foi enviado.' });
});

// Password recovery - Step 2: Validate token
router.get('/recover/:token', async (req, res) => {
  const result = await getUserByResetToken(req.params.token);
  if (!result || !result.user.resetTokenExpiry) return res.status(404).json({ message: 'Token invalido ou expirado.' });
  if (new Date(result.user.resetTokenExpiry) < new Date()) return res.status(410).json({ message: 'Token expirado. Solicite um novo link.' });
  res.json({ email: result.user.email, valid: true });
});

// Password recovery - Step 3: Set new password
router.post('/recover/:token', authRateLimiter, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'Nova senha deve ter no minimo 8 caracteres.' });

  const result = await getUserByResetToken(req.params.token);
  if (!result) return res.status(404).json({ message: 'Token invalido ou expirado.' });
  if (!result.user.resetTokenExpiry || new Date(result.user.resetTokenExpiry) < new Date()) return res.status(410).json({ message: 'Token expirado. Solicite um novo link.' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await updateUser(result.user.id, { password: hashedPassword, resetToken: undefined, resetTokenExpiry: undefined });
  logActivity(result.user.id, 'PASSWORD_RESET', `Senha redefinida com sucesso`, req.ip);
  res.json({ message: 'Senha redefinida com sucesso.' });
});

// Upgrade plan
router.post('/upgrade', authMiddleware, async (req: AuthRequest, res) => {
  const { plan } = req.body;
  if (!plan || !['Free', 'Pro', 'Scale'].includes(plan)) return res.status(400).json({ message: 'Invalid plan' });

  const updated = await updateUser(req.user!.id, { plan, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
  if (!updated) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Plan upgraded successfully', plan, planExpiresAt: updated.planExpiresAt });
});

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const limits = getPlanLimits(user.plan);
  const guestCount = await countGuestsByInviter(user.id);
  res.json({ id: user.id, email: user.email, role: user.role, plan: user.plan || 'Free', planExpiresAt: user.planExpiresAt, createdAt: user.createdAt, limits, usage: { guests: guestCount } });
});

// Activity logs
router.get('/activity', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
  const logs = await getUserActivityLogs(req.user.id, 50);
  res.json(logs);
});

// Support
router.post('/support', authRateLimiter, async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: 'Nome, email e mensagem sao obrigatorios.' });
  if (message.length > 5000) return res.status(400).json({ message: 'Mensagem muito longa (max 5000 caracteres).' });

  const emailSent = await sendSupportEmail(name, email, message);
  emailSent ? res.json({ message: 'Mensagem enviada com sucesso!' }) : res.status(500).json({ message: 'Erro ao enviar mensagem. Tente novamente.' });
});

export default router;
