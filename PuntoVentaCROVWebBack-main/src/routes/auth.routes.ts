import { Router } from 'express';
import { login, setup, perfil, sendCode, sendWelcome, resetPassword, changePassword} from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.post('/login', login);
router.post('/setup', setup);
router.get('/perfil', verifyToken,  perfil);
router.post('/send-code', sendCode);
router.post('/send-welcome', sendWelcome);
router.post('/reset-password', resetPassword);
router.put('/changepassword',verifyToken, changePassword);

export default router;
