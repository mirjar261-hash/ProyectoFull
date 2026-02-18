import request from 'supertest';
import express from 'express';

const mockFindFirst = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      compra: { findFirst: mockFindFirst }
    }))
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next()
}));

import compraRoutes from '../src/routes/compra.routes';

describe('GET /compra/ultimoFolio', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns last compra id as consecutivo', async () => {
    mockFindFirst.mockResolvedValue({ id: 5 });

    const app = express();
    app.use('/compra', compraRoutes);

    const res = await request(app).get('/compra/ultimoFolio?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ consecutivo: 5 });
  });
});
