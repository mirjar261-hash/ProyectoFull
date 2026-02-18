import express from 'express';
import {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerProductosPaginacion,
  obtenerProductoPorCodigoBarras
} from '../controllers/producto.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/productos', verifyToken, obtenerProductos);
router.get('/productos/:id', verifyToken, obtenerProductoPorId);
router.post('/productos', verifyToken, crearProducto);
router.put('/productos/:id', verifyToken, actualizarProducto);
router.delete('/productos/:id', verifyToken, eliminarProducto);
router.get('/productosPaginacion', verifyToken, obtenerProductosPaginacion);
router.get('/codigo/:codigo', verifyToken, obtenerProductoPorCodigoBarras);


export default router;
