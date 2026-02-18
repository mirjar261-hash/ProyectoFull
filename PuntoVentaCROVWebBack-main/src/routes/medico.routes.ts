import express from 'express';
import {
  crearMedico,
  obtenerMedicos,
  actualizarMedico,
  eliminarMedico,
  obtenerMedicoPorCedula,
} from '../controllers/medicos.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/cedula/:cedula', verifyToken, obtenerMedicoPorCedula);
router.get('/', verifyToken, obtenerMedicos);
router.post('/', verifyToken, crearMedico);
router.put('/:id', verifyToken, actualizarMedico);
router.delete('/:id', verifyToken, eliminarMedico);

export default router;
