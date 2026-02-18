import { Request, Response, NextFunction, RequestHandler  } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

interface JwtPayload {
  userId: number;
  sucursalId: number;
  role?: string;
}

// Extiende el objeto Request para que TypeScript reconozca `req.user`
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const verifyToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const internalToken = process.env.INTERNAL_TOKEN;

  if (authHeader === internalToken) {
    // Internal fixed token flow
    const internalUser: JwtPayload = { userId: 0, sucursalId: 0, role: 'internal' };
    req.user = internalUser as any;
    (req as any).userId = internalUser.userId;
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded as any;
    (req as any).userId = decoded.userId; // 👈 Aquí asegúrate que `userId` viene del token

    next();
  } catch (err) {
    if (internalToken) {
      try {
        const decoded = jwt.verify(token, internalToken) as JwtPayload;
        const internalUser: JwtPayload = {
          userId: decoded.userId ?? 0,
          sucursalId: decoded.sucursalId ?? 0,
          role: decoded.role ?? 'internal',
        };
        req.user = internalUser as any;
        (req as any).userId = internalUser.userId;
        next();
        return;
      } catch (internalError) {
        // fallthrough to invalid response
      }
    }
    res.status(403).json({ error: 'Token inválido o expirado' });
    return;
  }
};
