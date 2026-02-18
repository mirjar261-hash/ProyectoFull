import express from 'express';
import {
  obtenerVentasDevueltas7Dias,
  obtenerDetallesVentasDevueltas7Dias,
  obtenerVentasConDescuento7Dias,
  obtenerProductosInventarioMinimo,
  prediccionInventario,
  prediccionVentas,
  prediccionCompras,
  prediccionGastos,
  topProductosUltimoMes,
  topClientesUltimoMes,
  comparativaVentasUltimoMes,
  comparativaUtilidadUltimoMes,
  consultaSql,
  obtenerKpisDia,
  obtenerKpisSemana,
  obtenerKpisMes,
} from '../controllers/gerente.controller';
import { verifyToken } from '../middlewares/verifyToken';

const router = express.Router();

router.get('/ventasDevueltas7dias', verifyToken, obtenerVentasDevueltas7Dias);
router.get(
  '/detallesVentasDevueltas7dias',
  verifyToken,
  obtenerDetallesVentasDevueltas7Dias
);
router.get('/ventasConDescuento7dias', verifyToken, obtenerVentasConDescuento7Dias);
router.get('/productosInventarioMinimo', verifyToken, obtenerProductosInventarioMinimo);
router.get('/prediccionInventario', verifyToken, prediccionInventario);
router.get('/prediccionVentas', verifyToken, prediccionVentas);
router.get('/prediccionCompras', verifyToken, prediccionCompras);
router.get('/prediccionGastos', verifyToken, prediccionGastos);
router.get('/comparativaVentasUltimoMes', verifyToken, comparativaVentasUltimoMes);
router.get('/comparativaUtilidadUltimoMes', verifyToken, comparativaUtilidadUltimoMes);
router.get('/topProductosUltimoMes', verifyToken, topProductosUltimoMes);
router.get('/topClientesUltimoMes', verifyToken, topClientesUltimoMes);
router.get('/kpisDia', verifyToken, obtenerKpisDia);
router.get('/kpisSemana', verifyToken, obtenerKpisSemana);
router.get('/kpisMes', verifyToken, obtenerKpisMes);
router.post('/consultaSql', verifyToken, consultaSql);

export default router;
