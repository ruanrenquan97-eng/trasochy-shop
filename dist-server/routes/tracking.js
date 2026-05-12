"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const router = (0, express_1.Router)();
router.post('/view', async (req, res) => {
    try {
        const { sessionId, path, dwellTime, productId } = req.body;
        if (!sessionId || !path) {
            res.status(400).json({ error: 'Missing required tracking data' });
            return;
        }
        const userId = req.user?.id || null;
        index_1.sqlite.prepare(`
      INSERT INTO user_behavior_logs (session_id, user_id, action_type, path, product_id, dwell_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, 'page_view', path, productId || null, dwellTime || 0);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[Tracking Error]', err);
        res.status(500).json({ error: 'Tracking failed' });
    }
});
router.post('/event', async (req, res) => {
    try {
        const { sessionId, path, actionType, productId } = req.body;
        if (!sessionId || !actionType || !path) {
            res.status(400).json({ error: 'Missing required tracking data' });
            return;
        }
        const userId = req.user?.id || null;
        index_1.sqlite.prepare(`
      INSERT INTO user_behavior_logs (session_id, user_id, action_type, path, product_id, dwell_time)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(sessionId, userId, actionType, path, productId || null);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[Tracking Error]', err);
        res.status(500).json({ error: 'Tracking failed' });
    }
});
router.get('/stats', async (_req, res) => {
    try {
        const data = index_1.sqlite.prepare(`
      SELECT b.action_type, b.path, p.name as product_name, SUM(b.dwell_time) as total_dwell, COUNT(*) as action_count
      FROM user_behavior_logs b
      LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      GROUP BY b.action_type, b.path, p.name
      ORDER BY action_count DESC, total_dwell DESC
      LIMIT 20
    `).all();
        res.json({ stats: data });
    }
    catch (err) {
        console.error('[Tracking Stats Error]', err);
        res.status(500).json({ error: 'Failed to fetch tracking stats' });
    }
});
exports.default = router;
