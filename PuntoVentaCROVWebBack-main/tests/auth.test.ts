import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockSucursalFindUnique = jest.fn();
const mockPaymentFindFirst = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      usuario: { findUnique: mockFindUnique, update: mockUpdate },
      sucursal: { findUnique: mockSucursalFindUnique },
      payment: { findFirst: mockPaymentFindFirst },
    }))
  };
});

const mockedBcrypt = bcrypt as any;
const mockedJwt = jwt as any;
process.env.STRIPE_SECRET_KEY = 'test';
const authRoutes = require('../src/routes/auth.routes').default;

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = 'secret';
  });

  it('returns token for valid credentials', async () => {
    const user = { id: 1, correo: 'user@example.com', password: 'hash', sucursalId: 1 };
    const fecha = '2024-01-01T00:00:00.000Z';
    mockFindUnique.mockResolvedValue(user);
    mockSucursalFindUnique.mockResolvedValue({ empresa: { fecha_vencimiento: fecha } });
    mockPaymentFindFirst.mockResolvedValue({ id: 99, status: 'succeeded' });
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedJwt.sign.mockReturnValue('test-token');

    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    const res = await request(app)
      .post('/auth/login')
      .send({ correo: 'user@example.com', password: 'pass' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ token: 'test-token', user, fecha_vencimiento: fecha, requires_payment_method: false });
  });
});

describe('POST /auth/reset-password', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('updates password for existing user', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, correo: 'user@example.com' });
    mockedBcrypt.hash.mockResolvedValue('hashed');
    mockUpdate.mockResolvedValue({});

    const app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'user@example.com', password: 'new' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Contraseña actualizada correctamente' });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { correo_activo: { correo: 'user@example.com', activo: 1 } },
      data: { password: 'hashed' }
    });
  });
});
