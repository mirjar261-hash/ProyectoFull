import express from 'express';
import {
  actualizarDatosEmpresa,
  actualizarFechaVencimiento,
  activarEmpresa,
  desactivarEmpresa,
  obtenerEmpresas,
  obtenerUsuariosPorEmpresa,
  obtenerEmpresasActivas,
  actualizarPlanEmpresa
} from '../controllers/empresa.controller';

import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, obtenerEmpresas);
router.put('/:id', verifyToken, actualizarFechaVencimiento);
router.put('/:id/datos', verifyToken, actualizarDatosEmpresa);
router.put('/:id/desactivar', verifyToken, desactivarEmpresa);
router.put('/:id/activar', verifyToken, activarEmpresa);
router.put('/:id/plan', verifyToken, actualizarPlanEmpresa);
/*Routes para CrovInternal*/
router.get('/:empresaId/usuarios', verifyToken, obtenerUsuariosPorEmpresa);
router.get('/activas', verifyToken, obtenerEmpresasActivas);

export default router;
