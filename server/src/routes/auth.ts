import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';
import { db, sqlite } from '../db/index';
import { authMiddleware, signToken } from '../middleware/auth';

const router = Router();

// 获取图形验证码
router.get('/captcha', (req: Request, res: Response) => {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1i',
    noise: 2,
    color: true,
  });

  const token = uuidv4();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟有效期

  try {
    sqlite.prepare(
      `INSERT INTO captchas (token, code, expires_at) VALUES (?, ?, ?)`
    ).run(token, captcha.text.toLowerCase(), expiresAt);
    res.json({ token, svg: captcha.data });
  } catch (error) {
    console.error('保存图形验证码失败:', error);
    res.status(500).json({ error: '验证码生成失败，请稍后重试' });
  }
});


// 注册
router.post('/register', async (req: Request, res: Response) => {
  const { phone, captchaCode, captchaToken, email, password, name, referralCode } = req.body;
  
  if (!password || !name) {
    res.status(400).json({ error: '密码和姓名为必填项' });
    return;
  }

  if (!phone && !email) {
    res.status(400).json({ error: '必须提供手机号或邮箱注册' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: '密码不能少于6位' });
    return;
  }

  let finalEmail = email;

  // 如果使用手机号注册
  if (phone) {
    if (!captchaCode || !captchaToken) {
      res.status(400).json({ error: '请输入图形验证码' });
      return;
    }
    // 校验图形验证码
    const record = sqlite.prepare('SELECT * FROM captchas WHERE token = ?').get(captchaToken) as any;
    
    if (record) {
      // 无论成功失败，立刻销毁该验证码
      sqlite.prepare('DELETE FROM captchas WHERE token = ?').run(captchaToken);
    }

    if (!record) {
      res.status(400).json({ error: '验证码无效或已过期，请刷新重新获取' });
      return;
    }
    if (record.code !== captchaCode.toLowerCase()) {
      res.status(400).json({ error: '图形验证码不正确' });
      return;
    }
    if (Date.now() > record.expires_at) {
      res.status(400).json({ error: '图形验证码已过期，请刷新重新获取' });
      return;
    }

    // 检查手机号是否已注册 (通过 email 字段匹配或 phone 字段)
    const existingPhone = sqlite.prepare('SELECT id FROM users WHERE phone = ? OR email = ?').get(phone, `${phone}@user.trasochy.com`);
    if (existingPhone) {
      res.status(409).json({ error: '该手机号已注册' });
      return;
    }

    // 生成占位邮箱以满足底层数据库 NOT NULL UNIQUE 要求
    if (!finalEmail) {
      finalEmail = `${phone}@user.trasochy.com`;
    }
  } else if (email) {
    // 检查邮箱是否已注册
    const existingEmail = sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      res.status(409).json({ error: '该邮箱已注册' });
      return;
    }
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = Date.now();
  
  // 处理推荐人
  let referredBy = null;
  if (referralCode) {
    const referrer = sqlite.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode) as any;
    if (referrer) {
      referredBy = referrer.id;
    }
  }

  // 生成自己的推荐码
  const myReferralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString().slice(-4);

  const r = sqlite.prepare(
    `INSERT INTO users (email,password,name,phone,level,is_active,referral_code,referred_by,created_at,updated_at) VALUES (?,?,?,?,'member',1,?,?,?,?)`
  ).run(finalEmail, hashed, name, phone || null, myReferralCode, referredBy, now, now);

  const user = sqlite.prepare('SELECT id,email,name,level,points,referral_code FROM users WHERE id = ?').get(r.lastInsertRowid) as any;
  const token = signToken({ id: user.id, email: user.email, level: user.level });
  res.json({ token, user });
});

// 登录
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: '账号和密码为必填项' });
    return;
  }
  // 允许使用真实邮箱，或者虚拟邮箱，或者手机号登录
  const user = sqlite.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(email, email) as any;
  if (!user || !await bcrypt.compare(password, user.password)) {
    res.status(401).json({ error: '账号或密码错误' });
    return;
  }
  if (!user.is_active) {
    res.status(403).json({ error: '账号已被禁用' });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, level: user.level });
  const permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json({
    token,
    user: {
      id: user.id, email: user.email, name: user.name, phone: user.phone,
      level: user.level, points: user.points, avatar: user.avatar,
      referral_code: user.referral_code, partner_tier: user.partner_tier,
      permissions
    }
  });
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = sqlite.prepare('SELECT id,email,name,phone,avatar,level,permissions,points,total_spend,referral_code,partner_tier,created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  // 解析 permissions JSON
  if (user.permissions) {
    user.permissions = JSON.parse(user.permissions);
  }
  res.json(user);
});

// 获取我的推荐记录与积分流水
router.get('/me/referrals', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.id;
  // 我邀请的人
  const invited = sqlite.prepare('SELECT id, name, email, avatar, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC').all(userId) as any[];
  // 积分流水
  const pointsHistory = sqlite.prepare('SELECT id, amount, type, description, created_at FROM points_history WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  
  res.json({ invited, pointsHistory });
});

// 更新个人信息
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  const { name, phone } = req.body;
  const now = Date.now();
  sqlite.prepare('UPDATE users SET name=?,phone=?,updated_at=? WHERE id=?').run(
    name, phone, now, req.user!.id
  );
  res.json({ success: true });
});

// 修改密码
router.put('/me/password', authMiddleware, async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: '新密码不能少于6位' });
    return;
  }
  const user = sqlite.prepare('SELECT password FROM users WHERE id=?').get(req.user!.id) as any;
  if (!await bcrypt.compare(oldPassword, user.password)) {
    res.status(401).json({ error: '原密码错误' });
    return;
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  sqlite.prepare('UPDATE users SET password=?,updated_at=? WHERE id=?').run(hashed, Date.now(), req.user!.id);
  res.json({ success: true });
});

export default router;
