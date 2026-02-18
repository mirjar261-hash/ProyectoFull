import { PrismaClient, type Empresa } from '@prisma/client';
import Stripe from 'stripe';
import { toUTC } from '../utils/date';

const prisma = new PrismaClient();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' as any })
  : null;

const PRICE_ID_BY_TOKEN: Record<string, string | undefined> = {
  NEGOCIOS: process.env.PLAN_NEGOCIOS,
  PLANNEGOCIOS: process.env.PLAN_NEGOCIOS,
  INTELIGENTE: process.env.PLAN_INTELIGENTE,
  PLANINTELIGENTE: process.env.PLAN_INTELIGENTE,
};

const EXCLUDED_TOKENS = new Set(['DEMO']);

type EmpresaForRenewal = Pick<Empresa, 'id' | 'nombre' | 'token' | 'stripeCustomerId' | 'fecha_vencimiento'>;

type CardSummary = {
  last4: string | null;
  brand: string | null;
  country: string | null;
};

const normalizeToken = (token: string | null | undefined): string => {
  if (!token) {
    return '';
  }

  return token
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
};

const getPriceIdForToken = (token: string | null | undefined): string | null => {
  const normalized = normalizeToken(token);

  if (!normalized || EXCLUDED_TOKENS.has(normalized)) {
    return null;
  }

  return PRICE_ID_BY_TOKEN[normalized] ?? null;
};

const addMonthsUtc = (date: Date, months: number): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      targetDay,
      hours,
      minutes,
      seconds,
      milliseconds
    )
  );
};

const extractCardFromPaymentIntent = (
  paymentIntent: Stripe.PaymentIntent
): CardSummary => {
  const summary: CardSummary = { last4: null, brand: null, country: null };

  const latestCharge = paymentIntent.latest_charge;
  if (latestCharge && typeof latestCharge !== 'string') {
    const card = latestCharge.payment_method_details?.card;
    if (card) {
      return {
        last4: card.last4 ?? null,
        brand: card.brand ?? null,
        country: card.country ?? null,
      };
    }
  }

  const paymentMethod = paymentIntent.payment_method;
  if (paymentMethod && typeof paymentMethod !== 'string' && paymentMethod.card) {
    return {
      last4: paymentMethod.card.last4 ?? null,
      brand: paymentMethod.card.brand ?? null,
      country: paymentMethod.card.country ?? null,
    };
  }

  return summary;
};

const fetchDefaultPaymentMethod = async (
  stripe: Stripe,
  customerId: string
) => {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ['invoice_settings.default_payment_method'],
  });

  if ('deleted' in customer && customer.deleted) {
    return null;
  }

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

  if (!defaultPaymentMethod) {
    return null;
  }

  if (typeof defaultPaymentMethod === 'string') {
    return stripe.paymentMethods.retrieve(defaultPaymentMethod);
  }

  return defaultPaymentMethod as Stripe.PaymentMethod;
};

const processEmpresaRenewal = async (
  empresa: EmpresaForRenewal,
  stripe: Stripe
) => {
  const stripeCustomerId = empresa.stripeCustomerId?.trim();

  if (!stripeCustomerId || stripeCustomerId === 'null' || stripeCustomerId === 'undefined') {
    console.warn(
      `Renovación automática: empresa ${empresa.id} sin cliente de Stripe válido`
    );
    return;
  }

  const priceId = getPriceIdForToken(empresa.token);

  if (!priceId) {
    console.warn(
      `Renovación automática: empresa ${empresa.id} con token sin priceId configurado`
    );
    return;
  }

  const price = await stripe.prices.retrieve(priceId);
  const amount = price.unit_amount;
  const currency = price.currency;

  if (!amount || !currency) {
    console.error(
      `Renovación automática: price ${priceId} inválido para empresa ${empresa.id}`
    );
    return;
  }

  const paymentMethod = await fetchDefaultPaymentMethod(stripe, stripeCustomerId);

  if (!paymentMethod || paymentMethod.type !== 'card') {
    console.warn(
      `Renovación automática: empresa ${empresa.id} sin tarjeta por defecto en Stripe`
    );
    return;
  }

  const metadata: Record<string, string> = {
    empresaId: String(empresa.id),
    planToken: empresa.token,
    autoRenewal: 'true',
    priceId,
  };

  if (empresa.nombre) {
    metadata.empresaNombre = empresa.nombre;
  }

  const description = `Renovación automática - ${empresa.token}`;

  const paymentIntent = await stripe.paymentIntents
    .create({
      amount,
      currency,
      customer: stripeCustomerId,
      payment_method: paymentMethod.id,
      confirm: true,
      off_session: true,
      error_on_requires_action: true,
      automatic_payment_methods: { enabled: false },
      payment_method_types: ['card'],
      description,
      metadata,
    })
    .catch((error: unknown) => {
      console.error(
        `Renovación automática: error al crear PaymentIntent para empresa ${empresa.id}`,
        error
      );
      throw error;
    });

  if (paymentIntent.status !== 'succeeded') {
    console.warn(
      `Renovación automática: cobro no completado para empresa ${empresa.id}, estado ${paymentIntent.status}`
    );
    return;
  }

  const detailedPaymentIntentResponse = await stripe.paymentIntents.retrieve(
    paymentIntent.id,
    {
      expand: ['latest_charge.payment_method_details.card', 'payment_method'],
    }
  );

  const detailedPaymentIntent = detailedPaymentIntentResponse as Stripe.PaymentIntent;

  const cardDetails = extractCardFromPaymentIntent(detailedPaymentIntent);
  if (!cardDetails.last4 && paymentMethod.card) {
    cardDetails.last4 = paymentMethod.card.last4 ?? null;
    cardDetails.brand = paymentMethod.card.brand ?? cardDetails.brand;
    cardDetails.country = paymentMethod.card.country ?? cardDetails.country;
  }

  const createdAt = detailedPaymentIntent.created
    ? toUTC(detailedPaymentIntent.created * 1000)
    : toUTC();

  const paymentMethodId = detailedPaymentIntent.payment_method;
  const paymentMethodValue =
    typeof paymentMethodId === 'string'
      ? paymentMethodId
      : paymentMethodId?.id ?? paymentMethod.id;

  const nextExpiration = addMonthsUtc(empresa.fecha_vencimiento, 1);

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        paymentIntentId: detailedPaymentIntent.id,
        customerId: stripeCustomerId,
        status: detailedPaymentIntent.status,
        amount: detailedPaymentIntent.amount,
        currency: detailedPaymentIntent.currency,
        created: createdAt,
        paymentMethod: paymentMethodValue,
        description: detailedPaymentIntent.description ?? null,
        empresaId: empresa.id,
        cardLast4: cardDetails.last4,
        cardBrand: cardDetails.brand,
        cardCountry: cardDetails.country,
        invoiceId: null,
        subscriptionId:
          typeof detailedPaymentIntent.metadata?.subscriptionId === 'string'
            ? detailedPaymentIntent.metadata.subscriptionId
            : null,
      },
    });

    await tx.empresa.update({
      where: { id: empresa.id },
      data: {
        fecha_vencimiento: nextExpiration,
        activo: 1,
      },
    });
  });

  console.log(
    `Renovación automática completada para empresa ${empresa.id} (${empresa.nombre ?? 'sin nombre'})`
  );
};

const processAutoRenewals = async () => {
  if (!stripeClient) {
    console.warn('Renovación automática: Stripe no configurado, se omite la tarea');
    return;
  }

  const now = new Date();
  const upperBound = new Date(now.getTime());
  upperBound.setDate(upperBound.getDate() + 3);

  const empresas = await prisma.empresa.findMany({
    where: {
      activo: 1,
      stripeCustomerId: { not: null },
      fecha_vencimiento: {
        gte: now,
        lte: upperBound,
      },
      token: {
        notIn: ['Demo', 'demo', 'DEMO'],
      },
    },
    select: {
      id: true,
      nombre: true,
      token: true,
      stripeCustomerId: true,
      fecha_vencimiento: true,
    },
  });

  for (const empresa of empresas) {
    const normalizedToken = normalizeToken(empresa.token);
    if (!normalizedToken || EXCLUDED_TOKENS.has(normalizedToken)) {
      continue;
    }

    try {
      await processEmpresaRenewal(empresa, stripeClient);
    } catch (error) {
      console.error(
        `Renovación automática: error procesando empresa ${empresa.id}`,
        error
      );
    }
  }
};

export const scheduleAutoRenewals = () => {
  const schedule = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(2, 30, 0, 0);

    if (now > target) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    setTimeout(async () => {
      await processAutoRenewals().catch((error) => {
        console.error('Renovación automática: error en la ejecución programada', error);
      });

      schedule();
    }, delay);
  };

  schedule();
};

export const runAutoRenewalsNow = async () => {
  await processAutoRenewals();
};

