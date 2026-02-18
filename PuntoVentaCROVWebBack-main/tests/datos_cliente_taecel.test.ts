import request from 'supertest';
import express from 'express';

const mockFindMany = jest.fn();
const mockCreate = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      datos_cliente_taecel: { findMany: mockFindMany, create: mockCreate },
    })),
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next(),
}));

import datosTaecelRoutes from '../src/routes/datos_cliente_taecel.routes';

(global as any).fetch = jest.fn();

describe('GET /datos-cliente-taecel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns records filtered by sucursal', async () => {
    const datos = [{ id: 1 }];
    mockFindMany.mockResolvedValue(datos);

    const app = express();
    app.use('/datos-cliente-taecel', datosTaecelRoutes);

    const res = await request(app).get('/datos-cliente-taecel?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(datos);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { sucursal_id: 1, activo: 1 },
      orderBy: { id: 'asc' },
    });
  });
});

describe('POST /datos-cliente-taecel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a new record', async () => {
    const payload = { nombres: 'a', apellidos: 'b', telefono: 'c', correo: 'd' };
    const apiData = {
      cuentaID: 1,
      usuarioID: 2,
      perfilID: 3,
      contactoID: 4,
      status: 'ok',
      referenciaPagos: 'p',
      referenciaServicios: 's',
      numeroCuenta: 'n',
      usuario: 'u',
      ws: { key: 'k', nip: 'n' },
      nombreCompleto: 'name',
      UID: 'uid',
      password: 'pass',
      phone: 'c',
      email: 'd',
      envioEmail: '1',
    } as any;

    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: apiData }),
    });

    mockCreate.mockResolvedValue({});

    const app = express();
    app.use(express.json());
    app.use('/datos-cliente-taecel', datosTaecelRoutes);

    const res = await request(app).post('/datos-cliente-taecel').send(payload);

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ cuentaID: '1', usuarioID: '2' }),
    });
  });
});
