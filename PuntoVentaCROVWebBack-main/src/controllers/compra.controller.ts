import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import { serializeBigInt } from '../utils/serializeBigInt';
import prisma from '../utils/prisma';

export const obtenerCompras = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);
  const fechaInicio = req.query.fechaInicio
    ? toUTC(req.query.fechaInicio as string)
    : undefined;
  const fechaFin = req.query.fechaFin
    ? toUTC(req.query.fechaFin as string)
    : undefined;

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }
  const fechaWhere: any = {};
    if (fechaInicio) fechaWhere.gte = fechaInicio;
    if (fechaFin) fechaWhere.lte = fechaFin;
  const compras = await prisma.compra.findMany({
    where: {
      sucursalId,
      fecha: Object.keys(fechaWhere).length ? fechaWhere : undefined,
    },
    include: {
      proveedor: true,
      usuarioCompra: { select: { nombre: true, apellidos: true } },
      detalles: true,
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(serializeBigInt(compras));
};

export const obtenerUltimoFolio = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  const ultimaCompra = await prisma.compra.findFirst({
    where: { sucursalId },
    orderBy: { id: 'desc' },
  });

  res.json({ consecutivo: ultimaCompra?.id ?? 0 });
};

export const obtenerCompraPorId = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      proveedor: true,
      usuarioCompra: { select: { nombre: true, apellidos: true } },
      detalles: {
      include: {
        producto: {
          select: {
            nombre: true,
          },
        },
      },
    },
    },
  });

  if (!compra) {
    res.status(404).json({ mensaje: 'Compra no encontrada' });
    return;
  }

  res.json(serializeBigInt(compra));
};

export const crearCompra = async (req: Request, res: Response) => {
  const { detalles = [], proveedorId, id_proveedor, ...rest } = req.body;

  const data = {
    ...rest,
    id_proveedor: proveedorId ?? id_proveedor ?? null,
    impuestos: rest.impuestos ?? rest.iva,
    ieps: rest.ieps ?? 0,
  };

  try {
    const detallesConImporte = detalles.map((d: any) => {
      const {
        costo,
        productoId,
        id_producto,
        precio1,
        precio2,
        precio3,
        precio4,
        ...restDetalle
      } = d;
      const cantidad = Number(d.cantidad ?? 0);
      const costoNumero = Number(costo ?? 0);
      return {
        ...restDetalle,
        producto: { connect: { id: Number(productoId ?? id_producto) } },
        importe: Number(d.importe ?? cantidad * costoNumero),
        activo: 1
      };
    });

    const compra = await prisma.compra.create({
      data: {
        ...data,
        detalles: {
          create: detallesConImporte,
        },
      },
      include: { detalles: true },
    });

    // Actualizar productos con la información de la compra
    await Promise.all(
      detalles.map(async (d: any) => {
        const productoId = Number(d.productoId ?? d.id_producto);
        const costo = Number(d.costo ?? 0);
        const precio1 = Number(d.precio1 ?? 0);
        const precio2 = Number(d.precio2 ?? 0);
        const precio3 = Number(d.precio3 ?? 0);
        const precio4 = Number(d.precio4 ?? 0);
        const cantidad = Number(d.cantidad ?? 0);

        await prisma.producto.update({
          where: { id: BigInt(productoId) },
          data: {
            costo,
            precio1,
            precio2,
            precio3,
            precio4,
            utilidad1: precio1 - costo,
            utilidad2: precio2 - costo,
            utilidad3: precio3 - costo,
            utilidad4: precio4 - costo,
            cantidad_existencia: {
              increment: cantidad,
            },
          },
        });
      })
    );

    res.json(serializeBigInt(compra));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la compra' });
  }
};

export const editarCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const compra = await prisma.compra.update({
    where: { id },
    data,
  });

  res.json(serializeBigInt(compra));
};

export const desactivarCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.compra.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Compra desactivada' });
};

export const devolverCompra = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = req.user?.userId;

  try {
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!compra) {
      res.status(404).json({ mensaje: 'Compra no encontrada' });
      return;
    }

    await prisma.compra.update({
      where: { id },
      data: {
        activo: 0,
        fecha_devolucion: new Date(),
        id_usuario_devolucion: userId ?? null,
      },
    });

    await Promise.all(
      compra.detalles.map(async (d: any) => {
        const productoId = Number(d.id_producto);
        const cantidad = Number(d.cantidad ?? 0);
        await prisma.producto.update({
          where: { id: BigInt(productoId) },
          data: {
            cantidad_existencia: {
              decrement: cantidad,
            },
          },
        });
      })
    );

    res.json({ mensaje: 'Devolución realizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al realizar la devolución' });
  }
};
