import { Request, Response } from 'express';
import { Prisma, TipoESA } from '@prisma/client';
import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

export const devolverDetalleVenta = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ mensaje: 'Usuario no autenticado' });
    return;
  }

  try {
    const detalle = await prisma.detalle_venta.findUnique({
      where: { id },
      include: { producto: true },
    });

    if (!detalle) {
      res.status(404).json({ mensaje: 'Detalle no encontrado' });
      return;
    }

    if (detalle.fecha_devolucion) {
      res.status(400).json({ mensaje: 'Detalle ya devuelto' });
      return;
    }

    const productoId = Number(detalle.id_producto);
    const cantidad = Number(detalle.cantidad ?? 0);

    const producto = await prisma.producto.findUnique({
      where: { id: BigInt(productoId) },
      include: {
        insumos: {
          select: {
            cantidad: true,
            productoInsumo: {
              select: {
                id: true,
                cantidad_existencia: true,
                costo: true,
                sucursalId: true,
              },
            },
          },
        },
      },
    });

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    const cantidadAntigua = Number(producto.cantidad_existencia);
    const impuesto = Number(producto.impuesto ?? 0);
    const ivaDetalle = (Number(detalle.total) * impuesto) / (100 + impuesto);
    const subtotalDetalle = Number(detalle.total) - ivaDetalle;

    const venta = await prisma.venta.findUnique({
      where: { id: detalle.id_venta },
    });

    if (!venta) {
      res.status(404).json({ mensaje: 'Venta no encontrada' });
      return;
    }

    let restante = Number(detalle.total);
    const metodos: (
      | 'efectivo'
      | 'tarjeta'
      | 'cheque'
      | 'vale'
      | 'transferencia'
    )[] = ['efectivo', 'tarjeta', 'cheque', 'vale', 'transferencia'];

    const dataVenta: Prisma.VentaUpdateInput = {
      total: { decrement: Number(detalle.total) },
      iva: { decrement: ivaDetalle },
      subtotal: { decrement: subtotalDetalle },
      numitems: { decrement: cantidad },
    };

    for (const metodo of metodos) {
      if (restante <= 0) break;

      const valor = Number((venta as any)[metodo] ?? 0);
      if (valor > 0) {
        const dec = Math.min(restante, valor);
        if (dec > 0 && Number.isFinite(dec)) {
          (dataVenta as any)[metodo] = { decrement: dec };
          restante -= dec;
        }
      }
    }

    const esServicio = producto.servicio === 1;

    const operaciones: any[] = [
      prisma.detalle_venta.update({
        where: { id },
        data: {
          // Guardar la fecha de devolución en UTC
          fecha_devolucion: new Date(),
          id_usuario_devolucion: userId,
          activo: 0,
        },
      }),
    ];

    if (!esServicio) {
      if (producto.insumos && producto.insumos.length > 0) {
        producto.insumos.forEach((ins) => {
          const insumoId = Number(ins.productoInsumo.id);
          const cantInsumo = cantidad * Number(ins.cantidad ?? 0);
          const cantAntiguaInsumo = Number(
            ins.productoInsumo.cantidad_existencia
          );
          operaciones.push(
            prisma.producto.update({
              where: { id: BigInt(insumoId) },
              data: {
                cantidad_existencia: {
                  increment: cantInsumo,
                },
              },
            }),
            prisma.inventario_esa.create({
              data: {
                id_producto: BigInt(insumoId),
                comentario: 'Devolución de venta',
                tipo_esa: TipoESA.DEVOLUCION_VENTA,
                cantidad: cantInsumo,
                cantidad_antigua: cantAntiguaInsumo,
                fecha: toUTC(),
                id_user: userId,
                costo: Number(ins.productoInsumo.costo),
                sucursalId: ins.productoInsumo.sucursalId,
              },
            })
          );
        });
      } else {
        operaciones.push(
          prisma.producto.update({
            where: { id: BigInt(productoId) },
            data: {
              cantidad_existencia: {
                increment: cantidad,
              },
            },
          }),
          prisma.inventario_esa.create({
            data: {
              id_producto: BigInt(productoId),
              comentario: 'Devolución de venta',
              tipo_esa: TipoESA.DEVOLUCION_VENTA,
              cantidad,
              cantidad_antigua: cantidadAntigua,
              fecha: toUTC(),
              id_user: userId,
              costo: Number(producto.costo),
              sucursalId: producto.sucursalId,
            },
          })
        );
      }
    }

    operaciones.push(
      prisma.venta.update({
        where: { id: detalle.id_venta },
        data: dataVenta,
      })
    );

    await prisma.$transaction(operaciones);

    const detallesActivos = await prisma.detalle_venta.count({
      where: { id_venta: detalle.id_venta, activo: 1 },
    });

    if (detallesActivos === 0) {
      await prisma.venta.update({
        where: { id: detalle.id_venta },
        data: { activo: 0 },
      });
    }

    res.json({ mensaje: 'Devolución realizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al realizar la devolución' });
  }
};
