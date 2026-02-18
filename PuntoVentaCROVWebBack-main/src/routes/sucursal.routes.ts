import express from 'express';
import {
  obtenerSucursal,
  editarSucursal,
  obtenerCorreoNotificacion,
  actualizarDatosTaecelSucursal,
  obtenerDatosTaecelSucursal,
} from '../controllers/sucursal.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/:id', verifyToken, obtenerSucursal);
router.get('/:id/taecel', verifyToken, obtenerDatosTaecelSucursal);
router.put('/:id/taecel', verifyToken, actualizarDatosTaecelSucursal);
router.get('/:id/correo-notificacion', verifyToken, obtenerCorreoNotificacion);
router.put('/:id', verifyToken, editarSucursal);

export default router;

