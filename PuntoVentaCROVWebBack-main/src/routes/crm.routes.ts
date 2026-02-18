import express from 'express';
import {
  actualizarEstadoPlantilla,
  actualizarPlantilla,
  crearPlantilla,
  obtenerPlantillaPorId,
  obtenerPlantillas,
  enviarNotificacion,
  obtenerUsuariosConSucursal,
  enviarCorreosMasivos,
} from '../controllers/crm.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/plantillas', verifyToken, obtenerPlantillas);
router.get('/plantillas/:id', verifyToken, obtenerPlantillaPorId);
router.post('/plantillas', verifyToken, crearPlantilla);
router.put('/plantillas/:id', verifyToken, actualizarPlantilla);
router.patch('/plantillas/:id/estado', verifyToken, actualizarEstadoPlantilla);
router.post('/notificaciones', verifyToken, enviarNotificacion);
router.get('/usuarios', verifyToken, obtenerUsuariosConSucursal);
router.post('/notificaciones/correos/masivo', verifyToken, enviarCorreosMasivos);

export default router;