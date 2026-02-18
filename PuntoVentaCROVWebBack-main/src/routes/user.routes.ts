import { Router } from 'express';
import { register, cambiarPassword, editarUsuario, desactivarUsuario, obtenerUsuariosActivos, checkEmail } from '../controllers/user.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

// Protegido con JWT
router.post('/register', verifyToken, register);
router.put('/cambiar-password', verifyToken, cambiarPassword);
router.put('/:id', verifyToken, editarUsuario);
router.delete('/:id', verifyToken, desactivarUsuario);
router.get('/activos', verifyToken, obtenerUsuariosActivos);
router.get('/check-email', checkEmail);

export default router;