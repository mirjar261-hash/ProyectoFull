import { Request, Response, RequestHandler } from 'express';
import {
  NivelDistribuidor,
  Distribuidor,
  TipoSistemaCROV,
  Prisma,
  PuestoEmpleadoCROV,
  GarantiaTicketCROV,
  TipoProblemaTicketCROV,
  PrioridadTicketSoporteCROV,
  EstadoSolicitudTicketCROV,
  InteresProspectoCROV,
  PrioridadTareaCROV,
  EstatusTareaCROV,
  TipoTareaCROV,
} from '@prisma/client';
import Stripe from 'stripe';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import {deleteImageByUrlForJiraTasks} from './s3.controller';
import { calcularDiasHabiles, formatearFechaEsp } from '../utils/date';
import { notificarNuevaSolicitudIncidenciaRH } from '../services/rh.service'; 

const stripeSecret = process.env.STRIPE_SECRET_KEY as string;
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-04-10' as any });

export const obtenerTicketsInternos = async (_req: Request, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          include: {
            sucursal: {
              select: { nombre_comercial: true, tel: true }
            }
          }
        }
      },
      orderBy: { fecha_creacion: 'desc' }
    });

    const data = tickets.map((t) => ({
      id: t.id,
      asunto: t.asunto,
      estado: t.estado,
      fecha_creacion: t.fecha_creacion,
      sucursal: t.user?.sucursal
        ? {
            nombre: t.user.sucursal.nombre_comercial,
            telefono: t.user.sucursal.tel
          }
        : null
    }));

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};

export const obtenerEmpresasInternas = async (_req: Request, res: Response) => {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        payments: {
          orderBy: { created: 'desc' },
          take: 1
        }
      },
      orderBy: { fecha_vencimiento: 'asc' }
    });

    const data = empresas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      paquete: e.payments[0]?.description ?? null,
      fecha_vencimiento: e.fecha_vencimiento
    }));

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
};

const NIVELES: NivelDistribuidor[] = ['BRONCE', 'PLATA', 'ORO'];

const TIPOS_SISTEMA: readonly TipoSistemaCROV[] = Object.values(TipoSistemaCROV);
const PUESTOS_EMPLEADO: readonly PuestoEmpleadoCROV[] = Object.values(PuestoEmpleadoCROV);
const GARANTIAS_TICKET: readonly GarantiaTicketCROV[] = Object.values(GarantiaTicketCROV);
const TIPOS_PROBLEMA_TICKET: readonly TipoProblemaTicketCROV[] = Object.values(TipoProblemaTicketCROV);
const PRIORIDADES_TICKET: readonly PrioridadTicketSoporteCROV[] = Object.values(PrioridadTicketSoporteCROV);
const ESTADOS_TICKET: readonly EstadoSolicitudTicketCROV[] = Object.values(EstadoSolicitudTicketCROV);
const INTERESES_PROSPECTO: readonly InteresProspectoCROV[] = Object.values(InteresProspectoCROV);
const PRIORIDADES_TAREA: readonly PrioridadTareaCROV[] = Object.values(PrioridadTareaCROV);
const ESTATUS_TAREA: readonly EstatusTareaCROV[] = Object.values(EstatusTareaCROV);
const TIPOS_TAREA: readonly TipoTareaCROV[] = Object.values(TipoTareaCROV);

const onlyDigits = (s: string = '') => (s || '').replace(/\D+/g, '');

function isValidEmail(s?: string | null) {
  if (!s) return true; // email es opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clampPct(n: any, min = 0, max = 100) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(max, Math.max(min, x));
}

async function existsDistribuidorWithEmail(email: string, excludeId?: number) {
  if (!email) return false;
  const where: any = { email };
  if (excludeId) where.id = { not: excludeId };
  const found = await prisma.distribuidor.findFirst({ where, select: { id: true } });
  return !!found;
}

function parseTipoSistema(input: unknown): TipoSistemaCROV | null {
  if (!input) return null;
  const normalized = String(input)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return TIPOS_SISTEMA.find((tipo) => tipo === normalized) ?? null;
}

async function parseOptionalGiroComercialId(value: unknown): Promise<number | null | undefined> {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error: any = new Error('El giro comercial proporcionado es inválido');
    error.status = 400;
    throw error;
  }

  const existe = await prisma.giroComercial.findFirst({
    where: { id: parsed, activo: 1 },
    select: { id: true },
  });

  if (!existe) {
    const error: any = new Error('El giro comercial especificado no existe o está inactivo');
    error.status = 400;
    throw error;
  }

  return parsed;
}

function parseFecha(input: unknown): Date | null {
  if (!input) return null;
  const date = new Date(input as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalCoordinate(
  value: unknown,
  field: 'latitud' | 'longitud'
): Prisma.Decimal | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const strValue = String(value).trim();
  if (!strValue) {
    return null;
  }

  const numericValue = Number(strValue);
  if (!Number.isFinite(numericValue)) {
    const error: any = new Error(
      `La ${field} proporcionada es inválida`
    );
    error.status = 400;
    throw error;
  }

  const [min, max] = field === 'latitud' ? [-90, 90] : [-180, 180];
  if (numericValue < min || numericValue > max) {
    const error: any = new Error(
      `La ${field} debe estar entre ${min} y ${max}`
    );
    error.status = 400;
    throw error;
  }

  return new Prisma.Decimal(numericValue.toFixed(6));
}

function normalizeDateOnly(date: Date) {
  const normalized = new Date(date.getTime());
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function normalizeEnumValue<T extends string>(value: unknown, allowed: readonly T[]) {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : null;
}

function parseOptionalFlag(value: unknown, field: string): 0 | 1 | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (parsed !== 0 && parsed !== 1)) {
    const error: any = new Error(`El valor de ${field} debe ser 0 o 1`);
    error.status = 400;
    throw error;
  }
  return parsed as 0 | 1;
}

function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = parseFecha(value);
  if (!parsed) {
    const error: any = new Error(`La fecha de ${field} es inválida`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function parseOptionalDateOnly(value: unknown, field: string): Date | null | undefined {
  const parsed = parseOptionalDate(value, field);
  if (parsed === undefined || parsed === null) return parsed;
  return normalizeDateOnly(parsed);
}

function parseOptionalDecimal(value: unknown, field: string): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    const error: any = new Error(`El valor de ${field} es inválido`);
    error.status = 400;
    throw error;
  }
  return new Prisma.Decimal(numericValue);
}

function addMonthsToDate(date: Date, months: number) {
  const normalized = normalizeDateOnly(date);
  const year = normalized.getUTCFullYear();
  const month = normalized.getUTCMonth();
  const day = normalized.getUTCDate();

  return new Date(Date.UTC(year, month + months, day));
}

function parsePuestoEmpleado(input: unknown): PuestoEmpleadoCROV | null {
  if (!input) return null;
  const normalized = String(input)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return PUESTOS_EMPLEADO.find((puesto) => puesto === normalized) ?? null;
}

function normalizeEnumInput(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  return String(input)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
}

function parseGarantiaTicket(input: unknown): GarantiaTicketCROV | null {
  const normalized = normalizeEnumInput(input);
  if (!normalized) return null;
  return GARANTIAS_TICKET.find((garantia) => garantia === normalized) ?? null;
}

function parseTipoProblemaTicket(input: unknown): TipoProblemaTicketCROV | null {
  const normalized = normalizeEnumInput(input);
  if (!normalized) return null;
  return TIPOS_PROBLEMA_TICKET.find((tipo) => tipo === normalized) ?? null;
}

function parsePrioridadTicket(input: unknown): PrioridadTicketSoporteCROV | null {
  const normalized = normalizeEnumInput(input);
  if (!normalized) return null;
  return PRIORIDADES_TICKET.find((prioridad) => prioridad === normalized) ?? null;
}

function parseEstadoSolicitudTicket(input: unknown): EstadoSolicitudTicketCROV | null {
  const normalized = normalizeEnumInput(input);
  if (!normalized) return null;
  return ESTADOS_TICKET.find((estado) => estado === normalized) ?? null;
}

function parseInteresProspecto(input: unknown): InteresProspectoCROV | null {
  const normalized = normalizeEnumInput(input);
  if (!normalized) return null;
  return INTERESES_PROSPECTO.find((interes) => interes === normalized) ?? null;
}

/* --------------------------- crear --------------------------- */
export const crearDistribuidor: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const nombre_completo = String(body.nombre_completo ?? '').trim();
    if (!nombre_completo) {
      res.status(400).json({ message: 'El nombre completo es obligatorio' });
      return;
    }

    // Teléfono: sólo dígitos, máx 10 (MX)
    let telefono = onlyDigits(String(body.telefono ?? ''));
    if (!telefono) {
      res.status(400).json({ message: 'El teléfono es obligatorio' });
      return;
    }
    if (telefono.length > 10) telefono = telefono.slice(0, 10);

    const domicilio = body.domicilio ? String(body.domicilio).trim() : null;

    const emailRaw = (body.email ?? '').toString().trim();
    const email = emailRaw.length ? emailRaw.toLowerCase() : null;
    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Email inválido' });
      return;
    }

    const nivelInput = (body.nivel ?? 'BRONCE').toString().toUpperCase();
    const nivel = NIVELES.includes(nivelInput as NivelDistribuidor)
      ? (nivelInput as NivelDistribuidor)
      : 'BRONCE';

    const descuento = clampPct(body.descuento ?? 0, 0, 100);

    const nombre_comercial = body.nombre_comercial ? String(body.nombre_comercial).trim() : null;

    // Si NO tienes @unique en email, evita duplicados manualmente
    if (email && (await existsDistribuidorWithEmail(email))) {
      res.status(409).json({ message: 'Ya existe un distribuidor con ese email' });
      return;
    }

    const distribuidor = await prisma.distribuidor.create({
      data: {
        nombre_completo,
        telefono,
        domicilio,
        email,
        nivel,
        descuento,
        nombre_comercial,
        activo: 1,
      },
    });

    res.status(201).json({ message: 'Distribuidor creado', distribuidor });
  } catch (err: any) {
    // Si sí tienes @unique en email, Prisma lanzará P2002
    if (err?.code === 'P2002' && String(err?.meta?.target).includes('email')) {
      res.status(409).json({ message: 'Ya existe un distribuidor con ese email' });
      return;
    }
    console.error('Error al crear distribuidor:', err);
    res.status(500).json({ message: 'Error interno al crear distribuidor' });
  }
};

/* --------------------------- actualizar --------------------------- */
export const actualizarDistribuidor: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Partial<Distribuidor> = {};

    if (body.nombre_completo !== undefined) {
      const v = String(body.nombre_completo).trim();
      if (!v) {
        res.status(400).json({ message: 'El nombre completo no puede estar vacío' });
        return;
      }
      data.nombre_completo = v;
    }

    if (body.telefono !== undefined) {
      let v = onlyDigits(String(body.telefono));
      if (!v) {
        res.status(400).json({ message: 'El teléfono no puede estar vacío' });
        return;
      }
      if (v.length > 10) v = v.slice(0, 10);
      data.telefono = v;
    }

    if (body.domicilio !== undefined) {
      data.domicilio = body.domicilio ? String(body.domicilio).trim() : null;
    }

    if (body.email !== undefined) {
      const emailRaw = (body.email ?? '').toString().trim();
      const email = emailRaw.length ? emailRaw.toLowerCase() : null;
      if (!isValidEmail(email)) {
        res.status(400).json({ message: 'Email inválido' });
        return;
      }
      // Verificar colisión manual si no hay @unique, o dar mensaje claro antes del P2002
      if (email && (await existsDistribuidorWithEmail(email, id))) {
        res.status(409).json({ message: 'Ya existe un distribuidor con ese email' });
        return;
      }
      data.email = email;
    }

    if (body.nivel !== undefined) {
      const nivelInput = String(body.nivel).toUpperCase();
      if (!NIVELES.includes(nivelInput as NivelDistribuidor)) {
        res.status(400).json({ message: 'Nivel inválido. Use BRONCE | PLATA | ORO' });
        return;
      }
      data.nivel = nivelInput as NivelDistribuidor;
    }

    if (body.descuento !== undefined) {
      data.descuento = clampPct(body.descuento, 0, 100);
    }

    if (body.nombre_comercial !== undefined) {
      data.nombre_comercial = body.nombre_comercial ? String(body.nombre_comercial).trim() : null;
    }

    if (body.activo !== undefined) {
      const a = Number(body.activo);
      data.activo = a === 0 ? 0 : 1;
    }

    const distribuidor = await prisma.distribuidor.update({
      where: { id },
      data,
    });

    res.json({ message: 'Distribuidor actualizado', distribuidor });
  } catch (err: any) {
    if (err?.code === 'P2002' && String(err?.meta?.target).includes('email')) {
      res.status(409).json({ message: 'Ya existe un distribuidor con ese email' });
      return;
    }
    if (err?.code === 'P2025') {
      res.status(404).json({ message: 'Distribuidor no encontrado' });
      return;
    }
    console.error('Error al actualizar distribuidor:', err);
    res.status(500).json({ message: 'Error interno al actualizar distribuidor' });
  }
};

/* --------------------------- eliminar lógico --------------------------- */
export const eliminarDistribuidor: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const distribuidor = await prisma.distribuidor.update({
      where: { id },
      data: { activo: 0 },
    });

    res.json({ message: 'Distribuidor eliminado', distribuidor });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ message: 'Distribuidor no encontrado' });
      return;
    }
    console.error('Error al eliminar distribuidor:', err);
    res.status(500).json({ message: 'Error interno al eliminar distribuidor' });
  }
};

/* --------------------------- listar --------------------------- */
/**
 * GET /distribuidor
 * Query:
 *   - activo: 0|1 (default 1)
 *   - nivel: BRONCE|PLATA|ORO (opcional)
 *   - q: texto a buscar en nombre_completo, nombre_comercial o email (opcional)
 *   - take / skip: paginación opcional
 */
export const listarDistribuidores: RequestHandler = async (req, res) => {
  try {
    const activo = req.query.activo !== undefined ? Number(req.query.activo) : 1;
    const nivel = req.query.nivel ? String(req.query.nivel).toUpperCase() : undefined;
    const q = (req.query.q as string | undefined)?.trim();

    const take = req.query.take ? Number(req.query.take) : undefined;
    const skip = req.query.skip ? Number(req.query.skip) : undefined;

    const where: any = {};
    if (activo === 0 || activo === 1) where.activo = activo;
    if (nivel && NIVELES.includes(nivel as NivelDistribuidor)) where.nivel = nivel;
    if (q && q.length) {
      where.OR = [
        { nombre_completo: { contains: q } },
        { nombre_comercial: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const items = await prisma.distribuidor.findMany({
      where,
      orderBy: [{ creadoEn: 'desc' }],
      take,
      skip,
    });

    res.json({ items });
  } catch (err) {
    console.error('Error al listar distribuidores:', err);
    res.status(500).json({ message: 'Error interno al listar distribuidores' });
  }
};

/* --------------------------- borrado físico (opcional) --------------------------- */
export const borrarFisicoDistribuidor: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.distribuidor.delete({ where: { id } });

    res.json({ message: 'Distribuidor eliminado físicamente' });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ message: 'Distribuidor no encontrado' });
      return;
    }
    // Si alguna tabla futura llega a referenciar distribuidores, Prisma podría lanzar P2003 (FK)
    if (err?.code === 'P2003') {
      res.status(409).json({
        message:
          'No se puede borrar físicamente: existen registros relacionados. Elimina dependencias o configura onDelete en el schema.',
        detalle: err?.meta?.field_name ?? undefined,
      });
      return;
    }
    console.error('Error al borrar físicamente distribuidor:', err);
    res.status(500).json({ message: 'Error interno al borrar distribuidor' });
  }
};

export const obtenerPagosInternos = async (req: Request, res: Response) => {
  const empresaId = Number(req.params.empresaId);

  if (!empresaId || isNaN(empresaId)) {
    res.status(400).json({ error: 'empresaId es requerido y debe ser numérico' });
    return;
  }

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });

    if (!empresa || !empresa.stripeCustomerId) {
      res.status(404).json({ error: 'Empresa no encontrada o sin Stripe' });
      return;
    }

    const intents = await stripe.paymentIntents.list({
      customer: empresa.stripeCustomerId,
      limit: 100,
    });

    const data = intents.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      created: p.created,
    }));

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

/* --------------------------- Clientes CROV --------------------------- */

export const listarClientesCROV: RequestHandler = async (_req, res) => {
  try {
    const clientes = await prisma.clientes_CROV.findMany({
      orderBy: { id: 'desc' },
      include: { giroComercial: true },
    });
    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes CROV:', error);
    res.status(500).json({ message: 'Error al obtener clientes CROV' });
  }
};

export const obtenerClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const cliente = await prisma.clientes_CROV.findUnique({
      where: { id },
      include: { giroComercial: true },
    });
    if (!cliente) {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente CROV:', error);
    res.status(500).json({ message: 'Error al obtener cliente CROV' });
  }
};

export const crearClienteCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const nombre_cliente = String(body.nombre_cliente ?? '').trim();
    if (!nombre_cliente) {
      res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
      return;
    }

    const nombre_negocio = String(body.nombre_negocio ?? '').trim();
    if (!nombre_negocio) {
      res.status(400).json({ message: 'El nombre del negocio es obligatorio' });
      return;
    }

    const tipo_sistema = parseTipoSistema(body.tipo_sistema);
    if (!tipo_sistema) {
      res.status(400).json({ message: 'Tipo de sistema inválido' });
      return;
    }

    const direccion = body.direccion ? String(body.direccion).trim() : null;

    const idGiroComercial = await parseOptionalGiroComercialId(body.id_giro_comercial);

    let telefono: string | null = null;
    if (body.telefono !== undefined && body.telefono !== null) {
      const rawTelefono = String(body.telefono).trim();
      telefono = rawTelefono.length ? rawTelefono : null;
    }

    let telefono_negocio: string | null = null;
    if (body.telefono_negocio !== undefined && body.telefono_negocio !== null) {
      const rawTelefonoNegocio = String(body.telefono_negocio).trim();
      telefono_negocio = rawTelefonoNegocio.length ? rawTelefonoNegocio : null;
    } else if (telefono !== null) {
      telefono_negocio = telefono;
    }

    let logo: string | null = null;
    if (body.logo !== undefined && body.logo !== null) {
      const rawLogo = String(body.logo).trim();
      logo = rawLogo.length ? rawLogo : null;
    }

    let correo: string | null = null;
    if (body.correo !== undefined && body.correo !== null) {
      const rawCorreo = String(body.correo).trim();
      correo = rawCorreo.length ? rawCorreo.toLowerCase() : null;
      if (!isValidEmail(correo)) {
        res.status(400).json({ message: 'Correo inválido' });
        return;
      }
    }

    let fecha_instalacion: Date | null = null;
    if (body.fecha_instalacion !== undefined && body.fecha_instalacion !== null) {
      const parsedDate = parseFecha(body.fecha_instalacion);
      if (!parsedDate) {
        res.status(400).json({ message: 'Fecha de instalación inválida' });
        return;
      }
      fecha_instalacion = parsedDate;
    }

    let fecha_fin_soporte: Date | null = null;
    if (body.fecha_fin_soporte !== undefined && body.fecha_fin_soporte !== null) {
      const parsedDate = parseFecha(body.fecha_fin_soporte);
      if (!parsedDate) {
        res.status(400).json({ message: 'Fecha de fin de soporte inválida' });
        return;
      }
      fecha_fin_soporte = parsedDate;
    }

    const latitud = parseOptionalCoordinate(body.latitud, 'latitud');
    const longitud = parseOptionalCoordinate(body.longitud, 'longitud');

    const data: Prisma.Clientes_CROVUncheckedCreateInput = {
      nombre_cliente,
      nombre_negocio,
      direccion,
      telefono,
      telefono_negocio,
      correo,
      tipo_sistema,
      fecha_instalacion,
      fecha_fin_soporte,
    };

    if (logo !== null) {
      data.logo = logo;
    }

    if (idGiroComercial !== undefined) {
      data.id_giro_comercial = idGiroComercial;
    }

    if (latitud !== undefined) {
      data.latitud = latitud;
    }

    if (longitud !== undefined) {
      data.longitud = longitud;
    }

    const cliente = await prisma.clientes_CROV.create({
      data,
      include: { giroComercial: true },
    });

    res.status(201).json({ message: 'Cliente CROV creado', cliente });
  } catch (error: any) {
    if (error?.status) {
      res.status(error.status).json({ message: error.message ?? 'Error al crear cliente CROV' });
      return;
    }
    console.error('Error al crear cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al crear cliente CROV' });
  }
};

export const actualizarClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Prisma.Clientes_CROVUncheckedUpdateInput = {};

    if (body.nombre_cliente !== undefined) {
      const value = String(body.nombre_cliente).trim();
      if (!value) {
        res.status(400).json({ message: 'El nombre del cliente no puede estar vacío' });
        return;
      }
      data.nombre_cliente = value;
    }

    if (body.nombre_negocio !== undefined) {
      const value = String(body.nombre_negocio).trim();
      if (!value) {
        res.status(400).json({ message: 'El nombre del negocio no puede estar vacío' });
        return;
      }
      data.nombre_negocio = value;
    }

    if (body.tipo_sistema !== undefined) {
      if (body.tipo_sistema === null || body.tipo_sistema === '') {
        res.status(400).json({ message: 'El tipo de sistema es obligatorio' });
        return;
      }
      const tipo = parseTipoSistema(body.tipo_sistema);
      if (!tipo) {
        res.status(400).json({ message: 'Tipo de sistema inválido' });
        return;
      }
      data.tipo_sistema = tipo;
    }

    if (body.direccion !== undefined) {
      const value = body.direccion === null ? null : String(body.direccion).trim();
      data.direccion = value ? value : null;
    }

    if (body.telefono !== undefined) {
      const value = body.telefono === null ? null : String(body.telefono).trim();
      const telefonoValue = value ? value : null;
      data.telefono = telefonoValue;
      if (body.telefono_negocio === undefined) {
        data.telefono_negocio = telefonoValue;
      }
    }

    if (body.telefono_negocio !== undefined) {
      const value = body.telefono_negocio === null ? null : String(body.telefono_negocio).trim();
      data.telefono_negocio = value ? value : null;
    }

    if (body.correo !== undefined) {
      if (body.correo === null || body.correo === '') {
        data.correo = null;
      } else {
        const correo = String(body.correo).trim().toLowerCase();
        if (!isValidEmail(correo)) {
          res.status(400).json({ message: 'Correo inválido' });
          return;
        }
        data.correo = correo;
      }
    }

    if (body.logo !== undefined) {
      if (body.logo === null || body.logo === '') {
        data.logo = null;
      } else {
        const value = String(body.logo).trim();
        data.logo = value.length ? value : null;
      }
    }

    if (body.fecha_instalacion !== undefined) {
      if (body.fecha_instalacion === null || body.fecha_instalacion === '') {
        data.fecha_instalacion = null;
      } else {
        const parsedDate = parseFecha(body.fecha_instalacion);
        if (!parsedDate) {
          res.status(400).json({ message: 'Fecha de instalación inválida' });
          return;
        }
        data.fecha_instalacion = parsedDate;
      }
    }

    if (body.fecha_fin_soporte !== undefined) {
      if (body.fecha_fin_soporte === null || body.fecha_fin_soporte === '') {
        data.fecha_fin_soporte = null;
      } else {
        const parsedDate = parseFecha(body.fecha_fin_soporte);
        if (!parsedDate) {
          res.status(400).json({ message: 'Fecha de fin de soporte inválida' });
          return;
        }
        data.fecha_fin_soporte = parsedDate;
      }
    }

    const idGiroComercial = await parseOptionalGiroComercialId(body.id_giro_comercial);
    if (idGiroComercial !== undefined) {
      data.id_giro_comercial = idGiroComercial;
    }

    const latitud = parseOptionalCoordinate(body.latitud, 'latitud');
    if (latitud !== undefined) {
      data.latitud = latitud;
    }

    const longitud = parseOptionalCoordinate(body.longitud, 'longitud');
    if (longitud !== undefined) {
      data.longitud = longitud;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const cliente = await prisma.clientes_CROV.update({
      where: { id },
      data,
      include: { giroComercial: true },
    });

    res.json({ message: 'Cliente CROV actualizado', cliente });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }
    if (error?.status) {
      res.status(error.status).json({ message: error.message ?? 'Error al actualizar cliente CROV' });
      return;
    }
    console.error('Error al actualizar cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar cliente CROV' });
  }
};

export const actualizarFechaFinSoporteClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    if (!('fecha_fin_soporte' in req.body)) {
      res.status(400).json({ message: 'Se requiere el campo fecha_fin_soporte' });
      return;
    }

    let fecha_fin_soporte: Date | null = null;
    const value = (req.body as Record<string, any>).fecha_fin_soporte;
    if (value !== null && value !== '') {
      const parsedDate = parseFecha(value);
      if (!parsedDate) {
        res.status(400).json({ message: 'Fecha de fin de soporte inválida' });
        return;
      }
      fecha_fin_soporte = parsedDate;
    }

    const cliente = await prisma.clientes_CROV.update({
      where: { id },
      data: { fecha_fin_soporte },
    });

    res.json({ message: 'Fecha de fin de soporte actualizada', cliente });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar fecha de fin de soporte del cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar la fecha de fin de soporte' });
  }
};

export const eliminarClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.clientes_CROV.delete({ where: { id } });

    res.json({ message: 'Cliente CROV eliminado' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar cliente CROV' });
  }
};

/* ------------------ Mantenimientos Clientes CROV ------------------ */

export const listarMantenimientosClientesCROV: RequestHandler = async (req, res) => {
  try {
    const { clienteId, activo } = req.query as Record<string, any>;

    const where: Prisma.MantenimientoClienteCROVWhereInput = {};

    if (clienteId !== undefined) {
      const parsedClienteId = Number(clienteId);
      if (!Number.isInteger(parsedClienteId) || parsedClienteId <= 0) {
        res.status(400).json({ message: 'El parámetro clienteId es inválido' });
        return;
      }
      where.id_cliente_crov = parsedClienteId;
    }

    if (activo !== undefined) {
      const parsedActivo = Number(activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El parámetro activo debe ser 0 o 1' });
        return;
      }
      where.activo = parsedActivo;
    }

    const mantenimientos = await prisma.mantenimientoClienteCROV.findMany({
      where,
      orderBy: { fecha_mantenimiento: 'desc' },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.json(mantenimientos);
  } catch (error) {
    console.error('Error al listar mantenimientos de clientes CROV:', error);
    res.status(500).json({ message: 'Error al listar mantenimientos de clientes CROV' });
  }
};

export const obtenerMantenimientoClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const mantenimiento = await prisma.mantenimientoClienteCROV.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    if (!mantenimiento) {
      res.status(404).json({ message: 'Mantenimiento de cliente CROV no encontrado' });
      return;
    }

    res.json(mantenimiento);
  } catch (error) {
    console.error('Error al obtener mantenimiento de cliente CROV:', error);
    res.status(500).json({ message: 'Error al obtener mantenimiento de cliente CROV' });
  }
};

export const crearMantenimientoClienteCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const idCliente = Number(body.id_cliente_crov);
    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      res.status(400).json({ message: 'El id del cliente CROV es obligatorio y debe ser un número válido' });
      return;
    }

    const cliente = await prisma.clientes_CROV.findUnique({ where: { id: idCliente }, select: { id: true } });
    if (!cliente) {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }

    const parsedFechaMantenimiento = parseFecha(body.fecha_mantenimiento);
    if (!parsedFechaMantenimiento) {
      res.status(400).json({ message: 'La fecha de mantenimiento es obligatoria y debe ser válida' });
      return;
    }

    const fechaMantenimiento = normalizeDateOnly(parsedFechaMantenimiento);
    const fechaProximoMantenimiento = addMonthsToDate(fechaMantenimiento, 4);

    let comentarios: string | null = null;
    if (body.comentarios !== undefined && body.comentarios !== null) {
      const rawComentarios = String(body.comentarios).trim();
      comentarios = rawComentarios.length ? rawComentarios : null;
    }

    let activo = 1;
    if (body.activo !== undefined && body.activo !== null && body.activo !== '') {
      const parsedActivo = Number(body.activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El valor de activo debe ser 0 o 1' });
        return;
      }
      activo = parsedActivo;
    }

    const mantenimiento = await prisma.mantenimientoClienteCROV.create({
      data: {
        id_cliente_crov: idCliente,
        fecha_mantenimiento: fechaMantenimiento,
        fecha_proximo_mantenimiento: fechaProximoMantenimiento,
        comentarios,
        activo,
      },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.status(201).json({ message: 'Mantenimiento de cliente CROV creado', mantenimiento });
  } catch (error) {
    console.error('Error al crear mantenimiento de cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al crear mantenimiento de cliente CROV' });
  }
};

export const actualizarMantenimientoClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const data: Prisma.MantenimientoClienteCROVUncheckedUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'id_cliente_crov')) {
      const idCliente = Number(body.id_cliente_crov);
      if (!Number.isInteger(idCliente) || idCliente <= 0) {
        res.status(400).json({ message: 'El id del cliente CROV debe ser un número válido' });
        return;
      }
      const cliente = await prisma.clientes_CROV.findUnique({ where: { id: idCliente }, select: { id: true } });
      if (!cliente) {
        res.status(404).json({ message: 'Cliente CROV no encontrado' });
        return;
      }
      data.id_cliente_crov = idCliente;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fecha_proximo_mantenimiento') &&
        !Object.prototype.hasOwnProperty.call(body, 'fecha_mantenimiento')) {
      res.status(400).json({ message: 'La fecha próxima de mantenimiento se calcula automáticamente a partir de la fecha de mantenimiento' });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fecha_mantenimiento')) {
      if (body.fecha_mantenimiento === null || body.fecha_mantenimiento === '') {
        res.status(400).json({ message: 'La fecha de mantenimiento no puede ser nula' });
        return;
      }
      const parsedFechaMantenimiento = parseFecha(body.fecha_mantenimiento);
      if (!parsedFechaMantenimiento) {
        res.status(400).json({ message: 'La fecha de mantenimiento proporcionada es inválida' });
        return;
      }
      const fechaMantenimiento = normalizeDateOnly(parsedFechaMantenimiento);
      data.fecha_mantenimiento = fechaMantenimiento;
      data.fecha_proximo_mantenimiento = addMonthsToDate(fechaMantenimiento, 4);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'comentarios')) {
      if (body.comentarios === null || body.comentarios === undefined) {
        data.comentarios = null;
      } else {
        const rawComentarios = String(body.comentarios).trim();
        data.comentarios = rawComentarios.length ? rawComentarios : null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
      const parsedActivo = Number(body.activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El valor de activo debe ser 0 o 1' });
        return;
      }
      data.activo = parsedActivo;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const mantenimiento = await prisma.mantenimientoClienteCROV.update({
      where: { id },
      data,
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.json({ message: 'Mantenimiento de cliente CROV actualizado', mantenimiento });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Mantenimiento de cliente CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar mantenimiento de cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar mantenimiento de cliente CROV' });
  }
};

export const eliminarMantenimientoClienteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.mantenimientoClienteCROV.delete({ where: { id } });

    res.json({ message: 'Mantenimiento de cliente CROV eliminado' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Mantenimiento de cliente CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar mantenimiento de cliente CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar mantenimiento de cliente CROV' });
  }
};

/* --------------------------- Prospectos CROV --------------------------- */

export const listarProspectosCROV: RequestHandler = async (_req, res) => {
  try {
    const prospectos = await prisma.prospectos_CROV.findMany({
      orderBy: { id: 'desc' },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });
    res.json(prospectos);
  } catch (error) {
    console.error('Error al listar prospectos CROV:', error);
    res.status(500).json({ message: 'Error al obtener prospectos CROV' });
  }
};

export const obtenerProspectoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const prospecto = await prisma.prospectos_CROV.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    if (!prospecto) {
      res.status(404).json({ message: 'Prospecto CROV no encontrado' });
      return;
    }

    res.json(prospecto);
  } catch (error) {
    console.error('Error al obtener prospecto CROV:', error);
    res.status(500).json({ message: 'Error al obtener prospecto CROV' });
  }
};

export const crearProspectoCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) {
      res.status(400).json({ message: 'El nombre del prospecto es obligatorio' });
      return;
    }

    const telefono = String(body.telefono ?? '').trim();
    if (!telefono) {
      res.status(400).json({ message: 'El teléfono del prospecto es obligatorio' });
      return;
    }

    const interes = parseInteresProspecto(body.interes);
    if (!interes) {
      res.status(400).json({ message: 'Interés del prospecto inválido' });
      return;
    }

    let correo: string | null = null;
    if (body.correo !== undefined && body.correo !== null) {
      const rawCorreo = String(body.correo).trim().toLowerCase();
      if (rawCorreo.length > 0) {
        if (!isValidEmail(rawCorreo)) {
          res.status(400).json({ message: 'Correo del prospecto inválido' });
          return;
        }
        correo = rawCorreo;
      }
    }

    let idClienteCrov: number | null = null;
    if (body.id_cliente_crov !== undefined && body.id_cliente_crov !== null && body.id_cliente_crov !== '') {
      const parsedId = Number(body.id_cliente_crov);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        res.status(400).json({ message: 'El id del cliente CROV es inválido' });
        return;
      }
      const cliente = await prisma.clientes_CROV.findUnique({ where: { id: parsedId }, select: { id: true } });
      if (!cliente) {
        res.status(404).json({ message: 'Cliente CROV no encontrado' });
        return;
      }
      idClienteCrov = parsedId;
    }

    const nombre_negocio = body.nombre_negocio ? String(body.nombre_negocio).trim() : null;
    const direccion_negocio = body.direccion_negocio ? String(body.direccion_negocio).trim() : null;

    let activo = 1;
    if (body.activo !== undefined && body.activo !== null) {
      const parsedActivo = Number(body.activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El valor de activo debe ser 0 o 1' });
        return;
      }
      activo = parsedActivo;
    }

    const prospecto = await prisma.prospectos_CROV.create({
      data: {
        nombre,
        telefono,
        interes,
        correo,
        id_cliente_crov: idClienteCrov,
        nombre_negocio: nombre_negocio && nombre_negocio.length ? nombre_negocio : null,
        direccion_negocio: direccion_negocio && direccion_negocio.length ? direccion_negocio : null,
        activo,
      },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.status(201).json({ message: 'Prospecto CROV creado', prospecto });
  } catch (error) {
    console.error('Error al crear prospecto CROV:', error);
    res.status(500).json({ message: 'Error interno al crear prospecto CROV' });
  }
};

export const actualizarProspectoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const data: Prisma.Prospectos_CROVUncheckedUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'nombre')) {
      const nombre = String(body.nombre ?? '').trim();
      if (!nombre) {
        res.status(400).json({ message: 'El nombre del prospecto es obligatorio' });
        return;
      }
      data.nombre = nombre;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'telefono')) {
      const telefono = String(body.telefono ?? '').trim();
      if (!telefono) {
        res.status(400).json({ message: 'El teléfono del prospecto es obligatorio' });
        return;
      }
      data.telefono = telefono;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'interes')) {
      if (body.interes === null || body.interes === '') {
        res.status(400).json({ message: 'El interés del prospecto es obligatorio' });
        return;
      }
      const interes = parseInteresProspecto(body.interes);
      if (!interes) {
        res.status(400).json({ message: 'Interés del prospecto inválido' });
        return;
      }
      data.interes = interes;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'correo')) {
      if (body.correo === null || body.correo === '') {
        data.correo = null;
      } else {
        const correo = String(body.correo).trim().toLowerCase();
        if (!isValidEmail(correo)) {
          res.status(400).json({ message: 'Correo del prospecto inválido' });
          return;
        }
        data.correo = correo;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'id_cliente_crov')) {
      if (body.id_cliente_crov === null || body.id_cliente_crov === '') {
        data.id_cliente_crov = null;
      } else {
        const parsedId = Number(body.id_cliente_crov);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          res.status(400).json({ message: 'El id del cliente CROV es inválido' });
          return;
        }
        const cliente = await prisma.clientes_CROV.findUnique({ where: { id: parsedId }, select: { id: true } });
        if (!cliente) {
          res.status(404).json({ message: 'Cliente CROV no encontrado' });
          return;
        }
        data.id_cliente_crov = parsedId;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'nombre_negocio')) {
      if (body.nombre_negocio === null || body.nombre_negocio === '') {
        data.nombre_negocio = null;
      } else {
        data.nombre_negocio = String(body.nombre_negocio).trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'direccion_negocio')) {
      if (body.direccion_negocio === null || body.direccion_negocio === '') {
        data.direccion_negocio = null;
      } else {
        data.direccion_negocio = String(body.direccion_negocio).trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
      const parsedActivo = Number(body.activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El valor de activo debe ser 0 o 1' });
        return;
      }
      data.activo = parsedActivo;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const prospecto = await prisma.prospectos_CROV.update({
      where: { id },
      data,
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.json({ message: 'Prospecto CROV actualizado', prospecto });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Prospecto CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar prospecto CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar prospecto CROV' });
  }
};

export const registrarUltimaNotificacionProspectoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const prospecto = await prisma.prospectos_CROV.update({
      where: { id },
      data: { ultima_notificacion: new Date() },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.json({ message: 'Última notificación registrada para el prospecto CROV', prospecto });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Prospecto CROV no encontrado' });
      return;
    }
    console.error('Error al registrar la última notificación del prospecto CROV:', error);
    res.status(500).json({ message: 'Error interno al registrar la última notificación del prospecto CROV' });
  }
};

export const eliminarProspectoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.prospectos_CROV.delete({ where: { id } });

    res.json({ message: 'Prospecto CROV eliminado' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Prospecto CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar prospecto CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar prospecto CROV' });
  }
};

export const obtenerProspectosPorClienteCROV: RequestHandler = async (req, res) => {
  try {
    const idCliente = Number(req.params.idCliente);
    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      res.status(400).json({ message: 'ID del cliente inválido' });
      return;
    }

    const prospectos = await prisma.prospectos_CROV.findMany({
      where: { id_cliente_crov: idCliente },
      orderBy: { id: 'desc' },
      include: {
        cliente: {
          select: { id: true, nombre_cliente: true, nombre_negocio: true },
        },
      },
    });

    res.json(prospectos);
  } catch (error) {
    console.error('Error al obtener prospectos por cliente CROV:', error);
    res.status(500).json({ message: 'Error al obtener prospectos del cliente CROV' });
  }
};

/* --------------------------- Empleados CROV --------------------------- */

export const listarEmpleadosCROV: RequestHandler = async (_req, res) => {
  try {
    const empleados = await prisma.empleados_CROV.findMany({
      orderBy: { id: 'desc' },
      include: {
        sistema_residencia: {
          select: { id: true, nombre: true },
        }
      }
    });
    res.json(empleados);
  } catch (error) {
    console.error('Error al listar empleados CROV:', error);
    res.status(500).json({ message: 'Error al obtener empleados CROV' });
  }
};

export const obtenerEmpleadoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const empleado = await prisma.empleados_CROV.findUnique({ where: { id } });
    if (!empleado) {
      res.status(404).json({ message: 'Empleado CROV no encontrado' });
      return;
    }

    res.json(empleado);
  } catch (error) {
    console.error('Error al obtener empleado CROV:', error);
    res.status(500).json({ message: 'Error al obtener empleado CROV' });
  }
};

export const crearEmpleadoCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const nombre_completo = String(body.nombre_completo ?? '').trim();
    if (!nombre_completo) {
      res.status(400).json({ message: 'El nombre completo es obligatorio' });
      return;
    }

    let fecha_nacimiento : Date | null = null;
    if (body.fecha_nacimiento) {
      fecha_nacimiento = parseFecha(body.fecha_nacimiento);
    }

    let celular = String(body.celular ?? '').trim();
    celular = onlyDigits(celular);


    const correoRaw = String(body.correo ?? '').trim().toLowerCase();
    if (!correoRaw || !isValidEmail(correoRaw)) {
      res.status(400).json({ message: 'El correo es obligatorio y debe ser válido' });
      return;
    }
    const password = String(body.password ?? '').trim();
    if (!password) {
      res.status(400).json({ message: 'La contraseña es obligatoria' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const puesto = parsePuestoEmpleado(body.puesto);
    if (!puesto) {
      res.status(400).json({ message: 'Puesto inválido' });
      return;
    }

    let activo = 1;
    if (body.activo !== undefined && body.activo !== null) {
      const value = Number(body.activo);
      if (value !== 0 && value !== 1) {
        res.status(400).json({ message: 'El campo activo debe ser 0 o 1' });
        return;
      }
      activo = value;
    }
   const totalAhorro = parseOptionalDecimal(body.totalAhorro, 'totalAhorro');
    const montoAhorro = parseOptionalDecimal(body.montoAhorro, 'montoAhorro');
    const residenteParsed = parseOptionalFlag(body.residente, 'residente');
    const residente = residenteParsed === undefined ? 0 : residenteParsed;

    let id_sistema_residencia: number | null = null;

    if (residente === 1) {
      const idProyectoInput = body.idProyectoResidencia;
      
      if (!idProyectoInput) {
        res.status(400).json({ message: 'El proyecto de residencia es obligatorio' });
        return;
      }

      const parsedId = Number(idProyectoInput);
      if (isNaN(parsedId) || parsedId <= 0) {
        res.status(400).json({ message: 'El proyecto de residencia no es válido' });
        return;
      }

      const existsSistema = await prisma.sistemasCROV.findUnique({where: {id:parsedId}});

      if (!existsSistema){
        return res.status(400).json({ message: 'El proyecto no fue encontrado.' });
      }

      id_sistema_residencia = parsedId;
    } else {
      id_sistema_residencia = null;
    }

    const empleado = await prisma.empleados_CROV.create({
      data: {
        nombre_completo,
        fecha_nacimiento,
        celular,
        correo: correoRaw,
        password: passwordHash,
        puesto,
        activo,
        totalAhorro: totalAhorro ?? 0,
        monto_ahorro: montoAhorro ?? 0,
        residente,
        id_sistema_residencia,
      },
    });

    res.status(201).json({ message: 'Empleado CROV creado', empleado });
  } catch (error) {
    console.error('Error al crear empleado CROV:', error);
    res.status(500).json({ message: 'Error interno al crear empleado CROV' });
  }
};

export const actualizarEmpleadoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Record<string, any> = {};

    if (body.nombre_completo !== undefined) {
      const value = String(body.nombre_completo).trim();
      if (!value) {
        res.status(400).json({ message: 'El nombre completo no puede estar vacío' });
        return;
      }
      data.nombre_completo = value;
    }

    if (body.fecha_nacimiento !== undefined) {
      const parsedDate = parseFecha(body.fecha_nacimiento);
      data.fecha_nacimiento = parsedDate;
    }

    if (body.celular !== undefined) {
      const value = String(body.celular ?? '').trim();
      const digits = onlyDigits(value);
      data.celular = digits;
    }

    if (body.correo !== undefined) {
      const value = String(body.correo ?? '').trim().toLowerCase();
      if (!value || !isValidEmail(value)) {
        res.status(400).json({ message: 'El correo es obligatorio y debe ser válido' });
        return;
      }
      data.correo = value;
    }

    if (body.color_perfil !== undefined) {
      if (body.color_perfil === null || body.color_perfil === '') {
        data.color_perfil = null;
      } else {
        const colorStr = String(body.color_perfil).trim();
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!hexRegex.test(colorStr)) {
          res.status(400).json({ message: 'El color debe ser un hexadecimal válido (ej: #F97316)' });
          return; 
        }
        data.color_perfil = colorStr;
      }
    }

    if (body.puesto !== undefined) {
      const puesto = parsePuestoEmpleado(body.puesto);
      if (!puesto) {
        res.status(400).json({ message: 'Puesto inválido' });
        return;
      }
      data.puesto = puesto;
    }

    if (body.activo !== undefined) {
      const value = Number(body.activo);
      if (value !== 0 && value !== 1) {
        res.status(400).json({ message: 'El campo activo debe ser 0 o 1' });
        return;
      }
      data.activo = value;
    }

    if (body.password !== undefined) {
  const password = String(body.password).trim();

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }
}

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }
    if (body.totalAhorro !== undefined) {
      const totalAhorro = parseOptionalDecimal(body.totalAhorro, 'totalAhorro');
      data.totalAhorro = totalAhorro ?? null;
    }
    if (body.montoAhorro !== undefined) {
      const montoAhorro = parseOptionalDecimal(body.montoAhorro, 'montoAhorro');
      data.monto_ahorro = montoAhorro ?? null;
    }

    if (body.residente !== undefined) {
      const residente = parseOptionalFlag(body.residente, 'residente');
      if (residente === undefined) {
        return res.status(400).json({ message: 'El campo residente debe ser 0 o 1' });
      }

      data.residente = residente;

      if (residente === 1) {
        const idProyectoInput = body.idProyectoResidencia;

        if (!idProyectoInput) {
          return res.status(400).json({
            message: 'El proyecto de residencia es obligatorio',
          });
        }

        const parsedId = Number(idProyectoInput);
        if (isNaN(parsedId) || parsedId <= 0) {
          return res.status(400).json({
            message: 'El proyecto de residencia no es válido',
          });
        }

        const existsSistema = await prisma.sistemasCROV.findUnique({
          where: { id: parsedId },
        });

        if (!existsSistema) {
          return res.status(400).json({
            message: 'El proyecto de residencia no existe',
          });
        }

        data.id_sistema_residencia = parsedId;
      } else {
        // residente = 0 → limpiar proyecto
        data.id_sistema_residencia = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: 'No se proporcionaron cambios para actualizar',
      });
    }

    const empleado = await prisma.empleados_CROV.update({
      where: { id },
      data,
    });

    res.json({ message: 'Empleado CROV actualizado', empleado });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Empleado CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar empleado CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar empleado CROV' });
  }
};

export const eliminarEmpleadoCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.empleados_CROV.delete({ where: { id } });

    res.json({ message: 'Empleado CROV eliminado' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Empleado CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar empleado CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar empleado CROV' });
  }
};



/* --------------------------- Tickets soporte CROV --------------------------- */

function sanitizeNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

export const listarTicketsSoporteCROV: RequestHandler = async (_req, res) => {
  try {
    const tickets = await prisma.ticketSoporteCROV.findMany({
      include: { empleado: true, cliente: true },
      orderBy: { fecha_registro: 'desc' },
    });
    res.json(tickets);
  } catch (error) {
    console.error('Error al listar tickets de soporte CROV:', error);
    res.status(500).json({ message: 'Error al obtener tickets de soporte CROV' });
  }
};

export const obtenerTicketSoporteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const ticket = await prisma.ticketSoporteCROV.findUnique({
      where: { id },
      include: { empleado: true, cliente: true },
    });

    if (!ticket) {
      res.status(404).json({ message: 'Ticket de soporte CROV no encontrado' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error al obtener ticket de soporte CROV:', error);
    res.status(500).json({ message: 'Error interno al obtener el ticket de soporte CROV' });
  }
};

async function ensureEmpleadoCrovExists(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID_EMPLEADO_INVALIDO');
  }
  const empleado = await prisma.empleados_CROV.findUnique({ where: { id } });
  if (!empleado) {
    throw new Error('EMPLEADO_NO_ENCONTRADO');
  }
}

async function ensureClienteExists(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID_CLIENTE_INVALIDO');
  }
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    throw new Error('CLIENTE_NO_ENCONTRADO');
  }
}

async function ensureSistemaCrovExists(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID_SISTEMA_INVALIDO');
  }
  const sistema = await prisma.sistemasCROV.findUnique({ where: { id, activo: 1 } });
  if (!sistema) {
    throw new Error('SISTEMA_NO_ENCONTRADO');
  }
}

async function ensureSprintCrovExists(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID_SPRINT_INVALIDO');
  }
  const sprint = await prisma.sprintCROV.findUnique({ where: { id } });
  if (!sprint) {
    throw new Error('SPRINT_NO_ENCONTRADO');
  }
}

export const crearTicketSoporteCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const folio = sanitizeNullableString(body.folio);
    if (!folio) {
      res.status(400).json({ message: 'El folio es obligatorio' });
      return;
    }

    const nombre_cliente = sanitizeNullableString(body.nombre_cliente);
    if (!nombre_cliente) {
      res.status(400).json({ message: 'El nombre del cliente es obligatorio' });
      return;
    }

    const nombre_negocio = sanitizeNullableString(body.nombre_negocio);
    if (!nombre_negocio) {
      res.status(400).json({ message: 'El nombre del negocio es obligatorio' });
      return;
    }

    const garantia = parseGarantiaTicket(body.garantia);
    if (!garantia) {
      res.status(400).json({ message: 'Garantía inválida. Use SI o NO' });
      return;
    }

    const tipo_problema = parseTipoProblemaTicket(body.tipo_problema);
    if (!tipo_problema) {
      res.status(400).json({
        message:
          'Tipo de problema inválido. Use DUDA | FALLA_SISTEMA | MANTENIMIENTO | ERROR_CLIENTE | ASISTENCIA_CON_EL_SISTEMA | INSTALACION_DE_DEMO | CAMBIO',
      });
      return;
    }

    const prioridad = parsePrioridadTicket(body.prioridad) ?? PrioridadTicketSoporteCROV.MEDIA;
    const estado_solicitud = parseEstadoSolicitudTicket(body.estado_solicitud) ?? EstadoSolicitudTicketCROV.RECIBIDO;

    let correo: string | null | undefined;
    if (body.correo !== undefined) {
      const email = sanitizeNullableString(body.correo);
      if (email && !isValidEmail(email)) {
        res.status(400).json({ message: 'Correo electrónico inválido' });
        return;
      }
      correo = email ? email.toLowerCase() : null;
    }

    let telefono: string | null | undefined;
    if (body.telefono !== undefined) {
      const digits = onlyDigits(String(body.telefono));
      telefono = digits.length ? digits.slice(0, 15) : null;
    }

    let fecha_registro: Date | undefined;
    if (body.fecha_registro !== undefined && body.fecha_registro !== null && body.fecha_registro !== '') {
      const parsedDate = parseFecha(body.fecha_registro);
      if (!parsedDate) {
        res.status(400).json({ message: 'Fecha de registro inválida' });
        return;
      }
      fecha_registro = parsedDate;
    }

    let fecha_solucion: Date | null | undefined;
    if (body.fecha_solucion !== undefined) {
      if (body.fecha_solucion === null || body.fecha_solucion === '') {
        fecha_solucion = null;
      } else {
        const parsedDate = parseFecha(body.fecha_solucion);
        if (!parsedDate) {
          res.status(400).json({ message: 'Fecha de solución inválida' });
          return;
        }
        fecha_solucion = parsedDate;
      }
    }

    let id_empleado_crov: number | null | undefined;
    if (body.id_empleado_crov !== undefined) {
      if (body.id_empleado_crov === null || body.id_empleado_crov === '') {
        id_empleado_crov = null;
      } else {
        const empleadoId = Number(body.id_empleado_crov);
        try {
          await ensureEmpleadoCrovExists(empleadoId);
        } catch (err) {
          if ((err as Error).message === 'ID_EMPLEADO_INVALIDO') {
            res.status(400).json({ message: 'El id del empleado CROV es inválido' });
            return;
          }
          if ((err as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
            res.status(404).json({ message: 'Empleado CROV no encontrado' });
            return;
          }
          throw err;
        }
        id_empleado_crov = empleadoId;
      }
    }

    let id_cliente: number | null | undefined;
    if (body.id_cliente !== undefined) {
      if (body.id_cliente === null || body.id_cliente === '') {
        id_cliente = null;
      } else {
        const clienteId = Number(body.id_cliente);
        try {
          await ensureClienteExists(clienteId);
        } catch (err) {
          if ((err as Error).message === 'ID_CLIENTE_INVALIDO') {
            res.status(400).json({ message: 'El id del cliente es inválido' });
            return;
          }
          if ((err as Error).message === 'CLIENTE_NO_ENCONTRADO') {
            res.status(404).json({ message: 'Cliente no encontrado' });
            return;
          }
          throw err;
        }
        id_cliente = clienteId;
      }
    }

    const data: Prisma.TicketSoporteCROVUncheckedCreateInput = {
      folio,
      nombre_cliente,
      nombre_negocio,
      garantia,
      tipo_problema,
      prioridad,
      estado_solicitud,
    };

    if (correo !== undefined) data.correo = correo;
    if (telefono !== undefined) data.telefono = telefono;
    if (fecha_registro) data.fecha_registro = fecha_registro;
    if (body.descripcion !== undefined) data.descripcion = sanitizeNullableString(body.descripcion);
    if (body.descripcion_solucion !== undefined)
      data.descripcion_solucion = sanitizeNullableString(body.descripcion_solucion);
    if (fecha_solucion !== undefined) data.fecha_solucion = fecha_solucion;
    if (id_empleado_crov !== undefined) data.id_empleado_crov = id_empleado_crov ?? undefined;
    if (id_cliente !== undefined) data.id_cliente = id_cliente;
    if (body.tiempo_atencion !== undefined) data.tiempo_atencion = sanitizeNullableString(body.tiempo_atencion);

    const ticket = await prisma.ticketSoporteCROV.create({
      data,
      include: { empleado: true, cliente: true },
    });

    res.status(201).json({ message: 'Ticket de soporte CROV creado', ticket });
  } catch (error) {
    console.error('Error al crear ticket de soporte CROV:', error);
    res.status(500).json({ message: 'Error interno al crear ticket de soporte CROV' });
  }
};

export const actualizarTicketSoporteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Prisma.TicketSoporteCROVUncheckedUpdateInput = {};

    if (body.folio !== undefined) {
      const folio = sanitizeNullableString(body.folio);
      if (!folio) {
        res.status(400).json({ message: 'El folio no puede estar vacío' });
        return;
      }
      data.folio = folio;
    }

    if (body.nombre_cliente !== undefined) {
      const nombre_cliente = sanitizeNullableString(body.nombre_cliente);
      if (!nombre_cliente) {
        res.status(400).json({ message: 'El nombre del cliente no puede estar vacío' });
        return;
      }
      data.nombre_cliente = nombre_cliente;
    }

    if (body.nombre_negocio !== undefined) {
      const nombre_negocio = sanitizeNullableString(body.nombre_negocio);
      if (!nombre_negocio) {
        res.status(400).json({ message: 'El nombre del negocio no puede estar vacío' });
        return;
      }
      data.nombre_negocio = nombre_negocio;
    }

    if (body.garantia !== undefined) {
      const garantia = parseGarantiaTicket(body.garantia);
      if (!garantia) {
        res.status(400).json({ message: 'Garantía inválida. Use SI o NO' });
        return;
      }
      data.garantia = garantia;
    }

    if (body.tipo_problema !== undefined) {
      const tipo_problema = parseTipoProblemaTicket(body.tipo_problema);
      if (!tipo_problema) {
        res.status(400).json({
          message:
            'Tipo de problema inválido. Use DUDA | FALLA_SISTEMA | MANTENIMIENTO | ERROR_CLIENTE | ASISTENCIA_CON_EL_SISTEMA | INSTALACION_DE_DEMO | CAMBIO',
        });
        return;
      }
      data.tipo_problema = tipo_problema;
    }

    if (body.prioridad !== undefined) {
      const prioridad = parsePrioridadTicket(body.prioridad);
      if (!prioridad) {
        res.status(400).json({ message: 'Prioridad inválida. Use BAJA | MEDIA | URGENTE' });
        return;
      }
      data.prioridad = prioridad;
    }

    if (body.estado_solicitud !== undefined) {
      const estado = parseEstadoSolicitudTicket(body.estado_solicitud);
      if (!estado) {
        res.status(400).json({
          message:
            'Estado de solicitud inválido. Use RECIBIDO | EN_PROCESO | RESUELTO | PENDIENTE | SIN_SOPORTE | CLIENTE_NO_RESPONDE',
        });
        return;
      }
      data.estado_solicitud = estado;
    }

    if (body.correo !== undefined) {
      const email = sanitizeNullableString(body.correo);
      if (email && !isValidEmail(email)) {
        res.status(400).json({ message: 'Correo electrónico inválido' });
        return;
      }
      data.correo = email ? email.toLowerCase() : null;
    }

    if (body.telefono !== undefined) {
      const digits = onlyDigits(String(body.telefono));
      data.telefono = digits.length ? digits.slice(0, 15) : null;
    }

    if (body.descripcion !== undefined) {
      data.descripcion = sanitizeNullableString(body.descripcion);
    }

    if (body.descripcion_solucion !== undefined) {
      data.descripcion_solucion = sanitizeNullableString(body.descripcion_solucion);
    }

    if (body.tiempo_atencion !== undefined) {
      data.tiempo_atencion = sanitizeNullableString(body.tiempo_atencion);
    }

    if (body.fecha_registro !== undefined) {
      if (body.fecha_registro === null || body.fecha_registro === '') {
        res.status(400).json({ message: 'La fecha de registro no puede ser nula' });
        return;
      }
      const parsedDate = parseFecha(body.fecha_registro);
      if (!parsedDate) {
        res.status(400).json({ message: 'Fecha de registro inválida' });
        return;
      }
      data.fecha_registro = parsedDate;
    }

    if (body.fecha_solucion !== undefined) {
      if (body.fecha_solucion === null || body.fecha_solucion === '') {
        data.fecha_solucion = null;
      } else {
        const parsedDate = parseFecha(body.fecha_solucion);
        if (!parsedDate) {
          res.status(400).json({ message: 'Fecha de solución inválida' });
          return;
        }
        data.fecha_solucion = parsedDate;
      }
    }

    if (body.id_empleado_crov !== undefined) {
      if (body.id_empleado_crov === null || body.id_empleado_crov === '') {
        data.id_empleado_crov = null;
      } else {
        const empleadoId = Number(body.id_empleado_crov);
        try {
          await ensureEmpleadoCrovExists(empleadoId);
        } catch (err) {
          if ((err as Error).message === 'ID_EMPLEADO_INVALIDO') {
            res.status(400).json({ message: 'El id del empleado CROV es inválido' });
            return;
          }
          if ((err as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
            res.status(404).json({ message: 'Empleado CROV no encontrado' });
            return;
          }
          throw err;
        }
        data.id_empleado_crov = empleadoId;
      }
    }

    if (body.id_cliente !== undefined) {
      if (body.id_cliente === null || body.id_cliente === '') {
        data.id_cliente = null;
      } else {
        const clienteId = Number(body.id_cliente);
        try {
          await ensureClienteExists(clienteId);
        } catch (err) {
          if ((err as Error).message === 'ID_CLIENTE_INVALIDO') {
            res.status(400).json({ message: 'El id del cliente es inválido' });
            return;
          }
          if ((err as Error).message === 'CLIENTE_NO_ENCONTRADO') {
            res.status(404).json({ message: 'Cliente no encontrado' });
            return;
          }
          throw err;
        }
        data.id_cliente = clienteId;
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const ticket = await prisma.ticketSoporteCROV.update({
      where: { id },
      data,
      include: { empleado: true, cliente: true },
    });

    res.json({ message: 'Ticket de soporte CROV actualizado', ticket });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Ticket de soporte CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar ticket de soporte CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar ticket de soporte CROV' });
  }
};

export const eliminarTicketSoporteCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.ticketSoporteCROV.delete({ where: { id } });

    res.json({ message: 'Ticket de soporte CROV eliminado' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Ticket de soporte CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar ticket de soporte CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar ticket de soporte CROV' });
  }
};

/* ------------------ Sistemas CROV ------------------ */

export const listarSistemasCROV: RequestHandler = async (_req, res) => {
  try {
    const sistemas = await prisma.sistemasCROV.findMany({
      where: { activo: 1 },
      orderBy: { nombre: 'asc' },
    });

    res.json(sistemas);
  } catch (error) {
    console.error('Error al listar sistemas CROV:', error);
    res.status(500).json({ message: 'Error al listar sistemas CROV' });
  }
};

export const obtenerSistemasCROVConTareasYEmpleados: RequestHandler = async (_req, res) => {
  try {
    const sistemas = await prisma.sistemasCROV.findMany({
      where: { activo: 1 },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        tareas: {
          select: {
            id: true,
            titulo: true,
            estatus: true,
            empleado: {
              select: {
                nombre_completo: true,
                color_perfil: true
              }
            }
          }
        }
      }
    });

    const ordenEstatus = [
      "LISTO",
      "PRUEBAS",
      "IMPLEMENTACION_LISTA",
      "EN_CURSO",
      "POR_HACER",
    ];

    const sistemasOrdenados = sistemas.map((sistema) => ({
      ...sistema,
      tareas: sistema.tareas.sort(
        (a, b) =>
          ordenEstatus.indexOf(a.estatus) -
          ordenEstatus.indexOf(b.estatus)
      ),
    }));

    res.status(200).json(sistemasOrdenados);

  } catch (error) {
    console.error('Error al listar sistemas CROV:', error);
    res.status(500).json({ message: 'Error al listar sistemas CROV' });
  }
}

export const obtenerSistemaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const sistema = await prisma.sistemasCROV.findFirst({ where: { id, activo: 1 } });
    if (!sistema) {
      res.status(404).json({ message: 'Sistema CROV no encontrado' });
      return;
    }

    res.json(sistema);
  } catch (error) {
    console.error('Error al obtener sistema CROV:', error);
    res.status(500).json({ message: 'Error al obtener sistema CROV' });
  }
};

export const crearSistemaCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const nombre = String(body.nombre ?? '').trim();

    if (!nombre) {
      res.status(400).json({ message: 'El nombre es obligatorio' });
      return;
    }

    const sistema = await prisma.sistemasCROV.create({
      data: { nombre, activo: 1 },
    });

    res.status(201).json({ message: 'Sistema CROV creado', sistema });
  } catch (error) {
    console.error('Error al crear sistema CROV:', error);
    res.status(500).json({ message: 'Error interno al crear sistema CROV' });
  }
};

export const actualizarSistemaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Prisma.SistemasCROVUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'nombre')) {
      const nombre = String(body.nombre ?? '').trim();
      if (!nombre) {
        res.status(400).json({ message: 'El nombre es obligatorio' });
        return;
      }
      data.nombre = nombre;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
      const parsedActivo = Number(body.activo);
      if (!Number.isInteger(parsedActivo) || (parsedActivo !== 0 && parsedActivo !== 1)) {
        res.status(400).json({ message: 'El valor de activo debe ser 0 o 1' });
        return;
      }
      data.activo = parsedActivo;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const sistema = await prisma.sistemasCROV.update({ where: { id }, data });

    res.json({ message: 'Sistema CROV actualizado', sistema });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Sistema CROV no encontrado' });
      return;
    }
    console.error('Error al actualizar sistema CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar sistema CROV' });
  }
};

export const eliminarSistemaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const sistema = await prisma.sistemasCROV.update({
      where: { id },
      data: { activo: 0 },
    });

    res.json({ message: 'Sistema CROV eliminado', sistema });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Sistema CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar sistema CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar sistema CROV' });
  }
};

/* ------------------ Sprints y tareas CROV ------------------ */

function parsePrioridadTarea(value: unknown): PrioridadTareaCROV | null {
  return normalizeEnumValue(value, PRIORIDADES_TAREA);
}

function parseEstatusTarea(value: unknown): EstatusTareaCROV | null {
  return normalizeEnumValue(value, ESTATUS_TAREA);
}

function parseTipoTarea(value: unknown): TipoTareaCROV | null {
  return normalizeEnumValue(value, TIPOS_TAREA);
}

export const listarSprintsCROV: RequestHandler = async (req, res) => {
  try {
    const query = (req && typeof req.query === 'object' ? req.query : {}) as Record<string, any>;
    const where: Prisma.SprintCROVWhereInput = {};

    const parsedActivo = parseOptionalFlag(query.activo, 'activo');
    const parsedEnUso = parseOptionalFlag(query.en_uso, 'en_uso');

    if (parsedActivo !== undefined) where.activo = parsedActivo;
    if (parsedEnUso !== undefined) where.en_uso = parsedEnUso;

    const search = String(query.q ?? '').trim();
    if (search) {
      where.nombre = { contains: search };
    }

    const sprints = await prisma.sprintCROV.findMany({
      where,
      orderBy: [
        { fecha_inicio: 'desc' },
        { id: 'desc' },
      ],
      include: { _count: { select: { tareas: true } } },
    });

    const data = sprints.map((s) => {
      const { _count, ...rest } = s as any;
      return { ...rest, total_tareas: _count?.tareas ?? 0 };
    });

    res.json(data);
  } catch (error) {
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al listar sprints CROV:', error);
    res.status(500).json({ message: 'Error al listar sprints CROV' });
  }
};

export const obtenerSprintCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const sprint = await prisma.sprintCROV.findUnique({
      where: { id },
      include: {
        tareas: {
          orderBy: { fecha_registro: 'desc' },
          include: {
            sistema: { select: { id: true, nombre: true } },
            empleado: { select: { id: true, nombre_completo: true, puesto: true } },
          },
        },
      },
    });

    if (!sprint) {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }

    res.json(sprint);
  } catch (error) {
    console.error('Error al obtener sprint CROV:', error);
    res.status(500).json({ message: 'Error al obtener sprint CROV' });
  }
};

export const crearSprintCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const nombre = String(body.nombre ?? '').trim();
    const fecha_inicio = parseOptionalDateOnly(body.fecha_inicio, 'inicio');
    const fecha_final = parseOptionalDateOnly(body.fecha_final, 'final');
    const activo = parseOptionalFlag(body.activo, 'activo') ?? 1;
    const en_uso = parseOptionalFlag(body.en_uso, 'en_uso') ?? 0;

    const sprint = await prisma.$transaction(async (tx) => {
      const created = await tx.sprintCROV.create({
        data: {
          nombre: nombre || 'Sprint_',
          fecha_inicio: fecha_inicio ?? undefined,
          fecha_final: fecha_final ?? undefined,
          activo,
          en_uso,
        },
      });

      const finalName = nombre || `Sprint_${created.id}`;
      if (finalName !== created.nombre) {
        return tx.sprintCROV.update({ where: { id: created.id }, data: { nombre: finalName } });
      }
      return created;
    });

    res.status(201).json({ message: 'Sprint CROV creado', sprint });
  } catch (error) {
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al crear sprint CROV:', error);
    res.status(500).json({ message: 'Error interno al crear sprint CROV' });
  }
};

export const actualizarSprintCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Prisma.SprintCROVUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'nombre')) {
      const nombre = String(body.nombre ?? '').trim();
      if (!nombre) {
        res.status(400).json({ message: 'El nombre es obligatorio' });
        return;
      }
      data.nombre = nombre;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fecha_inicio')) {
      data.fecha_inicio = parseOptionalDateOnly(body.fecha_inicio, 'inicio');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fecha_final')) {
      data.fecha_final = parseOptionalDateOnly(body.fecha_final, 'final');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
      data.activo = parseOptionalFlag(body.activo, 'activo');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'en_uso')) {
      data.en_uso = parseOptionalFlag(body.en_uso, 'en_uso');
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const sprint = await prisma.sprintCROV.update({ where: { id }, data });

    res.json({ message: 'Sprint CROV actualizado', sprint });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al actualizar sprint CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar sprint CROV' });
  }
};

export const activarSprintCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const sprintObjetivo = await prisma.sprintCROV.findUnique({ where: { id, activo: 1 } });
    if (!sprintObjetivo) {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }

    const sprintConPendientes = await prisma.sprintCROV.findFirst({
      where: {
        id: { not: id },
        activo: 1,
        tareas: {
          some: {
            activo: 1,
            estatus: { not: EstatusTareaCROV.LISTO },
          },
        },
      },
      select: { id: true, nombre: true },
    });

    if (sprintConPendientes) {
      res.status(400).json({
        message: `No se puede activar este sprint porque el sprint ${sprintConPendientes.nombre} tiene tareas pendientes`,
      });
      return;
    }

    const [, sprint] = await prisma.$transaction([
      prisma.sprintCROV.updateMany({ data: { en_uso: 0 }, where: { id: { not: id } } }),
      prisma.sprintCROV.update({ where: { id }, data: { en_uso: 1 } }),
    ]);

    res.json({ message: 'Sprint CROV activado', sprint });
  } catch (error) {
    console.error('Error al activar sprint CROV:', error);
    res.status(500).json({ message: 'Error interno al activar sprint CROV' });
  }
};

export const eliminarSprintCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const sprint = await prisma.sprintCROV.update({ where: { id }, data: { activo: 0, en_uso: 0 } });

    res.json({ message: 'Sprint CROV eliminado', sprint });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }
    console.error('Error al eliminar sprint CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar sprint CROV' });
  }
};

export const listarTareasCROV: RequestHandler = async (req, res) => {
  try {
    const query = (req && typeof req.query === 'object' ? req.query : {}) as Record<string, any>;
    const where: Prisma.TareaCROVWhereInput = {};

    const activo = parseOptionalFlag(query.activo, 'activo');
    where.activo = activo ?? 1;

    const reabierto = parseOptionalFlag(query.reabierto, 'reabierto');
    if (reabierto !== undefined) {
      where.reabierto = reabierto;
    }

    const prioridadFiltro = String(query.prioridad ?? '')
      .split(',')
      .map((p) => parsePrioridadTarea(p))
      .filter((p): p is PrioridadTareaCROV => !!p);
    if (query.prioridad && prioridadFiltro.length === 0) {
      res.status(400).json({ message: 'La prioridad especificada es inválida' });
      return;
    }
    if (prioridadFiltro.length) {
      where.prioridad = { in: prioridadFiltro };
    }

    const estatusFiltro = String(query.estatus ?? '')
      .split(',')
      .map((e) => parseEstatusTarea(e))
      .filter((e): e is EstatusTareaCROV => !!e);
    if (query.estatus && estatusFiltro.length === 0) {
      res.status(400).json({ message: 'El estatus especificado es inválido' });
      return;
    }
    if (estatusFiltro.length) {
      where.estatus = { in: estatusFiltro };
    }

    const tipoFiltro = String(query.tipo ?? '')
      .split(',')
      .map((t) => parseTipoTarea(t))
      .filter((t): t is TipoTareaCROV => !!t);
    if (query.tipo && tipoFiltro.length === 0) {
      res.status(400).json({ message: 'El tipo especificado es inválido' });
      return;
    }
    if (tipoFiltro.length) {
      where.tipo = { in: tipoFiltro };
    }

    if (query.id_sistemas_crov !== undefined) {
      const sistemaId = Number(query.id_sistemas_crov);
      if (!Number.isInteger(sistemaId) || sistemaId <= 0) {
        res.status(400).json({ message: 'El id del sistema es inválido' });
        return;
      }
      where.id_sistemas_crov = sistemaId;
    }

    if (query.id_empleados_crov !== undefined) {
      const empleadoId = Number(query.id_empleados_crov);
      if (!Number.isInteger(empleadoId) || empleadoId <= 0) {
        res.status(400).json({ message: 'El id del empleado es inválido' });
        return;
      }
      where.id_empleados_crov = empleadoId;
    }

    const sinSprint = parseOptionalFlag(query.sin_sprint, 'sin_sprint');
    if (query.id_sprint !== undefined) {
      const sprintId = Number(query.id_sprint);
      if (!Number.isInteger(sprintId) || sprintId <= 0) {
        res.status(400).json({ message: 'El id del sprint es inválido' });
        return;
      }
      where.id_sprint = sprintId;
    } else if (sinSprint === 1) {
      where.id_sprint = null;
    }

    const fechaVencimientoDesde = parseOptionalDate(query.fecha_vencimiento_desde, 'fecha de vencimiento (desde)');
    const fechaVencimientoHasta = parseOptionalDate(query.fecha_vencimiento_hasta, 'fecha de vencimiento (hasta)');

    if (fechaVencimientoDesde || fechaVencimientoHasta) {
      where.fecha_vencimiento = {};
      if (fechaVencimientoDesde) {
        where.fecha_vencimiento.gte = fechaVencimientoDesde;
      }
      if (fechaVencimientoHasta) {
        where.fecha_vencimiento.lte = fechaVencimientoHasta;
      }
    }

    const search = String(query.q ?? '').trim();
    if (search) {
      where.OR = [
        { titulo: { contains: search } },
        { descripcion: { contains: search } },
      ];
    }

    const tareas = await prisma.tareaCROV.findMany({
      where,
      orderBy: { fecha_registro: 'desc' },
      include: {
        sistema: true,
        empleado: true,
        sprint: true,
      },
    });

    res.json(tareas);
  } catch (error) {
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al listar tareas CROV:', error);
    res.status(500).json({ message: 'Error al listar tareas CROV' });
  }
};

export const obtenerTareaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const tarea = await prisma.tareaCROV.findUnique({
      where: { id },
      include: {
        sistema: true,
        empleado: true,
        sprint: true,
      },
    });

    if (!tarea) {
      res.status(404).json({ message: 'Tarea CROV no encontrada' });
      return;
    }

    res.json(tarea);
  } catch (error) {
    console.error('Error al obtener tarea CROV:', error);
    res.status(500).json({ message: 'Error al obtener tarea CROV' });
  }
};

export const crearTareaCROV: RequestHandler = async (req, res) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const titulo = String(body.titulo ?? '').trim();
    if (!titulo) {
      res.status(400).json({ message: 'El título es obligatorio' });
      return;
    }

    const descripcion = sanitizeNullableString(body.descripcion);

    const id_sistemas_crov = Number(body.id_sistemas_crov);
    const id_empleados_crov = Number(body.id_empleados_crov);

    await ensureSistemaCrovExists(id_sistemas_crov);
    await ensureEmpleadoCrovExists(id_empleados_crov);

    const prioridad = parsePrioridadTarea(body.prioridad) ?? PrioridadTareaCROV.BAJA;
    const estatus = parseEstatusTarea(body.estatus) ?? EstatusTareaCROV.POR_HACER;
    const tipo = parseTipoTarea(body.tipo) ?? TipoTareaCROV.TAREA;

    const reabierto = parseOptionalFlag(body.reabierto, 'reabierto') ?? 0;
    const activo = parseOptionalFlag(body.activo, 'activo') ?? 1;
    const complejidad = Number(body.complejidad ?? 1);
    if (!Number.isInteger(complejidad) || complejidad <= 0) {
      res.status(400).json({ message: 'La complejidad debe ser un entero positivo' });
      return;
    }

    const fecha_vencimiento = parseOptionalDate(body.fecha_vencimiento, 'vencimiento');

    let id_sprint: number | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'id_sprint')) {
      if (body.id_sprint === null || body.id_sprint === '') {
        id_sprint = null;
      } else {
        id_sprint = Number(body.id_sprint);
        await ensureSprintCrovExists(id_sprint);
      }
    }

    const tarea = await prisma.tareaCROV.create({
      data: {
        titulo,
        descripcion,
        id_sistemas_crov,
        id_empleados_crov,
        prioridad,
        estatus,
        reabierto,
        activo,
        fecha_vencimiento,
        tipo,
        complejidad,
        id_sprint: id_sprint ?? undefined,
      },
      include: { sistema: true, empleado: true, sprint: true },
    });

    res.status(201).json({ message: 'Tarea CROV creada', tarea });
  } catch (error) {
    if (error instanceof Error && error.message === 'ID_SISTEMA_INVALIDO') {
      res.status(400).json({ message: 'El id del sistema es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'SISTEMA_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Sistema CROV no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'ID_EMPLEADO_INVALIDO') {
      res.status(400).json({ message: 'El id del empleado es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'EMPLEADO_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Empleado CROV no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'ID_SPRINT_INVALIDO') {
      res.status(400).json({ message: 'El id del sprint es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'SPRINT_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al crear tarea CROV:', error);
    res.status(500).json({ message: 'Error interno al crear tarea CROV' });
  }
};

export const actualizarTareaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const data: Prisma.TareaCROVUncheckedUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'titulo')) {
      const titulo = String(body.titulo ?? '').trim();
      if (!titulo) {
        res.status(400).json({ message: 'El título es obligatorio' });
        return;
      }
      data.titulo = titulo;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'descripcion')) {
      data.descripcion = sanitizeNullableString(body.descripcion);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'id_sistemas_crov')) {
      const sistemaId = Number(body.id_sistemas_crov);
      await ensureSistemaCrovExists(sistemaId);
      data.id_sistemas_crov = sistemaId;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'id_empleados_crov')) {
      const empleadoId = Number(body.id_empleados_crov);
      await ensureEmpleadoCrovExists(empleadoId);
      data.id_empleados_crov = empleadoId;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'prioridad')) {
      const prioridad = parsePrioridadTarea(body.prioridad);
      if (!prioridad) {
        res.status(400).json({ message: 'La prioridad especificada es inválida' });
        return;
      }
      data.prioridad = prioridad;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'estatus')) {
      const estatus = parseEstatusTarea(body.estatus);
      if (!estatus) {
        res.status(400).json({ message: 'El estatus especificado es inválido' });
        return;
      }
      data.estatus = estatus;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'tipo')) {
      const tipo = parseTipoTarea(body.tipo);
      if (!tipo) {
        res.status(400).json({ message: 'El tipo especificado es inválido' });
        return;
      }
      data.tipo = tipo;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'reabierto')) {
      data.reabierto = parseOptionalFlag(body.reabierto, 'reabierto');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'activo')) {
      data.activo = parseOptionalFlag(body.activo, 'activo');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'complejidad')) {
      const complejidad = Number(body.complejidad);
      if (!Number.isInteger(complejidad) || complejidad <= 0) {
        res.status(400).json({ message: 'La complejidad debe ser un entero positivo' });
        return;
      }
      data.complejidad = complejidad;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'fecha_vencimiento')) {
      data.fecha_vencimiento = parseOptionalDate(body.fecha_vencimiento, 'vencimiento');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'id_sprint')) {
      if (body.id_sprint === null || body.id_sprint === '') {
        data.id_sprint = null;
      } else {
        const sprintId = Number(body.id_sprint);
        await ensureSprintCrovExists(sprintId);
        data.id_sprint = sprintId;
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron cambios para actualizar' });
      return;
    }

    const tarea = await prisma.tareaCROV.update({
      where: { id },
      data,
      include: { sistema: true, empleado: true, sprint: true },
    });

    const { deletedImagesDescripcion = [] } = body;

    // limpiando imagenes borradas de la descripción de la tarea
    // para evitar imagenes huerfanas en S3
    for (const imageUrl of deletedImagesDescripcion) {
      try {
        await deleteImageByUrlForJiraTasks(imageUrl);
      } catch (error) {
        console.error("Error borrando imagen:", imageUrl, error);
      }
    }

    res.json({ message: 'Tarea CROV actualizada', tarea });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Tarea CROV no encontrada' });
      return;
    }
    if (error instanceof Error && error.message === 'ID_SISTEMA_INVALIDO') {
      res.status(400).json({ message: 'El id del sistema es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'SISTEMA_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Sistema CROV no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'ID_EMPLEADO_INVALIDO') {
      res.status(400).json({ message: 'El id del empleado es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'EMPLEADO_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Empleado CROV no encontrado' });
      return;
    }
    if (error instanceof Error && error.message === 'ID_SPRINT_INVALIDO') {
      res.status(400).json({ message: 'El id del sprint es inválido' });
      return;
    }
    if (error instanceof Error && error.message === 'SPRINT_NO_ENCONTRADO') {
      res.status(404).json({ message: 'Sprint CROV no encontrado' });
      return;
    }
    if ((error as any)?.status === 400) {
      res.status(400).json({ message: (error as any).message });
      return;
    }
    console.error('Error al actualizar tarea CROV:', error);
    res.status(500).json({ message: 'Error interno al actualizar tarea CROV' });
  }
};

export const eliminarTareaCROV: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const tarea = await prisma.tareaCROV.update({
      where: { id },
      data: { activo: 0 },
      include: { sistema: true, empleado: true, sprint: true },
    });

    res.json({ message: 'Tarea CROV eliminada', tarea });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Tarea CROV no encontrada' });
      return;
    }
    console.error('Error al eliminar tarea CROV:', error);
    res.status(500).json({ message: 'Error interno al eliminar tarea CROV' });
  }
};

export const optenertareassprintactual = async (req:Request, res:Response) => {
try {
  const empleadosConConteo = await prisma.empleados_CROV.findMany({
  // 1. Opcional: Solo traer empleados que tengan al menos una tarea en el sprint actual
  // (Si quitas este 'where', te traerá también a los que tienen 0 tareas)
  where: {
    tareas: {
      some: {
        sprint: { en_uso: 1 }
      }
    }
  },
  
  select: {
    id: true,
    nombre_completo: true,
    color_perfil: true,
    // 2. La magia de Prisma: Contar con filtro
    _count: {
      select: {
        tareas: {
          where: {
            sprint: { en_uso: 1 } // Condición del conteo
          }
        }
      }
    }
  }
});
res.json(empleadosConConteo)
} catch (error) {
 console.error("Error al obtener el conteo de tareas en el sprint actual :", error) 
 res.status(500).json({message:"Error al obtener el conteo de tareas en el sprint actual"})
}
}

export const getHistorialAhorrosEmpleados = async (_req: Request,res: Response) => {
  try {
      const ahorros = await prisma.ahorros_Empleados_CROV.findMany({
        where: { // solo empleados activos
          empleado: {
            activo: 1
          }
        },
        orderBy: [
          { fecha: 'desc' }, // por fecha mas reciente
          {
            empleado: {
              nombre_completo: 'asc', // por orden alfabetico
            },
          },
        ],
        select: {
          id: true,
          monto: true,
          fecha: true,
          retiro: true,
          empleado: {
            select: {
              id: true,
              nombre_completo: true,
            }
          }
        }
      });
      const ahorrosNormalizados = ahorros.map((ahorro) => ({
          ...ahorro,
          monto: Number(ahorro.monto)
      }));
      res.json(ahorrosNormalizados);
    } catch (error) {
      console.error('Error al obtener el historial de ahorros:', error);
      res.status(500).json({ message: 'Error al obtener el historico de ahorros' });
    }
}

export const getAhorroEmpleado = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    const ahorro = await prisma.ahorros_Empleados_CROV.findUnique({
      where: { id },
      select: {
        id: true,
        monto: true,
        fecha: true,
        empleado: {
          select: {
            id: true,
            nombre_completo: true,
          }
        }
      }
    });
    if (!ahorro) {
      res.status(404).json({ message: 'Ahorro no encontrado' });
      return;
    }
    const ahorroNormalizado = {
      ...ahorro,
      monto: Number(ahorro?.monto)
    };
    res.status(200).json(ahorroNormalizado);
  } catch (error) {
    console.error(`Error al obtener el ahorro con ID ${req.params.id}: ${error}`);
    res.status(500).json({ message: 'Error al obtener el ahorro' });
  }
}

export const getEmpleadosActivosNoResidentes = async (_req: Request, res: Response) => {
  try {
    const empleados = await prisma.empleados_CROV.findMany({
      orderBy: { nombre_completo: 'desc' },
      where: {
        activo: 1,
        residente: 0,
      }
    });
    const empleadosNormalizados = empleados.map((e) => {
      return {
        ...e,
        monto_ahorro: Number(e.monto_ahorro),
        totalAhorro: Number(e.totalAhorro),
      }
    })
    res.json(empleadosNormalizados);
  } catch (error) {
    console.error('Error al listar empleados CROV:', error);
    res.status(500).json({ message: 'Error al obtener empleados CROV' });
  }
}

export const crearAhorroEmpleado = async (req: Request, res: Response) => {
  const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  try {
    const {empleadoId, fecha, monto} = body;
    if (!empleadoId) {
      res.status(400).json({ message: 'El empleado es obligatorio' });
      return;
    }
    if (!fecha) {
      res.status(400).json({ message: 'La fecha es obligatoria' });
      return;
    }
    if (!monto) {
      res.status(400).json({ message: 'El monto del ahorro es obligatorio' });
      return;
    }
    if (monto <= 0) {
      res.status(400).json({ message: 'El monto del ahorro debe ser mayor a 0' });
      return;
    }


    const empleado = await prisma.empleados_CROV.findUnique({
      where: {id : empleadoId},
      select: {id:true}
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // implicitamente el campo retiro = 0, ya que es un movimiento de ahorro
    await prisma.ahorros_Empleados_CROV.create({
      data: {
        id_empleado: empleado.id,
        fecha: new Date(fecha),
        monto,
      }
    }); 

    
    res.status(201).json({ message: 'Ahorro registrado'});
  } catch (error:any) {
    console.error('Error al registrar un ahorro:', error);
    res.status(500).json({ message: 'Error interno al registrar el ahorro' });
  }
}

export const modificarAhorroEmpleado = async (req:Request, res: Response) => {
  const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const id = Number(req.params.id);
  try {
    const {monto, fecha} = body;
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    if (!monto || monto <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }


    const ahorro = await prisma.ahorros_Empleados_CROV.findUnique({
      where: { id },
      include: {
        empleado: {
          select: { id: true, totalAhorro: true },
        },
      },
    });
    if (!ahorro) {
      return res.status(404).json({ message: 'Ahorro no encontrado' });
    }
    if (ahorro.retiro) {
      return res.status(409).json({
        message: 'No se puede modificar un movimiento de retiro',
      });
    }

    const totalActual = Number(ahorro.empleado.totalAhorro ?? 0);
    const montoAnterior = Number(ahorro.monto);
    
    // si se quiere modificar ahorro, cuando ya se retiro todo el ahorroTotal del empleado
    if (totalActual === 0 && monto !== montoAnterior) {
      return res.status(409).json({
        message: 'No se puede modificar ahorro: el empleado ya retiró todo su ahorro',
      });
    }

    // si se intenta disminuir mas de lo disponible
    if (monto < montoAnterior) {
      const diferencia = montoAnterior - monto;
      if (diferencia > totalActual) {
        return res.status(409).json({
          message: 'No se puede disminuir el ahorro más de lo disponible',
        });
      }
    }

    // trigger "trg_ahorros_after_update" despues del update ajusta el totalAhorro en tb empleados
    await prisma.ahorros_Empleados_CROV.update({
      where: { id },
      data: {
        fecha: new Date(fecha).toISOString(),
        monto
      },
    });

    
    res.status(204).json({ message: 'Ahorro actualizado'});

  } catch (error: any) {
    console.error('Error al modificar un ahorro:', error);
    return res.status(500).json({ message: 'Error interno al actualizar el ahorro' });
  }
}

export const eliminarAhorroEmpleado = async (req:Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const ahorro = await prisma.ahorros_Empleados_CROV.findUnique({
      where: { id },
      include: {
        empleado: {
          select: { totalAhorro: true },
        },
      },
    });

    if (!ahorro) {
      return res.status(404).json({ message: 'Ahorro no encontrado' });
    }

    if (ahorro.retiro) {
      return res.status(409).json({
        message: 'No se puede eliminar un movimiento de retiro',
      });
    }

    const totalActual = Number(ahorro.empleado.totalAhorro ?? 0);
    const montoAhorro = Number(ahorro.monto);

    if (totalActual === 0) {
      return res.status(409).json({
        message: 'No se puede eliminar un ahorro ya retirado',
      });
    }

    if (montoAhorro > totalActual) {
      return res.status(409).json({
        message: 'No se puede eliminar un ahorro mayor al total disponible',
      });
    }

    // el trigger "trg_ahorros_after_delete" despues del delete actualiza el totalAhorro en tb empleados
    await prisma.ahorros_Empleados_CROV.delete({ where: { id } });

    return res.status(204).json({ message: 'Ahorro eliminado' });
    
  } catch (error) {
    console.error('Error al eliminar ahorro:', error);
    res.status(500).json({ message: 'Error interno al eliminar ahorro' });
  }
}

export const getEmpleadosInfoParaRetiroAhorros = async (req: Request, res: Response) => {
  try {
    
    const empleados = await prisma.empleados_CROV.findMany({
      where: {
        activo: 1,
        residente: 0,
        totalAhorro: {
          gt: 0,
        },
      },
      select: {
        id: true,
        nombre_completo: true,
        totalAhorro: true,
      },
      orderBy: {
        nombre_completo: 'asc',
      }
    });

    res.json(empleados);

  } catch (error) {
    console.error('Error al obtener empleados CROV:', error);
    res.status(500).json({ message: 'Error al obtener empleados CROV' });
  }
}

export const retirarAhorroEmpleado: RequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  const montoARetirar = Number(req.body.montoARetirar);
  try {
    
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    if (isNaN(montoARetirar) || montoARetirar <= 0) {
      return res.status(400).json({ message: 'El monto a retirar debe ser un número positivo' });
    }

    const empleado = await prisma.empleados_CROV.findUnique({
      where: { id },
      select: {
        id: true,
        nombre_completo: true,
        totalAhorro: true,
      },
    });
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    const totalAhorroActual = Number(empleado.totalAhorro ?? 0);

    if (totalAhorroActual === 0) {
      return res.status(400).json({ message: 'El empleado no tiene ahorros disponibles' });
    }

    if (montoARetirar > totalAhorroActual){
      return res.status(400).json({ message: 'El monto a retirar es mayor al total de ahorros' });
    }

    const fechaMazatlan = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/Mazatlan',
      })
    );

    // crear un nuevo movimiento en el historial del retiro.
    // al crear este nuevo registro de retiro, el trigger trg_ahorros_after_insert
    // de la tabla ahorros_Empleados_CROV realiza el ajuste de retiro en ahorroTotal
    await prisma.ahorros_Empleados_CROV.create({
      data: {
        id_empleado: empleado.id,
        fecha: fechaMazatlan,
        monto: montoARetirar,
        retiro: true, // <- SE INDICA QUE ES UN MOVIMIENTO DE RETIRO
      }
    });

    return res.status(200).json({ message: 'Ahorro retirado exitosamente' });

  } catch (error) {
    console.error("Error al retirar el ahorro del empleado: ", error);
    res.status(500).json({ message: 'Error interno al retirar el ahorro' });
  }
}


export const getTotalAhorrosGeneralOPorEmpleadoBuscado: RequestHandler = async (req, res) => {
  try {
    // Leemos el parámetro 'q' de la URL (ej: /crovinternal/historial-ahorros/total-ahorros?q=Juan)
    const { q } = req.query;
    const termino = (q as string)?.trim();

    // No hay búsqueda (Total General)
    if (!termino) {
      const general = await prisma.empleados_CROV.aggregate({
        _sum: { totalAhorro: true },
        where: { totalAhorro: { gt: 0 } } // Opcional: solo mayores a 0
      });

      return res.json({
        total: general._sum.totalAhorro || 0,
        titulo: "Total acumulado general"
      });
    }

    // Hay búsqueda (Buscar empleado)
    // Buscamos al primer empleado que coincida con el nombre
    const empleado = await prisma.empleados_CROV.findFirst({
      where: {
        nombre_completo: { contains: termino } ,
        activo: 1,
        residente: 0,
      },
      select: { nombre_completo: true, totalAhorro: true }
    });

    if (empleado) {
      return res.json({
        total: empleado.totalAhorro || 0,
        titulo: `Ahorro de ${empleado.nombre_completo}`
      });
    } else {
      return res.json({
        total: 0,
        titulo: "Empleado no encontrado"
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error calculando total de ahorros" });
  }
};

// esta funcion solo trae el historial de ahorro y total de un empleado en concreto
export const getHistorialAhorrosEmpleado : RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'Error al consultar mi historial de ahorro' });
      return;
    }
    const ahorros = await prisma.ahorros_Empleados_CROV.findMany({
        where: {
          id_empleado: id,
        },
        orderBy: [
          { fecha: 'desc' }, // por fecha mas reciente
        ],
        select: {
          id: true,
          monto: true,
          fecha: true,
          retiro: true,
        }
    });

    const totalAhorro = await prisma.empleados_CROV.findUnique({
      where: { id },
      select: { totalAhorro: true },
    });

    res.status(200).json({
      ahorros,
      totalAhorro: totalAhorro?.totalAhorro || 0,
    });

  } catch (error) {
    console.error("Error al consultar mi historial de ahorro: ", error);
    res.status(500).json({ message: "Error al consultar mi historial de ahorro" });
  }
}

export const getTiposIncidencias : RequestHandler = async (req, res) => {
  try {
    const data = await prisma.tiposIncidenciaCROV.findMany({
      select: {
        id: true,
        clave: true,
        nombre: true,
      },
      where: {activo: true}
    });
    res.status(200).json(data);
  } catch (error) {
    console.log("Error al consultar el catálogo de tipos de incidencia: ",error);
    res.status(500).json({message: "Error al consultar el catálogo de tipos de incidencia"});
  }
};

export const getSolicitudesIncidenciaPorEmpleado: RequestHandler = async (req, res) => {
  const idEmpleado = Number(req.params.idEmpleado);

  try {
    if (isNaN(idEmpleado) || !Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({ message: 'Empleado no encontrado' });
    }

    const solicitudesRaw = await prisma.solicitudesIncidenciaCROV.findMany({
      where: {
        id_empleados_crov: idEmpleado,
        estado: { not: 'CANCELADO' }, // solicitudes que no hayan sido eliminadas de forma lógica
      },
      orderBy: {
        created_at: 'desc', 
      },
      select: {
        id: true,
        descripcion: true,
        fecha_inicio: true,
        fecha_fin: true,
        estado: true,
        created_at: true,
        motivo_rechazo: true, 
        id_tipos_incidencia: true,
        tipo_incidencia: {
          select: {
            nombre: true,
          },
        },
      },
    });

    const solicitudesFormateadas = solicitudesRaw.map((solicitud) => {
      
      const fechaInicioStr = formatearFechaEsp(solicitud.fecha_inicio);
      const fechaFinStr = formatearFechaEsp(solicitud.fecha_fin);

      const displayFechas = (fechaInicioStr === fechaFinStr)
        ? fechaInicioStr
        : `${fechaInicioStr} - ${fechaFinStr}`;

      return {
        // --- DATOS VISUALES (Tabla) ---
        id: solicitud.id,
        fecha_solicitud: formatearFechaEsp(solicitud.created_at),
        tipo: solicitud.tipo_incidencia.nombre,
        descripcion: solicitud.descripcion || "Sin descripción",
        fechas_solicitadas: displayFechas,
        estado: solicitud.estado,
        motivo_rechazo: solicitud.motivo_rechazo,
        // --- DATOS CRUDOS (Modal de Edición) ---
        raw_fecha_inicio: solicitud.fecha_inicio, 
        raw_fecha_fin: solicitud.fecha_fin,
        raw_id_tipos_incidencia: solicitud.id_tipos_incidencia,
      };
    });

    res.status(200).json(solicitudesFormateadas);

  } catch (error) {
    console.error("Error al consultar las solicitudes de incidencia: ", error);
    res.status(500).json({ message: "Error al consultar las solicitudes de incidencia" });
  }
};

export const crearSolicitudIncidencia: RequestHandler = async (req, res) => {
  const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const errors: Record<string, string> = {};

  try {
    const {
      id_tipos_incidencia,
      descripcion,
      fecha_inicio,
      fecha_fin,
      id_empleados_crov
    } = body;

    const number_id_tipos_incidencia = Number(id_tipos_incidencia);
    const number_id_empleados_crov = Number(id_empleados_crov);

    if (!id_tipos_incidencia) {
      errors.id_tipos_incidencia = 'El tipo de incidencia es obligatorio';
    } else if (isNaN(number_id_tipos_incidencia) || number_id_tipos_incidencia <= 0) {
      errors.id_tipos_incidencia = 'El tipo de incidencia es inválido';
    }

    if (!id_empleados_crov) {
      errors.id_empleados_crov = 'El empleado es obligatorio';
    } else if (isNaN(number_id_empleados_crov) || number_id_empleados_crov <= 0) {
      errors.id_empleados_crov = 'El empleado es inválido';
    }

    if (!fecha_inicio) errors.fecha_inicio = 'La fecha de inicio es obligatoria';
    if (!fecha_fin) errors.fecha_fin = 'La fecha de fin es obligatoria';

    let inicioDate: Date | null = null;
    let finDate: Date | null = null;

    if (fecha_inicio && fecha_fin) {
      inicioDate = new Date(fecha_inicio + 'T00:00:00');
      finDate = new Date(fecha_fin + 'T00:00:00');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (isNaN(inicioDate.getTime())) {
        errors.fecha_inicio = 'Formato de fecha inválido';
      } else if (inicioDate < hoy) {
        errors.fecha_inicio = 'La fecha de inicio no puede ser anterior a hoy';
      }

      if (isNaN(finDate.getTime())) {
        errors.fecha_fin = 'Formato de fecha inválido';
      }

      if (inicioDate && finDate && inicioDate > finDate) {
        errors.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    // --- RETORNAR ERRORES DE VALIDACIÓN ---
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Error de validación",
        errors
      });
    }

    const tipoIncidencia = await prisma.tiposIncidenciaCROV.findUnique({
      where: { id: number_id_tipos_incidencia },
    });

    if (!tipoIncidencia) {
      return res.status(404).json({ message: 'Tipo de incidencia no existente' });
    }

    const empleado = await prisma.empleados_CROV.findUnique({
      where: { id: number_id_empleados_crov },
      select: {
        id: true,
        dias_vacaciones: true, 
        nombre_completo: true,
      }
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no existente' });
    }
    
    const seSolicitanVacaciones = tipoIncidencia.clave === 'VACACIONES';

    if (seSolicitanVacaciones && inicioDate && finDate) {
      const diasSolicitados = calcularDiasHabiles(inicioDate, finDate);

      if (Number(empleado.dias_vacaciones) < diasSolicitados) {
        return res.status(400).json({ 
          message: 'Saldo de vacaciones insuficiente',
          detalle: `Se solicitaron ${diasSolicitados} días hábiles de vacaciones, pero solo tienes ${empleado.dias_vacaciones} días disponibles.`
        });
      }
      // aqui NO se restan los días. Eso se hace cuando el jefe APRUEBA la solicitud.
    }

    const nuevaSolicitud = await prisma.solicitudesIncidenciaCROV.create({
      data: {
        id_empleados_crov: empleado.id,
        id_tipos_incidencia: tipoIncidencia.id,
        descripcion: descripcion ?? '',
        fecha_inicio: inicioDate!, 
        fecha_fin: finDate!,
        estado: "PENDIENTE"
      }
    });

    // notificar por correo, al correo de la empresa cuando se crea
    // una nueva solicitud para que sea atendida
    notificarNuevaSolicitudIncidenciaRH(
      empleado.nombre_completo,
      tipoIncidencia.nombre,
      inicioDate!,
      finDate!,
      descripcion ?? 'Sin descripción'
    );

    return res.status(201).json({ message: 'Solicitud creada exitosamente', nuevaSolicitud });

  } catch (error) {
    console.error("Error al crear la solicitud de incidencia: ", error);
    return res.status(500).json({ message: 'Error interno al crear la solicitud' });
  }
};

export const eliminarSolicitudIncidencia: RequestHandler = async (req, res) => {
  const idSolicitud = Number(req.params.idSolicitud);
  // Eliminado lógico
  try {
    if (isNaN(idSolicitud) || !Number.isInteger(idSolicitud) || idSolicitud <= 0) {
      return res.status(400).json({ message: 'Solicitud inválida' });
    }
    const solicitud = await prisma.solicitudesIncidenciaCROV.findUnique({
      where: { id: idSolicitud },
      select: { estado: true },
    });
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    if (solicitud.estado !== 'PENDIENTE') { 
      return res.status(400).json({ message: 'No se puede eliminar una solicitud que no esté en estatus pendiente' });
    }
    await prisma.solicitudesIncidenciaCROV.update({
      where: { id: idSolicitud },
      data: { estado: 'CANCELADO' },
    });
    return res.status(200).json({ message: 'Solicitud eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar solicitud de incidencia:', error);
    res.status(500).json({ message: 'Error interno al eliminar solicitud' });
  }

};

export const actualizarSolicitudIncidencia: RequestHandler = async (req, res) => {
  const idSolicitud = Number(req.params.idSolicitud); 
  const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
  const errors: Record<string, string> = {};

  try {
    if (isNaN(idSolicitud) || !Number.isInteger(idSolicitud) || idSolicitud <= 0) {
      return res.status(400).json({ message: 'ID de solicitud inválido' });
    }
    const {
      id_tipos_incidencia,
      descripcion,
      fecha_inicio,
      fecha_fin,
      id_empleados_crov 
    } = body;

    // --- BLOQUE DE VALIDACIÓN DE DATOS ---
    const number_id_tipos_incidencia = Number(id_tipos_incidencia);
    const number_id_empleados_crov = Number(id_empleados_crov);

    if (!id_tipos_incidencia) {
      errors.id_tipos_incidencia = 'El tipo de incidencia es obligatorio';
    } else if (isNaN(number_id_tipos_incidencia) || number_id_tipos_incidencia <= 0) {
      errors.id_tipos_incidencia = 'El tipo de incidencia es inválido';
    }

    if (!fecha_inicio) errors.fecha_inicio = 'La fecha de inicio es obligatoria';
    if (!fecha_fin) errors.fecha_fin = 'La fecha de fin es obligatoria';

    let inicioDate: Date | null = null;
    let finDate: Date | null = null;

    if (fecha_inicio && fecha_fin) {
      inicioDate = new Date(fecha_inicio + 'T00:00:00');
      finDate = new Date(fecha_fin + 'T00:00:00');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (isNaN(inicioDate.getTime())) {
        errors.fecha_inicio = 'Formato de fecha inválido';
      } else if (inicioDate < hoy) {
        errors.fecha_inicio = 'La fecha de inicio no puede ser anterior a hoy';
      }

      if (isNaN(finDate.getTime())) {
        errors.fecha_fin = 'Formato de fecha inválido';
      }

      if (inicioDate && finDate && inicioDate > finDate) {
        errors.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Error de validación", errors });
    }
    // ---------------------------------------------------------

    const solicitudExistente = await prisma.solicitudesIncidenciaCROV.findUnique({
      where: { id: idSolicitud },
    });

    if (!solicitudExistente) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (solicitudExistente.estado !== 'PENDIENTE') {
      return res.status(409).json({ 
        message: `No se puede editar una solicitud que no este en estatus pendiente.` 
      });
    }

    const tipoIncidencia = await prisma.tiposIncidenciaCROV.findUnique({
      where: { id: number_id_tipos_incidencia },
    });

    if (!tipoIncidencia) {
      return res.status(404).json({ message: 'Tipo de incidencia no existente' });
    }

    const seSolicitanVacaciones = tipoIncidencia.clave === 'VACACIONES';

    if (seSolicitanVacaciones && inicioDate && finDate) {
      const empleado = await prisma.empleados_CROV.findUnique({
        where: { id: number_id_empleados_crov },
        select: { dias_vacaciones: true }
      });

      if (!empleado) {
        return res.status(404).json({ message: 'Empleado no encontrado' });
      }

      const diasSolicitados = calcularDiasHabiles(inicioDate, finDate);

      if (Number(empleado.dias_vacaciones) < diasSolicitados) {
        return res.status(400).json({ 
          message: `Solicitas ${diasSolicitados} días hábiles de vacaciones, pero solo tienes ${empleado.dias_vacaciones} disponibles.`
        });
      }
    }

    const solicitudActualizada = await prisma.solicitudesIncidenciaCROV.update({
      where: { id: idSolicitud },
      data: {
        id_tipos_incidencia: tipoIncidencia.id,
        descripcion: descripcion ?? '',
        fecha_inicio: inicioDate!,
        fecha_fin: finDate!,
      }
    });

    return res.status(200).json({ 
      message: 'Solicitud actualizada exitosamente', 
      solicitud: solicitudActualizada 
    });

  } catch (error) {
    console.error("Error al actualizar la solicitud: ", error);
    return res.status(500).json({ message: 'Error interno al actualizar la solicitud' });
  }
};