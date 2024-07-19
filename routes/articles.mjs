import express from 'express';
import { articles_get, article_create_post, article_detail_get, article_add_comment_post } from '../controllers/articlesController.mjs';
import protect from '../middleware/authMiddleware.mjs';
import optionalAuth from '../middleware/optionalAuth.mjs';
import multer from 'multer';

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

router.get('/', articles_get);
router.get('/article_:id', optionalAuth, article_detail_get);

router.post('/article_create', protect, upload.single('image'), article_create_post);
router.post('/article_:id/add_comment', protect, article_add_comment_post);

export default router;