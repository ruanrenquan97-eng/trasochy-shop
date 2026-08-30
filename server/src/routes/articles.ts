import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware, permissionMiddleware } from '../middleware/auth';

const router = Router();

// ======================= 公开接口 =======================
// 获取所有已发布的文章 (前端展示)
router.get('/', (req: Request, res: Response) => {
  const { page = '1', limit = '12', keyword } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  // 检查全局开关
  const settings = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_articles'").get() as any;
  if (!settings || settings.value !== '1') {
    res.status(403).json({ error: '内容中心功能未开启' });
    return;
  }

  let where = "status = 'published'";
  const params: any[] = [];
  
  if (keyword) {
    where += " AND (title LIKE ? OR content LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const articles = sqlite.prepare(`
    SELECT id, title, slug, cover_image, is_ai_generated, keywords, translations, published_at, created_at, updated_at
    FROM articles 
    WHERE ${where} 
    ORDER BY COALESCE(published_at, created_at) DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  const totalRow = sqlite.prepare(`SELECT COUNT(*) as count FROM articles WHERE ${where}`).get(...params) as any;
  
  res.json({ articles, total: totalRow.count });
});

// 获取单篇文章详情
router.get('/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const isId = !isNaN(Number(idOrSlug));
  
  let article;
  if (isId) {
    article = sqlite.prepare("SELECT * FROM articles WHERE id = ?").get(idOrSlug) as any;
  } else {
    article = sqlite.prepare("SELECT * FROM articles WHERE slug = ?").get(idOrSlug) as any;
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
router.use(authMiddleware);
router.use(permissionMiddleware('articles'));

// 获取所有文章 (后台管理)
router.get('/admin/list', (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, keyword } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  
  let where = "1=1";
  const params: any[] = [];
  
  if (status && status !== 'all') {
    where += " AND status = ?";
    params.push(status);
  }
  
  if (keyword) {
    where += " AND title LIKE ?";
    params.push(`%${keyword}%`);
  }

  const articles = sqlite.prepare(`
    SELECT * FROM articles 
    WHERE ${where} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset);

  const totalRow = sqlite.prepare(`SELECT COUNT(*) as count FROM articles WHERE ${where}`).get(...params) as any;
  
  res.json({ articles, total: totalRow.count });
});

// 创建文章
router.post('/', (req: Request, res: Response) => {
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
    const r = sqlite.prepare(`
      INSERT INTO articles (title, slug, content, cover_image, status, is_ai_generated, keywords, translations, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, finalSlug, content, coverImage || null, status || 'draft', isAiGenerated ? 1 : 0, keywords || null, transStr, pubTime, now, now);
    
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: '别名(Slug)已存在，请修改' });
    } else {
      res.status(500).json({ error: '保存失败: ' + err.message });
    }
  }
});

// 更新文章
router.put('/:id', (req: Request, res: Response) => {
  const { title, slug, content, coverImage, status, isAiGenerated, keywords, publishedAt, translations } = req.body;
  
  const existing = sqlite.prepare("SELECT status, published_at FROM articles WHERE id = ?").get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: '文章不存在' });
    return;
  }
  
  const now = Date.now();
  let pubTime = existing.published_at;
  if (status === 'published' && existing.status !== 'published') {
     pubTime = publishedAt || now; // 首次发布记录时间
  } else if (status === 'draft') {
     pubTime = null;
  }
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;

  try {
    sqlite.prepare(`
      UPDATE articles 
      SET title = ?, slug = ?, content = ?, cover_image = ?, status = ?, is_ai_generated = ?, keywords = ?, translations = ?, published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(title, slug, content, coverImage || null, status, isAiGenerated ? 1 : 0, keywords || null, transStr, pubTime, now, req.params.id);
    
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: '别名(Slug)已存在，请修改' });
    } else {
      res.status(500).json({ error: '更新失败: ' + err.message });
    }
  }
});

// 删除文章
router.delete('/:id', (req: Request, res: Response) => {
  sqlite.prepare("DELETE FROM articles WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
