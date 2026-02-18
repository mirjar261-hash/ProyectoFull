import request from 'supertest';
import express from 'express';

const mockFindMany = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      actividad: { findMany: mockFindMany }
    }))
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, sucursalId: 1 };
    next();
  }
}));

import actividadRoutes from '../src/routes/actividad.routes';

describe('GET /actividad/usuario/proximas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns activities for today and next week', async () => {
    const hoy = [{ id: 1 }];
    const semana = [{ id: 2 }];
    mockFindMany.mockResolvedValueOnce(hoy).mockResolvedValueOnce(semana);

    const app = express();
    app.use('/actividad', actividadRoutes);

    const res = await request(app).get('/actividad/usuario/proximas');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hoy, semanaProxima: semana });
    expect(mockFindMany).toHaveBeenCalledTimes(2);
    expect(mockFindMany.mock.calls[0][0].where.usuario_id).toBe(1);
    expect(mockFindMany.mock.calls[1][0].where.usuario_id).toBe(1);
  });
});
