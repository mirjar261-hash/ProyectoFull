import request from 'supertest';
import express from 'express';

const mockSucursalFindUnique = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      sucursal: { findUnique: mockSucursalFindUnique },
    })),
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next(),
}));

import recargaRoutes from '../src/routes/recarga.routes';

describe('GET /recarga/comision/:sucursalId', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retorna la comisión por recarga de la sucursal', async () => {
    mockSucursalFindUnique.mockResolvedValue({ comision_por_recarga: 5 });

    const app = express();
    app.use('/recarga', recargaRoutes);

    const res = await request(app).get('/recarga/comision/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ comision_por_recarga: 5 });
    expect(mockSucursalFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { comision_por_recarga: true },
    });
  });
});
