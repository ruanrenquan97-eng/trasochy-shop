"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ======================= 公开接口 =======================
// 获取所有已发布的文章 (前端展示)
router.get('/', (req, res) => {
    const { page = '1', limit = '12', keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    // 检查全局开关
    const settings = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_articles'").get();
    if (!settings || settings.value !== '1') {
        res.status(403).json({ error: '内容中心功能未开启' });
        return;
    }
    let where = "status = 'published'";
    const params = [];
    if (keyword) {
        where += " AND (title LIKE ? OR content LIKE ?)";
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const articles = index_1.sqlite.prepare(`
    SELECT id, title, slug, cover_image, is_ai_generated, keywords, published_at, created_at, updated_at
    FROM articles 
    WHERE ${where} 
    ORDER BY COALESCE(published_at, created_at) DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    const totalRow = index_1.sqlite.prepare(`SELECT COUNT(*) as count FROM articles WHERE ${where}`).get(...params);
    res.json({ articles, total: totalRow.count });
});
// 获取单篇文章详情
router.get('/:idOrSlug', (req, res) => {
    const { idOrSlug } = req.params;
    const isId = !isNaN(Number(idOrSlug));
    let article;
    if (isId) {
        article = index_1.sqlite.prepare("SELECT * FROM articles WHERE id = ?").get(idOrSlug);
    }
    else {
        article = index_1.sqlite.prepare("SELECT * FROM articles WHERE slug = ?").get(idOrSlug);
    }
    if (!article) {
        res.status(404).json({ error: '文章不存在' });
        return;
    }
    // 只有后台允许查看草稿
    if (article.status !== 'published') {
        // 简单的鉴权检查，公开接口无法查看草稿
        const isApiCallFromAdmin = req.headers.authorization;
        if (!isApiCallFromAdmin) {
            res.status(403).json({ error: '文章未发布' });
            return;
        }
    }
    res.json(article);
});
// ======================= 后台接口 =======================
router.use(auth_1.authMiddleware);
router.use((0, auth_1.permissionMiddleware)('articles'));
// 获取所有文章 (后台管理)
router.get('/admin/list', (req, res) => {
    const { page = '1', limit = '20', status, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "1=1";
    const params = [];
    if (status && status !== 'all') {
        where += " AND status = ?";
        params.push(status);
    }
    if (keyword) {
        where += " AND title LIKE ?";
        params.push(`%${keyword}%`);
    }
    const articles = index_1.sqlite.prepare(`
    SELECT * FROM articles 
    WHERE ${where} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    const totalRow = index_1.sqlite.prepare(`SELECT COUNT(*) as count FROM articles WHERE ${where}`).get(...params);
    res.json({ articles, total: totalRow.count });
});
// 创建文章
router.post('/', (req, res) => {
    const { title, slug, content, coverImage, status, isAiGenerated, keywords, publishedAt, translations } = req.body;
    if (!title || !content) {
        res.status(400).json({ error: '标题和内容为必填项' });
        return;
    }
    const finalSlug = slug || title.replace(/\s+/g, '-').substring(0, 50);
    const now = Date.now();
    const pubTime = status === 'published' ? (publishedAt || now) : null;
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    try {
        const r = index_1.sqlite.prepare(`
      INSERT INTO articles (title, slug, content, cover_image, status, is_ai_generated, keywords, translations, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, finalSlug, content, coverImage || null, status || 'draft', isAiGenerated ? 1 : 0, keywords || null, transStr, pubTime, now, now);
        res.json({ success: true, id: r.lastInsertRowid });
    }
    catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: '别名(Slug)已存在，请修改' });
        }
        else {
            res.status(500).json({ error: '保存失败: ' + err.message });
        }
    }
});
// 更新文章
router.put('/:id', (req, res) => {
    const { title, slug, content, coverImage, status, isAiGenerated, keywords, publishedAt, translations } = req.body;
    const existing = index_1.sqlite.prepare("SELECT status, published_at FROM articles WHERE id = ?").get(req.params.id);
    if (!existing) {
        res.status(404).json({ error: '文章不存在' });
        return;
    }
    const now = Date.now();
    let pubTime = existing.published_at;
    if (status === 'published' && existing.status !== 'published') {
        pubTime = publishedAt || now; // 首次发布记录时间
    }
    else if (status === 'draft') {
        pubTime = null;
    }
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    try {
        index_1.sqlite.prepare(`
      UPDATE articles 
      SET title = ?, slug = ?, content = ?, cover_image = ?, status = ?, is_ai_generated = ?, keywords = ?, translations = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(title, slug, content, coverImage || null, status, isAiGenerated ? 1 : 0, keywords || null, transStr, pubTime, now, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: '别名(Slug)已存在，请修改' });
        }
        else {
            res.status(500).json({ error: '更新失败: ' + err.message });
        }
    }
});
// 删除文章
router.delete('/:id', (req, res) => {
    index_1.sqlite.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});
exports.default = router;
