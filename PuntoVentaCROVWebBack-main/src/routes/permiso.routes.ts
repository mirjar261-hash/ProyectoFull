import { Router } from 'express';
import { obtenerPermisosUsuario, actualizarPermisosUsuario, obtenerTodosPermisos } from '../controllers/permiso.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.get('/', verifyToken, obtenerTodosPermisos);
router.get('/:id', verifyToken, obtenerPermisosUsuario);
router.put('/:id', verifyToken, actualizarPermisosUsuario);

export default router;