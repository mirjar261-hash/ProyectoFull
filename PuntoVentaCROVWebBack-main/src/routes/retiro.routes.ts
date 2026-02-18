import express from 'express';
import {
  obtenerRetiros,
  crearRetiro,
  editarRetiro,
  desactivarRetiro,
} from '../controllers/retiro.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerRetiros);
router.post('/', verifyToken, crearRetiro);
router.put('/:id', verifyToken, editarRetiro);
router.delete('/:id', verifyToken, desactivarRetiro);

export default router;
