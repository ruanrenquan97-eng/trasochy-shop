"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.staffMiddleware = staffMiddleware;
exports.permissionMiddleware = permissionMiddleware;
exports.optionalAuth = optionalAuth;
exports.signToken = signToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'skincare-shop-secret-key-2024';
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ error: '未登录' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token无效或已过期' });
    }
}
// 仅超级管理员可访问
function adminMiddleware(req, res, next) {
    if (req.user?.level !== 'admin') {
        res.status(403).json({ error: '无管理员权限' });
        return;
    }
    next();
}
// admin 或 staff 可访问（后台基本权限）
function staffMiddleware(req, res, next) {
    if (!req.user || (req.user.level !== 'admin' && req.user.level !== 'staff')) {
        res.status(403).json({ error: '无后台访问权限' });
        return;
    }
    next();
}
// 按模块检查权限：admin 全部放行，staff 检查 permissions 数组
function permissionMiddleware(...requiredModules) {
    return (req, res, next) => {
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
            let perms = [];
            if (userRow && userRow.permissions) {
                try {
                    perms = JSON.parse(userRow.permissions);
                }
                catch (e) { }
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
function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = payload;
        }
        catch { /* 忽略错误，继续作为游客 */ }
    }
    next();
}
function signToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
