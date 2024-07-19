import express from 'express';
import { comment_reaction_post } from '../controllers/commentsController.mjs';
import protect from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.post('/comment_:id/:reaction', protect, comment_reaction_post);

export default router;

