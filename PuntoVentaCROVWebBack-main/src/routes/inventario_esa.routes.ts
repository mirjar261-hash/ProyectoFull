import express from 'express';
import {
  obtenerInventarioESA,
  crearInventarioESA,
  editarInventarioESA,
  eliminarInventarioESA,
} from '../controllers/inventario_esa.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerInventarioESA);
router.post('/', verifyToken, crearInventarioESA);
router.put('/:id', verifyToken, editarInventarioESA);
router.delete('/:id', verifyToken, eliminarInventarioESA);

export default router;
