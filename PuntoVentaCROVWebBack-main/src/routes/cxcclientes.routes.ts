import express from 'express';
import {
  listarCxcClientes,
  crearCxcCliente,
  devolverAbonoCxc,
  listarCreditosPendientes,
  listarAbonosActivosPorVenta,
} from '../controllers/cxcclientes.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyToken, listarCxcClientes);
router.get('/creditos/pendientes', verifyToken, listarCreditosPendientes);
router.get('/ventas/:ventaId/abonos/activos', verifyToken, listarAbonosActivosPorVenta);
router.post('/', verifyToken, crearCxcCliente);
router.post('/abonos/:id/devolver', verifyToken, devolverAbonoCxc);

export default router;
