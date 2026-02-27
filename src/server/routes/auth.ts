import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return db.users || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If the file doesn't exist, create it with an empty users array
      await writeUsers([]);
      return [];
    }
    throw error;
  }
}

async function writeUsers(users: User[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify({ users, vaults: [] }, null, 2));
    console.log('Users written to db.json');
  } catch (error) {
    console.error('Error writing to db.json:', error);
  }
}

// Register
router.post('/register', async (req, res) => {
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
  };

  users.push(newUser);
  await writeUsers(users);

  res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const users = await readUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
