import express from 'express';
import {
  crearSolicitud,
  editarSolicitud,
  enviarSolicitudCorreo,
  obtenerSolicitudesActivas,
} from '../controllers/spinnegocios.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.post('/', verifyToken, crearSolicitud);
router.put('/:id', verifyToken, editarSolicitud);
router.post('/:id/enviar-correo', verifyToken, enviarSolicitudCorreo);
router.get('/activas', verifyToken, obtenerSolicitudesActivas);

export default router;