import express from 'express';
import {
  obtenerInversiones,
  obtenerInversionesPorRango,
  crearInversion,
  editarInversion,
  desactivarInversion,
} from '../controllers/inversion.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerInversiones);
router.get('/rango', verifyToken, obtenerInversionesPorRango);
router.post('/', verifyToken, crearInversion);
router.put('/:id', verifyToken, editarInversion);
router.delete('/:id', verifyToken, desactivarInversion);

export default router;
