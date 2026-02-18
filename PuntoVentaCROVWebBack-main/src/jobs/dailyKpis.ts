import nodemailer from 'nodemailer';
import path from 'path';
import { calcularKpisDia } from '../controllers/gerente.controller';
import prisma from '../utils/prisma';

const sendDailyKpis = async () => {
  const sucursales = await prisma.sucursal.findMany({
    where: { correo_notificacion: { not: null } },
    select: { id: true, correo_notificacion: true, nombre_comercial: true },
  });

  const fecha = new Date();

  for (const sucursal of sucursales) {
    const kpis = await calcularKpisDia(sucursal.id, 0, fecha);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <img src="cid:logo" alt="CROV" style="max-width:150px;" />
        <p>Hola jefe, soy tu gerente CROV.</p>
        <p>Aquí están los KPIs del día para ${sucursal.nombre_comercial ?? 'tu sucursal'}:</p>
        <ul>
          <li><strong>Ventas totales:</strong> $${Number(kpis.ventasTotales).toFixed(2)}</li>
          <li><strong>Ticket promedio:</strong> $${Number(kpis.ticketPromedio).toFixed(2)}</li>
          <li><strong>Número de transacciones:</strong> ${kpis.numeroTransacciones}</li>
          <li><strong>Total efectivo:</strong> $${Number(kpis.totalEfectivo).toFixed(2)}</li>
          <li><strong>Total transferencia:</strong> $${Number(kpis.totalTransferencia).toFixed(2)}</li>
          <li><strong>Total tarjeta:</strong> $${Number(kpis.totalTarjeta).toFixed(2)}</li>
          <li><strong>Total cheque:</strong> $${Number(kpis.totalCheque).toFixed(2)}</li>
          <li><strong>Total vale:</strong> $${Number(kpis.totalVale).toFixed(2)}</li>
          <li><strong>Total crédito:</strong> $${Number(kpis.totalCredito).toFixed(2)}</li>
          <li><strong>Porcentaje devoluciones:</strong> ${kpis.porcentajeDevoluciones.toFixed(2)}%</li>
          <li><strong>Total compras:</strong> $${Number(kpis.totalCompras).toFixed(2)}</li>
          <li><strong>Total gastos:</strong> $${Number(kpis.totalGastos).toFixed(2)}</li>
        </ul>
      </div>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter
      .sendMail({
        from: process.env.SMTP_FROM,
        to: sucursal.correo_notificacion!,
        subject: 'KPIs del día',
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
        console.error('Error al enviar KPIs:', error)
      );
  }
};

export const scheduleDailyKpis = () => {
  const schedule = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(22, 30, 0, 0);
    if (now > target) {
      target.setDate(target.getDate() + 1);
    }
    const delay = target.getTime() - now.getTime();
    setTimeout(async () => {
      await sendDailyKpis().catch((err) =>
        console.error('Error tarea KPIs:', err)
      );
      schedule();
    }, delay);
  };

  schedule();
};
