import express from 'express';
import {
  obtenerGastos,
  obtenerGastosPorRango,
  crearGasto,
  editarGasto,
  desactivarGasto,
} from '../controllers/gasto.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerGastos);
router.get('/rango', verifyToken, obtenerGastosPorRango);
router.post('/', verifyToken, crearGasto);
router.put('/:id', verifyToken, editarGasto);
router.delete('/:id', verifyToken, desactivarGasto);

export default router;
