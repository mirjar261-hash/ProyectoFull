import request from 'supertest';
import express from 'express';

const mockProductoFindMany = jest.fn();
const mockProductoCount = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      producto: { findMany: mockProductoFindMany, count: mockProductoCount }
    }))
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next(),
}));

import productoRoutes from '../src/routes/producto.routes';

describe('GET /producto/productosPaginacion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes insumos information', async () => {
    mockProductoFindMany.mockResolvedValue([
      {
        id: 1n,
        codigo: 'P001',
        cod_barras: '123',
        nombre: 'Prod1',
        costo: 10,
        servicio: 0,
        precio1: 12,
        precio2: 0,
        precio3: 0,
        precio4: 0,
        stock_min: 1,
        cantidad_existencia: 10,
        clase: { nombre: 'Clase' },
        insumos: [
          {
            cantidad: 2,
            productoInsumo: {
              id: 2n,
              nombre: 'Insumo1',
              costo: 1,
              precio1: 2,
            },
          },
        ],
      },
    ]);
    mockProductoCount.mockResolvedValue(1);

    const app = express();
    app.use(express.json());
    app.use('/producto', productoRoutes);

    const res = await request(app).get('/producto/productosPaginacion?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      productos: [
        {
          id: '1',
          codigo: 'P001',
          cod_barras: '123',
          nombre: 'Prod1',
          costo: 10,
          servicio: 0,
          precio1: 12,
          precio2: 0,
          precio3: 0,
          precio4: 0,
          stock_min: 1,
          cantidad_existencia: 10,
          clase: { nombre: 'Clase' },
          insumos: [
            { id: '2', nombre: 'Insumo1', costo: 1, precio1: 2, cantidad: 2 },
          ],
        },
      ],
      total: 1,
    });
  });
});

