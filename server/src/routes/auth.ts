import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sqlite } from '../db/index';
import { authMiddleware, signToken } from '../middleware/auth';

const router = Router();

// ============================================================
// 工具：校验用户名格式
// ============================================================
function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{4,20}$/.test(u);
}

// ============================================================
// GET /auth/check-username?u=xxx
// 实时检查用户名是否可用（无需登录）
// ============================================================
router.get('/check-username', (req: Request, res: Response) => {
  const u = (req.query.u as string || '').toLowerCase().trim();
  if (!u) { res.json({ available: false, reason: '请输入用户名' }); return; }
  if (!isValidUsername(u)) {
    res.json({ available: false, reason: '用户名只能包含小写字母、数字和下划线，长度 4-20 位' });
    return;
  }
  const exists = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(u);
  res.json({ available: !exists, reason: exists ? '该用户名已被占用' : '' });
});

// ============================================================
// POST /auth/register（新：用户名注册）
// Body: { username, password, name?, referralCode? }
// ============================================================
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, name, referralCode } = req.body;

  // 基本校验
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码为必填项' });
    return;
  }
  const lowerUsername = username.toLowerCase().trim();
  if (!isValidUsername(lowerUsername)) {
    res.status(400).json({ error: '用户名只能包含字母、数字和下划线，长度 4-20 位' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码不能少于6位' });
    return;
  }

  // 检查用户名唯一性
  const existingUsername = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(lowerUsername);
  if (existingUsername) {
    res.status(409).json({ error: '该用户名已被占用，请换一个' });
    return;
  }

  // 处理推荐人
  let referredBy = null;
  if (referralCode) {
    const referrer = sqlite.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode) as any;
    if (referrer) referredBy = referrer.id;
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = Date.now();
  const displayName = (name && name.trim()) || lowerUsername;
  const myReferralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString().slice(-4);

  // 新用户不再强制需要 email；email 字段留空字符串避免 NOT NULL 约束
  const r = sqlite.prepare(
    `INSERT INTO users (email, username, password, name, phone, level, is_active, referral_code, referred_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'member', 1, ?, ?, ?, ?)`
  ).run('', lowerUsername, hashed, displayName, null, myReferralCode, referredBy, now, now);

  const user = sqlite.prepare('SELECT id, email, username, name, level, points, referral_code FROM users WHERE id = ?').get(r.lastInsertRowid) as any;
  const token = signToken({ id: user.id, email: user.email || '', level: user.level });
  res.json({ token, user });
});

// ============================================================
// POST /auth/login
// Body: { email, password }  — email 字段接受 username / email / phone
// ============================================================
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: '账号和密码为必填项' });
    return;
  }

  const input = email.toString().trim();
  const inputLower = input.toLowerCase();

  // 按 username（不区分大小写）/ email / phone 三种方式查找
  const user = sqlite.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?'
  ).get(inputLower, input, input) as any;

  if (!user || !await bcrypt.compare(password, user.password)) {
    res.status(401).json({ error: '账号或密码错误' });
    return;
  }
  if (!user.is_active) {
    res.status(403).json({ error: '账号已被禁用' });
    return;
  }
  const token = signToken({ id: user.id, email: user.email || '', level: user.level });
  const permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      level: user.level,
      points: user.points,
      avatar: user.avatar,
      referral_code: user.referral_code,
      partner_tier: user.partner_tier,
      permissions,
    },
  });
});

// ============================================================
// GET /auth/me — 获取当前用户信息
// ============================================================
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = sqlite.prepare(
    'SELECT id, email, username, name, phone, avatar, level, permissions, points, total_spend, referral_code, partner_tier, created_at FROM users WHERE id = ?'
  ).get(req.user!.id) as any;
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  if (user.permissions) user.permissions = JSON.parse(user.permissions);
  res.json(user);
});

// ============================================================
// GET /auth/me/referrals — 我的推荐记录与积分流水
// ============================================================
router.get('/me/referrals', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const invited = sqlite.prepare(
    'SELECT id, name, username, email, avatar, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC'
  ).all(userId) as any[];
  const pointsHistory = sqlite.prepare(
    'SELECT id, amount, type, description, created_at FROM points_history WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId) as any[];
  res.json({ invited, pointsHistory });
});

// ============================================================
// PUT /auth/me — 更新个人信息（支持设置 username）
// ============================================================
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  const { name, phone, username } = req.body;
  const now = Date.now();

  if (username !== undefined) {
    const lowerUsername = username.toLowerCase().trim();
    if (!isValidUsername(lowerUsername)) {
      res.status(400).json({ error: '用户名只能包含字母、数字和下划线，长度 4-20 位' });
      return;
    }
    // 检查是否已被其他用户占用
    const existing = sqlite.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(lowerUsername, req.user!.id) as any;
    if (existing) {
      res.status(409).json({ error: '该用户名已被占用' });
      return;
    }
    sqlite.prepare('UPDATE users SET name=?, phone=?, username=?, updated_at=? WHERE id=?').run(
      name, phone, lowerUsername, now, req.user!.id
    );
  } else {
    sqlite.prepare('UPDATE users SET name=?, phone=?, updated_at=? WHERE id=?').run(
      name, phone, now, req.user!.id
    );
  }

  res.json({ success: true });
});

// ============================================================
// PUT /auth/me/password — 修改密码
// ============================================================
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
  sqlite.prepare('UPDATE users SET password=?, updated_at=? WHERE id=?').run(hashed, Date.now(), req.user!.id);
  res.json({ success: true });
});

export default router;
