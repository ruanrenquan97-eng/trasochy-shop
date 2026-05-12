import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware, staffMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(staffMiddleware);

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WebP 格式图片'));
    }
  },
});

// 上传单张图片（兼容 /image 路径，供设置页面使用）
router.post('/image', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的图片' });
    return;
  }
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// 上传单张图片
router.post('/single', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请选择要上传的图片' });
    return;
  }
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// 上传多张图片
router.post('/multiple', upload.array('images', 5), (req: Request, res: Response) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    res.status(400).json({ error: '请选择要上传的图片' });
    return;
  }
  const files = req.files as Express.Multer.File[];
  const urls = files.map(f => `/uploads/products/${f.filename}`);
  res.json({ urls, filenames: files.map(f => f.filename) });
});

// 删除图片
router.delete('/:filename', (req: Request, res: Response) => {
  const filename = String(req.params.filename);
  const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
  // 安全检查：防止路径遍历
  const resolvedPath = path.resolve(filePath);
  const allowedDir = path.resolve(path.join(process.cwd(), 'uploads', 'products'));
  if (!resolvedPath.startsWith(allowedDir)) {
    res.status(403).json({ error: '非法路径' });
    return;
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ success: true });
});

export default router;
