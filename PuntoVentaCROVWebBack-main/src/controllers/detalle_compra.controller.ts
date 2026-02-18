import { Request, Response } from 'express';

import { serializeBigInt } from '../utils/serializeBigInt';
import prisma from '../utils/prisma';

export const obtenerDetallesCompra = async (req: Request, res: Response) => {
  const id_compra = req.query.id_compra ? Number(req.query.id_compra) : undefined;

  const detalles = await prisma.detalle_compra.findMany({
    where: { id_compra: id_compra ?? undefined },
  });

  res.json(serializeBigInt(detalles));
};

export const obtenerDetalleCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const detalle = await prisma.detalle_compra.findUnique({
    where: { id },
  });

  if (!detalle) {
    res.status(404).json({ mensaje: 'Detalle no encontrado' });
    return;
  }

  res.json(serializeBigInt(detalle));
};

export const crearDetalleCompra = async (req: Request, res: Response) => {
  const { costo, ...rest } = req.body;
  const cantidad = Number(req.body.cantidad ?? 0);
  const costoNumero = Number(costo ?? 0);
  const data = {
    ...rest,
    importe: Number(req.body.importe ?? cantidad * costoNumero),
  };

  const detalle = await prisma.detalle_compra.create({ data });
  res.json(serializeBigInt(detalle));
};

export const editarDetalleCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { costo, ...rest } = req.body;
  const cantidad = Number(req.body.cantidad ?? 0);
  const costoNumero = Number(costo ?? 0);
  const data = {
    ...rest,
    importe: Number(req.body.importe ?? cantidad * costoNumero),
  };

  const detalle = await prisma.detalle_compra.update({
    where: { id },
    data,
  });

  res.json(serializeBigInt(detalle));
};

export const desactivarDetalleCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.detalle_compra.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Detalle de compra desactivado' });
};
