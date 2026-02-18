import express from 'express';
import {
  obtenerProveedores,
  crearProveedor,
  editarProveedor,
  desactivarProveedor,
} from '../controllers/proveedor.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerProveedores);
router.post('/', verifyToken, crearProveedor);
router.put('/:id', verifyToken, editarProveedor);
router.delete('/:id', verifyToken, desactivarProveedor);

export default router;
