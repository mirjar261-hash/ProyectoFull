import request from 'supertest';
import express from 'express';

const mockFindFirst = jest.fn();
const mockGastoFindMany = jest.fn();
const mockRetiroFindMany = jest.fn();
const mockInicioFindMany = jest.fn();
const mockInversionFindMany = jest.fn();
const mockVentaFindMany = jest.fn();
const mockCompraFindMany = jest.fn();
const mockDetalleVentaFindMany = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      corte_dia: { findFirst: mockFindFirst },
      gasto: { findMany: mockGastoFindMany },
      retiro: { findMany: mockRetiroFindMany },
      inicio: { findMany: mockInicioFindMany },
      inversion: { findMany: mockInversionFindMany },
      venta: { findMany: mockVentaFindMany },
      compra: { findMany: mockCompraFindMany },
      detalle_venta: { findMany: mockDetalleVentaFindMany },
    }))
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next()
}));

import corteDiaRoutes from '../src/routes/corte_dia.routes';

describe('GET /corte-dia/ultimo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns last corte date', async () => {
    const fecha = new Date('2024-05-01T00:00:00.000Z');
    mockFindFirst.mockResolvedValue({ fecha });

    const app = express();
    app.use('/corte-dia', corteDiaRoutes);

    const res = await request(app).get('/corte-dia/ultimo?usuarioId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fecha: fecha.toISOString() });
  });

  it('returns default date when no corte found', async () => {
    mockFindFirst.mockResolvedValue(null);

    const app = express();
    app.use('/corte-dia', corteDiaRoutes);

    const res = await request(app).get('/corte-dia/ultimo?usuarioId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fecha: new Date('2000-01-01T00:00:00.000Z').toISOString() });
  });
});

describe('GET /corte-dia/datos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns aggregated data for corte', async () => {
    const fecha = new Date('2024-05-01T00:00:00.000Z');
    mockFindFirst.mockResolvedValue({ fecha });

    mockGastoFindMany.mockResolvedValue([{ monto: 10, descripcion: 'g', fecha }]);
    mockRetiroFindMany.mockResolvedValue([{ monto: 5, descripcion: 'r', fecha }]);
    mockInicioFindMany.mockResolvedValue([{ monto: 20, comentarios: 'f', fecha }]);
    mockInversionFindMany.mockResolvedValue([{ monto: 30, descripcion: 'i', fecha }]);
    mockVentaFindMany
      .mockResolvedValueOnce([{ efectivo: 40, observaciones: 'v', fecha }])
      .mockResolvedValueOnce([{ total: 7, observaciones: 'dv', fecha_devolucion: fecha }]);
    mockCompraFindMany
      .mockResolvedValueOnce([{ total: 50, observaciones: 'c', fecha }])
      .mockResolvedValueOnce([{ total: 8, observaciones: 'dc', fecha_devolucion: fecha }]);
    mockDetalleVentaFindMany.mockResolvedValue([{ total: 3, fecha_devolucion: fecha }]);

    const app = express();
    app.use('/corte-dia', corteDiaRoutes);

    const res = await request(app).get('/corte-dia/datos?sucursalId=1&usuarioId=1');

    expect(res.status).toBe(200);
    expect(res.body.totales).toEqual([
      { tipo: 'Venta', monto: 40 },
      { tipo: 'Gasto', monto: 10 },
      { tipo: 'Retiro', monto: 5 },
      { tipo: 'Fondo de caja', monto: 20 },
      { tipo: 'Inversión', monto: 30 },
      { tipo: 'Compra', monto: 50 },
      { tipo: 'Devolución de compra', monto: 8 },
      { tipo: 'Devolución de venta', monto: 7 },
      { tipo: 'Devolución de venta por producto (Informativo)', monto: 3 },
    ]);
    expect(res.body.detalles.length).toBe(9);
  });
});

