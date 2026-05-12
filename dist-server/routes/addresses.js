"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取我的地址列表
router.get('/', auth_1.authMiddleware, (req, res) => {
    const addresses = index_1.sqlite.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
    res.json(addresses);
});
// 添加地址
router.post('/', auth_1.authMiddleware, (req, res) => {
    const { name, phone, province, city, district, address, isDefault } = req.body;
    if (!name || !phone || !province || !city || !district || !address) {
        res.status(400).json({ error: '请填写完整地址信息' });
        return;
    }
    const setDefault = index_1.sqlite.transaction(() => {
        // 如果设为默认，先清除其他默认
        if (isDefault) {
            index_1.sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
        }
        const result = index_1.sqlite.prepare(`INSERT INTO addresses (user_id, name, phone, province, city, district, address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, name, phone, province, city, district, address, isDefault ? 1 : 0);
        return result.lastInsertRowid;
    });
    const id = setDefault();
    const addr = index_1.sqlite.prepare('SELECT * FROM addresses WHERE id = ?').get(id);
    res.json(addr);
});
// 更新地址
router.put('/:id', auth_1.authMiddleware, (req, res) => {
    const addr = index_1.sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!addr) {
        res.status(404).json({ error: '地址不存在' });
        return;
    }
    const { name, phone, province, city, district, address, isDefault } = req.body;
    const update = index_1.sqlite.transaction(() => {
        if (isDefault) {
            index_1.sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
        }
        index_1.sqlite.prepare(`UPDATE addresses SET name=?, phone=?, province=?, city=?, district=?, address=?, is_default=?
       WHERE id = ? AND user_id = ?`).run(name || addr.name, phone || addr.phone, province || addr.province, city || addr.city, district || addr.district, address || addr.address, isDefault ? 1 : 0, req.params.id, req.user.id);
    });
    update();
    const updated = index_1.sqlite.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
    res.json(updated);
});
// 删除地址
router.delete('/:id', auth_1.authMiddleware, (req, res) => {
    const addr = index_1.sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!addr) {
        res.status(404).json({ error: '地址不存在' });
        return;
    }
    index_1.sqlite.prepare('DELETE FROM addresses WHERE id = ?').run(req.params.id);
    // 如果删除的是默认地址，把最早的地址设为默认
    if (addr.is_default) {
        const first = index_1.sqlite.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(req.user.id);
        if (first) {
            index_1.sqlite.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(first.id);
        }
    }
    res.json({ success: true });
});
// 设为默认地址
router.put('/:id/default', auth_1.authMiddleware, (req, res) => {
    const addr = index_1.sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!addr) {
        res.status(404).json({ error: '地址不存在' });
        return;
    }
    const setDefault = index_1.sqlite.transaction(() => {
        index_1.sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
        index_1.sqlite.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(req.params.id);
    });
    setDefault();
    res.json({ success: true });
});
exports.default = router;
