import express from 'express';
import { devolverDetalleVenta } from '../controllers/detalle_venta.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.post('/:id/devolucion', verifyToken, devolverDetalleVenta);

export default router;
