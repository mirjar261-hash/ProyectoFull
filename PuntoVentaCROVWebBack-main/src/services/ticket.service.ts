import prisma from '../utils/prisma';
import nodemailer from 'nodemailer';
// 1. IMPORTANTE: Importamos los Enums generados por Prisma
// Si 'EstadoTicket' te marca error, verifica en tu schema.prisma cómo se llama el enum del estado.
import { PrioridadTicket, EstadoTicket } from '@prisma/client';

const enviarNotificacionCorreo = async (ticket: any) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_FROM, 
      subject: `Nuevo ticket IA: ${ticket.asunto}`,
      text: `Se ha creado un nuevo ticket de soporte vía Chatbot.\n\n` +
        `Ticket ID: ${ticket.id}\n` +
        `Usuario ID: ${ticket.user_id}\n` +
        `Asunto: ${ticket.asunto}\n` +
        `Mensaje: ${ticket.mensaje_inicial}\n` +
        `Prioridad: ${ticket.prioridad}`
    });
  } catch (error) {
    console.error('Error al enviar correo del ticket (IA):', error);
  }
};

export const crearTicketIA = async (userId: number, asunto: string, mensaje: string, prioridad: string = 'BAJA') => {
  try {
    // 2. Convertimos el string que viene de la IA al tipo Enum de Prisma
    // Esto asume que la IA manda "ALTA", "MEDIA" o "BAJA" tal cual.
    const prioridadEnum = prioridad as PrioridadTicket;

    const ticket = await prisma.supportTicket.create({
      data: {
        user_id: userId,
        asunto,
        mensaje_inicial: mensaje,
        // CORRECCIÓN AQUÍ: Usamos el enum casteado
        prioridad: prioridadEnum, 
        // CORRECCIÓN AQUÍ: Aseguramos que 'ABIERTO' sea del tipo EstadoTicket
        estado: 'ABIERTO' as EstadoTicket 
      }
    });

    enviarNotificacionCorreo(ticket);

    return { 
      success: true, 
      mensaje: `Ticket **#${ticket.id}** creado exitosamente jefe. Hemos notificado al equipo de soporte.` 
    };
  } catch (error: any) {
    console.error("Error crearTicketIA:", error);
    return { error: 'Hubo un error técnico al intentar crear el ticket de soporte.' };
  }
};

export const consultarTicketIA = async (ticketId: number) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        respuestas: {
          orderBy: { fecha_respuesta: 'desc' },
          take: 1
        },
        user: { select: { nombre: true } }
      }
    });

    if (!ticket) {
      return { error: `No encontré ningún ticket con el folio **#${ticketId}** jefe.` };
    }

    let respuestaTexto = "Sin respuestas aún.";
    if (ticket.respuestas.length > 0) {
      respuestaTexto = `Última respuesta: "${ticket.respuestas[0].mensaje}"`;
    }

    // Convertimos a string para mostrar emojis sin problemas de tipos
    const estadoStr = String(ticket.estado);
    const estadoEmoji = estadoStr === 'ABIERTO' ? '🟢' : estadoStr === 'CERRADO' ? '🔴' : '🟡';

    return {
      success: true,
      mensaje: `📋 **Estado del Ticket #${ticket.id}**\n` +
               `▫️ **Asunto:** ${ticket.asunto}\n` +
               `▫️ **Estado:** ${estadoEmoji} ${estadoStr}\n` +
               `▫️ **Prioridad:** ${ticket.prioridad}\n` +
               `▫️ **Detalle:** ${respuestaTexto}`
    };
  } catch (error: any) {
    console.error("Error consultarTicketIA:", error);
    return { error: 'Error al consultar el ticket.' };
  }
};