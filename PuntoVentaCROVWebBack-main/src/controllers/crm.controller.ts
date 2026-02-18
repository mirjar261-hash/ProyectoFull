import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';

type EstadoPlantilla = 0 | 1;

const parseActivo = (valor: unknown): EstadoPlantilla | null => {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor === 'boolean') {
    return valor ? 1 : 0;
  }

  const numero = Number(valor);
  if (Number.isNaN(numero) || (numero !== 0 && numero !== 1)) {
    return null;
  }

  return numero as EstadoPlantilla;
};

export const obtenerPlantillas = async (req: Request, res: Response) => {
  try {
    const { activo } = req.query as { activo?: string };
    const filtros: { activo?: EstadoPlantilla } = {};

    if (activo !== undefined) {
      const estado = parseActivo(activo);
      if (estado === null) {
        res.status(400).json({ error: 'El parámetro activo debe ser 0 o 1' });
        return;
      }
      filtros.activo = estado;
    }

    const plantillas = await prisma.plantilla.findMany({
      where: filtros,
      orderBy: { creadoEn: 'desc' },
    });

    res.json(plantillas);
  } catch (error) {
    console.error('Error al obtener plantillas', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

export const obtenerPlantillaPorId = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: 'id es requerido y debe ser numérico' });
    return;
  }

  try {
    const plantilla = await prisma.plantilla.findUnique({ where: { id } });

    if (!plantilla) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }

    res.json(plantilla);
  } catch (error) {
    console.error('Error al obtener plantilla', error);
    res.status(500).json({ error: 'Error al obtener la plantilla' });
  }
};

export const crearPlantilla = async (req: Request, res: Response) => {
  try {
    const { titulo, mensaje, activo } = req.body as {
      titulo?: string;
      mensaje?: string;
      activo?: unknown;
    };

    if (!titulo || !titulo.trim()) {
      res.status(400).json({ error: 'El título es obligatorio' });
      return;
    }

    if (!mensaje || !mensaje.trim()) {
      res.status(400).json({ error: 'El mensaje es obligatorio' });
      return;
    }

    const estado = parseActivo(activo);
    if (activo !== undefined && estado === null) {
      res.status(400).json({ error: 'El campo activo debe ser 0 o 1' });
      return;
    }

    const nuevaPlantilla = await prisma.plantilla.create({
      data: {
        titulo: titulo.trim(),
        mensaje,
        activo: estado ?? 1,
      },
    });

    res.status(201).json(nuevaPlantilla);
  } catch (error) {
    console.error('Error al crear plantilla', error);
    res.status(500).json({ error: 'Error al crear la plantilla' });
  }
};

export const actualizarPlantilla = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: 'id es requerido y debe ser numérico' });
    return;
  }

  try {
    const { titulo, mensaje, activo } = req.body as {
      titulo?: string;
      mensaje?: string;
      activo?: unknown;
    };

    const data: {
      titulo?: string;
      mensaje?: string;
      activo?: EstadoPlantilla;
    } = {};

    if (titulo !== undefined) {
      if (!titulo.trim()) {
        res.status(400).json({ error: 'El título no puede estar vacío' });
        return;
      }
      data.titulo = titulo.trim();
    }

    if (mensaje !== undefined) {
      if (!mensaje.trim()) {
        res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        return;
      }
      data.mensaje = mensaje;
    }

    if (activo !== undefined) {
      const estado = parseActivo(activo);
      if (estado === null) {
        res.status(400).json({ error: 'El campo activo debe ser 0 o 1' });
        return;
      }
      data.activo = estado;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No hay datos para actualizar' });
      return;
    }

    const plantillaActualizada = await prisma.plantilla.update({
      where: { id },
      data,
    });

    res.json(plantillaActualizada);
  } catch (error) {
    console.error('Error al actualizar plantilla', error);
    res.status(500).json({ error: 'Error al actualizar la plantilla' });
  }
};

export const actualizarEstadoPlantilla = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    res.status(400).json({ error: 'id es requerido y debe ser numérico' });
    return;
  }

  try {
    const { activo } = req.body as { activo?: unknown };

    const estado = parseActivo(activo);
    if (estado === null) {
      res.status(400).json({ error: 'El campo activo debe ser 0 o 1' });
      return;
    }

    const plantilla = await prisma.plantilla.update({
      where: { id },
      data: { activo: estado },
    });

    res.json(plantilla);
  } catch (error) {
    console.error('Error al cambiar estado de plantilla', error);
    res.status(500).json({ error: 'Error al cambiar el estado de la plantilla' });
  }
};
export const enviarNotificacion = async (req: Request, res: Response) => {
  try {
    const { empresaId, plantillaId, canal, correoDestino } = req.body;

    if (!empresaId || !plantillaId || !canal) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // Traer la plantilla de la base de datos
    const plantilla = await prisma.plantilla.findUnique({
      where: { id: Number(plantillaId) },
    });

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    if (canal === 'correo') {
      if (!correoDestino) {
        return res.status(400).json({ error: 'Falta correoDestino' });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465, // false para 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM, // tu correo verificado en SES
        to: correoDestino,
        subject: plantilla.titulo,
        text: plantilla.mensaje,
      });

      return res.json({ message: 'Correo enviado correctamente' });
    }

    if (canal === 'whatsapp') {
      console.log('Simulación envío WhatsApp', { empresaId, plantillaId });
      return res.json({ message: 'Notificación de WhatsApp enviada (simulada)' });
    }

    return res.status(400).json({ error: 'Canal desconocido' });
  } catch (err) {
    console.error('Error al enviar notificación', err);
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
};

export const obtenerUsuariosConSucursal = async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        correo: true,
        perfil: true,
        activo: true,
        sucursal: {
          select: {
            id: true,
            nombre_comercial: true,
            razon_social: true,
            correo: true,
            tel: true,
            cel: true,
            activo: true,
            empresa: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios para CRM', error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
};

export const enviarCorreosMasivos = async (req: Request, res: Response) => {
  try {
    const { plantilla_id, correos } = req.body as {
      plantilla_id?: string | number;
      correos?: string[];
    };

    if (!plantilla_id || !correos || correos.length === 0) {
      return res.status(400).json({ error: 'plantilla_id y correos son obligatorios' });
    }

    const plantilla = await prisma.plantilla.findUnique({
      where: { id: Number(plantilla_id) },
    });

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_FROM,
      bcc: correos,
      subject: plantilla.titulo,
      text: plantilla.mensaje,
    });

    return res.json({
      message: 'Correos enviados correctamente',
      totalDestinatarios: correos.length,
    });
  } catch (error) {
    console.error('Error al enviar correos masivos', error);
    res.status(500).json({ error: 'Error al enviar los correos masivos' });
  }
};

