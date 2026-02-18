import express from 'express';
import {
  obtenerCortesDia,
  obtenerCortesPorRango,
  crearCorteDia,
  editarCorteDia,
  desactivarCorteDia,
  obtenerUltimoCorteUsuario,
  obtenerDatosCorteDia,
} from '../controllers/corte_dia.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerCortesDia);
router.get('/rango', verifyToken, obtenerCortesPorRango);
router.get('/ultimo', verifyToken, obtenerUltimoCorteUsuario);
router.get('/datos', verifyToken, obtenerDatosCorteDia);
router.post('/', verifyToken, crearCorteDia);
router.put('/:id', verifyToken, editarCorteDia);
router.delete('/:id', verifyToken, desactivarCorteDia);

export default router;
