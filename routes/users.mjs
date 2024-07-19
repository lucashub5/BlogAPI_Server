import express from 'express';
import { registerUser_post, loginUser_post, profileUser_get, auth_google_get, auth_google_callback_get } from '../controllers/usersController.mjs';
import protect from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.post('/user_register', registerUser_post);
router.post('/user_login', loginUser_post);
router.get('/user_profile', protect, profileUser_get);

router.get('/auth/google', auth_google_get);
router.get('/auth/google/callback', auth_google_callback_get);


export default router;