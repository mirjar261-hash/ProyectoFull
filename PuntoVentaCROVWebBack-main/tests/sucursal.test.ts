import request from 'supertest';
import express from 'express';

const mockSucursalUpdate = jest.fn();
const mockTaecelUpdateMany = jest.fn();
const mockSucursalFindUnique = jest.fn();
const mockTaecelFindFirst = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      sucursal: { update: mockSucursalUpdate, findUnique: mockSucursalFindUnique },
      datos_cliente_taecel: { updateMany: mockTaecelUpdateMany, findFirst: mockTaecelFindFirst },
    })),
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next(),
}));

import sucursalRoutes from '../src/routes/sucursal.routes';

describe('PUT /sucursales/:id/taecel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('actualiza comisión y datos taecel', async () => {
    const sucursalResp = { id: 1, comision_por_recarga: 5 };
    mockSucursalUpdate.mockResolvedValue(sucursalResp);
    mockTaecelUpdateMany.mockResolvedValue({ count: 1 });

    const app = express();
    app.use(express.json());
    app.use('/sucursales', sucursalRoutes);

    const res = await request(app).put('/sucursales/1/taecel').send({
      comision_por_recarga: 5,
      keyTaecel: 'k',
      nipTaecel: 'n',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sucursalResp);
    expect(mockSucursalUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { comision_por_recarga: 5 },
    });
    expect(mockTaecelUpdateMany).toHaveBeenCalledWith({
      where: { sucursal_id: 1, activo: 1 },
      data: { keyTaecel: 'k', nipTaecel: 'n' },
    });
  });
});

describe('GET /sucursales/:id/taecel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retorna comisión y credenciales taecel', async () => {
    mockSucursalFindUnique.mockResolvedValue({ comision_por_recarga: 5 });
    mockTaecelFindFirst.mockResolvedValue({ keyTaecel: 'k', nipTaecel: 'n' });

    const app = express();
    app.use('/sucursales', sucursalRoutes);

    const res = await request(app).get('/sucursales/1/taecel');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      comision_por_recarga: 5,
      keyTaecel: 'k',
      nipTaecel: 'n',
    });
    expect(mockSucursalFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { comision_por_recarga: true },
    });
    expect(mockTaecelFindFirst).toHaveBeenCalledWith({
      where: { sucursal_id: 1, activo: 1 },
      select: { keyTaecel: true, nipTaecel: true },
    });
  });
});

