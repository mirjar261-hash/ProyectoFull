import { Request, Response } from 'express';

import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';

export const obtenerTickets = async (_req: Request, res: Response) => {
  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: { select: { id: true, nombre: true, apellidos: true } }
    },
    orderBy: { fecha_creacion: 'desc' }
  });
  res.json(tickets);
};

export const obtenerTicketPorId = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nombre: true, apellidos: true } },
      respuestas: {
        include: {
          usuario: { select: { id: true, nombre: true, apellidos: true } }
        },
        orderBy: { fecha_respuesta: 'asc' }
      }
    }
  });

  if (!ticket) {
    res.status(404).json({ mensaje: 'Ticket no encontrado' });
    return;
  }

  res.json(ticket);
};

export const crearTicket = async (req: Request, res: Response) => {
  const { user_id, asunto, mensaje_inicial, prioridad } = req.body;
  const ticket = await prisma.supportTicket.create({
    data: { user_id, asunto, mensaje_inicial, prioridad }
  });
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

    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_FROM,
      subject: `Nuevo ticket: ${asunto}`,
      text: `Se ha creado un nuevo ticket de soporte.\n\n` +
        `Ticket ID: ${ticket.id}\n` +
        `Usuario ID: ${user_id}\n` +
        `Asunto: ${asunto}\n` +
        `Mensaje: ${mensaje_inicial}\n` +
        `Prioridad: ${prioridad}`
    }).catch((error: unknown) => console.error('Error al enviar correo del ticket:', error));
  } catch (error) {
    console.error('Error al enviar correo del ticket:', error);
  }
  res.json(ticket);
};

export const actualizarEstado = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { estado, fecha_cierre } = req.body;
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { estado, fecha_cierre }
  });
  res.json(ticket);
};

export const obtenerRespuestas = async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const respuestas = await prisma.ticketResponse.findMany({
    where: { ticket_id: ticketId },
    include: {
      usuario: { select: { id: true, nombre: true, apellidos: true } }
    },
    orderBy: { fecha_respuesta: 'asc' }
  });
  res.json(respuestas);
};

export const crearRespuesta = async (req: Request, res: Response) => {
  const ticket_id = Number(req.params.id);
  const { user_id, mensaje, es_admin } = req.body;
  const respuesta = await prisma.ticketResponse.create({
    data: { ticket_id, user_id, mensaje, es_admin },
    include: {
      usuario: { select: { id: true, nombre: true, apellidos: true } }
    }
  });
  res.json(respuesta);
};

export const actualizarTicket = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { estado, prioridad, fecha_cierre } = req.body;

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(estado && { estado }),
        ...(prioridad && { prioridad }),
        ...(fecha_cierre && { fecha_cierre })
      }
    });
    res.json(ticket);
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    res.status(400).json({ mensaje: 'Error al actualizar ticket' });
  }
};


