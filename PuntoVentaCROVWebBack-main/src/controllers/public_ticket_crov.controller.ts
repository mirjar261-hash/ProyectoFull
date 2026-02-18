import { RequestHandler } from 'express';
import {
  EstadoSolicitudTicketCROV,
  GarantiaTicketCROV,
  PrioridadTicketSoporteCROV,
  TipoProblemaTicketCROV,
  TicketSoporteCROV,
  Prisma,
} from '@prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import prisma from '../utils/prisma';

const onlyDigits = (value: string = '') => value.replace(/\D+/g, '');

function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullable(value: unknown): string | null {
  const sanitized = sanitizeString(value);
  return sanitized.length ? sanitized : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function sendTicketNotification(ticket: TicketSoporteCROV) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
      console.warn('Servicio de correo no configurado. No se enviará la notificación del ticket CROV.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fechaRegistro = new Date(ticket.fecha_registro).toLocaleString('es-MX');
    const garantia = ticket.garantia === GarantiaTicketCROV.SI ? 'Sí' : 'No';
    const prioridad = formatEnum(ticket.prioridad);
    const tipoProblema = formatEnum(ticket.tipo_problema);
    const estado = formatEnum(ticket.estado_solicitud);
    const descripcion = escapeHtml(ticket.descripcion ?? 'Sin descripción proporcionada').replace(/\r?\n/g, '<br />');

    const rows: Array<[string, string]> = [
      ['ID interno', String(ticket.id)],
      ['Folio', ticket.folio],
      ['Fecha de registro', fechaRegistro],
      ['Nombre del cliente', ticket.nombre_cliente],
      ['Nombre del negocio', ticket.nombre_negocio],
      ['Teléfono', ticket.telefono ?? 'No proporcionado'],
      ['Correo', ticket.correo ?? 'No proporcionado'],
      ['ID cliente vinculado', ticket.id_cliente ? String(ticket.id_cliente) : 'No vinculado'],
      ['Garantía', garantia],
      ['Tipo de problema', tipoProblema],
      ['Prioridad', prioridad],
      ['Estado de la solicitud', estado],
    ];

    const rowsHtml = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #d1d5db;background:#f3f4f6;font-weight:600;">${escapeHtml(
              label,
            )}</td>
            <td style="padding:8px 12px;border:1px solid #d1d5db;">${escapeHtml(value)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2933;">
        <img src="cid:logo" alt="CROV" style="max-width:150px;margin-bottom:16px;" />
        <h2 style="color:#111827;">Nuevo ticket de soporte CROV</h2>
        <p>Se ha generado un nuevo ticket desde el formulario público.</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <h3 style="margin-top:24px;color:#111827;">Descripción del problema</h3>
        <p style="white-space:pre-wrap;">${descripcion}</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'crov.technology.services@gmail.com',
      subject: `Nuevo ticket de soporte CROV ${ticket.folio}`,
      html,
      attachments: [
        {
          filename: 'avatar.png',
          path: path.join(__dirname, '../../assets/avatar.png'),
          cid: 'logo',
        },
      ],
    });
  } catch (error) {
    console.error('Error al enviar correo del ticket de soporte CROV público:', error);
  }
}

async function generateNextFolio() {
  const result = await prisma.ticketSoporteCROV.aggregate({
    _max: { id: true },
  });
  const nextId = (result._max.id ?? 0) + 1;
  return `TSC-${String(nextId).padStart(6, '0')}`;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = value.toString().trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export const listarClientesCrovDirectorioPublic: RequestHandler = async (_req, res) => {
  try {
    const clientes = await prisma.clientes_CROV.findMany({
      where: {
        latitud: { not: null },
        longitud: { not: null },
      },
      orderBy: { nombre_negocio: 'asc' },
      select: {
        id: true,
        nombre_cliente: true,
        nombre_negocio: true,
        direccion: true,
        telefono: true,
        telefono_negocio: true,
        correo: true,
        latitud: true,
        longitud: true,
        tipo_sistema: true,
        logo: true,
        giroComercial: {
          select: {
            nombre: true,
          },
        },
      },
    });

    const directorio = clientes
      .map((cliente) => {
        const latitud = decimalToNumber(cliente.latitud);
        const longitud = decimalToNumber(cliente.longitud);
        const { giroComercial, telefono, telefono_negocio, ...clienteData } = cliente;

        return {
          ...clienteData,
          telefono: telefono_negocio ?? telefono ?? null,
          telefono_negocio: telefono_negocio ?? null,
          giro_negocio: giroComercial?.nombre ?? null,
          latitud,
          longitud,
        };
      })
      .filter((cliente) => cliente.latitud !== null && cliente.longitud !== null);

    res.json(directorio);
  } catch (error) {
    console.error('Error al listar clientes CROV para directorio público:', error);
    res.status(500).json({ message: 'Error al obtener el directorio de clientes CROV' });
  }
};

export const buscarClienteCrovPorTelefonoPublic: RequestHandler = async (req, res) => {
  try {
    const telefonoRaw = sanitizeString(req.body?.telefono ?? req.query?.telefono);

    if (!telefonoRaw) {
      res.status(400).json({ message: 'El teléfono es obligatorio' });
      return;
    }

    const digits = onlyDigits(telefonoRaw);

    const clientes = await prisma.clientes_CROV.findMany({
      where: digits
        ? {
            OR: [
              {
                telefono_negocio: {
                  contains: digits,
                },
              },
              {
                telefono: {
                  contains: digits,
                },
              },
            ],
          }
        : {
            OR: [
              { telefono_negocio: telefonoRaw },
              { telefono: telefonoRaw },
            ],
          },
      take: 5,
      orderBy: { id: 'desc' },
    });

    const cliente = clientes.find((c) => {
      const telefonoCliente = c.telefono_negocio ?? c.telefono ?? '';
      const clienteDigits = onlyDigits(telefonoCliente);
      return digits
        ? clienteDigits.endsWith(digits) || clienteDigits === digits
        : telefonoCliente === telefonoRaw;
    }) ?? clientes[0];

    if (!cliente) {
      res.status(404).json({ message: 'Cliente CROV no encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    console.error('Error al buscar cliente CROV por teléfono:', error);
    res.status(500).json({ message: 'Error interno al buscar cliente CROV' });
  }
};

export const crearTicketSoporteCrovPublic: RequestHandler = async (req, res) => {
  try {
    const descripcion = sanitizeString(req.body?.descripcion);
    const telefonoFormulario = toNullable(req.body?.telefono);
    const idClienteRaw = req.body?.id_cliente;

    if (!descripcion) {
      res.status(400).json({ message: 'La descripción del problema es obligatoria' });
      return;
    }

    if (!telefonoFormulario && (idClienteRaw === undefined || idClienteRaw === null || idClienteRaw === '')) {
      res.status(400).json({ message: 'Debe proporcionar el teléfono o el identificador del cliente' });
      return;
    }

    let cliente = null as Awaited<ReturnType<typeof prisma.clientes_CROV.findUnique>> | Awaited<ReturnType<typeof prisma.clientes_CROV.findFirst>> | null;
    let idCliente: number | null = null;

    if (idClienteRaw !== undefined && idClienteRaw !== null && idClienteRaw !== '') {
      const parsedId = Number(idClienteRaw);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        res.status(400).json({ message: 'El identificador del cliente es inválido' });
        return;
      }

      cliente = await prisma.clientes_CROV.findUnique({ where: { id: parsedId } });
      if (!cliente) {
        res.status(404).json({ message: 'Cliente CROV no encontrado' });
        return;
      }
      idCliente = parsedId;
    } else if (telefonoFormulario) {
      const digits = onlyDigits(telefonoFormulario);
      cliente = await prisma.clientes_CROV.findFirst({
        where: digits
          ? {
              OR: [
                {
                  telefono_negocio: {
                    contains: digits,
                  },
                },
                {
                  telefono: {
                    contains: digits,
                  },
                },
              ],
            }
          : {
              OR: [
                { telefono_negocio: telefonoFormulario },
                { telefono: telefonoFormulario },
              ],
            },
        orderBy: { id: 'desc' },
      });
    }

    const nombreClienteFormulario = toNullable(req.body?.nombre_cliente);
    const nombreNegocioFormulario = toNullable(req.body?.nombre_negocio);
    const correoFormulario = toNullable(req.body?.correo);

    const nombreCliente = cliente?.nombre_cliente ?? nombreClienteFormulario ?? '';
    const nombreNegocio = cliente?.nombre_negocio ?? nombreNegocioFormulario ?? '';
    const correo = cliente?.correo ?? (correoFormulario ? correoFormulario.toLowerCase() : null);
    const telefono = cliente?.telefono_negocio ?? cliente?.telefono ?? telefonoFormulario ?? null;

    if (!nombreCliente || !nombreNegocio) {
      res.status(400).json({ message: 'No se pudo determinar el nombre del cliente o negocio' });
      return;
    }

    const folio = await generateNextFolio();

    const data = {
      folio,
      fecha_registro: new Date(),
      correo,
      nombre_cliente: nombreCliente,
      nombre_negocio: nombreNegocio,
      telefono,
      garantia: idCliente ? GarantiaTicketCROV.SI : GarantiaTicketCROV.NO,
      descripcion: descripcion || null,
      tipo_problema: TipoProblemaTicketCROV.ASISTENCIA_CON_EL_SISTEMA,
      prioridad: PrioridadTicketSoporteCROV.BAJA,
      descripcion_solucion: null,
      id_empleado_crov: null,
      fecha_solucion: null,
      estado_solicitud: EstadoSolicitudTicketCROV.RECIBIDO,
      id_cliente: idCliente,
    } as const;

    const ticket = await prisma.$transaction((tx) =>
      tx.ticketSoporteCROV.create({
        data,
      }),
    );

    await sendTicketNotification(ticket);

    res.status(201).json({ message: 'Ticket de soporte CROV creado', ticket });
  } catch (error) {
    console.error('Error al crear ticket de soporte CROV público:', error);
    res.status(500).json({ message: 'Error interno al crear ticket de soporte CROV' });
  }
};
