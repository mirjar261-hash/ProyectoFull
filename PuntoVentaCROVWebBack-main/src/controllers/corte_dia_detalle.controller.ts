import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const obtenerDetallesCorteDia = async (req: Request, res: Response) => {
  const id_corte = req.query.id_corte ? Number(req.query.id_corte) : undefined;

  const detalles = await prisma.corte_dia_detalle.findMany({
    where: { id_corte: id_corte ?? undefined },
  });

  res.json(detalles);
};

export const obtenerDetalleCorteDia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const detalle = await prisma.corte_dia_detalle.findUnique({ where: { id } });

  if (!detalle) {
    res.status(404).json({ mensaje: 'Detalle no encontrado' });
    return;
  }

  res.json(detalle);
};

export const crearDetalleCorteDia = async (req: Request, res: Response) => {
  const detalle = await prisma.corte_dia_detalle.create({ data: req.body });
  res.json(detalle);
};

export const editarDetalleCorteDia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const detalle = await prisma.corte_dia_detalle.update({
    where: { id },
    data: req.body,
  });

  res.json(detalle);
};

export const desactivarDetalleCorteDia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.corte_dia_detalle.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Detalle de corte desactivado' });
};
