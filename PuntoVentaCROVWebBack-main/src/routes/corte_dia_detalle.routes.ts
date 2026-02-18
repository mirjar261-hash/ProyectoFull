import express from 'express';
import {
  obtenerDetallesCorteDia,
  obtenerDetalleCorteDia,
  crearDetalleCorteDia,
  editarDetalleCorteDia,
  desactivarDetalleCorteDia,
} from '../controllers/corte_dia_detalle.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerDetallesCorteDia);
router.get('/:id', verifyToken, obtenerDetalleCorteDia);
router.post('/', verifyToken, crearDetalleCorteDia);
router.put('/:id', verifyToken, editarDetalleCorteDia);
router.delete('/:id', verifyToken, desactivarDetalleCorteDia);

export default router;
