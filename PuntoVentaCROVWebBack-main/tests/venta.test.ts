import request from 'supertest';
import express from 'express';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockProductoFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockVentaUpdate = jest.fn();
const mockVentaFindUnique = jest.fn();
const mockSucursalFindUnique = jest.fn();
const mockSendMail = jest.fn().mockResolvedValue(undefined);
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });
const mockDetalleVentaUpdate = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      venta: {
        create: mockCreate,
        findFirst: mockFindFirst,
        update: mockVentaUpdate,
        findUnique: mockVentaFindUnique
      },
      producto: { update: mockUpdate, findUnique: mockProductoFindUnique },
      sucursal: { findUnique: mockSucursalFindUnique },
      detalle_venta: { update: mockDetalleVentaUpdate }
    }))
  };
});

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport }
}));

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next()
}));

import ventaRoutes from '../src/routes/venta.routes';

describe('POST /venta', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSendMail.mockResolvedValue(undefined);
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  it('creates sale and updates products', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    mockProductoFindUnique.mockResolvedValue({
      nombre: 'Prod',
      stock_min: 1,
      cantidad_existencia: 5,
      servicio: 0
    });
    mockUpdate.mockResolvedValue({
      nombre: 'Prod',
      cantidad_existencia: 5,
      stock_min: 1,
    });
    const app = express();
    app.use(express.json());
    app.use('/venta', ventaRoutes);

    const payload = {
      id_usuario: 1,
      numitems: 1,
      subtotal: 10,
      iva: 0,
      total: 10,
      fecha: '2024-01-01T00:00:00.000Z',
      sucursalId: 1,
      detalles: [{ id_producto: 1, cantidad: 2, precio: 5 }]
    } as any;

    const res = await request(app).post('/venta').send(payload);

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { cantidad_existencia: { decrement: 2 } },
      select: { nombre: true, stock_min: true, cantidad_existencia: true }
    });
  });

  it('does not update products when estado is COTIZACION', async () => {
    mockCreate.mockResolvedValue({ id: 3 });
    const app = express();
    app.use(express.json());
    app.use('/venta', ventaRoutes);

    const payload = {
      id_usuario: 1,
      numitems: 1,
      subtotal: 10,
      iva: 0,
      total: 10,
      fecha: '2024-01-01T00:00:00.000Z',
      sucursalId: 1,
      estado: 'COTIZACION',
      detalles: [{ id_producto: 1, cantidad: 2, precio: 5 }]
    } as any;

    const res = await request(app).post('/venta').send(payload);

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sends email when inventory below minimum', async () => {
    mockCreate.mockResolvedValue({ id: 2, sucursalId: 5 });
    mockProductoFindUnique.mockResolvedValue({
      nombre: 'Prod',
      stock_min: 1,
      cantidad_existencia: 2,
      servicio: 0,
    });
    mockUpdate.mockResolvedValue({
      nombre: 'Prod',
      cantidad_existencia: 0,
      stock_min: 1,
    });
    mockSucursalFindUnique.mockResolvedValue({ correo_notificacion: 'a@b.com', nombre_comercial: 'Test' });

    const app = express();
    app.use(express.json());
    app.use('/venta', ventaRoutes);

    const payload = {
      id_usuario: 1,
      numitems: 1,
      subtotal: 10,
      iva: 0,
      total: 10,
      fecha: '2024-01-01T00:00:00.000Z',
      sucursalId: 5,
      detalles: [{ id_producto: 1, cantidad: 2, precio: 5 }]
    } as any;

    await request(app).post('/venta').send(payload);

    expect(mockSendMail).toHaveBeenCalled();
  });
});

describe('GET /venta/ultimoFolio', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns last venta id as consecutivo', async () => {
    mockFindFirst.mockResolvedValue({ id: 8 });

    const app = express();
    app.use('/venta', ventaRoutes);

    const res = await request(app).get('/venta/ultimoFolio?sucursalId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ consecutivo: 8 });
  });
});

describe('PUT /venta/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('updates cotizacion and deducts inventory', async () => {
    mockVentaFindUnique.mockResolvedValue({
      id: 9,
      estado: 'COTIZACION',
      detalles: [{ id_producto: 1, cantidad: 2 }]
    });
    mockVentaUpdate.mockResolvedValue({
      id: 9,
      estado: 'FINAL',
      fecha: new Date(),
      detalles: [{ id: 1, id_producto: 1, cantidad: 2 }]
    });
    mockProductoFindUnique.mockResolvedValue({ costo: 10, servicio: 0 });
    mockUpdate.mockResolvedValue({});
    const app = express();
    app.use(express.json());
    app.use('/venta', ventaRoutes);

    const res = await request(app).put('/venta/9').send({ estado: 'FINAL' });

    expect(res.status).toBe(200);
    expect(mockVentaUpdate).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { cantidad_existencia: { decrement: 2 } },
    });
  });

  it('updates detalles when array provided', async () => {
    mockVentaFindUnique.mockResolvedValue({ id: 10, estado: 'FINAL', detalles: [] });
    mockVentaUpdate.mockResolvedValue({ id: 10, estado: 'FINAL', detalles: [] });

    const app = express();
    app.use(express.json());
    app.use('/venta', ventaRoutes);

    await request(app)
      .put('/venta/10')
      .send({ numitems: 2, detalles: [{ id_producto: 1, cantidad: 1 }] });

    const call = mockVentaUpdate.mock.calls[0][0];
    expect(call.data.detalles).toEqual({
      deleteMany: {},
      create: [
        {
          cantidad: 1,
          precio: 0,
          total: 0,
          descuento: 0,
          costo: 0,
          producto: { connect: { id: 1 } },
          activo: 1,
        },
      ],
    });
    expect(call.data.numitems).toBe(2);
  });
});
