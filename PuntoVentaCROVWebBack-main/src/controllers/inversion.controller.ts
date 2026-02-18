import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

export const obtenerInversiones = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const inversiones = await prisma.inversion.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioInversion: {
        select: {
          nombre: true,
          apellidos: true
        }
      },
      usuarioCreacion: {
        select: {
          nombre: true,
          apellidos: true
        }
      }
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(inversiones);
};

export const crearInversion = async (req: Request, res: Response) => {
  const data = req.body;
  const userId = req.user?.userId;
  const nuevoInversion = await prisma.inversion.create({
    data: { ...data, id_usuario_creacion: userId }
  });
  res.json(nuevoInversion);
};

export const editarInversion = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const inversion = await prisma.inversion.update({
    where: { id },
    data,
  });

  res.json(inversion);
};

export const desactivarInversion = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.inversion.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Inversion desactivada' });
};

export const obtenerInversionesPorRango = async (req: Request, res: Response) => {
  const { fechaInicio, fechaFin, sucursalId } = req.query;
  const activos = req.query.activos !== '0';

  const inicio = fechaInicio ? toUTC(fechaInicio.toString()) : undefined;
  const fin = fechaFin ? toUTC(fechaFin.toString()) : undefined;
  const idSucursal = Number(sucursalId);

  if (!inicio || isNaN(inicio.getTime()) || !fin || isNaN(fin.getTime())) {
    res.status(400).json({ error: 'Fechas inválidas' });
    return;
  }

  if (!idSucursal || isNaN(idSucursal)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const inversiones = await prisma.inversion.findMany({
    where: {
      sucursalId: idSucursal,
      fecha: {
        gte: inicio,
        lte: fin,
      },
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioInversion: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(inversiones);
};
