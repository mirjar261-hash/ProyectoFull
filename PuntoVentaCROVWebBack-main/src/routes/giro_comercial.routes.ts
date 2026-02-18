import { Router } from 'express';
import {
  listarGirosComerciales,
  obtenerGiroComercial,
  crearGiroComercial,
  actualizarGiroComercial,
  eliminarGiroComercial,
} from '../controllers/giro_comercial.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.get('/', verifyToken, listarGirosComerciales);
router.get('/:id', verifyToken, obtenerGiroComercial);
router.post('/', verifyToken, crearGiroComercial);
router.put('/:id', verifyToken, actualizarGiroComercial);
router.delete('/:id', verifyToken, eliminarGiroComercial);

export default router;
