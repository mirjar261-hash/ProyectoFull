import { Prisma, PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import { toUTC } from '../utils/date';

const prisma = new PrismaClient();

const TIME_ZONE =
  process.env.LICENSE_REMINDER_TIMEZONE ||
  process.env.APP_TIMEZONE ||
  'America/Mexico_City';

const SCHEDULE_HOUR = Number.isFinite(Number(process.env.LICENSE_REMINDER_HOUR))
  ? Number(process.env.LICENSE_REMINDER_HOUR)
  : 7;

const SCHEDULE_MINUTE = Number.isFinite(
  Number(process.env.LICENSE_REMINDER_MINUTE)
)
  ? Number(process.env.LICENSE_REMINDER_MINUTE)
  : 0;

const REMINDER_DAYS_BEFORE = Number.isFinite(
  Number(process.env.LICENSE_REMINDER_DAYS_BEFORE)
)
  ? Number(process.env.LICENSE_REMINDER_DAYS_BEFORE)
  : 5;

type EmpresaConSucursales = Prisma.EmpresaGetPayload<{
  include: {
    sucursal: {
      where: { activo: 1 };
      select: {
        nombre_comercial: true;
        correo: true;
        correo_notificacion: true;
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

const sendLicenseRenewalReminders = async () => {
  const now = new Date();
  const reminderDate = new Date(now);
  reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS_BEFORE);

  const startOfDay = new Date(reminderDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(reminderDate);
  endOfDay.setHours(23, 59, 59, 999);

  const empresas: EmpresaConSucursales[] = await prisma.empresa.findMany({
    where: {
      activo: 1,
      fecha_vencimiento: {
        gte: toUTC(startOfDay),
        lte: toUTC(endOfDay),
      },
    },
    include: {
      sucursal: {
        where: { activo: 1 },
        select: {
          nombre_comercial: true,
          correo: true,
          correo_notificacion: true,
        },
      },
    },
    orderBy: { fecha_vencimiento: 'asc' },
  });

  if (empresas.length === 0) {
    return;
  }

  const transporter = buildTransporter();

  for (const empresa of empresas) {
    const correos = new Set<string>();

    for (const sucursal of empresa.sucursal) {
      if (sucursal.correo_notificacion) {
        correos.add(sucursal.correo_notificacion);
      } else if (sucursal.correo) {
        correos.add(sucursal.correo);
      }
    }

    if (correos.size === 0) {
      continue;
    }

    const destinatarios = Array.from(correos);
    const fechaFormateada = formatDate.format(new Date(empresa.fecha_vencimiento));

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <img src="cid:logo" alt="CROV" style="max-width:150px; margin-bottom:16px;" />
        <p>Hola,</p>
        <p>Queremos recordarte que la licencia de tu empresa <strong>${empresa.nombre}</strong> vence el ${fechaFormateada}.</p>
        <p>Te invitamos a renovar tu licencia para evitar interrupciones en el servicio.</p>
        <p>Si ya realizaste el pago, por favor ignora este mensaje.</p>
        <p style="margin-top:24px; color:#555;">Gracias por confiar en CROV.</p>
      </div>
    `;

    await transporter
      .sendMail({
        from: process.env.SMTP_FROM,
        to: destinatarios,
        subject: 'Tu licencia está por vencer',
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
        console.error(
          `Error al enviar recordatorio de licencia a ${destinatarios.join(', ')}:`,
          error
        )
      );
  }
};

export const scheduleLicenseRenewalReminders = () => {
  const schedule = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);

    if (now > target) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    setTimeout(async () => {
      await sendLicenseRenewalReminders().catch((err) =>
        console.error('Error en tarea de recordatorio de licencias:', err)
      );
      schedule();
    }, delay);
  };

  schedule();
};