import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 获取我的地址列表
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const addresses = sqlite.prepare(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC'
  ).all(req.user!.id) as any[];
  res.json(addresses);
});

// 添加地址
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { name, phone, province, city, district, address, isDefault } = req.body;
  if (!name || !phone || !province || !city || !district || !address) {
    res.status(400).json({ error: '请填写完整地址信息' });
    return;
  }

  const setDefault = sqlite.transaction(() => {
    // 如果设为默认，先清除其他默认
    if (isDefault) {
      sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
    }
    const result = sqlite.prepare(
      `INSERT INTO addresses (user_id, name, phone, province, city, district, address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user!.id, name, phone, province, city, district, address, isDefault ? 1 : 0);
    return result.lastInsertRowid;
  });

  const id = setDefault();
  const addr = sqlite.prepare('SELECT * FROM addresses WHERE id = ?').get(id);
  res.json(addr);
});

// 更新地址
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  const addr = sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.id
  ) as any;
  if (!addr) {
    res.status(404).json({ error: '地址不存在' });
    return;
  }

  const { name, phone, province, city, district, address, isDefault } = req.body;

  const update = sqlite.transaction(() => {
    if (isDefault) {
      sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
    }
    sqlite.prepare(
      `UPDATE addresses SET name=?, phone=?, province=?, city=?, district=?, address=?, is_default=?
       WHERE id = ? AND user_id = ?`
    ).run(
      name || addr.name, phone || addr.phone, province || addr.province,
      city || addr.city, district || addr.district, address || addr.address,
      isDefault ? 1 : 0, req.params.id, req.user!.id
    );
  });

  update();
  const updated = sqlite.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// 删除地址
router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  const addr = sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.id
  ) as any;
  if (!addr) {
    res.status(404).json({ error: '地址不存在' });
    return;
  }
  sqlite.prepare('DELETE FROM addresses WHERE id = ?').run(req.params.id);
  // 如果删除的是默认地址，把最早的地址设为默认
  if (addr.is_default) {
    const first = sqlite.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(req.user!.id) as any;
    if (first) {
      sqlite.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(first.id);
    }
  }
  res.json({ success: true });
});

// 设为默认地址
router.put('/:id/default', authMiddleware, (req: Request, res: Response) => {
  const addr = sqlite.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(
    req.params.id, req.user!.id
  ) as any;
  if (!addr) {
    res.status(404).json({ error: '地址不存在' });
    return;
  }
  const setDefault = sqlite.transaction(() => {
    sqlite.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
    sqlite.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(req.params.id);
  });
  setDefault();
  res.json({ success: true });
});

export default router;
