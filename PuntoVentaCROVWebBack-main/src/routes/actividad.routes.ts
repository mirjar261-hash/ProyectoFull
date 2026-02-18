import express from 'express';
import {
  obtenerActividades,
  obtenerActividadesPorMes,
  obtenerActividadesPorSemana,
  obtenerActividadesPorDia,
  obtenerActividadesDelUsuario,
  crearActividad,
  editarActividad,
  desactivarActividad,
} from '../controllers/actividad.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerActividades);
router.get('/mes', verifyToken, obtenerActividadesPorMes);
router.get('/semana', verifyToken, obtenerActividadesPorSemana);
router.get('/dia', verifyToken, obtenerActividadesPorDia);
router.get('/usuario/proximas', verifyToken, obtenerActividadesDelUsuario);
router.post('/', verifyToken, crearActividad);
router.put('/:id', verifyToken, editarActividad);
router.delete('/:id', verifyToken, desactivarActividad);

export default router;
