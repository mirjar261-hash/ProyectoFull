import request from 'supertest';
import express from 'express';

const mockDetalleFind = jest.fn();
const mockDetalleUpdate = jest.fn();
const mockDetalleCount = jest.fn();
const mockProductoFind = jest.fn();
const mockProductoUpdate = jest.fn();
const mockInventarioCreate = jest.fn();
const mockVentaFind = jest.fn();
const mockVentaUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      detalle_venta: {
        findUnique: mockDetalleFind,
        update: mockDetalleUpdate,
        count: mockDetalleCount,
      },
      producto: { findUnique: mockProductoFind, update: mockProductoUpdate },
      inventario_esa: { create: mockInventarioCreate },
      venta: { findUnique: mockVentaFind, update: mockVentaUpdate },
      $transaction: mockTransaction,
    })),
    TipoESA: { DEVOLUCION_VENTA: 'DEVOLUCION_VENTA' },
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { userId: 1 };
    next();
  },
}));

import detalleVentaRoutes from '../src/routes/detalle_venta.routes';

describe('POST /detalle_venta/:id/devolucion', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('updates venta totals on detail return', async () => {
    mockDetalleFind.mockResolvedValue({
      id: 1,
      id_venta: 10,
      id_producto: 1,
      cantidad: 1,
      total: 116,
      fecha_devolucion: null,
      producto: { impuesto: '16' },
    });
    mockVentaFind.mockResolvedValue({
      efectivo: 50,
      tarjeta: 40,
      cheque: 30,
      vale: 20,
      transferencia: 10,
    });
    mockProductoFind.mockResolvedValue({
      id: 1,
      costo: 80,
      sucursalId: 2,
      cantidad_existencia: 5,
      impuesto: '16',
    });
    mockDetalleUpdate.mockResolvedValue({});
    mockProductoUpdate.mockResolvedValue({});
    mockInventarioCreate.mockResolvedValue({});
    mockVentaUpdate.mockResolvedValue({});
    mockDetalleCount.mockResolvedValue(1);
    mockTransaction.mockImplementation(async (ops: any[]) => {
      await Promise.all(ops);
    });

    const app = express();
    app.use(express.json());
    app.use('/detalle_venta', detalleVentaRoutes);

    const res = await request(app).post('/detalle_venta/1/devolucion');

    expect(res.status).toBe(200);
    const ivaDetalle = (116 * 16) / (100 + 16);
    const subtotalDetalle = 116 - ivaDetalle;
    expect(mockVentaUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        total: { decrement: 116 },
        iva: { decrement: ivaDetalle },
        subtotal: { decrement: subtotalDetalle },
        numitems: { decrement: 1 },
        efectivo: { decrement: 50 },
        tarjeta: { decrement: 40 },
        cheque: { decrement: 26 },
      },
    });
    expect(mockVentaUpdate).toHaveBeenCalledTimes(1);
  });

  it('deactivates venta when no active details remain', async () => {
    mockDetalleFind.mockResolvedValue({
      id: 1,
      id_venta: 10,
      id_producto: 1,
      cantidad: 1,
      total: 116,
      fecha_devolucion: null,
      producto: { impuesto: '16' },
    });
    mockVentaFind.mockResolvedValue({
      efectivo: 50,
      tarjeta: 40,
      cheque: 30,
      vale: 20,
      transferencia: 10,
    });
    mockProductoFind.mockResolvedValue({
      id: 1,
      costo: 80,
      sucursalId: 2,
      cantidad_existencia: 5,
      impuesto: '16',
    });
    mockDetalleUpdate.mockResolvedValue({});
    mockProductoUpdate.mockResolvedValue({});
    mockInventarioCreate.mockResolvedValue({});
    mockVentaUpdate.mockResolvedValue({});
    mockDetalleCount.mockResolvedValue(0);
    mockTransaction.mockImplementation(async (ops: any[]) => {
      await Promise.all(ops);
    });

    const app = express();
    app.use(express.json());
    app.use('/detalle_venta', detalleVentaRoutes);

    const res = await request(app).post('/detalle_venta/1/devolucion');

    expect(res.status).toBe(200);
    const ivaDetalle = (116 * 16) / (100 + 16);
    const subtotalDetalle = 116 - ivaDetalle;

    expect(mockVentaUpdate.mock.calls[0][0]).toEqual({
      where: { id: 10 },
      data: {
        total: { decrement: 116 },
        iva: { decrement: ivaDetalle },
        subtotal: { decrement: subtotalDetalle },
        numitems: { decrement: 1 },
        efectivo: { decrement: 50 },
        tarjeta: { decrement: 40 },
        cheque: { decrement: 26 },
      },
    });

    expect(mockVentaUpdate.mock.calls[1][0]).toEqual({
      where: { id: 10 },
      data: { activo: 0 },
    });
    expect(mockVentaUpdate).toHaveBeenCalledTimes(2);
  });

  it('returns insumo inventory when product has insumos', async () => {
    mockDetalleFind.mockResolvedValue({
      id: 1,
      id_venta: 10,
      id_producto: 1,
      cantidad: 2,
      total: 100,
      fecha_devolucion: null,
      producto: { impuesto: '0' },
    });
    mockVentaFind.mockResolvedValue({
      efectivo: 100,
      tarjeta: 0,
      cheque: 0,
      vale: 0,
      transferencia: 0,
    });
    mockProductoFind.mockResolvedValue({
      id: 1,
      servicio: 0,
      costo: 50,
      sucursalId: 1,
      cantidad_existencia: 10,
      impuesto: '0',
      insumos: [
        {
          cantidad: 0.5,
          productoInsumo: {
            id: 2,
            cantidad_existencia: 5,
            costo: 10,
            sucursalId: 1,
          },
        },
      ],
    });
    mockDetalleUpdate.mockResolvedValue({});
    mockProductoUpdate.mockResolvedValue({});
    mockInventarioCreate.mockResolvedValue({});
    mockVentaUpdate.mockResolvedValue({});
    mockDetalleCount.mockResolvedValue(1);
    mockTransaction.mockImplementation(async (ops: any[]) => {
      await Promise.all(ops);
    });

    const app = express();
    app.use(express.json());
    app.use('/detalle_venta', detalleVentaRoutes);

    const res = await request(app).post('/detalle_venta/1/devolucion');

    expect(res.status).toBe(200);
    expect(mockProductoUpdate).toHaveBeenCalledWith({
      where: { id: BigInt(2) },
      data: { cantidad_existencia: { increment: 1 } },
    });
    expect(
      mockProductoUpdate.mock.calls.some(
        (call) => call[0].where.id === BigInt(1)
      )
    ).toBe(false);
    expect(
      mockInventarioCreate.mock.calls[0][0].data.id_producto
    ).toBe(BigInt(2));
  });
});
