import express from 'express';
import {
  obtenerVentas,
  obtenerVentaPorId,
  crearVenta,
  editarVenta,
  desactivarVenta,
  devolverVenta,
  registrarAbono,
  registrarAbonoGeneral,
  obtenerUltimoFolio,
} from '../controllers/venta.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerVentas);
router.get('/ultimoFolio', verifyToken, obtenerUltimoFolio);
router.get('/:id', verifyToken, obtenerVentaPorId);
router.post('/', verifyToken, crearVenta);
router.post('/abono-general', verifyToken, registrarAbonoGeneral);
router.post('/abono', verifyToken, registrarAbono);
router.put('/:id', verifyToken, editarVenta);
router.post('/:id/devolucion', verifyToken, devolverVenta);
router.delete('/:id', verifyToken, desactivarVenta);

export default router;
