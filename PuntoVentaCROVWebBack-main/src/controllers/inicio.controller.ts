import { Request, Response } from "express";
import { toUTC } from "../utils/date";
import prisma from '../utils/prisma';

export const obtenerInicios = async (req: Request, res: Response) => {
  const activos = req.query.activos !== "0";
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res
      .status(400)
      .json({ error: "sucursalId es requerido y debe ser numérico" });
    return;
  }

  const inicios = await prisma.inicio.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioentrega: {
        select: {
          nombre: true,
          apellidos: true
        }
      },
      usuariorecibe: {
        select: {
          nombre: true,
          apellidos: true
        }
      }
    },
    orderBy: { fecha: "desc" },
  });

  res.json(inicios);
};

export const crearInicio = async (req: Request, res: Response) => {
  const data = req.body;
  const nuevoInicio = await prisma.inicio.create({ data });
  res.json(nuevoInicio);
};

export const editarInicio = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const inicio = await prisma.inicio.update({
    where: { id },
    data,
  });

  res.json(inicio);
};

export const desactivarInicio = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.inicio.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: "Inicio desactivado" });
};

export const obtenerIniciosPorRango = async (req: Request, res: Response) => {
  const { fechaInicio, fechaFin, sucursalId } = req.query;
  const activos = req.query.activos !== "0";

  const inicio = fechaInicio ? toUTC(fechaInicio.toString()) : undefined;
  const fin = fechaFin ? toUTC(fechaFin.toString()) : undefined;
  const idSucursal = Number(sucursalId);

  if (!inicio || isNaN(inicio.getTime()) || !fin || isNaN(fin.getTime())) {
    res.status(400).json({ error: "Fechas inválidas" });
    return;
  }

  if (!idSucursal || isNaN(idSucursal)) {
    res.status(400).json({ error: "sucursalId es requerido y debe ser numérico" });
    return;
  }

  const inicios = await prisma.inicio.findMany({
    where: {
      sucursalId: idSucursal,
      fecha: {
        gte: inicio,
        lte: fin,
      },
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioentrega: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
      usuariorecibe: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  res.json(inicios);
};
