import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

interface DemoRequestPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  date?: string;
  time?: string;
}

const RECIPIENT_EMAIL = process.env.DEMO_REQUEST_RECIPIENT ?? 'crov.technology.services@gmail.com';

function formatDateTime(date?: string, time?: string) {
  if (!date || !time) return undefined;
  try {
    const dateTime = new Date(`${date}T${time}`);
    if (Number.isNaN(dateTime.getTime())) {
      return undefined;
    }
    return dateTime.toLocaleString('es-MX', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch (error) {
    console.error('Error al formatear la fecha de agenda', error);
    return undefined;
  }
}

export const enviarSolicitudDemo = async (req: Request<unknown, unknown, DemoRequestPayload>, res: Response) => {
  const { fullName, phone, email, date, time } = req.body ?? {};

  if (!fullName || !phone || !email || !date || !time) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM;

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    console.error('Configuración SMTP incompleta para solicitud de demostración');
    return res.status(500).json({ error: 'El servicio de correo no está configurado.' });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const formattedSchedule = formatDateTime(date, time) ?? `${date} ${time}`;

  const htmlContent = `
    <p>Hola equipo CROV,</p>
    <p>Un cliente ha solicitado una demostración del punto de venta web.</p>
    <ul>
      <li><strong>Nombre:</strong> ${fullName}</li>
      <li><strong>Teléfono:</strong> ${phone}</li>
      <li><strong>Correo electrónico:</strong> ${email}</li>
      <li><strong>Fecha y hora solicitadas:</strong> ${formattedSchedule}</li>
    </ul>
    <p>Por favor, pónganse en contacto con el cliente para confirmar la demostración.</p>
  `;

  const textContent = `Nuevo cliente interesado en demostración\nNombre: ${fullName}\nTeléfono: ${phone}\nCorreo: ${email}\nFecha y hora solicitadas: ${formattedSchedule}`;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: RECIPIENT_EMAIL,
      subject: 'Nuevo cliente agendó una demostración',
      html: htmlContent,
      text: textContent,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error al enviar correo de demostración', error);
    return res
      .status(502)
      .json({ error: 'No se pudo enviar la notificación por correo. Inténtalo más tarde.' });
  }
};
