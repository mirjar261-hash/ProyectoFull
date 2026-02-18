import express from 'express';
import {
    obtenerInsumosDeProducto,
    agregarInsumoAProducto,
    actualizarCantidadProductoInsumo,
    eliminarProductoInsumo,
    obtenerNumeroInsumosDeProducto,
    obtenerTotalInsumosProducto
}   from '../controllers/insumos.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/productos/:productoId/insumos', verifyToken, obtenerInsumosDeProducto);
router.post('/', verifyToken, agregarInsumoAProducto);
router.put('/productoInsumo', verifyToken, actualizarCantidadProductoInsumo);
router.delete('/productoInsumo', verifyToken, eliminarProductoInsumo);
router.get('/producto/:productoId/insumo',verifyToken, obtenerNumeroInsumosDeProducto);
router.get('/producto/:id/insumo-total', verifyToken, obtenerTotalInsumosProducto);

export default router;