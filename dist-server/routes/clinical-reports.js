"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ======================= 公开接口 =======================
// 获取所有已发布的临床报告
router.get('/', (req, res) => {
    const { page = '1', limit = '12', keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "status = 'published'";
    const params = [];
    if (keyword) {
        where += " AND (title LIKE ? OR summary LIKE ?)";
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const reports = index_1.sqlite.prepare(`
    SELECT id, title, slug, summary, cover_image, pdf_url, published_at, created_at, updated_at
    FROM clinical_reports 
    WHERE ${where} 
    ORDER BY COALESCE(published_at, created_at) DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    const totalRow = index_1.sqlite.prepare(`SELECT COUNT(*) as count FROM clinical_reports WHERE ${where}`).get(...params);
    res.json({ reports, total: totalRow.count });
});
// 获取单篇报告详情
router.get('/:idOrSlug', (req, res) => {
    const { idOrSlug } = req.params;
    const isId = !isNaN(Number(idOrSlug));
    let report;
    if (isId) {
        report = index_1.sqlite.prepare("SELECT * FROM clinical_reports WHERE id = ?").get(idOrSlug);
    }
    else {
        report = index_1.sqlite.prepare("SELECT * FROM clinical_reports WHERE slug = ?").get(idOrSlug);
    }
    if (!report) {
        res.status(404).json({ error: '报告不存在' });
        return;
    }
    if (report.status !== 'published') {
        const isApiCallFromAdmin = req.headers.authorization;
        if (!isApiCallFromAdmin) {
            res.status(403).json({ error: '报告未发布' });
            return;
        }
    }
    res.json(report);
});
// ======================= 后台接口 =======================
router.use(auth_1.authMiddleware);
router.use((0, auth_1.permissionMiddleware)('articles')); // 共用内容管理权限
// 获取所有报告 (后台管理)
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
    const reports = index_1.sqlite.prepare(`
    SELECT * FROM clinical_reports 
    WHERE ${where} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    const totalRow = index_1.sqlite.prepare(`SELECT COUNT(*) as count FROM clinical_reports WHERE ${where}`).get(...params);
    res.json({ reports, total: totalRow.count });
});
// 创建报告
router.post('/', (req, res) => {
    const { title, slug, summary, coverImage, pdfUrl, status, translations, publishedAt } = req.body;
    if (!title) {
        res.status(400).json({ error: '标题为必填项' });
        return;
    }
    const finalSlug = slug || title.replace(/\s+/g, '-').substring(0, 50);
    const now = Date.now();
    const pubTime = status === 'published' ? (publishedAt || now) : null;
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    try {
        const r = index_1.sqlite.prepare(`
      INSERT INTO clinical_reports (title, slug, summary, cover_image, pdf_url, status, translations, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, finalSlug, summary || null, coverImage || null, pdfUrl || null, status || 'draft', transStr, pubTime, now, now);
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
// 更新报告
router.put('/:id', (req, res) => {
    const { title, slug, summary, coverImage, pdfUrl, status, translations, publishedAt } = req.body;
    const existing = index_1.sqlite.prepare("SELECT status, published_at FROM clinical_reports WHERE id = ?").get(req.params.id);
    if (!existing) {
        res.status(404).json({ error: '报告不存在' });
        return;
    }
    const now = Date.now();
    let pubTime = existing.published_at;
    if (status === 'published' && existing.status !== 'published') {
        pubTime = publishedAt || now;
    }
    else if (status === 'draft') {
        pubTime = null;
    }
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    try {
        index_1.sqlite.prepare(`
      UPDATE clinical_reports 
      SET title = ?, slug = ?, summary = ?, cover_image = ?, pdf_url = ?, status = ?, translations = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(title, slug, summary || null, coverImage || null, pdfUrl || null, status, transStr, pubTime, now, req.params.id);
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
// 删除报告
router.delete('/:id', (req, res) => {
    index_1.sqlite.prepare("DELETE FROM clinical_reports WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});
exports.default = router;
