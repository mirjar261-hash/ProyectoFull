import request from 'supertest';
import express from 'express';

const mockPaymentIntentCreate = jest.fn();
const mockPricesRetrieve = jest.fn();
const mockCustomerCreate = jest.fn();
const mockCustomerUpdate = jest.fn();
const mockPaymentMethodAttach = jest.fn();
const mockInvoiceList = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentCreate },
    prices: { retrieve: mockPricesRetrieve },
    invoices: { list: mockInvoiceList },
    customers: { create: mockCustomerCreate, update: mockCustomerUpdate },
    paymentMethods: { attach: mockPaymentMethodAttach },
  }));
}, { virtual: true });

const mockPaymentCreate = jest.fn();
const mockPaymentFindMany = jest.fn();
const mockEmpresaUpdateMany = jest.fn();
const mockEmpresaFindFirst = jest.fn();
const mockEmpresaUpdate = jest.fn();

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      payment: { create: mockPaymentCreate, findMany: mockPaymentFindMany },
      empresa: {
        updateMany: mockEmpresaUpdateMany,
        findFirst: mockEmpresaFindFirst,
        update: mockEmpresaUpdate,
      },
    })),
  };
});

jest.mock('../src/middlewares/verifyToken', () => ({
  verifyToken: (_req: any, _res: any, next: any) => next(),
}));

import paymentsRoutes from '../src/routes/payments.routes';

describe('POST /payments/create-payment-intent', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test';
  });

  it('returns payment information when the payment intent succeeds immediately', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 5000, currency: 'mxn' });
    mockEmpresaFindFirst.mockResolvedValue({ id: 1, stripeCustomerId: null });
    mockCustomerCreate.mockResolvedValue({ id: 'cus_1' });
    mockPaymentMethodAttach.mockResolvedValue({});
    mockCustomerUpdate.mockResolvedValue({});
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 5000,
      currency: 'mxn',
      client_secret: 'secret',
    });

    const app = express();
    app.use(express.json());
    app.use('/payments', paymentsRoutes);

    const res = await request(app)
      .post('/payments/create-payment-intent')
      .send({
        priceId: 'price_1',
        paymentMethodId: 'pm_1',
        empresaId: 1,
        customer: { name: 'Test', email: 'test@example.com' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      stripeCustomerId: 'cus_1',
      payment: {
        paymentIntentId: 'pi_1',
        status: 'succeeded',
        amount: 5000,
        currency: 'mxn',
      },
    });

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'mxn',
        customer: 'cus_1',
        payment_method: 'pm_1',
        confirm: true,
      }),
    );

    expect(mockCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test',
        email: 'test@example.com',
        phone: undefined,
        description: undefined,
        metadata: undefined,
      }),
    );

    expect(mockEmpresaUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { stripeCustomerId: 'cus_1' },
    });
    expect(mockEmpresaUpdate.mock.calls[1][0]).toEqual({
      where: { id: 1 },
      data: expect.objectContaining({
        stripeCustomerId: 'cus_1',
        activo: 1,
      }),
    });
  });

  it('returns client secret when the payment intent requires additional action', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 5000, currency: 'mxn' });
    mockEmpresaFindFirst.mockResolvedValue({ id: 1, stripeCustomerId: 'cus_1' });
    mockPaymentMethodAttach.mockResolvedValue({});
    mockCustomerUpdate.mockResolvedValue({});
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_1',
      status: 'requires_action',
      amount: 5000,
      currency: 'mxn',
      client_secret: 'secret',
    });

    const app = express();
    app.use(express.json());
    app.use('/payments', paymentsRoutes);

    const res = await request(app)
      .post('/payments/create-payment-intent')
      .send({
        priceId: 'price_1',
        paymentMethodId: 'pm_1',
        empresaId: 1,
        customer: { name: 'Test', email: 'test@example.com' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      requiresAction: true,
      clientSecret: 'secret',
      stripeCustomerId: 'cus_1',
    });
    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockEmpresaUpdate).toHaveBeenCalledTimes(1);
  });

  it('creates a new stripe customer when the empresa record stores a blank id', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 5000, currency: 'mxn' });
    mockEmpresaFindFirst.mockResolvedValue({ id: 1, stripeCustomerId: '   ' });
    mockCustomerCreate.mockResolvedValue({ id: 'cus_2' });
    mockPaymentMethodAttach.mockResolvedValue({});
    mockCustomerUpdate.mockResolvedValue({});
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_2',
      status: 'succeeded',
      amount: 5000,
      currency: 'mxn',
    });

    const app = express();
    app.use(express.json());
    app.use('/payments', paymentsRoutes);

    const res = await request(app)
      .post('/payments/create-payment-intent')
      .send({
        priceId: 'price_1',
        paymentMethodId: 'pm_1',
        empresaId: 1,
        customer: { name: 'Test', email: 'test@example.com' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      stripeCustomerId: 'cus_2',
      payment: {
        paymentIntentId: 'pi_2',
        status: 'succeeded',
        amount: 5000,
        currency: 'mxn',
      },
    });

    expect(mockCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mockEmpresaUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { stripeCustomerId: 'cus_2' },
    });
  });

  it('creates a payment intent when empresaId is not provided', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 5000, currency: 'mxn' });
    mockCustomerCreate.mockResolvedValue({ id: 'cus_1' });
    mockPaymentMethodAttach.mockResolvedValue({});
    mockCustomerUpdate.mockResolvedValue({});
    mockPaymentIntentCreate.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 5000,
      currency: 'mxn',
    });

    const app = express();
    app.use(express.json());
    app.use('/payments', paymentsRoutes);

    const res = await request(app)
      .post('/payments/create-payment-intent')
      .send({
        priceId: 'price_1',
        paymentMethodId: 'pm_1',
        customer: { name: 'Test', email: 'test@example.com' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      stripeCustomerId: 'cus_1',
      payment: {
        paymentIntentId: 'pi_1',
        status: 'succeeded',
        amount: 5000,
        currency: 'mxn',
      },
    });
    expect(mockEmpresaFindFirst).not.toHaveBeenCalled();
    expect(mockEmpresaUpdate).not.toHaveBeenCalled();
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test',
        email: 'test@example.com',
        phone: undefined,
        description: undefined,
        metadata: undefined,
      }),
    );
  });
});

describe('POST /payments/record', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test';
  });

  it('saves payment information including card details', async () => {
    mockPaymentCreate.mockImplementation(async ({ data }) => data);

    const payload = {
      paymentIntentId: 'pi_1',
      amount: 100,
      status: 'succeeded',
      currency: 'mxn',
      customerId: 'cus_1',
      empresaId: 5,
      created: 1717000000,
      paymentMethod: 'pm_1',
      description: 'Compra de paquete',
      card: { last4: '1234', brand: 'visa', country: 'MX' },
    } as any;

    const app = express();
    app.use(express.json());
    app.use('/payments', paymentsRoutes);

    const res = await request(app).post('/payments/record').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        paymentIntentId: 'pi_1',
        amount: 100,
        status: 'succeeded',
        customerId: 'cus_1',
        empresaId: 5,
        cardLast4: '1234',
        cardBrand: 'visa',
        cardCountry: 'MX',
      }),
    );
    const createCall = mockPaymentCreate.mock.calls[0][0].data;
    expect(createCall.created).toBeInstanceOf(Date);
    expect(mockEmpresaUpdateMany).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { stripeCustomerId: 'cus_1' },
    });
  });
});

describe('GET /payments', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test';
  });

  it('returns payments filtered by empresa ordered by date', async () => {
    const payments = [{ id: 1 }, { id: 2 }];
    mockPaymentFindMany.mockResolvedValue(payments);

    const app = express();
    app.use('/payments', paymentsRoutes);

    const res = await request(app).get('/payments?empresaId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(payments);
    expect(mockPaymentFindMany).toHaveBeenCalledWith({
      where: { empresaId: 1 },
      orderBy: { created: 'desc' },
    });
  });
});

describe('GET /payments/stripe-payments', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test';
  });

  it('returns payments from stripe invoices', async () => {
    mockEmpresaFindFirst.mockResolvedValue({ id: 1, stripeCustomerId: 'cus_1' });
    mockInvoiceList.mockResolvedValue({
      data: [
        {
          id: 'in_1',
          amount_paid: 5000,
          currency: 'mxn',
          status: 'paid',
          created: 1717000000,
          payment_intent: { id: 'pi_1', status: 'succeeded' },
          subscription: 'sub_1',
          lines: { data: [{ price: { nickname: 'Plan Básico' } }] },
        },
      ],
    });

    const app = express();
    app.use('/payments', paymentsRoutes);

    const res = await request(app).get('/payments/stripe-payments?empresaId=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        paymentIntentId: 'pi_1',
        status: 'paid',
        amount: 5000,
        currency: 'mxn',
        subscriptionId: 'sub_1',
        subscriptionName: 'Plan Básico',
        invoiceId: 'in_1',
      }),
    ]);
    expect(mockInvoiceList).toHaveBeenCalledWith({
      customer: 'cus_1',
      limit: 100,
      expand: ['data.payment_intent', 'data.lines.data.price'],
    });
  });
});
