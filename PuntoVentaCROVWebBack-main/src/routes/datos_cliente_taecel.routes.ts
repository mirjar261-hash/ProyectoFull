import express from 'express';
import {
  obtenerDatosTaecel,
  crearDatosTaecel,
  actualizarDatosTaecel,
  eliminarDatosTaecel,
} from '../controllers/datos_cliente_taecel.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerDatosTaecel);
router.post('/', verifyToken, crearDatosTaecel);
router.put('/:id', verifyToken, actualizarDatosTaecel);
router.delete('/:id', verifyToken, eliminarDatosTaecel);

export default router;
