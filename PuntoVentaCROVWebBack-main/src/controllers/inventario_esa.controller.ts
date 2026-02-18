import { Request, Response } from 'express';

import { serializeBigInt } from '../utils/serializeBigInt';
import prisma from '../utils/prisma';

export const obtenerInventarioESA = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const id_producto = req.query.id_producto
    ? BigInt(req.query.id_producto as string)
    : undefined;

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const movimientos = await prisma.inventario_esa.findMany({
    where: {
      sucursalId,
      id_producto: id_producto ?? undefined,
    },
    include: {
      producto: {
        select: {
          nombre: true,
          codigo: true,
        },
      },
      usuario: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(serializeBigInt(movimientos));
};

export const crearInventarioESA = async (req: Request, res: Response) => {
  const data = req.body;
  const movimiento = await prisma.inventario_esa.create({ data });
  res.json(serializeBigInt(movimiento));
};

export const editarInventarioESA = async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const data = req.body;

  const movimiento = await prisma.inventario_esa.update({
    where: { id },
    data,
  });

  res.json(serializeBigInt(movimiento));
};

export const eliminarInventarioESA = async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);

  await prisma.inventario_esa.delete({
    where: { id },
  });

  res.json({ mensaje: 'Movimiento eliminado' });
};
