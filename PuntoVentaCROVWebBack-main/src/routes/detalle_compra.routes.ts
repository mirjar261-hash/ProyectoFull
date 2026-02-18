import express from 'express';
import {
  obtenerDetallesCompra,
  obtenerDetalleCompra,
  crearDetalleCompra,
  editarDetalleCompra,
  desactivarDetalleCompra,
} from '../controllers/detalle_compra.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerDetallesCompra);
router.get('/:id', verifyToken, obtenerDetalleCompra);
router.post('/', verifyToken, crearDetalleCompra);
router.put('/:id', verifyToken, editarDetalleCompra);
router.delete('/:id', verifyToken, desactivarDetalleCompra);

export default router;
