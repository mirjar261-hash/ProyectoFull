import { toUTCEnd, toUTCStart } from '../utils/date';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const obtenerPromocionesAplicables = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const promociones = await prisma.promocion.findMany({
    where: { sucursalId, activo: 1 },
    select: {
      id: true,
      tipo: true,
      productoId: true,
      cantidad: true,
      monto: true,
      tipo_descuento: true,
      fecha_inicio: true,
      fecha_fin: true,
      descripcion: true,
    },
  });

  const serializadas = promociones.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    productoId: p.productoId ? p.productoId.toString() : null,
    cantidad: p.cantidad,
    monto: p.tipo_descuento === 'MONTO' ? Number(p.monto) : null,
    porcentaje: p.tipo_descuento === 'PORCENTAJE' ? Number(p.monto) : null,
    fecha_inicio: p.fecha_inicio,
    fecha_fin: p.fecha_fin,
    descripcion: p.descripcion,
  }));

  res.json(serializadas);
};

export const obtenerPromociones = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const promociones = await prisma.promocion.findMany({
    where: { sucursalId },

    include: { producto: true }
  });

  const serializadas = promociones.map(p => ({
    ...p,
    productoId: p.productoId ? p.productoId.toString() : null,
    producto: p.producto ? { ...p.producto, id: p.producto.id.toString() } : null
  }));

  res.json(serializadas);
};

export const crearPromocion = async (req: Request, res: Response) => {
  try {
    const sucursalId = Number(req.body.sucursalId);
    if (!sucursalId || isNaN(sucursalId)) {
      res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
      return;
    }

    const data = {
      ...req.body,
      fecha_inicio: toUTCStart(req.body.fecha_inicio),
      fecha_fin: toUTCEnd(req.body.fecha_fin),
      sucursalId,
      productoId: req.body.productoId ? BigInt(req.body.productoId) : undefined
    };

    await prisma.promocion.create({ data });
    return res.sendStatus(201);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear promoción' });
  }
};

export const actualizarPromocion = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: 'id es requerido y debe ser numérico' });
    return;
  }

  const data: any = {
    ...req.body,
    fecha_inicio: toUTCEnd(req.body.fecha_inicio),
    fecha_fin: toUTCStart(req.body.fecha_fin),
    sucursalId: req.body.sucursalId ? Number(req.body.sucursalId) : undefined,
    productoId: req.body.productoId ? BigInt(req.body.productoId) : undefined
  };

  try {
    const promocion = await prisma.promocion.update({
      where: { id },
      data
    });
    return res.sendStatus(201);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar promoción' });
  }
};

export const desactivarPromocion = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: 'id es requerido y debe ser numérico' });
    return;
  }

  try {
    const promocion = await prisma.promocion.update({
      where: { id },
      data: { activo: 0 }
    });
    return res.sendStatus(201);
  } catch (error) {
    res.status(400).json({ error: 'Error al desactivar promoción' });
  }
};

export const obtenerPromocionesActivas = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const fechaParam = req.query.fecha as string;
  const fecha = fechaParam ? new Date(fechaParam) : null;

  if (!sucursalId || isNaN(sucursalId) || !fecha || isNaN(fecha.getTime())) {
    res.status(400).json({ error: 'sucursalId y fecha válidos son requeridos' });
    return;
  }

  const promociones = await prisma.promocion.findMany({
    where: {
      sucursalId,
      activo: 1,
      fecha_inicio: { lte: fecha },
      fecha_fin: { gte: fecha }
    },
    include: { producto: true }
  });

  const serializadas = promociones.map(p => ({
    ...p,
    productoId: p.productoId ? p.productoId.toString() : null,
    producto: p.producto ? { ...p.producto, id: p.producto.id.toString() } : null
  }));

  res.json(serializadas);
};

export const obtenerPromocionesPorRangoFecha = async (req: Request, res: Response) => {
  const inicioParam = req.query.inicio as string;
  const finParam = req.query.fin as string;
  const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : undefined;
  const productoIdParam = req.query.productoId as string;
  const inicio = inicioParam ? new Date(inicioParam) : null;
  const fin = finParam ? new Date(finParam) : null;

  if (!inicio || !fin || isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    res.status(400).json({ error: 'inicio y fin deben ser fechas válidas' });
    return;
  }

  const where: any = {
    fecha_inicio: { gte: inicio },
    fecha_fin: { lte: fin },
    activo: 1
  };

  if (sucursalId && !isNaN(sucursalId)) {
    where.sucursalId = sucursalId;
  }
  if (productoIdParam && !isNaN(Number(productoIdParam))) {
    where.productoId = BigInt(productoIdParam);
  }

  const promociones = await prisma.promocion.findMany({
    where,
    include: { producto: true }
  });

  const serializadas = promociones.map(p => ({
    ...p,
    productoId: p.productoId ? p.productoId.toString() : null,
    producto: p.producto ? { ...p.producto, id: p.producto.id.toString() } : null
  }));

  res.json(serializadas);
};
