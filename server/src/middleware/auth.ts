import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'skincare-shop-secret-key-2024';

export interface AuthUser {
  id: number;
  email: string;
  level: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token无效或已过期' });
  }
}

// 仅超级管理员可访问
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.level !== 'admin') {
    res.status(403).json({ error: '无管理员权限' });
    return;
  }
  next();
}

// admin 或 staff 可访问（后台基本权限）
export function staffMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.level !== 'admin' && req.user.level !== 'staff')) {
    res.status(403).json({ error: '无后台访问权限' });
    return;
  }
  next();
}

// 按模块检查权限：admin 全部放行，staff 检查 permissions 数组
export function permissionMiddleware(...requiredModules: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: '未登录' });
      return;
    }
    // admin 全部放行
    if (req.user.level === 'admin') {
      next();
      return;
    }
    // staff 检查模块权限，只要具备其中一个即可
    if (req.user.level === 'staff') {
      const { sqlite } = require('../db/index');
      const userRow = sqlite.prepare('SELECT permissions FROM users WHERE id = ?').get(req.user.id);
      let perms: string[] = [];
      if (userRow && userRow.permissions) {
        try {
          perms = JSON.parse(userRow.permissions);
        } catch (e) {}
      }
      const hasPermission = requiredModules.some(mod => perms.includes(mod));
      if (hasPermission || requiredModules.length === 0) {
        next();
        return;
      }
      res.status(403).json({ error: `无「${requiredModules.join('或')}」模块权限` });
      return;
    }
    res.status(403).json({ error: '无后台访问权限' });
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = payload;
    } catch { /* 忽略错误，继续作为游客 */ }
  }
  next();
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
