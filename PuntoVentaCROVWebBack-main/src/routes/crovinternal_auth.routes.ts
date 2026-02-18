import { Router } from 'express';
import {
  crovInternalLogin,
  crovInternalChangePassword,
} from '../controllers/crovinternal_auth.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.post('/login', crovInternalLogin);
router.put('/changepassword', verifyToken, crovInternalChangePassword);

export default router;
