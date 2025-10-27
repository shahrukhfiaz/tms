import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { login, refreshTokens } from '../services/auth.service';
import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { user, tokens } = await login(email, password);

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await refreshTokens(refreshToken);
  return res.status(200).json(tokens);
});

export const meHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json(user);
});
