import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');

// Ensure upload directories exist
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Multer config: store in memory for sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

/**
 * POST /uploads/images
 * Upload one or more images, returns array of paths
 */
router.post(
  '/images',
  requireAuth,
  upload.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No images provided' });
        return;
      }

      const paths: string[] = [];

      for (const file of files) {
        const id = crypto.randomBytes(12).toString('hex');
        const filename = `${id}.webp`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Resize and convert to webp
        await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(filepath);

        paths.push(`/uploads/images/${filename}`);
      }

      res.json({ data: paths });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

export default router;
