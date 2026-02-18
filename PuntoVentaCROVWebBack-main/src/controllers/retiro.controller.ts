import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const obtenerRetiros = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const retiros = await prisma.retiro.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioRetiro: {
        select: {
          nombre: true,
          apellidos: true
        }
      }
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(retiros);
};

export const crearRetiro = async (req: Request, res: Response) => {
  const data = req.body;
  const nuevoRetiro = await prisma.retiro.create({ data });
  res.json(nuevoRetiro);
};

export const editarRetiro = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const retiro = await prisma.retiro.update({
    where: { id },
    data,
  });

  res.json(retiro);
};

export const desactivarRetiro = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.retiro.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Retiro desactivado' });
};
