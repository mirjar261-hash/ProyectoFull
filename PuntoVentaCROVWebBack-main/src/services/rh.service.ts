import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
};

export const notificarNuevaSolicitudIncidenciaRH = async (
  nombreEmpleado: string,
  tipo: string,
  inicio: Date,
  fin: Date,
  descripcion: string
) => {
  try {
    const inicioStr = formatDate(inicio);
    const finStr = formatDate(fin);

    const fechasHtml = (inicioStr === finStr)
      ? `<li><strong>Fecha:</strong> ${inicioStr}</li>`
      : `<li><strong>Fecha inicio:</strong> ${inicioStr}</li>
         <li><strong>Fecha fin:</strong> ${finStr}</li>`;

    const asunto = `Nueva solicitud de incidencia - ${nombreEmpleado}`;

    const htmlContent = `
      <p>Se ha recibido una nueva solicitud de incidencia:</p>
      <ul>
        <li><strong>Solicitante:</strong> ${nombreEmpleado}</li>
        <li><strong>Tipo incidencia:</strong> ${tipo}</li>
        ${fechasHtml}
        <li><strong>Descripción:</strong> ${descripcion}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM, 
      to: process.env.SMTP_FROM_EMAIL_F,
      subject: asunto,
      html: htmlContent,
    });
    
  } catch (error) {
    console.error("Error al mandar notificación de nueva solicitud de incidencia:", error);
  }
};