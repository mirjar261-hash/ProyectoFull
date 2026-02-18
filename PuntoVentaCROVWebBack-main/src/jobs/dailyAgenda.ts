import { PrismaClient, Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import { toUTC } from '../utils/date';

const prisma = new PrismaClient();

const TIME_ZONE = process.env.AGENDA_TIMEZONE || process.env.APP_TIMEZONE || 'America/Mexico_City';
const SCHEDULE_HOUR = Number.isFinite(Number(process.env.AGENDA_EMAIL_HOUR))
  ? Number(process.env.AGENDA_EMAIL_HOUR)
  : 7;
const SCHEDULE_MINUTE = Number.isFinite(Number(process.env.AGENDA_EMAIL_MINUTE))
  ? Number(process.env.AGENDA_EMAIL_MINUTE)
  : 0;

type ActividadConUsuario = Prisma.ActividadGetPayload<{
  include: {
    usuarioActividad: {
      select: {
        nombre: true;
        apellidos: true;
        correo: true;
      };
    };
    sucursal: {
      select: {
        nombre_comercial: true;
      };
    };
  };
}>;

const buildTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const formatDate = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'full',
  timeZone: TIME_ZONE,
});

const formatTime = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});

const sendDailyAgenda = async () => {
  const now = new Date();

  const inicioDia = new Date(now);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(now);
  finDia.setHours(23, 59, 59, 999);

  const actividades: ActividadConUsuario[] = await prisma.actividad.findMany({
    where: {
      fecha_calendario: {
        gte: toUTC(inicioDia),
        lte: toUTC(finDia),
      },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true, correo: true },
      },
      sucursal: {
        select: { nombre_comercial: true },
      },
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  const agendasPorUsuario = new Map<
    string,
    {
      usuario: NonNullable<ActividadConUsuario['usuarioActividad']>;
      actividades: ActividadConUsuario[];
    }
  >();

  for (const actividad of actividades) {
    const usuario = actividad.usuarioActividad;
    if (!usuario?.correo) {
      continue;
    }

    const existente = agendasPorUsuario.get(usuario.correo) ?? {
      usuario,
      actividades: [],
    };

    existente.actividades.push(actividad);
    agendasPorUsuario.set(usuario.correo, existente);
  }

  if (agendasPorUsuario.size === 0) {
    return;
  }

  const transporter = buildTransporter();
  const fechaFormateada = formatDate.format(now);

  for (const [correo, detalle] of agendasPorUsuario.entries()) {
    const items = detalle.actividades
      .map((actividad) => {
        const fecha = new Date(actividad.fecha_calendario);
        const hora = formatTime.format(fecha);
        const descripcion = actividad.descripcion
          ? `<br/><span style="color:#555;">${actividad.descripcion}</span>`
          : '';
        const horario = actividad.horario
          ? `<br/><small style="color:#777;">Horario: ${actividad.horario}</small>`
          : '';
        const sucursal = actividad.sucursal?.nombre_comercial
          ? `<br/><small style="color:#777;">Sucursal: ${actividad.sucursal.nombre_comercial}</small>`
          : '';

        return `<li style="margin-bottom:12px;">
            <strong>${actividad.titulo}</strong>
            <br/><span style="color:#333;">Hora: ${hora}</span>
            ${horario}
            ${descripcion}
            ${sucursal}
          </li>`;
      })
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <img src="cid:logo" alt="CROV" style="max-width:150px; margin-bottom:16px;" />
        <p>Hola ${detalle.usuario.nombre},</p>
        <p>Estas son tus actividades programadas para ${fechaFormateada}:</p>
        <ul style="padding-left:18px;">${items}</ul>
        <p style="margin-top:24px; color:#555;">Que tengas un excelente día.</p>
      </div>
    `;

    await transporter
      .sendMail({
        from: process.env.SMTP_FROM,
        to: correo,
        subject: 'Agenda del día',
        html,
        attachments: [
          {
            filename: 'avatar.png',
            path: path.join(__dirname, '../../assets/avatar.png'),
            cid: 'logo',
          },
        ],
      })
      .catch((error: unknown) =>
        console.error(`Error al enviar agenda diaria a ${correo}:`, error)
      );
  }
};

export const scheduleDailyAgendaEmails = () => {
  const schedule = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);

    if (now > target) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    setTimeout(async () => {
      await sendDailyAgenda().catch((err) =>
        console.error('Error en tarea de agenda diaria:', err)
      );
      schedule();
    }, delay);
  };

  schedule();
};