import { Router } from 'express';
import {
  obtenerOperadores,
  obtenerProductos,
  obtenerSaldoTaecel,
  obtenerComisionRecarga,
  realizarRecarga,
  obtenerHistorialRecargas,
} from '../controllers/recarga.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = Router();

router.get('/operadores', verifyToken, obtenerOperadores);
router.get('/operadores/:operadorId/productos', verifyToken, obtenerProductos);
router.get('/saldo/:sucursalId', verifyToken, obtenerSaldoTaecel);
router.get('/comision/:sucursalId', verifyToken, obtenerComisionRecarga);
router.get('/historial/:usuarioId', verifyToken, obtenerHistorialRecargas);
router.post('/', realizarRecarga);

export default router;
