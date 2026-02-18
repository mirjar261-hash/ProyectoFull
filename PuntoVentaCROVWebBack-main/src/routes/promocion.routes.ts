import express from 'express';
import {
  crearPromocion,
  obtenerPromociones,
  actualizarPromocion,
  desactivarPromocion,
  obtenerPromocionesActivas,
  obtenerPromocionesPorRangoFecha,
  obtenerPromocionesAplicables
} from '../controllers/promocion.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/promociones', verifyToken, obtenerPromociones);
router.get('/promociones/activas', verifyToken, obtenerPromocionesActivas);
router.get('/promociones/rango', verifyToken, obtenerPromocionesPorRangoFecha);
router.get('/promociones/aplicables', verifyToken, obtenerPromocionesAplicables);
router.post('/promociones', verifyToken, crearPromocion);
router.put('/promociones/:id', verifyToken, actualizarPromocion);
router.patch('/promociones/:id/desactivar', verifyToken, desactivarPromocion);

export default router;
