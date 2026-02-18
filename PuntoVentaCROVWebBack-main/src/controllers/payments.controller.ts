import { Request, Response } from 'express';
import Stripe from 'stripe';

import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

const stripeSecret = process.env.STRIPE_SECRET_KEY as string;
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-04-10' as any });

const stripeCardErrorMessages: Record<string, string> = {
  incorrect_number: 'Número de tarjeta incorrecto',
  invalid_number: 'Número de tarjeta inválido',
  invalid_expiry_month: 'Mes de expiración inválido',
  invalid_expiry_year: 'Año de expiración inválido',
  invalid_cvc: 'CVC inválido',
  incorrect_cvc: 'El CVC es incorrecto',
  expired_card: 'La tarjeta ha expirado',
  incorrect_zip: 'Código postal incorrecto',
  card_declined: 'La tarjeta fue declinada',
  card_not_supported: 'La tarjeta no es soportada',
  currency_not_supported: 'Moneda no soportada',
  do_not_honor: 'La tarjeta fue rechazada por el banco emisor',
  fraudulent: 'La tarjeta ha sido marcada como fraudulenta',
  lost_card: 'La tarjeta se reportó como perdida',
  stolen_card: 'La tarjeta fue reportada como robada',
  processing_error: 'Error procesando la tarjeta',
  new_account_information_available: 'Nueva información de la cuenta disponible',
  restriction: 'La tarjeta tiene una restricción',
  issuer_not_available: 'El emisor de la tarjeta no está disponible',
  generic_decline: 'La tarjeta fue declinada',
  insufficient_funds: 'Fondos insuficientes',
  invalid_account: 'Cuenta inválida',
  missing: 'Falta la información de pago',
  testmode_decline: 'La tarjeta fue declinada en modo de prueba',
  invalid_amount: 'Monto inválido',
  incorrect_pin: 'NIP incorrecto',
  duplicate_transaction: 'Transacción duplicada',
};

type CustomerPayload = {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

type PaymentIntentMetadata = Record<string, unknown> | undefined;

type CreatePaymentIntentBody = {
  priceId?: string;
  paymentMethodId?: string;
  empresaId?: number | string;
  customer?: CustomerPayload;
  metadata?: PaymentIntentMetadata;
};

type RecordPaymentBody = {
  paymentIntentId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created?: number | string | Date;
  paymentMethod?: string;
  description?: string;
  orderId?: number;
  empresaId?: number;
  card?: {
    last4?: string;
    brand?: string;
    country?: string;
  };
  cardLast4?: string;
  cardBrand?: string;
  cardCountry?: string;
};

const normalizeMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) {
    return undefined;
  }

  return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    acc[key] = String(value);
    return acc;
  }, {});
};

const sanitizeStripeCustomerId = (rawId: unknown): string | null => {
  if (typeof rawId !== 'string') {
    return null;
  }

  const trimmedId = rawId.trim();
  return trimmedId.length > 0 ? trimmedId : null;
};

const isStripeCardError = (error: any): boolean => {
  const StripeCardError = (Stripe as any)?.errors?.StripeCardError;
  return (
    (StripeCardError && error instanceof StripeCardError) ||
    error?.type === 'StripeCardError'
  );
};

const handleStripeError = (res: Response, error: any) => {
  if (isStripeCardError(error)) {
    const message = stripeCardErrorMessages[error?.code as string] || error?.message;
    res.status(400).json({ error: message, code: error?.code });
    return true;
  }

  return false;
};

export const createPaymentIntent = async (req: Request, res: Response) => {
  const { priceId, paymentMethodId, customer, empresaId, metadata } =
    req.body as CreatePaymentIntentBody;

  if (!priceId || !paymentMethodId || !customer?.name || !customer?.email) {
    res.status(400).json({
      error: 'priceId, paymentMethodId y los datos del cliente son requeridos',
    });
    return;
  }

  const hasEmpresaId =
    empresaId !== undefined &&
    empresaId !== null &&
    String(empresaId).trim() !== '';

  let empresaIdNumber: number | null = null;
  let empresa: any = null;

  if (hasEmpresaId) {
    empresaIdNumber = Number(empresaId);

    if (Number.isNaN(empresaIdNumber) || empresaIdNumber <= 0) {
      res.status(400).json({ error: 'empresaId debe ser un número válido' });
      return;
    }

    empresa = await (prisma.empresa as any).findFirst({
      where: { id: empresaIdNumber },
    });

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }
  }

  try {
    const price = await stripe.prices.retrieve(priceId);

    const amount = price.unit_amount;
    const currency = price.currency;

    if (!amount || !currency) {
      res.status(400).json({ error: 'El precio proporcionado no tiene un monto válido' });
      return;
    }

    const normalizedCustomerMetadata = normalizeMetadata(customer.metadata);

    let stripeCustomerId: string | null = sanitizeStripeCustomerId(
      empresa?.stripeCustomerId,
    );

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        description: customer.description,
        metadata: normalizedCustomerMetadata,
      });
      stripeCustomerId = stripeCustomer.id;
    }

    if (!stripeCustomerId) {
      throw new Error('No se pudo determinar el cliente de Stripe');
    }

    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (attachError: any) {
      if (attachError?.code !== 'resource_already_exists') {
        throw attachError;
      }
    }

    await stripe.customers.update(stripeCustomerId, {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      description: customer.description,
      metadata: normalizedCustomerMetadata,
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    if (empresaIdNumber !== null) {
      await (prisma.empresa as any).update({
        where: { id: empresaIdNumber },
        data: { stripeCustomerId },
      });
    }

    const normalizedMetadata = normalizeMetadata(metadata ?? undefined) ?? {};
    normalizedMetadata.priceId = priceId;
    if (empresaIdNumber !== null) {
      normalizedMetadata.empresaId = String(empresaIdNumber);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never", 
      },
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      setup_future_usage: 'off_session',
      receipt_email: customer.email,
      metadata: normalizedMetadata,
    });

    if (paymentIntent.status === 'succeeded') {
      res.json({
        stripeCustomerId,
        payment: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
      return;
    }

    if (paymentIntent.status === 'requires_action') {
      res.json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        stripeCustomerId,
      });
      return;
    }

    res.json({
      stripeCustomerId,
      payment: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (err) {
    console.error(err);

    if (handleStripeError(res, err)) {
      return;
    }

    res.status(500).json({
      error: 'Tuvimos problemas con el cobro de tu tarjeta, verifica bien los datos.',
    });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const {
      paymentIntentId,
      customerId,
      amount,
      currency,
      status,
      created,
      paymentMethod,
      description,
      orderId,
      empresaId,
      card,
      cardLast4,
      cardBrand,
      cardCountry,
    } = req.body as RecordPaymentBody;

    if (!paymentIntentId || typeof amount !== 'number' || !currency || !status) {
      res.status(400).json({ error: 'Datos de pago incompletos' });
      return;
    }

    const createdValue = created ?? Date.now();
    const createdTimestamp =
      typeof createdValue === 'number' && createdValue < 1e12
        ? createdValue * 1000
        : createdValue;
    const createdDate = toUTC(createdTimestamp);

    const data = {
      paymentIntentId,
      customerId: customerId ?? null,
      amount,
      currency,
      status,
      created: createdDate,
      paymentMethod: paymentMethod ?? null,
      description: description ?? null,
      orderId: orderId ?? null,
      empresaId: empresaId ?? null,
      cardLast4: card?.last4 ?? cardLast4 ?? null,
      cardBrand: card?.brand ?? cardBrand ?? null,
      cardCountry: card?.country ?? cardCountry ?? null,
    };

    const payment = await prisma.payment.create({ data });

    if (data.customerId && empresaId) {
      await (prisma.empresa as any).updateMany({
        where: { id: empresaId },
        data: { stripeCustomerId: data.customerId },
      });
    }

    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving payment' });
  }
};

export const obtenerPayments = async (req: Request, res: Response) => {
  const empresaId = Number(req.query.empresaId);

  if (!empresaId || isNaN(empresaId)) {
    res.status(400).json({ error: 'empresaId es requerido y debe ser numérico' });
    return;
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { empresaId } as any,
      orderBy: { created: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error retrieving payments' });
  }
};

export const obtenerPaymentsStripe = async (req: Request, res: Response) => {
  const empresaId = Number(req.query.empresaId);

  if (!empresaId || isNaN(empresaId)) {
    res.status(400).json({ error: 'empresaId es requerido y debe ser numérico' });
    return;
  }

  try {
    const empresa = await (prisma.empresa as any).findFirst({ where: { id: empresaId } });

    if (!empresa || !empresa.stripeCustomerId) {
      res.status(404).json({ error: 'Empresa no encontrada o sin cliente de Stripe' });
      return;
    }

    const invoices = await stripe.invoices.list({
      customer: empresa.stripeCustomerId,
      limit: 100,
      expand: ['data.payment_intent', 'data.lines.data.price'],
    });

    const payments = invoices.data
      .filter((invoice: any) => invoice.status === 'paid')
      .map((invoice: any) => ({
        paymentIntentId:
          typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id,
        status: typeof invoice.status === 'string' ? invoice.status : undefined,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        created: toUTC((invoice.created ?? 0) * 1000),
        subscriptionId:
          typeof invoice.subscription === 'string' ? invoice.subscription : undefined,
        subscriptionName:
          invoice.lines?.data?.[0]?.price?.nickname ??
          invoice.parent?.data?.[0]?.description,
        invoiceId: invoice.id,
      }));

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error retrieving payments from Stripe' });
  }
};

export const updateCard = async (req: Request, res: Response) => {
  const { empresaId, paymentMethodId, customer } = req.body as {
    empresaId?: number;
    paymentMethodId?: string;
    customer?: CustomerPayload;
  };

  if (!empresaId || !paymentMethodId) {
    res.status(400).json({ error: 'empresaId y paymentMethodId son requeridos' });
    return;
  }

  try {
    const empresa = await (prisma.empresa as any).findFirst({
      where: { id: Number(empresaId) },
    });

    if (!empresa || !empresa.stripeCustomerId) {
      res.status(404).json({ error: 'Empresa no encontrada o sin cliente de Stripe' });
      return;
    }

    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: empresa.stripeCustomerId,
      });
    } catch (attachError: any) {
      if (attachError?.code !== 'resource_already_exists') {
        throw attachError;
      }
    }

    await stripe.customers.update(empresa.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
      name: customer?.name,
      email: customer?.email,
      phone: customer?.phone,
      description: customer?.description,
      metadata: normalizeMetadata(customer?.metadata),
    });

    res.json({ updated: true });
  } catch (err) {
    console.error(err);

    if (handleStripeError(res, err)) {
      return;
    }

    res.status(500).json({ error: 'Error actualizando tarjeta de pago' });
  }
};
