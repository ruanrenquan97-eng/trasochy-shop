"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 注册
router.post('/register', async (req, res) => {
    const { email, password, name, phone, referralCode } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ error: '邮箱、密码、姓名为必填项' });
        return;
    }
    if (password.length < 6) {
        res.status(400).json({ error: '密码不能少于6位' });
        return;
    }
    const existing = index_1.sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        res.status(409).json({ error: '该邮箱已注册' });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const now = Date.now();
    // 处理推荐人
    let referredBy = null;
    if (referralCode) {
        const referrer = index_1.sqlite.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode);
        if (referrer) {
            referredBy = referrer.id;
        }
    }
    // 生成自己的推荐码
    const myReferralCode = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString().slice(-4);
    const r = index_1.sqlite.prepare(`INSERT INTO users (email,password,name,phone,level,is_active,referral_code,referred_by,created_at,updated_at) VALUES (?,?,?,?,'member',1,?,?,?,?)`).run(email, hashed, name, phone || null, myReferralCode, referredBy, now, now);
    const user = index_1.sqlite.prepare('SELECT id,email,name,level,points,referral_code FROM users WHERE id = ?').get(r.lastInsertRowid);
    const token = (0, auth_1.signToken)({ id: user.id, email: user.email, level: user.level });
    res.json({ token, user });
});
// 登录
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: '邮箱和密码为必填项' });
        return;
    }
    const user = index_1.sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !await bcryptjs_1.default.compare(password, user.password)) {
        res.status(401).json({ error: '邮箱或密码错误' });
        return;
    }
    if (!user.is_active) {
        res.status(403).json({ error: '账号已被禁用' });
        return;
    }
    const token = (0, auth_1.signToken)({ id: user.id, email: user.email, level: user.level });
    const permissions = user.permissions ? JSON.parse(user.permissions) : null;
    res.json({
        token,
        user: {
            id: user.id, email: user.email, name: user.name,
            level: user.level, points: user.points, avatar: user.avatar,
            permissions
        }
    });
});
// 获取当前用户信息
router.get('/me', auth_1.authMiddleware, (req, res) => {
    const user = index_1.sqlite.prepare('SELECT id,email,name,phone,avatar,level,permissions,points,total_spend,referral_code,created_at FROM users WHERE id = ?').get(req.user.id);
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
router.get('/me/referrals', auth_1.authMiddleware, (req, res) => {
    const userId = req.user.id;
    // 我邀请的人
    const invited = index_1.sqlite.prepare('SELECT id, name, email, avatar, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC').all(userId);
    // 积分流水
    const pointsHistory = index_1.sqlite.prepare('SELECT id, amount, type, description, created_at FROM points_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    res.json({ invited, pointsHistory });
});
// 更新个人信息
router.put('/me', auth_1.authMiddleware, async (req, res) => {
    const { name, phone } = req.body;
    const now = Date.now();
    index_1.sqlite.prepare('UPDATE users SET name=?,phone=?,updated_at=? WHERE id=?').run(name, phone, now, req.user.id);
    res.json({ success: true });
});
// 修改密码
router.put('/me/password', auth_1.authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 6) {
        res.status(400).json({ error: '新密码不能少于6位' });
        return;
    }
    const user = index_1.sqlite.prepare('SELECT password FROM users WHERE id=?').get(req.user.id);
    if (!await bcryptjs_1.default.compare(oldPassword, user.password)) {
        res.status(401).json({ error: '原密码错误' });
        return;
    }
    const hashed = await bcryptjs_1.default.hash(newPassword, 10);
    index_1.sqlite.prepare('UPDATE users SET password=?,updated_at=? WHERE id=?').run(hashed, Date.now(), req.user.id);
    res.json({ success: true });
});
exports.default = router;
