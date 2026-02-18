import express from 'express';
import {
  obtenerCompras,
  obtenerCompraPorId,
  crearCompra,
  editarCompra,
  desactivarCompra,
  devolverCompra,
  obtenerUltimoFolio,
} from '../controllers/compra.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerCompras);
router.get('/ultimoFolio', verifyToken, obtenerUltimoFolio);
router.get('/:id', verifyToken, obtenerCompraPorId);
router.post('/', verifyToken, crearCompra);
router.put('/:id', verifyToken, editarCompra);
router.post('/:id/devolucion', verifyToken, devolverCompra);
router.delete('/:id', verifyToken, desactivarCompra);

export default router;
