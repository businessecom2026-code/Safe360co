import { Request, Response, NextFunction } from 'express';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha sao obrigatorios.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Formato de email invalido.' });
  }

  if (email.length > 254) {
    return res.status(400).json({ message: 'Email muito longo.' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message: 'Senha deve ter no minimo 8 caracteres, com pelo menos 1 maiuscula, 1 minuscula e 1 numero.'
    });
  }

  if (password.length > 128) {
    return res.status(400).json({ message: 'Senha muito longa.' });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha sao obrigatorios.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Formato de email invalido.' });
  }

  next();
};

export const validateVaultName = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Nome do cofre e obrigatorio.' });
  }

  if (name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ message: 'Nome do cofre deve ter entre 2 e 100 caracteres.' });
  }

  // Sanitize - strip HTML tags
  req.body.name = name.replace(/<[^>]*>/g, '').trim();

  next();
};

export const validateItemData = (req: Request, res: Response, next: NextFunction) => {
  const { title, description } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ message: 'Titulo e obrigatorio.' });
  }

  if (title.trim().length < 1 || title.trim().length > 200) {
    return res.status(400).json({ message: 'Titulo deve ter entre 1 e 200 caracteres.' });
  }

  if (description && typeof description === 'string' && description.length > 5000) {
    return res.status(400).json({ message: 'Descricao muito longa (max 5000 caracteres).' });
  }

  // Sanitize
  req.body.title = title.replace(/<[^>]*>/g, '').trim();
  if (description) {
    req.body.description = description.replace(/<[^>]*>/g, '');
  }

  next();
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // Deep sanitize all string values in body
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      const clean: any = {};
      for (const key of Object.keys(obj)) {
        clean[key] = sanitize(obj[key]);
      }
      return clean;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};
