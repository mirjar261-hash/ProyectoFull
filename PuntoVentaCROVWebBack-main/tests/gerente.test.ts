import request from 'supertest';
import express from 'express';

const mockVentaFindMany = jest.fn();
const mockVentaGroupBy = jest.fn();
const mockCompraFindMany = jest.fn();
const mockGastoFindMany = jest.fn();
const mockDetalleVentaGroupBy = jest.fn();
const mockProductoFindMany = jest.fn();
const mockClienteFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    venta: { findMany: mockVentaFindMany, groupBy: mockVentaGroupBy },
    compra: { findMany: mockCompraFindMany },
    gasto: { findMany: mockGastoFindMany },
    detalle_venta: { groupBy: mockDetalleVentaGroupBy },
    producto: { findMany: mockProductoFindMany },
    cliente: { findMany: mockClienteFindMany }
  }))
}));

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next()
}));

import gerenteRoutes from '../src/routes/gerente.routes';

describe('GET /gerente/prediccionVentas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns prediction based on last 30 days', async () => {
    mockVentaFindMany.mockResolvedValue([
      { total: 100 },
      { total: 200 }
    ]);

    const app = express();
    app.use('/gerente', gerenteRoutes);

    const res = await request(app).get('/gerente/prediccionVentas?sucursalId=1&dias=5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalUltimos30Dias: 300,
      promedioDiario: 10,
      prediccion: 50
    });
  });
});

describe('GET /gerente/prediccionCompras', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns prediction based on last 30 days', async () => {
    mockCompraFindMany.mockResolvedValue([
      { total: 150 },
      { total: 150 }
    ]);

    const app = express();
    app.use('/gerente', gerenteRoutes);

    const res = await request(app).get('/gerente/prediccionCompras?sucursalId=1&dias=5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalUltimos30Dias: 300,
      promedioDiario: 10,
      prediccion: 50
    });
  });
});

describe('GET /gerente/prediccionGastos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns prediction based on last 30 days', async () => {
    mockGastoFindMany.mockResolvedValue([
      { monto: 50 },
      { monto: 100 }
    ]);

    const app = express();
    app.use('/gerente', gerenteRoutes);

    const res = await request(app).get('/gerente/prediccionGastos?sucursalId=1&dias=5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalUltimos30Dias: 150,
      promedioDiario: 5,
      prediccion: 25
    });
  });
});

describe('GET /gerente/topProductosUltimoMes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns top products from last month', async () => {
    mockDetalleVentaGroupBy.mockResolvedValue([
      { id_producto: 1, _sum: { cantidad: 10 } },
      { id_producto: 2, _sum: { cantidad: 5 } }
    ]);
    mockProductoFindMany.mockResolvedValue([
      { id: 1, nombre: 'Prod1' },
      { id: 2, nombre: 'Prod2' }
    ]);

    const app = express();
    app.use('/gerente', gerenteRoutes);

    const res = await request(app).get('/gerente/topProductosUltimoMes?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { productoId: 1, nombre: 'Prod1', cantidadVendida: 10 },
      { productoId: 2, nombre: 'Prod2', cantidadVendida: 5 }
    ]);
  });
});

describe('GET /gerente/topClientesUltimoMes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns top clients from last month', async () => {
    mockVentaGroupBy.mockResolvedValue([
      { id_cliente: 1, _sum: { total: 200 } },
      { id_cliente: 2, _sum: { total: 150 } }
    ]);
    mockClienteFindMany.mockResolvedValue([
      { id: 1, razon_social: 'Cliente1' },
      { id: 2, razon_social: 'Cliente2' }
    ]);

    const app = express();
    app.use('/gerente', gerenteRoutes);

    const res = await request(app).get('/gerente/topClientesUltimoMes?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { clienteId: 1, nombre: 'Cliente1', totalVendido: 200 },
      { clienteId: 2, nombre: 'Cliente2', totalVendido: 150 }
    ]);
  });
});

afterAll(() => {
  jest.resetModules();
});
