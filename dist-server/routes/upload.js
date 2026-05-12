"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.use(auth_1.staffMiddleware);
// 配置 multer 存储
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'products');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('只支持 JPG、PNG、GIF、WebP 格式图片'));
        }
    },
});
// 上传单张图片（兼容 /image 路径，供设置页面使用）
router.post('/image', upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: '请选择要上传的图片' });
        return;
    }
    const url = `/uploads/products/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// 上传单张图片
router.post('/single', upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: '请选择要上传的图片' });
        return;
    }
    const url = `/uploads/products/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});
// 上传多张图片
router.post('/multiple', upload.array('images', 5), (req, res) => {
    if (!req.files || req.files.length === 0) {
        res.status(400).json({ error: '请选择要上传的图片' });
        return;
    }
    const files = req.files;
    const urls = files.map(f => `/uploads/products/${f.filename}`);
    res.json({ urls, filenames: files.map(f => f.filename) });
});
// 删除图片
router.delete('/:filename', (req, res) => {
    const filename = String(req.params.filename);
    const filePath = path_1.default.join(process.cwd(), 'uploads', 'products', filename);
    // 安全检查：防止路径遍历
    const resolvedPath = path_1.default.resolve(filePath);
    const allowedDir = path_1.default.resolve(path_1.default.join(process.cwd(), 'uploads', 'products'));
    if (!resolvedPath.startsWith(allowedDir)) {
        res.status(403).json({ error: '非法路径' });
        return;
    }
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
    res.json({ success: true });
});
exports.default = router;
