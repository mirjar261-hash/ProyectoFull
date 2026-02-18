import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

export const obtenerGastos = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);
   const fechaInicio = req.query.fechaInicio
    ? toUTC(req.query.fechaInicio as string)
    : undefined;
  const fechaFin = req.query.fechaFin
    ? toUTC(req.query.fechaFin as string)
    : undefined;

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }
   const fechaWhere: any = {};
    if (fechaInicio) fechaWhere.gte = fechaInicio;
    if (fechaFin) fechaWhere.lte = fechaFin;

  const gastos = await prisma.gasto.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
      fecha: Object.keys(fechaWhere).length ? fechaWhere : undefined
    },
    include: {
      usuarioGasto: {
        select: {
          nombre: true,
          apellidos: true
        }
      }
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(gastos);
};

export const crearGasto = async (req: Request, res: Response) => {
  const data = req.body;
  const nuevoGasto = await prisma.gasto.create({ data });
  res.json(nuevoGasto);
};

export const editarGasto = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const gasto = await prisma.gasto.update({
    where: { id },
    data,
  });

  res.json(gasto);
};

export const desactivarGasto = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.gasto.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Gasto desactivado' });
};

export const obtenerGastosPorRango = async (req: Request, res: Response) => {
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

  const gastos = await prisma.gasto.findMany({
    where: {
      sucursalId: idSucursal,
      fecha: {
        gte: inicio,
        lte: fin,
      },
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioGasto: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(gastos);
};
