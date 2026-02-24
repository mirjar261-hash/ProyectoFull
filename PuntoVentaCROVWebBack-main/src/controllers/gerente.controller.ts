import { Request, Response } from 'express';
import { serializeBigInt } from '../utils/serializeBigInt';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import prisma from '../utils/prisma';

// ==========================================
// IMPORTACIÓN DE SERVICIOS
// ==========================================

import { 
  obtenerDashboardGerenteMetas,
  obtenerProductosBajaRotacionService,
  obtenerImpactoDevolucionesService,
  obtenerTopProductosUltimoMesService,
  obtenerTopClientesUltimoMesService,
  validarSucursalId
 } from '../services/metas.service';
//
import { 
  procesarVentaIA, 
  procesarCompraIA, 
  realizarCorteDiaIA, 
  simularCorteDiaIA, 
  obtenerUsuariosPendientesDeCorte, 
  procesarDevolucionIA, 
  obtenerCajerosDisponiblesIA 
} from '../services/transacciones.service';

import { 
  crearProductoCompletoIA, 
  agregarInsumosIA, 
  modificarProductoIA, 
  cambiarEstadoProductoIA 
} from '../services/producto.service';

import { 
  crearProveedorIA, 
  modificarProveedorIA, 
  cambiarEstadoProveedorIA 
} from '../services/proveedor.service';

import { 
  crearClienteIA, 
  actualizarClienteIA, 
  cambiarEstadoClienteIA 
} from '../services/cliente.service';

import { 
  crearTicketIA, 
  consultarTicketIA 
} from '../services/ticket.service';

import {
  registrarGastoIA,
  registrarRetiroIA,
  registrarFondoCajaIA,
  registrarInversionIA,
  obtenerHistorialCortesIA,
  obtenerCreditosPendientesIA,
  obtenerSaldosPorClienteIA,
  registrarAbonoIA,
  consultarHistorialAbonosIA,
  obtenerCajerosPendientesIA
} from '../services/caja.service';

import {
    generarReporteVentasIA,
    generarReporteComprasIA,
    obtenerMejoresClientesIA,
    obtenerMejoresProveedoresIA,
    obtenerMejoresCajerosIA,
    obtenerListaProveedoresGeneralIA,
    obtenerListaClientesGeneralIA
} from '../services/reportes.service';

// ==========================================
// CONFIGURACIÓN PRISMA & UTILS
// ==========================================
let prismaModels: { name: string; fields: string[] }[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Prisma } = require('@prisma/client');
  
  prismaModels = Prisma?.dmmf?.datamodel?.models?.map((m: any) => ({
      name: m.name,
      fields: m.fields
        .filter((f: any) => f.kind === 'scalar') 
        .map((f: any) => f.name),
    })) ?? [];
} catch {
  prismaModels = [];
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const buildSchemaPrompt = (message: string): string => {
  const lcMsg = message.toLowerCase();
  
  const tableAliases: Record<string, string[]> = {
    Actividad: ['actividad', 'actividades', 'agenda'],
    Cliente: ['cliente', 'clientes'],
    Clase: ['clase', 'clases', 'departamento', 'departamentos'],
    Compra: ['compra', 'compras', 'compre', 'compré', 'comprar', 'folio', 'factura', 'numdoc'],
    Datos_cliente_taecel: ['datos cliente taecel', 'cliente taecel', 'taecel'],
    Detalle_compra: ['compra', 'detalles'],
    Detalle_venta: ['venta', 'ventas', 'detalles', 'folio', 'ticket', 'top', 'mas vendido'],
    Gasto: ['gasto', 'gastos', 'gaste', 'gasté'],
    HistorialPermiso: ['historial permiso'],
    Inicio: ['inicio', 'inicios', 'fondo de caja', 'fondo'],
    Inventario_esa: ['kardex', 'historial de inventario', 'bitacora'],
    Inversion: ['inversion', 'inversión'],
    Marca: ['marca', 'marcas'],
    Modelo: ['modelo', 'modelos'],
    Permiso: ['permiso', 'permisos'],
    Producto: ['producto', 'productos', 'inventario', 'mercancia', 'articulo'],
    Proveedor: ['proveedor', 'proveedores'],
    Retiro: ['retiro', 'retiros'],
    SupportTicket: ['soporte', 'ticket', 'reporte', 'incidencia', 'fallo', 'error'],
    TicketResponse: ['respuesta ticket'],
    Usuario: ['usuario', 'usuarios', 'empleado', 'empleados', 'cajero', 'cajeros', 'vendedor'],
    Venta: ['venta', 'ventas', 'folio', 'ticket', 'recibo', 'top', 'mas'],
  };

  const relevant = prismaModels.filter((m) => {
    const aliases = tableAliases[m.name] ?? [];
    const names = [m.name.toLowerCase(), ...aliases.map((a) => a.toLowerCase())];
    return names.some((name) => lcMsg.includes(name));
  });

  if (!relevant.length) return '';
  
  const tables = relevant
    .map((m) => `${m.name}(${m.fields.join(', ')})`)
    .join('\n');
    
  return `Tablas disponibles:\n${tables}`;
};

const MAX_HISTORY_MESSAGES = 12;

const sanitizeHistory = (history: any): ChatMessage[] => {
  if (!Array.isArray(history)) return [];
  const allowedRoles = new Set(['user', 'assistant']);
  const cleaned: ChatMessage[] = [];
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') continue;
    const role = entry.role;
    const content = entry.content;
    if (!allowedRoles.has(role) || typeof content !== 'string') continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    cleaned.push({
      role,
      content: trimmed.slice(0, 2000),
    });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
};

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const formatOffset = (minutes: number) => {
  const total = clamp(Math.round(-minutes), -14 * 60, 14 * 60);
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
};

const MAZATLAN_TIMEZONE = 'America/Mazatlan';
const MAZATLAN_UTC_OFFSET = '-07:00';

const parseTimezoneOffset = (
  timezone?: string,
  offsetMinutes?: number,
  headerOffset?: string | string[]
) => {
  const tryFormat = (value: unknown): string | undefined => {
    if (typeof value === 'number' && isFinite(value)) {
      return formatOffset(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (/^[+-]\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return formatOffset(numeric);
      }
    }
    return undefined;
  };

  const tryTimezoneName = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^[A-Za-z_]+(?:\/[A-Za-z_]+)+$/.test(trimmed)) {
      return trimmed;
    }
    return undefined;
  };

  const headerValues = Array.isArray(headerOffset) ? headerOffset : [headerOffset];

  const detectedTimezone =
    tryTimezoneName(timezone) ||
    headerValues.map(tryTimezoneName).find(Boolean) ||
    tryFormat(offsetMinutes) ||
    tryFormat(timezone) ||
    headerValues.map(tryFormat).find(Boolean);

  if (detectedTimezone && detectedTimezone !== MAZATLAN_TIMEZONE) {
    return MAZATLAN_UTC_OFFSET;
  }

  return MAZATLAN_TIMEZONE;
};

const last7Days = () => {
  const now = new Date();
  const seven = new Date();
  seven.setDate(now.getDate() - 7);
  return seven;
};

const startOfLastMonth = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return start;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// ==========================================
// CÁLCULO DE KPIS
// ==========================================

const obtenerMetaDiariaHistorica = async (sucursalId: number): Promise<number> => {
  const resultado = await prisma.$queryRaw<Array<{ meta: unknown }>>`
    SELECT COALESCE(MAX(total_por_dia), 0) AS meta
    FROM (
      SELECT
        DATE(fecha) AS fecha,
        SUM(COALESCE(efectivo, 0) + COALESCE(transferencia, 0) + COALESCE(tarjeta, 0) + COALESCE(cheque, 0) + COALESCE(vale, 0)) AS total_por_dia
      FROM Venta
      WHERE sucursalId = ${sucursalId} AND activo = 1
      GROUP BY DATE(fecha)
    ) AS daily_totals
  `;
  const meta = resultado[0]?.meta ?? 0;
  return toNumber(meta);
};

export const calcularKpisDia = async (sucursalId: number, metaDiaria = 0, fechaParam = new Date()) => {
  const start = new Date(fechaParam); start.setHours(0, 0, 0, 0);
  const end = new Date(fechaParam); end.setHours(23, 59, 59, 999);

  const ventas = await prisma.venta.findMany({
    where: { sucursalId, activo: 1, fecha: { gte: start, lte: end } },
    select: { total: true, efectivo: true, transferencia: true, tarjeta: true, cheque: true, vale: true },
  });

  const ventasTotales = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const numeroTransacciones = ventas.length;
  const ticketPromedio = numeroTransacciones > 0 ? ventasTotales / numeroTransacciones : 0;
  
  const totalEfectivo = ventas.reduce((sum, v) => sum + Number(v.efectivo ?? 0), 0);
  const totalTransferencia = ventas.reduce((sum, v) => sum + Number(v.transferencia ?? 0), 0);
  const totalTarjeta = ventas.reduce((sum, v) => sum + Number(v.tarjeta ?? 0), 0);
  const totalCheque = ventas.reduce((sum, v) => sum + Number(v.cheque ?? 0), 0);
  const totalVale = ventas.reduce((sum, v) => sum + Number(v.vale ?? 0), 0);

  const ventasCredito = await prisma.venta.findMany({
    where: { sucursalId, fecha: { gte: start, lte: end }, estado: 'CREDITO', activo: 1 },
    select: { total: true },
  });
  const totalCredito = ventasCredito.reduce((sum, v) => sum + Number(v.total), 0);

  const devolVentas = await prisma.venta.findMany({ where: { sucursalId, fecha_devolucion: { gte: start, lte: end }, activo: 0 }, select: { total: true } });
  const devolVentasTotal = devolVentas.reduce((sum, v) => sum + Number(v.total), 0);
  const devolDetalles = await prisma.detalle_venta.findMany({ where: { fecha_devolucion: { gte: start, lte: end }, activo: 0, venta: { sucursalId, activo: 1 } }, select: { total: true } });
  const devolDetallesTotal = devolDetalles.reduce((sum, d) => sum + Number(d.total), 0);
  const totalDevoluciones = devolVentasTotal + devolDetallesTotal;
  const porcentajeDevoluciones = ventasTotales > 0 ? (totalDevoluciones / ventasTotales) * 100 : 0;

  const compras = await prisma.compra.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { total: true } });
  const totalCompras = compras.reduce((sum, c) => sum + Number(c.total), 0);
  const gastos = await prisma.gasto.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { monto: true } });
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  return {
    ventasTotales, metaDiaria, ticketPromedio, numeroTransacciones,
    totalEfectivo, totalTransferencia, totalTarjeta, totalCheque, totalVale, totalCredito,
    porcentajeDevoluciones, totalCompras, totalGastos,
  };
};

export const calcularKpisSemana = async (sucursalId: number, metaDiaria = 0, fechaParam = new Date()) => {
  const start = new Date(fechaParam);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);

  const ventas = await prisma.venta.findMany({ where: { sucursalId, activo: 1, fecha: { gte: start, lte: end } }, select: { total: true, efectivo: true, transferencia: true, tarjeta: true, cheque: true, vale: true } });
  const ventasTotales = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const numeroTransacciones = ventas.length;
  const ticketPromedio = numeroTransacciones > 0 ? ventasTotales / numeroTransacciones : 0;
  const totalEfectivo = ventas.reduce((sum, v) => sum + Number(v.efectivo ?? 0), 0);
  const totalTransferencia = ventas.reduce((sum, v) => sum + Number(v.transferencia ?? 0), 0);
  const totalTarjeta = ventas.reduce((sum, v) => sum + Number(v.tarjeta ?? 0), 0);
  const totalCheque = ventas.reduce((sum, v) => sum + Number(v.cheque ?? 0), 0);
  const totalVale = ventas.reduce((sum, v) => sum + Number(v.vale ?? 0), 0);

  const ventasCredito = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, estado: 'CREDITO', activo: 1 }, select: { total: true } });
  const totalCredito = ventasCredito.reduce((sum, v) => sum + Number(v.total), 0);

  const devolVentas = await prisma.venta.findMany({ where: { sucursalId, fecha_devolucion: { gte: start, lte: end }, activo: 0 }, select: { total: true } });
  const devolVentasTotal = devolVentas.reduce((sum, v) => sum + Number(v.total), 0);
  const devolDetalles = await prisma.detalle_venta.findMany({ where: { fecha_devolucion: { gte: start, lte: end }, activo: 0, venta: { sucursalId, activo: 1 } }, select: { total: true } });
  const devolDetallesTotal = devolDetalles.reduce((sum, d) => sum + Number(d.total), 0);
  const totalDevoluciones = devolVentasTotal + devolDetallesTotal;
  const porcentajeDevoluciones = ventasTotales > 0 ? (totalDevoluciones / ventasTotales) * 100 : 0;

  const compras = await prisma.compra.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { total: true } });
  const totalCompras = compras.reduce((sum, c) => sum + Number(c.total), 0);
  const gastos = await prisma.gasto.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { monto: true } });
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
  const metaSemanal = metaDiaria * 7;

  return {
    ventasTotales, metaDiaria, metaSemanal, ticketPromedio, numeroTransacciones,
    totalEfectivo, totalTransferencia, totalTarjeta, totalCheque, totalVale, totalCredito,
    porcentajeDevoluciones, totalCompras, totalGastos,
  };
};

export const calcularKpisMes = async (sucursalId: number, metaDiaria = 0, fechaParam = new Date()) => {
  const start = new Date(fechaParam); start.setDate(1); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);

  const ventas = await prisma.venta.findMany({ where: { sucursalId, activo: 1, fecha: { gte: start, lte: end } }, select: { total: true, efectivo: true, transferencia: true, tarjeta: true, cheque: true, vale: true } });
  const ventasTotales = ventas.reduce((sum, v) => sum + Number(v.total), 0);
  const numeroTransacciones = ventas.length;
  const ticketPromedio = numeroTransacciones > 0 ? ventasTotales / numeroTransacciones : 0;
  const totalEfectivo = ventas.reduce((sum, v) => sum + Number(v.efectivo ?? 0), 0);
  const totalTransferencia = ventas.reduce((sum, v) => sum + Number(v.transferencia ?? 0), 0);
  const totalTarjeta = ventas.reduce((sum, v) => sum + Number(v.tarjeta ?? 0), 0);
  const totalCheque = ventas.reduce((sum, v) => sum + Number(v.cheque ?? 0), 0);
  const totalVale = ventas.reduce((sum, v) => sum + Number(v.vale ?? 0), 0);

  const ventasCredito = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, estado: 'CREDITO', activo: 1 }, select: { total: true } });
  const totalCredito = ventasCredito.reduce((sum, v) => sum + Number(v.total), 0);

  const devolVentas = await prisma.venta.findMany({ where: { sucursalId, fecha_devolucion: { gte: start, lte: end }, activo: 0 }, select: { total: true } });
  const devolVentasTotal = devolVentas.reduce((sum, v) => sum + Number(v.total), 0);
  const devolDetalles = await prisma.detalle_venta.findMany({ where: { fecha_devolucion: { gte: start, lte: end }, activo: 0, venta: { sucursalId, activo: 1 } }, select: { total: true } });
  const devolDetallesTotal = devolDetalles.reduce((sum, d) => sum + Number(d.total), 0);
  const totalDevoluciones = devolVentasTotal + devolDetallesTotal;
  const porcentajeDevoluciones = ventasTotales > 0 ? (totalDevoluciones / ventasTotales) * 100 : 0;

  const compras = await prisma.compra.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { total: true } });
  const totalCompras = compras.reduce((sum, c) => sum + Number(c.total), 0);
  const gastos = await prisma.gasto.findMany({ where: { sucursalId, fecha: { gte: start, lte: end }, activo: 1 }, select: { monto: true } });
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const metaMensual = metaDiaria * daysInMonth;

  return {
    ventasTotales, metaDiaria, metaMensual, ticketPromedio, numeroTransacciones,
    totalEfectivo, totalTransferencia, totalTarjeta, totalCheque, totalVale, totalCredito,
    porcentajeDevoluciones, totalCompras, totalGastos,
  };
};

export const obtenerKpisDia = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const fechaParam = req.query.fecha ? new Date(String(req.query.fecha)) : new Date();
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId es requerido' }); return; }
  const metaDiaria = await obtenerMetaDiariaHistorica(sucursalId);
  const kpis = await calcularKpisDia(sucursalId, metaDiaria, fechaParam);
  res.json(serializeBigInt(kpis));
};

export const obtenerKpisSemana = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const fechaParam = req.query.fecha ? new Date(String(req.query.fecha)) : new Date();
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId es requerido' }); return; }
  const metaDiaria = await obtenerMetaDiariaHistorica(sucursalId);
  const kpis = await calcularKpisSemana(sucursalId, metaDiaria, fechaParam);
  res.json(serializeBigInt(kpis));
};

export const obtenerKpisMes = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const fechaParam = req.query.fecha ? new Date(String(req.query.fecha)) : new Date();
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId es requerido' }); return; }
  const metaDiaria = await obtenerMetaDiariaHistorica(sucursalId);
  const kpis = await calcularKpisMes(sucursalId, metaDiaria, fechaParam);
  res.json(serializeBigInt(kpis));
};

// ==========================================
// GRAFICOS Y PREDICCIONES
// ==========================================

export const obtenerVentasDevueltas7Dias = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const desde = last7Days();
  const ventas = await prisma.venta.findMany({ where: { sucursalId, fecha_devolucion: { not: null, gte: desde } }, orderBy: { fecha_devolucion: 'desc' } });
  res.json(serializeBigInt(ventas));
};

export const obtenerDetallesVentasDevueltas7Dias = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const desde = last7Days();
  const detalles = await prisma.detalle_venta.findMany({ where: { venta: { sucursalId, fecha_devolucion: { not: null, gte: desde } } }, include: { producto: true, venta: true }, orderBy: { id: 'desc' } });
  res.json(serializeBigInt(detalles));
};

export const obtenerVentasConDescuento7Dias = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const desde = last7Days();
  const ventas = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: desde }, OR: [{ descuento: { gt: 0 } }, { detalles: { some: { descuento: { gt: 0 } } } }] }, include: { detalles: true }, orderBy: { fecha: 'desc' } });
  res.json(serializeBigInt(ventas));
};

export const obtenerProductosInventarioMinimo = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const productos = await prisma.producto.findMany({ where: { sucursalId, activo: 1, servicio: 0} });
  const resultado = productos.filter((p: any) => p.stock_min !== null && Number(p.cantidad_existencia) <= Number(p.stock_min));
  res.json(serializeBigInt(resultado));
};

export const prediccionInventario = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const dias = Number(req.query.dias ?? 7);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = new Date(); start.setDate(start.getDate() - 30);
  const ventas = await prisma.detalle_venta.groupBy({ by: ['id_producto'], _sum: { cantidad: true }, where: { venta: { sucursalId, fecha: { gte: start } } } });
  const productos = await prisma.producto.findMany({ where: { id: { in: ventas.map((v: any) => v.id_producto) } }, select: { id: true, nombre: true, cantidad_existencia: true } });
  const resultado = ventas.map((v: any) => {
    const producto = productos.find((p: any) => p.id === v.id_producto);
    const promedioDiario = (v._sum.cantidad ?? 0) / 30;
    const prediccion = promedioDiario * dias;
    const stockActual = Number(producto?.cantidad_existencia ?? 0);
    return { productoId: v.id_producto, nombre: producto?.nombre ?? '', promedioDiario, prediccion, stockActual, stockEsperado: stockActual - prediccion };
  });
  const resultadoFiltrado = resultado.filter((item: any) => item.stockEsperado <= 0);
  res.json(serializeBigInt(resultadoFiltrado));
};

export const prediccionVentas = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const dias = Number(req.query.dias ?? 7);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = new Date(); start.setDate(start.getDate() - 30);
  const ventas = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: start } }, select: { total: true } });
  const totalUltimos30Dias = ventas.reduce((sum: number, v: any) => sum + Number(v.total), 0);
  const promedioDiario = totalUltimos30Dias / 30;
  const prediccion = promedioDiario * dias;
  res.json(serializeBigInt({ totalUltimos30Dias, promedioDiario, prediccion }));
};

export const prediccionCompras = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const dias = Number(req.query.dias ?? 7);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = new Date(); start.setDate(start.getDate() - 30);
  const compras = await prisma.compra.findMany({ where: { sucursalId, fecha: { gte: start } }, select: { total: true } });
  const totalUltimos30Dias = compras.reduce((sum: number, c: any) => sum + Number(c.total), 0);
  const promedioDiario = totalUltimos30Dias / 30;
  const prediccion = promedioDiario * dias;
  res.json(serializeBigInt({ totalUltimos30Dias, promedioDiario, prediccion }));
};

export const prediccionGastos = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const dias = Number(req.query.dias ?? 7);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = new Date(); start.setDate(start.getDate() - 30);
  const gastos = await prisma.gasto.findMany({ where: { sucursalId, fecha: { gte: start } }, select: { monto: true } });
  const totalUltimos30Dias = gastos.reduce((sum: number, g: any) => sum + Number(g.monto), 0);
  const promedioDiario = totalUltimos30Dias / 30;
  const prediccion = promedioDiario * dias;
  res.json(serializeBigInt({ totalUltimos30Dias, promedioDiario, prediccion }));
};

export const topProductosUltimoMes = async (req: Request, res: Response) => {
  const sucursalId = validarSucursalId(req.query.sucursalId || req.params.sucursalId || (req as any).user?.sucursalId);
  if (!sucursalId) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const resultado = await obtenerTopProductosUltimoMesService(sucursalId);
  res.json(serializeBigInt(resultado));
};

export const topClientesUltimoMes = async (req: Request, res: Response) => {
  const sucursalId = validarSucursalId(req.query.sucursalId || req.params.sucursalId || (req as any).user?.sucursalId);
  if (!sucursalId) { res.status(400).json({ error: 'sucursalId requerido' }); return; }

  const periodoRaw = String(req.query.periodo || 'historico').toLowerCase();
  const periodo: 'historico' | '1m' | '2m' =
    periodoRaw === '1m' || periodoRaw === '2m' ? periodoRaw : 'historico';

  const resultado = await obtenerTopClientesUltimoMesService(sucursalId, periodo);
  res.json(serializeBigInt(resultado));
};

export const comparativaVentasUltimoMes = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = startOfLastMonth();
  const ventas = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: start } }, select: { fecha: true, total: true } });
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const groups: Record<number, number> = {};
  ventas.forEach((venta: any) => {
    const index = Math.floor((venta.fecha.getTime() - start.getTime()) / weekMs);
    groups[index] = (groups[index] ?? 0) + Number(venta.total);
  });
  const resultado = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map((k) => ({ semana: Number(k) + 1, venta: groups[Number(k)] }));
  res.json(resultado);
};

export const comparativaUtilidadUltimoMes = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  const start = startOfLastMonth();
  const ventas = await prisma.venta.findMany({ where: { sucursalId, fecha: { gte: start } }, include: { detalles: { include: { producto: { select: { costo: true } } } } } });
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const groups: Record<number, number> = {};
  ventas.forEach((venta: any) => {
    const index = Math.floor((venta.fecha.getTime() - start.getTime()) / weekMs);
    const utilidadVenta = venta.detalles.reduce((sum: number, d: any) => { const costo = Number(d.producto?.costo ?? 0); return sum + (Number(d.total) - costo * Number(d.cantidad)); }, 0);
    groups[index] = (groups[index] ?? 0) + utilidadVenta;
  });
  const resultado = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map((k) => ({ semana: Number(k) + 1, utilidad: groups[Number(k)] }));
  res.json(resultado);
};

// ==========================================
// CEREBRO PRINCIPAL: CHAT SQL + TOOLS
// ==========================================

export const consultaSql = async (req: Request, res: Response) => {
  const { message, history, timezone, timezoneOffsetMinutes, timezoneOffset } = req.body ?? {};

  if (!message) { res.status(400).json({ error: 'Mensaje requerido' }); return; }
  const openAiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!openAiKey) { res.status(500).json({ error: 'API KEY no configurada' }); return; }

  const sucursalId = Number(req.query.sucursalId);
  const conversationHistory = sanitizeHistory(history);

  console.log("Historial:", JSON.stringify(conversationHistory, null, 2));
  console.log("Mensaje:", message);

  const tools = [
    {
      type: "function",
      function: {
        name: "listar_cajeros",
        description: "Muestra la lista de usuarios con perfil 'CAJA' activos.",
        parameters: { 
            type: "object", 
            properties: {}, 
            required: [] 
        }
      }
    },
    {
        type: "function",
        function: {
            name: "obtener_top_clientes",
            description: "Obtiene el ranking de los mejores clientes. Úsala para 'mejor cliente', 'quien compra mas'.",
            parameters: { 
                type: "object", 
                properties: {}, 
                required: [] 
            }
        }
    },
    {
        type: "function",
        function: {
            name: "obtener_top_proveedores",
            description: "Ranking de proveedores por volumen de compra. Úsala para 'mejor proveedor', 'a quien compro mas'.",
            parameters: { 
                type: "object", 
                properties: {}, 
                required: [] 
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listar_proveedores",
            description: "Muestra lista general alfabética de proveedores (teléfonos y contactos). Úsala para 'ver lista de proveedores', 'mis proveedores'. NO para ranking.",
            parameters: { 
                type: "object", 
                properties: {}, 
                required: [] 
            }
        }
    },
    {
        type: "function",
        function: {
            name: "listar_clientes",
            description: "Muestra lista general alfabética de clientes. Úsala para 'ver lista de clientes', 'mis clientes'. NO para ranking.",
            parameters: { 
                type: "object", 
                properties: {}, 
                required: [] 
            }
        }
    },
    {
        type: "function",
        function: {
            name: "obtener_top_cajeros",
            description: "Ranking de desempeño de cajeros. Úsala para 'mejor cajero'.",
            parameters: { 
                type: "object", 
                properties: {}, 
                required: [] 
            }
        }
    },
    {
    type: "function",
      function: {
        name: "registrar_venta",
        description: "Registra una venta.",
        parameters: {
          type: "object",
          properties: {
            usuarioVendedorId: { type: "number", description: "ID opcional" },
            nombreCliente: { type: "string" },
            productos: {
              type: "array",
              items: {
                type: "object",
                properties: { 
                    nombreProducto: { type: "string" }, 
                    cantidad: { type: "number" } 
                },
                required: ["nombreProducto", "cantidad"]
              }
            }
          },
          required: ["nombreCliente", "productos"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "registrar_compra",
        description: "Registra compra a proveedores.",
        parameters: {
          type: "object",
          properties: {
            nombreProveedor: { type: "string" },
            productos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombreProducto: { type: "string" },
                  cantidad: { type: "number" },
                  costo: { type: "number", description: "Opcional" }
                },
                required: ["nombreProducto", "cantidad"]
              }
            }
          },
          required: ["nombreProveedor", "productos"]
        }
      }
    },
    {
        type: "function",
        function: {
            name: "registrar_gasto",
            description: "Registra un gasto operativo.",
            parameters: {
                type: "object",
                properties: {
                    monto: { type: "number" },
                    descripcion: { type: "string" },
                    usuarioObjetivo: { type: "string" }
                },
                required: ["monto", "descripcion"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "registrar_retiro",
            description: "Registra un retiro de efectivo.",
            parameters: {
                type: "object",
                properties: {
                    monto: { type: "number" },
                    descripcion: { type: "string" },
                    usuarioObjetivo: { type: "string" }
                },
                required: ["monto", "descripcion"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "registrar_fondo_caja",
            description: "Asigna fondo inicial.",
            parameters: {
                type: "object",
                properties: {
                    monto: { type: "number" },
                    cajeroObjetivo: { type: "string" }
                },
                required: ["monto", "cajeroObjetivo"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "registrar_inversion",
            description: "Registra una inversión.",
            parameters: {
                type: "object",
                properties: {
                    monto: { type: "number" },
                    descripcion: { type: "string" }
                },
                required: ["monto"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "ver_historial_cortes",
            description: "Muestra historial de cortes de caja.",
            parameters: {
                type: "object",
                properties: {
                    fechaInicio: { type: "string" },
                    fechaFin: { type: "string" }
                },
                required: []
            }
        }
    },
    {
      type: "function",
      function: {
        name: "ver_creditos_pendientes",
        description: "Lista las ventas a crédito con saldo pendiente.",
        parameters: {
          type: "object",
          properties: {
            nombreCliente: { "type": "string" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "ver_clientes_deudores",
        description: "Resumen de clientes con deuda.",
        parameters: { 
            type: "object", 
            properties: {}, 
            required: [] 
        }
      }
    },
    {
      type: "function",
      function: {
        name: "registrar_abono",
        description: "Registra un abono a venta a crédito.",
        parameters: {
          type: "object",
          properties: {
            ventaIdentificador: { "type": "string" },
            monto: { "type": "number" },
            metodoPago: { "type": "string" },
            comentarios: { "type": "string" }
          },
          "required": ["ventaIdentificador", "monto"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "ver_historial_abonos",
        description: "Historial de abonos de una venta.",
        parameters: {
          type: "object",
          properties: {
            ventaIdentificador: { "type": "string" }
          },
          "required": ["ventaIdentificador"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "ver_pendientes_corte",
        description: "Muestra la lista de cajeros que han vendido hoy pero NO han hecho corte. Úsala para 'pre-corte' o 'quien falta'.",
        parameters: { 
            type: "object", 
            properties: {}, 
            required: [] 
        }
      }
    },
    {
      type: "function",
      function: {
        name: "consultar_pre_corte",
        description: "Muestra los números del pre-corte de un usuario ESPECÍFICO. Pide ID o Nombre.",
        parameters: {
          type: "object",
          properties: {
            usuarioObjetivoId: { type: "string", description: "ID del usuario." }
          },
          required: ["usuarioObjetivoId"]
        }
      }
    },
    {
      type: "function",
      function: {
    name: "realizar_corte_caja",
        description: "Ejecuta el corte. NO PEDIR MONTO MANUAL al usuario a menos que él lo especifique explícitamente. Por defecto usa el calculado.",
        parameters: {
          type: "object",
          properties: {
            usuarioObjetivoId: { type: "string" },
            montoManual: { type: "number", description: "Solo usar si el usuario quiere sobreescribir el monto del sistema." }
          },
          required: ["usuarioObjetivoId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "registrar_devolucion",
        description: "Devolución parcial o completa. NOTA: Compras SIEMPRE son COMPLETAS.",
        parameters: {
          type: "object",
          properties: {
            folio: { type: "string" }, 
            tipo: { type: "string", enum: ["VENTA", "COMPRA"] },
            modo: { type: "string", enum: ["COMPLETA", "PARCIAL"] },
            productos: { 
              type: "array",
              items: { 
                  type: "object", 
                  properties: { nombreProducto: { type: "string" }, cantidad: { type: "number" } }, 
                  required: ["nombreProducto", "cantidad"] 
              } 
            }
          },
          required: ["folio", "tipo", "modo"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "registrar_producto_nuevo",
        description: "Registra producto nuevo.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string" }, codigo: { type: "string" }, codigo_barras: { type: "string" }, codigo_fabricante: { type: "string" },
            costo: { type: "number" }, stock_inicial: { type: "number" }, stock_min: { type: "number" },
            precio_publico: { type: "number" }, precio_descuento: { type: "number" }, precio_semimayoreo: { type: "number" }, precio_mayoreo: { type: "number" }
          },
          required: ["nombre", "codigo", "costo", "stock_inicial", "precio_publico"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "modificar_producto",
        description: "Modifica producto existente.",
        parameters: {
          type: "object",
          properties: {
            nombreBusqueda: { type: "string" }, nombre: { type: "string" }, precio_publico: { type: "number" },
            costo: { type: "number" }, stock_min: { type: "number" }
          },
          required: ["nombreBusqueda"]
        }
      }
    },
    {
        type: "function",
        function: {
          name: "cambiar_estado_producto",
          description: "Eliminar o restaurar producto.",
          parameters: {
            type: "object",
            properties: {
              identificador: { type: "string" },
              nuevoEstado: { type: "number" }
            },
            required: ["identificador", "nuevoEstado"]
          }
        }
      },
      {
      type: "function",
      function: {
        name: "registrar_proveedor_nuevo",
        description: "Registra proveedor nuevo.",
        parameters: {
          type: "object",
          properties: {
            razon_social: { type: "string" }, telefono: { type: "string" }, rfc: { type: "string" }, movil: { type: "string" },
            nombre_contacto: { type: "string" }, email: { type: "string" }, rubro: { type: "string" },
            limite_credito: { type: "number" }, dias_credito: { type: "number" }
          },
          required: ["razon_social", "telefono"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "modificar_proveedor",
        description: "Modifica proveedor existente.",
        parameters: {
          type: "object",
          properties: {
            nombreBusqueda: { type: "string" }, razon_social: { type: "string" }, telefono: { type: "string" },
            rfc: { type: "string" }, email: { type: "string" }, limite_credito: { type: "number" }
          },
          required: ["nombreBusqueda"]
        }
      }
    },
    {
        type: "function",
        function: {
          name: "cambiar_estado_proveedor",
          description: "Eliminar o restaurar proveedor.",
          parameters: {
            type: "object",
            properties: {
              nombreProveedor: { type: "string" },
              nuevoEstado: { type: "number" }
            },
            required: ["nombreProveedor", "nuevoEstado"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "registrar_cliente_nuevo",
          description: "Registra un cliente.",
          parameters: {
            type: "object",
            properties: {
              razon_social: { type: "string" }, telefono: { type: "string" },
              tipo_precio: { type: "string", enum: ["precio al publico", "precio con descuento", "precio semi mayoreo", "precio mayoreo"] },
              nombre_contacto: { type: "string" }, email: { type: "string" }, movil: { type: "string" },
              dias_credito: { type: "number" }, limite_credito: { type: "number" }
            },
            required: ["razon_social", "telefono", "tipo_precio"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "modificar_cliente",
          description: "Modifica datos de un cliente.",
          parameters: {
            type: "object",
            properties: {
              nombreBusqueda: { type: "string" }, razon_social: { type: "string" }, telefono: { type: "string" },
              tipo_precio: { type: "string", enum: ["precio al publico", "precio con descuento", "precio semi mayoreo", "precio mayoreo"] },
              email: { type: "string" }, movil: { type: "string" }, limite_credito: { type: "number" }
            },
            required: ["nombreBusqueda"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "cambiar_estado_cliente",
          description: "Cambia estado de un cliente.",
          parameters: {
            type: "object",
            properties: {
              nombreCliente: { type: "string" },
              nuevoEstado: { type: "number" }
            },
            required: ["nombreCliente", "nuevoEstado"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "crear_ticket_soporte",
          description: "Crea ticket de soporte.",
          parameters: {
            type: "object",
            properties: {
              asunto: { type: "string" },
              mensaje: { type: "string" },
              prioridad: { type: "string", enum: ["BAJA", "MEDIA", "ALTA"] }
            },
            required: ["asunto", "mensaje", "prioridad"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consultar_estado_ticket",
          description: "Consulta estado de ticket.",
          parameters: {
            type: "object",
            properties: {
              ticketId: { type: "number" }
            },
            required: ["ticketId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analizar_ventas_periodo",
          description: "Genera reportes de VENTAS.",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["SEMANAL", "MENSUAL", "COMPARATIVA_MES_ANTERIOR", "ANUAL"] }
            },
            required: ["tipo"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analizar_compras_periodo",
          description: "Genera reportes de COMPRAS.",
          parameters: {
            type: "object",
            properties: {
              tipo: { type: "string", enum: ["SEMANAL", "MENSUAL", "COMPARATIVA_MES_ANTERIOR", "ANUAL"] }
            },
            required: ["tipo"]
          }
        }
      }
  ];

  try {
    const toolCheckCompletion = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        tools: tools,
        tool_choice: "auto", 
        messages: [
          {
            role: 'system',
            content: `Eres CROV, mi mano derecha y gerente operativo.
            ACTITUD: Leal, trabajador y respetuoso ("Jefe"). Habla natural.

            REGLAS CRÍTICAS DE NEGOCIO:
            1. **CXC vs CAJA:**
               - **FONDO:** Dinero que se da a un **CAJERO (Empleado)**. Usa 'registrar_fondo_caja'.
               - **PAGO/ABONO:** Dinero que entra de un **CLIENTE (Deuda)**. 
               - **REGLA DE ORO:** Si dicen "Pago de [Nombre]" o "Abono de [Nombre]", **NUNCA** uses 'registrar_fondo_caja'. Usa 'ver_creditos_pendientes' para ver qué debe el cliente.

            2. **CORTES:**
               - 'Pre-corte' o 'Quien falta': Usa 'ver_pendientes_corte'.
               - 'Corte definitivo': **NUNCA preguntes el monto manual**. Si el usuario no dio monto, asume el del sistema (null).
               - **FLUJO:** 1. Identifica usuario (o usa pendientes). 2. Muestra monto calculado. 3. Pregunta confirmación (Sí/No). 4. Si dicen Sí, ejecuta 'realizar_corte_caja'.

            3. **DINERO SIN CANTIDAD:**
               - Si dicen "Registra inversión", "Registra gasto", etc. y **NO DAN CANTIDAD**, **NO LLAMES A LA HERRAMIENTA**. Pregunta primero la cantidad.
               - PROHIBIDO inventar montos.

            4. **REPORTES:** Pregunta detalles antes de guardar.
            5. **HISTORIAL:** Sin fechas muestra 2 meses.
            6. **DEVOLUCIONES DE COMPRA (PROVEEDORES):**
               - SIEMPRE TOTALES. NUNCA parciales.
               - Solo pide el FOLIO.
               - Ejecuta 'registrar_devolucion' con modo='COMPLETA' y productos=[].
            7. **DEVOLUCIONES DE VENTA:** Pueden ser parciales o completas.`
          },
          ...conversationHistory, 
          { role: 'user', content: message },
        ],
      }),
    });

    const toolData = await toolCheckCompletion.json();
    const messageResponse = toolData.choices?.[0]?.message;
    const toolCalls = messageResponse?.tool_calls;
    const contentResponse = messageResponse?.content;

    if (toolCalls && toolCalls.length > 0) {
      const tool = toolCalls[0];
      const fnName = tool.function.name;
      const args = JSON.parse(tool.function.arguments);
      let actionResult: any;

      if (fnName === 'listar_cajeros') {
        const cajeros = await obtenerCajerosDisponiblesIA(sucursalId);
        if (cajeros.length === 0) {
            res.json({ answer: ensureJefe("Jefe, le di una vuelta a la sucursal y no veo cajeros activos con perfil de Caja ahora mismo.") });
            return;
        }
        const listaTexto = cajeros.map((c: any) => `👤 **${c.nombre}** (ID: ${c.id})`).join('\n');
        res.json({ answer: ensureJefe(`Mire jefe, estos son los muchachos que están en caja ahorita. ¿A cuál le asignamos la lana?\n\n${listaTexto}`) });
        return;

      } else if (fnName === 'registrar_venta') {
        actionResult = await procesarVentaIA(sucursalId, args.nombreCliente, args.productos, args.usuarioVendedorId ? Number(args.usuarioVendedorId) : undefined);
      } else if (fnName === 'registrar_compra') {
        actionResult = await procesarCompraIA(sucursalId, args.nombreProveedor, args.productos);
      } else if (fnName === 'ver_pendientes_corte') {
        actionResult = await obtenerCajerosPendientesIA(sucursalId);
      } else if (fnName === 'consultar_pre_corte') {
        if (!args.usuarioObjetivoId || args.usuarioObjetivoId === 'TODOS') {
             actionResult = await obtenerCajerosPendientesIA(sucursalId);
        } else {
             actionResult = await simularCorteDiaIA(sucursalId, args.usuarioObjetivoId);
        }
      } else if (fnName === 'realizar_corte_caja') {
        // 🔥 MEJORA CRÍTICA: RESOLUCIÓN DE NOMBRES PARA CORTE 🔥
        let idObjetivo: number | 'TODOS' = 'TODOS';
        const input = args.usuarioObjetivoId;

        if (input !== 'TODOS') {
            if (!isNaN(Number(input))) {
                idObjetivo = Number(input);
            } else {
                // BUSCAR POR NOMBRE COMPLETO EN MEMORIA (ROBUSTO)
                const termino = String(input).trim().toLowerCase();
                const usuarios = await prisma.usuario.findMany({
                    where: { sucursalId: Number(sucursalId), activo: 1 },
                    select: { id: true, nombre: true, apellidos: true }
                });

                const encontrado = usuarios.find(u => {
                    const nombreCompleto = `${u.nombre} ${u.apellidos || ''}`.toLowerCase();
                    return nombreCompleto.includes(termino);
                });

                if (!encontrado) {
                    res.json({ answer: ensureJefe(`No encontré a nadie con el nombre "${input}" para hacerle el corte.`) });
                    return;
                }
                idObjetivo = encontrado.id;
            }
        }

        actionResult = await realizarCorteDiaIA(
            sucursalId,
            Number(req.body.usuarioSolicitanteId || 1),
            idObjetivo,
            args.montoManual
        );
      } else if (fnName === 'registrar_devolucion') {
        actionResult = await procesarDevolucionIA(sucursalId, args.folio, args.tipo, args.modo, args.productos || []);
      } else if (fnName === 'registrar_producto_nuevo') {
        actionResult = await crearProductoCompletoIA(sucursalId, args);
      } else if (fnName === 'registrar_proveedor_nuevo') {
        actionResult = await crearProveedorIA(sucursalId, args);
      } else if (fnName === 'modificar_proveedor') {
        actionResult = await modificarProveedorIA(sucursalId, args.nombreBusqueda, args);
      } else if (fnName === 'modificar_producto') {
        actionResult = await modificarProductoIA(sucursalId, args.nombreBusqueda, args);
      } else if (fnName === 'asignar_insumos_producto') {
        actionResult = await agregarInsumosIA(sucursalId, args.nombreProductoPadre, args.insumos);
      } else if (fnName === 'cambiar_estado_producto') {
        actionResult = await cambiarEstadoProductoIA(sucursalId, args.identificador, args.nuevoEstado);
      } else if (fnName === 'cambiar_estado_proveedor') {
        actionResult = await cambiarEstadoProveedorIA(sucursalId, args.nombreProveedor, args.nuevoEstado);
      } else if (fnName === 'registrar_cliente_nuevo') {
        actionResult = await crearClienteIA(sucursalId, args);
        if (!actionResult.error) actionResult.mensaje += "\n\n💡 Oiga jefe, nada más le comento que para ponerle todos los datos fiscales, es mejor usar el panel administrativo.";
      } else if (fnName === 'modificar_cliente') {
        actionResult = await actualizarClienteIA(sucursalId, args.nombreBusqueda, args);
        if (!actionResult.error) actionResult.mensaje += "\n\n💡 Un detalle jefe: los datos de facturación se editan mejor desde el panel.";
      } else if (fnName === 'cambiar_estado_cliente') {
        actionResult = await cambiarEstadoClienteIA(sucursalId, args.nombreCliente, args.nuevoEstado);
      } else if (fnName === 'crear_ticket_soporte') {
        actionResult = await crearTicketIA(Number(req.body.usuarioSolicitanteId || 1), args.asunto, args.mensaje, args.prioridad || 'MEDIA');
      } else if (fnName === 'consultar_estado_ticket') {
        actionResult = await consultarTicketIA(Number(args.ticketId));
      } else if (fnName === 'analizar_ventas_periodo') {
        actionResult = await generarReporteVentasIA(sucursalId, args.tipo); 
      } else if (fnName === 'analizar_compras_periodo') {
        actionResult = await generarReporteComprasIA(sucursalId, args.tipo);
      } else if (fnName === 'obtener_top_clientes') {
        actionResult = await obtenerMejoresClientesIA(sucursalId);
      } else if (fnName === 'obtener_top_proveedores') {
        actionResult = await obtenerMejoresProveedoresIA(sucursalId);
      } else if (fnName === 'listar_proveedores') {
        actionResult = await obtenerListaProveedoresGeneralIA(sucursalId);
      } else if (fnName === 'listar_clientes') {
        actionResult = await obtenerListaClientesGeneralIA(sucursalId);
      } else if (fnName === 'obtener_top_cajeros') {
        actionResult = await obtenerMejoresCajerosIA(sucursalId);
      } else if (fnName === 'registrar_gasto') {
        const usuarioIdentificador = args.usuarioObjetivo || Number(req.body.usuarioSolicitanteId || 1);
        actionResult = await registrarGastoIA(sucursalId, usuarioIdentificador, args.monto, args.descripcion);
      } else if (fnName === 'registrar_retiro') {
        const usuarioIdentificador = args.usuarioObjetivo || Number(req.body.usuarioSolicitanteId || 1);
        actionResult = await registrarRetiroIA(sucursalId, usuarioIdentificador, args.monto, args.descripcion);
      } else if (fnName === 'registrar_fondo_caja') {
        const idAdmin = Number(req.body.usuarioSolicitanteId || 1);
        actionResult = await registrarFondoCajaIA(sucursalId, args.monto, idAdmin, args.cajeroObjetivo);
      } else if (fnName === 'registrar_inversion') {
        const usuarioInversionista = Number(req.body.usuarioSolicitanteId || 1);
        actionResult = await registrarInversionIA(sucursalId, args.monto, args.descripcion, usuarioInversionista);
      } else if (fnName === 'ver_historial_cortes') {
        actionResult = await obtenerHistorialCortesIA(sucursalId, args.fechaInicio, args.fechaFin);
        if (actionResult.success && Array.isArray(actionResult.datos) && actionResult.datos.length > 0) {
            let tabla = `**${actionResult.mensaje}**\n\n`;
            tabla += `| Fecha | Entrega | Recibe | Monto | Estado |\n`;
            tabla += `| :--- | :--- | :--- | :---: | :---: |\n`;
            actionResult.datos.forEach((c: any) => {
                const f = new Date(c.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const diff = Number(c.monto_reportado) - Number(c.monto_esperado);
                let estado = "✅ Cuadrado";
                if (diff > 0.5) estado = `⚠️ Sobrante (+$${diff.toFixed(2)})`;
                else if (diff < -0.5) estado = `🔻 Faltante (-$${Math.abs(diff).toFixed(2)})`;
                const entrega = c.usuarioEntrega?.nombre || 'Sistema';
                const recibe = c.usuarioRecibe?.nombre || 'Sistema';
                tabla += `| ${f} | ${entrega} | ${recibe} | $${Number(c.monto_reportado).toFixed(2)} | ${estado} |\n`;
            });
            actionResult.mensaje = tabla + "\nAquí tiene el detalle completo de los cortes,";
        } else if (actionResult.success) {
             actionResult.mensaje = "Jefe, revisé los registros y no encontré cortes en esas fechas.";
        }
      } else if (fnName === 'ver_creditos_pendientes') {
        actionResult = await obtenerCreditosPendientesIA(sucursalId, args.nombreCliente);
        if (actionResult.success && Array.isArray(actionResult.datos) && actionResult.datos.length > 0) {
            let tabla = `**${actionResult.mensaje}**\n\n`;
            tabla += `| Folio | Cliente | Total | Resta | Fecha |\n`;
            tabla += `| :--- | :--- | :---: | :---: | :--- |\n`;
            actionResult.datos.forEach((c: any) => {
                const f = new Date(c.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const resta = Number(c.saldo_pendiente || 0);
                const total = Number(c.total || 0);
                tabla += `| ${c.numdoc} | ${c.cliente?.razon_social || '-'} | $${total.toFixed(2)} | $${resta.toFixed(2)} | ${f} |\n`;
            });
            actionResult.mensaje = tabla + "\nAquí está el listado detallado de lo que nos deben,";
        }
      } else if (fnName === 'ver_clientes_deudores') {
        actionResult = await obtenerSaldosPorClienteIA(sucursalId);
        if (actionResult.success && Array.isArray(actionResult.datos) && actionResult.datos.length > 0) {
            let tabla = `**${actionResult.mensaje}**\n\n`;
            tabla += `| Cliente | Teléfono | Notas | Deuda Total |\n`;
            tabla += `| :--- | :--- | :---: | :---: |\n`;
            actionResult.datos.forEach((c: any) => {
                tabla += `| ${c.nombre} | ${c.telefono} | ${c.conteo} | $${Number(c.total_deuda).toFixed(2)} |\n`;
            });
            actionResult.mensaje = tabla + "\nEstos son los clientes que traen saldo pendiente,";
        }
      } else if (fnName === 'registrar_abono') {
        const usuarioCajeroId = Number(req.body.usuarioSolicitanteId || 1);
        actionResult = await registrarAbonoIA(
            sucursalId, usuarioCajeroId, args.ventaIdentificador, args.monto, args.metodoPago, args.comentarios
        );
      } else if (fnName === 'ver_historial_abonos') {
        actionResult = await consultarHistorialAbonosIA(sucursalId, args.ventaIdentificador);
        if (actionResult.success && Array.isArray(actionResult.datos) && actionResult.datos.length > 0) {
            let tabla = `**${actionResult.mensaje}**\n\n`;
            tabla += `| Fecha | Monto | Método | Cobró |\n`;
            tabla += `| :--- | :---: | :---: | :--- |\n`;
            actionResult.datos.forEach((a: any) => {
                const f = new Date(a.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour:'2-digit', minute:'2-digit' });
                const monto = Number(a.saldo_abonado || 0);
                const cajero = a.usuario?.nombre || 'Sistema'; 
                tabla += `| ${f} | $${monto.toFixed(2)} | ${a.metodo_pago} | ${cajero} |\n`;
            });
            actionResult.mensaje = tabla + "\nAquí está el historial de pagos de esa venta,";
        }
      } 

      let finalMsg = actionResult.error 
        ? `Híjole jefe, hubo un inconveniente: ${actionResult.error}`
        : `${actionResult.mensaje}`;
      
      if (finalMsg.trim().endsWith('|')) {
          finalMsg += "\n\nAquí tiene los datos";
      }
      
      res.json({ answer: ensureJefe(finalMsg) });
      return;
    }

    const textoLimpio = contentResponse?.trim() || "";
    if (textoLimpio.length > 0 && !textoLimpio.includes("SQL_MODE") && textoLimpio !== '""' && textoLimpio !== "''") {
        res.json({ answer: ensureJefe(textoLimpio) });
        return;
    }

    const userTimezone = parseTimezoneOffset(timezone, typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : undefined, timezoneOffset ?? req.headers['x-timezone-offset']);
    const timezoneForSql = userTimezone === MAZATLAN_TIMEZONE ? MAZATLAN_UTC_OFFSET : userTimezone;

    const schemaPrompt = buildSchemaPrompt(message);
    const prompt = `${schemaPrompt ? schemaPrompt + '\n' : ''}Genera únicamente una consulta SQL tipo SELECT en formato JSON {"sql": "..."} sin comentarios.
    REGLA CRÍTICA 1: La tabla de ventas se llama 'Venta' (en singular). NO uses 'Ventas'.
    REGLA CRÍTICA 2: Para el dinero vendido usa la columna 'total'. Si piden efectivo, usa 'efectivo'. NO inventes columnas como 'monto'.
    
    Para fechas, usa filtros simples (DATE(col) = 'YYYY-MM-DD'). 
    Siempre agrega en el WHERE la condición sucursalId = ${sucursalId}.
    Pregunta:"${message}"`;
    
    const completion = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_schema', json_schema: { name: 'sql_response', schema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'], additionalProperties: false } } },
        messages: [{ role: 'system', content: 'Eres experto en SQL MySQL.' }, ...conversationHistory, { role: 'user', content: prompt }]
      }),
    });
    
    const data = await completion.json();
    let sql = '';
    try { const parsed = JSON.parse(data.choices?.[0]?.message?.content?.trim()); sql = parsed.sql.trim(); } catch { sql = ''; }

    if (!sql) { 
        res.json({ answer: 'No logré entender esa consulta, jefe. ¿Me la podría plantear diferente?' }); 
        return; 
    }

    let resultado: any;
    try {
      resultado = await prisma.$queryRawUnsafe(sql);
    } catch (err) {
      console.error('Error executing generated SQL:', err);
      res.status(400).json({ answer: 'Disculpe jefe, algo falló en la base de datos al intentar consultar eso.', detail: err instanceof Error ? err.message : String(err) });
      return;
    }

    const serialized = serializeBigInt(resultado);
    const descripcionPrompt = `Responde en español y de forma cordial. Eres un gerente virtual empático y servicial.
    Considera el historial cuando sea relevante. 
    \nPregunta: ${message}\nResultado: ${JSON.stringify(serialized)}`;

    const descripcion = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `Eres CROV, el gerente operativo de confianza. Hablas con el dueño ("jefe").
            PERSONALIDAD: Amable, profesional pero cálido.
            REGLAS: NO uses palabras técnicas (BD, JSON). Resume si hay muchos datos.`,
          },
          ...conversationHistory,
          { role: 'assistant', content: `Consulta SQL ejecutada: ${sql}` },
          { role: 'user', content: descripcionPrompt },
        ],
      }),
    });
    const descripcionData = await descripcion.json();
    const answer = ensureJefe(descripcionData.choices?.[0]?.message?.content?.trim()) || 'Listo jefe, aquí tiene la información.';

    res.json({ answer });
  } catch (err: any) {
    console.error("ERROR CRÍTICO GERENTE CONTROLLER:", err);
    res.json({ answer: 'Hubo un error interno en el servidor, jefe. Déjeme revisarlo.' });
  }
};

function ensureJefe(texto: string) {
  let t = texto.replace(/\s*jefe\s*$/i, '').trim();
  t = t.replace(/[.,;:!?]+$/g, '').trim();
  return t + ' jefe';
}

// =================================================================
// ENDPOINTS PARA USO DIRECTO
// =================================================================

export const ejecutarVentaIA = async (req: Request, res: Response) => {
  const { sucursalId, cliente, productos, usuarioVendedorId } = req.body;
  if (!sucursalId || !cliente || !productos || !Array.isArray(productos)) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." });
    return;
  }
  const resultado = await procesarVentaIA(Number(sucursalId), cliente, productos, usuarioVendedorId ? Number(usuarioVendedorId) : undefined);
  if (resultado.error) {
    res.status(400).json(serializeBigInt({ success: false, mensaje: resultado.error }));
  } else {
    res.json(serializeBigInt(resultado));
  }
};

export const ejecutarCompraIA = async (req: Request, res: Response) => {
  const { sucursalId, proveedor, productos } = req.body;
  if (!sucursalId || !proveedor || !productos || !Array.isArray(productos)) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." });
    return;
  }
  const resultado = await procesarCompraIA(Number(sucursalId), proveedor, productos);
  if (resultado.error) {
    res.status(400).json(serializeBigInt({ success: false, mensaje: resultado.error }));
  } else {
    res.json(serializeBigInt(resultado));
  }
};

export const consultarUsuariosCorte = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) { res.status(400).json({ error: 'sucursalId requerido' }); return; }
  try {
    const usuarios = await obtenerUsuariosPendientesDeCorte(sucursalId);
    res.json(serializeBigInt(usuarios));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios pendientes.' });
  }
};

export const ejecutarCorteIA = async (req: Request, res: Response) => {
  const { sucursalId, usuarioSolicitanteId, usuarioObjetivoId, montoManual } = req.body;
  if (!sucursalId || !usuarioSolicitanteId || !usuarioObjetivoId) {
    res.status(400).json({ success: false, mensaje: "Faltan datos." });
    return;
  }
  const monto = (montoManual !== undefined && montoManual !== null) ? Number(montoManual) : undefined;
  const resultado = await realizarCorteDiaIA(Number(sucursalId), Number(usuarioSolicitanteId), usuarioObjetivoId === 'TODOS' ? 'TODOS' : Number(usuarioObjetivoId), monto);
  if (resultado.error) {
    res.status(400).json(serializeBigInt({ success: false, mensaje: resultado.error }));
  } else {
    res.json(serializeBigInt(resultado));
  }
};

export const ejecutarDevolucionIA = async (req: Request, res: Response) => {
    const { sucursalId, folio, tipo, modo, productos } = req.body;
    if (!sucursalId || !folio || !tipo || !modo) {
        res.status(400).json({ success: false, mensaje: "Datos incompletos." });
        return;
    }
    const resultado = await procesarDevolucionIA(Number(sucursalId), folio, tipo, modo, productos || []);
    if (resultado.error) {
        res.status(400).json(serializeBigInt({ success: false, mensaje: resultado.error }));
    } else {
        res.json(serializeBigInt(resultado));
    }
};

export const ejecutarGastoIA = async (req: Request, res: Response) => {
  const { sucursalId, usuarioId, usuarioObjetivo, monto, descripcion } = req.body;
  
  if (!sucursalId || !monto || !descripcion) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." }); return;
  }
  const identificador = usuarioObjetivo || usuarioId;
  
  if(!identificador) {
     res.status(400).json({ success: false, mensaje: "Se requiere usuarioId o usuarioObjetivo." }); return;
  }

  const resultado = await registrarGastoIA(Number(sucursalId), identificador,
   Number(monto), descripcion);
  resultado.error ? res.status(400).json(resultado) : res.json(resultado);
};

export const ejecutarRetiroIA = async (req: Request, res: Response) => {
  const { sucursalId, usuarioId, usuarioObjetivo, monto, descripcion } = req.body;
  
  if (!sucursalId || !monto || !descripcion) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." }); return;
  }
  const identificador = usuarioObjetivo || usuarioId;
  
  if(!identificador) {
     res.status(400).json({ success: false, mensaje: "Se requiere usuarioId o usuarioObjetivo." }); return;
  }

  const resultado = await registrarRetiroIA(Number(sucursalId), identificador,
   Number(monto), descripcion);
  resultado.error ? res.status(400).json(resultado) : res.json(resultado);
};

export const ejecutarFondoCajaIA = async (req: Request, res: Response) => {
  const { sucursalId, monto, idAdminEntrega, idCajeroRecibe, cajeroObjetivo } = req.body;
  
  if (!sucursalId || !monto || !idAdminEntrega) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." }); return;
  }
  const cajero = cajeroObjetivo || idCajeroRecibe;
  
  if(!cajero) {
     res.status(400).json({ success: false, mensaje: "Se requiere especificar el cajero (idCajeroRecibe o cajeroObjetivo)." }); return;
  }

  const resultado = await registrarFondoCajaIA(Number(sucursalId), Number(monto),
   Number(idAdminEntrega), cajero);
  resultado.error ? res.status(400).json(resultado) : res.json(resultado);
};

export const ejecutarInversionIA = async (req: Request, res: Response) => {
  const { sucursalId, monto, descripcion, usuarioInversionistaId } = req.body;
  if (!sucursalId || !monto || !usuarioInversionistaId) {
    res.status(400).json({ success: false, mensaje: "Datos incompletos." }); return;
  }
  const resultado = await registrarInversionIA(Number(sucursalId), Number(monto), descripcion, 
  Number(usuarioInversionistaId));
  resultado.error ? res.status(400).json(resultado) : res.json(resultado);
};
export const obtenerComparativaDiaria = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const fechaInicioActual = String(req.query.fechaInicioActual);
  const fechaFinActual = String(req.query.fechaFinActual);
  const fechaInicioAnterior = String(req.query.fechaInicioAnterior);
  const fechaFinAnterior = String(req.query.fechaFinAnterior);

  if (!sucursalId || !fechaInicioActual.includes('T')) {
    res.status(400).json({ error: 'Parámetros incorrectos' });
    return;
  }

  try {
    // 1. Agrupar por FECHA COMPLETA (Año-Mes-Día) para no mezclar meses
    const queryVentas = async (inicio: string, fin: string) => {
      // Usamos DATE_FORMAT para agrupar por día exacto
      return await prisma.$queryRawUnsafe(`
        SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fechaFull, SUM(total) as total 
        FROM Venta 
        WHERE sucursalId = ${sucursalId} 
        AND activo = 1 
        AND estado != 'COTIZACION'
        AND fecha >= '${inicio}' AND fecha <= '${fin}'
        GROUP BY DATE_FORMAT(fecha, '%Y-%m-%d')
        ORDER BY fechaFull ASC
      `);
    };

    const [actuales, anteriores] = await Promise.all([
      queryVentas(fechaInicioActual, fechaFinActual),
      queryVentas(fechaInicioAnterior, fechaFinAnterior)
    ]);

    // 2. Construir la línea de tiempo día por día
    const start = new Date(fechaInicioActual);
    const end = new Date(fechaFinActual);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const data = [];
    
    for (let i = 0; i < diffDays; i++) {
       const currentDayDate = new Date(start);
        currentDayDate.setDate(start.getDate() + i);
        const currentIsoDate = currentDayDate.toISOString().split('T')[0];

        const ventaActual = (actuales as any[]).find((x: any) => x.fechaFull === currentIsoDate)?.total || 0;
        const ventaAnterior = (anteriores as any[])[i]?.total || 0;

        const day = currentDayDate.getUTCDate();
        const month = currentDayDate.toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', ''); // Quitamos punto de abreviatura
        const yearShort = currentDayDate.getUTCFullYear().toString().slice(-2); // Últimos 2 dígitos
        
        const labelFecha = `${day} ${month}/${yearShort}`; // Resultado: "10 dic/25"

        data.push({
            day: i + 1,
            label: labelFecha, 
            current: Number(ventaActual),
            previous: Number(ventaAnterior)
        });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
};
//metas
export const getGerenteDashboard = async (req: Request, res: Response) => {
  try {
    // Aseguramos la obtención del ID de sucursal
    const sucursalId = validarSucursalId(req.query.sucursalId || req.params.sucursalId || (req as any).user?.sucursalId);

    if (!sucursalId) {
      return res.status(400).json({ success: false, message: 'Falta el ID de la sucursal' });
    }

    const dashboardData = await obtenerDashboardGerenteMetas(sucursalId);

    return res.json(dashboardData);

  } catch (error) {
    console.error("Error en getGerenteDashboard:", error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al cargar el panel del gerente'
    });
  }
};

export const getProductosBajaRotacion = async (req: Request, res: Response) => {
  try {
    const sucursalId = validarSucursalId(req.query.sucursalId || req.params.sucursalId || (req as any).user?.sucursalId);

    if (!sucursalId) {
      return res.status(400).json({ success: false, message: 'El sucursalId es requerido' });
    }

    const result = await obtenerProductosBajaRotacionService(sucursalId);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Error en getProductosBajaRotacion:", error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
export const getImpactoDevoluciones = async (req: Request, res: Response) => {
  try {
    const sucursalId = validarSucursalId(req.query.sucursalId || req.params.sucursalId || (req as any).user?.sucursalId);

    if (!sucursalId) {
      return res.status(400).json({ success: false, message: 'El sucursalId es requerido' });
    }

    const result = await obtenerImpactoDevolucionesService(sucursalId);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Error en getImpactoDevoluciones:", error);
    return res.status(500).json({ success: false, message: 'Error interno al calcular el impacto de devoluciones' });
  }
};