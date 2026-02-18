import { Request, Response } from 'express';

import nodemailer from 'nodemailer';
import path from 'path';
import { serializeBigInt } from '../utils/serializeBigInt';
import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

const notifySucursal = async (sucursalId: number, subject: string, body: string) => {
  const sucursal = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { correo_notificacion: true, nombre_comercial: true },
  });

  if (!sucursal?.correo_notificacion) return;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <img src="cid:logo" alt="CROV" style="max-width:150px;" />
      <p>Hola soy tu gerente CROV.</p>
      <p>Estimado equipo de ${sucursal.nombre_comercial ?? 'sucursal'},</p>
      ${body}
    </div>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

    transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: sucursal.correo_notificacion,
    subject,
    html,
    attachments: [{
      filename: 'avatar.png',
      path: path.join(__dirname, '../../assets/avatar.png'),
      cid: 'logo',
    }],
    }).catch((error: unknown) => console.error('Error al enviar correo de notificación:', error));
};

const mapDetalle = async (d: any) => {
  const cantidad = Number(d.cantidad ?? 0);
  const precio = Number(d.precio ?? 0);
  const producto = await prisma.producto.findUnique({
    where: { id: BigInt(d.id_producto) },
    select: { costo: true },
  });
  return {
    cantidad,
    precio,
    total: Number(d.total ?? cantidad * precio),
    descuento: Number(d.descuento ?? 0),
    descuentoind: d.descuentoind !== undefined ? Number(d.descuentoind) : undefined,
    descuentogeneral:
      d.descuentogeneral !== undefined ? Number(d.descuentogeneral) : undefined,
    costo: Number(producto?.costo ?? 0),
    producto: { connect: { id: Number(d.id_producto) } },
    activo: 1,
    promociones: Array.isArray(d.promociones)
      ? { create: d.promociones.map((p: number) => ({ id_promocion: Number(p) })) }
      : undefined,
  };
};

export const obtenerVentas = async (req: Request, res: Response) => {
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

  const ventasRaw = (await prisma.venta.findMany({
    where: {
      sucursalId,
      fecha: Object.keys(fechaWhere).length ? fechaWhere : undefined,
    },
    include: {
      cliente: true,
      usuario: { select: { nombre: true, apellidos: true } },
      detalles: {
        include: {
          // @ts-ignore
          promociones: { include: { promocion: true } },
        },
      },
    },
    orderBy: { fecha: 'desc' },
  })) as any[];

  const ventas = ventasRaw.map((v) => ({
    ...v,
    detalles: v.detalles.map((d: any) => ({
      ...d,
      promociones: d.promociones ? d.promociones.map((p: any) => p.promocion) : [],
    })),
  }));

  res.json(serializeBigInt(ventas));
};

export const obtenerUltimoFolio = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  const ultimaVenta = await prisma.venta.findFirst({
    where: { sucursalId },
    orderBy: { id: 'desc' },
  });

  res.json({ consecutivo: ultimaVenta?.id ?? 0 });
};

export const obtenerVentaPorId = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const ventaRaw = (await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { nombre: true, apellidos: true } },
      detalles: {
        include: {
          producto: {
            select: { nombre: true },
          },
          // @ts-ignore
          promociones: { include: { promocion: true } },
        },
      },
    },
  })) as any;

  if (!ventaRaw) {
    res.status(404).json({ mensaje: 'Venta no encontrada' });
    return;
  }

  const venta = {
    ...ventaRaw,
    detalles: ventaRaw.detalles.map((d: any) => ({
      ...d,
      promociones: d.promociones ? d.promociones.map((p: any) => p.promocion) : [],
    })),
  };

  res.json(serializeBigInt(venta));
};

export const crearVenta = async (req: Request, res: Response) => {
  const { detalles = [], id_cliente, descuentoind, ...rest } = req.body;
  const userId = req.user?.userId;

  try {
     // Obtener usuario y sucursal
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { sucursal: true },
    });

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const sucursal = usuario.sucursal;
    const permiteInventarioNegativo = sucursal.inventario_negativo;

    const detallesData = await Promise.all(detalles.map(mapDetalle));

    const venta = (await prisma.venta.create({
      data: {
        ...rest,
        id_cliente: id_cliente ?? null,
        descuentoind: descuentoind !== undefined ? Number(descuentoind) : undefined,
        detalles: {
          create: detallesData,
        },
      },
      include: {
        detalles: {
          include: {
            // @ts-ignore
            promociones: { include: { promocion: true } },
          },
        },
      },
    })) as any;

    const alertas: string[] = [];
    const descuentos:string[] = [];
    const isCotizacion = (rest.estado ?? '').toUpperCase() === 'COTIZACION';
    /*if (!isCotizacion) {
      await Promise.all(
        detalles.map(async (d: any) => {
          const productoId = Number(d.id_producto);
          const cantidad = Number(d.cantidad ?? 0);
          const producto = await prisma.producto.update({
            where: { id: BigInt(productoId) },
            data: {
              cantidad_existencia: {
                decrement: cantidad,
              },
            },
          });
          const min = producto.stock_min ?? 0;
          if (producto.cantidad_existencia <= min || producto.cantidad_existencia <= 0) {
            alertas.push(`${producto.nombre} (existencia: ${producto.cantidad_existencia})`);
          }
        })
      );
    }*/
   await Promise.all(
      detalles.map(async (d: any) => {
        const productoId = Number(d.id_producto);
        const cantidad = Number(d.cantidad ?? 0);
        const descuento = Number(d.descuento ?? 0);
        const producto = await prisma.producto.findUnique({
          where: { id: BigInt(productoId) },
          select: {
            nombre: true,
            stock_min: true,
            cantidad_existencia: true,
            servicio: true,
            insumos: {
              select: {
                cantidad: true,
                productoInsumo: {
                  select: {
                    id: true,
                    nombre: true,
                    stock_min: true,
                    cantidad_existencia: true,
                  },
                },
              },
            },
          },
        });

        if (!producto) return;

        if (!isCotizacion && producto.servicio !== 1) {
          if (producto.insumos && producto.insumos.length > 0) {
            await Promise.all(
              producto.insumos.map(async (ins) => {
                const insumoId = Number(ins.productoInsumo.id);
                const cantInsumo = cantidad * Number(ins.cantidad ?? 0);
                 // Validación inventario negativo
                if (!permiteInventarioNegativo) {
                  const insumoActual = await prisma.producto.findUnique({
                    where: { id: BigInt(insumoId) },
                  });
                  if ((insumoActual?.cantidad_existencia ?? 0) < cantInsumo) {
                    throw new Error(
                      `Stock insuficiente para ${insumoActual?.nombre}. Disponibles: ${insumoActual?.cantidad_existencia}, solicitados: ${cantInsumo}`
                    );
                  }
                }
                const actualizado = await prisma.producto.update({
                  where: { id: BigInt(insumoId) },
                  data: {
                    cantidad_existencia: {
                      decrement: cantInsumo,
                    },
                  },
                  select: {
                    nombre: true,
                    stock_min: true,
                    cantidad_existencia: true,
                  },
                });
                const min = actualizado.stock_min ?? 0;
                if (
                  actualizado.cantidad_existencia <= min ||
                  actualizado.cantidad_existencia <= 0
                ) {
                  alertas.push(
                    `${actualizado.nombre} (existencia: ${actualizado.cantidad_existencia})`
                  );
                }
              })
            );
            if (descuento > 0) {
              const nombre = producto.nombre ?? 'Producto';
              descuentos.push(`${nombre} (descuento: ${descuento})`);
            }
          } else {
            const actualizado = await prisma.producto.update({
              where: { id: BigInt(productoId) },
              data: {
                cantidad_existencia: {
                  decrement: cantidad,
                },
              },
              select: {
                nombre: true,
                stock_min: true,
                cantidad_existencia: true,
              },
            });
            const min = actualizado.stock_min ?? 0;
            if (
              actualizado.cantidad_existencia <= min ||
              actualizado.cantidad_existencia <= 0
            ) {
              alertas.push(
                `${actualizado.nombre} (existencia: ${actualizado.cantidad_existencia})`
              );
            }
            if (descuento > 0) {
              descuentos.push(`${actualizado.nombre} (descuento: ${descuento})`);
            }
          }
        } else {
          if (descuento > 0) {
            const nombre = producto.nombre ?? 'Producto';
            descuentos.push(`${nombre} (descuento: ${descuento})`);
          }
        }
      })
    );//<-

    if (alertas.length > 0) {
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: venta.sucursalId },
        select: { correo_notificacion: true, nombre_comercial: true },
      });

      if (sucursal?.correo_notificacion) {
        
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <img src="cid:logo" alt="CROV" style="max-width:150px;" />
            <p>Hola soy tu gerente CROV.</p>
            <p>Estimado equipo de ${sucursal.nombre_comercial ?? 'sucursal'},</p>
            <p>Los siguientes productos han alcanzado su inventario mínimo o se encuentran agotados:</p>
            <ul>${alertas.map(a => `<li>${a}</li>`).join('')}</ul>
            <p>Por favor, considere realizar el reabastecimiento correspondiente.</p>
          </div>`;

        transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: sucursal.correo_notificacion,
          subject: 'Productos con inventario bajo',
          html,
          attachments: [{
            filename: 'avatar.png',
            path: path.join(__dirname, '../../assets/avatar.png'),
            cid: 'logo'
          }]
        }).catch((error: unknown) => console.error('Error al enviar correo de notificación:', error));
      }
    }
    if (descuentos.length > 0) {//<---
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: venta.sucursalId },
        select: { correo_notificacion: true, nombre_comercial: true },
      });

      if (sucursal?.correo_notificacion) {
        const usuario = userId
          ? await prisma.usuario.findUnique({
              where: { id: userId },
              select: { nombre: true, apellidos: true },
            })
          : null;
        const usuarioNombre = usuario
          ? `${usuario.nombre} ${usuario.apellidos}`
          : 'N/A';
        const folioVenta =
          venta.numdoc ??
          `VV-${String(venta.id).padStart(5, '0')}-${new Date(venta.fecha).getFullYear()}`;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <img src="cid:logo" alt="CROV" style="max-width:150px;" />
            <p>Hola soy tu gerente CROV.</p>
            <p>Estimado equipo de ${sucursal.nombre_comercial ?? 'sucursal'},</p>
            <p>Se ha aplicado un descuento a los siguientes productos:</p>
            <ul>${descuentos.map(d => `<li>${d}</li>`).join('')}</ul>
            <p>Por el usuario: ${usuarioNombre}</p>
            <p>A la Venta: ${folioVenta}</p>            
          </div>`;

        transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: sucursal.correo_notificacion,
          subject: 'Descuento aplicado en productos',
          html,
          attachments: [{
            filename: 'avatar.png',
            path: path.join(__dirname, '../../assets/avatar.png'),
            cid: 'logo'
          }]
        }).catch((error: unknown) => console.error('Error al enviar correo de notificación:', error));
      }
    }//<--

    const ventaResp = {
      ...venta,
      detalles: venta.detalles
        ? venta.detalles.map((d: any) => ({
            ...d,
            promociones: d.promociones
              ? d.promociones.map((p: any) => p.promocion)
              : [],
          }))
        : [],
    };

    res.json(serializeBigInt(ventaResp));
  } catch (error : any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error al crear la venta' });
  }
};

export const editarVenta = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  // Extract detalles and remove unused fields
  const { detalles, cotizacionId, descuentoind,descuentogeneral, ...updateData } = data;

  let detallesInput: any;
  if (detalles) {
    if (Array.isArray(detalles)) {
      detallesInput = {
        deleteMany: {},
        create: await Promise.all(detalles.map(mapDetalle)),
      };
    } else {
      detallesInput = {
        deleteMany: detalles.deleteMany ?? {},
        create: detalles.create
          ? await Promise.all(detalles.create.map(mapDetalle))
          : [],
      };
    }
  }

  try {
    const prevVenta = await prisma.venta.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!prevVenta) {
      res.status(404).json({ mensaje: 'Venta no encontrada' });
      return;
    }

    const wasCotizacion =
      (prevVenta.estado ?? '').toUpperCase() === 'COTIZACION';
    const nuevoEstado = (updateData.estado ?? prevVenta.estado ?? '').toUpperCase();
    const convertir = wasCotizacion && nuevoEstado !== 'COTIZACION';

    const venta = (await prisma.venta.update({
      where: { id },
      data: {
        ...updateData,
        ...(descuentoind !== undefined
          ? { descuentoind: Number(descuentoind) }
          : {}),
          ...(descuentogeneral !== undefined
          ? { descuentogeneral: Number(descuentogeneral) }
          : {}),
        fecha: convertir
          ? toUTC()
          : updateData.fecha
          ? toUTC(updateData.fecha)
          : undefined,
        ...(detallesInput ? { detalles: detallesInput } : {}),
      },
      include: {
        detalles: {
          include: {
            producto: { select: { nombre: true } },
            // @ts-ignore
            promociones: { include: { promocion: true } },
          },
        },
      },
    })) as any;
    const ventaResp = {
      ...venta,
      detalles: venta.detalles
        ? venta.detalles.map((d: any) => ({
            ...d,
            promociones: d.promociones
              ? d.promociones.map((p: any) => p.promocion)
              : [],
          }))
        : [],
    };
    const descuentos: string[] = [];
    venta.detalles?.forEach((d: any) => {
      const desc = Number(d.descuento ?? 0);
      if (desc > 0) {
        const nombre = d.producto?.nombre ?? 'Producto';
        descuentos.push(`${nombre} (descuento: ${desc})`);
      }
    });//<--

    if (convertir && venta.detalles) {
      await Promise.all(
        venta.detalles.map(async (d: any) => {
          const productoId = Number(d.id_producto);
          const cantidad = Number(d.cantidad ?? 0);
          const producto = await prisma.producto.findUnique({
            where: { id: BigInt(productoId) },
            select: { costo: true, servicio: true },
          });

          if (producto?.servicio !== 1) {
            await prisma.producto.update({
              where: { id: BigInt(productoId) },
              data: {
                cantidad_existencia: {
                  decrement: cantidad,
                },
              },
            });
          }

          await prisma.detalle_venta.update({
            where: { id: d.id },
            data: { costo: Number(producto?.costo ?? 0) },
          });
        })
      );
    }
    if (descuentos.length > 0) {
      const sucursal = await prisma.sucursal.findUnique({
        where: { id: venta.sucursalId },
        select: { correo_notificacion: true, nombre_comercial: true },
      });

      if (sucursal?.correo_notificacion) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <img src="cid:logo" alt="CROV" style="max-width:150px;" />
            <p>Hola soy tu gerente CROV.</p>
            <p>Estimado equipo de ${sucursal.nombre_comercial ?? 'sucursal'},</p>
            <p>Se ha aplicado un descuento a los siguientes productos:</p>
            <ul>${descuentos.map(d => `<li>${d}</li>`).join('')}</ul>%
          </div>`;

        transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: sucursal.correo_notificacion,
          subject: 'Descuento aplicado en productos',
          html,
          attachments: [{
            filename: 'avatar.png',
            path: path.join(__dirname, '../../assets/avatar.png'),
            cid: 'logo'
          }]
        }).catch((error: unknown) => console.error('Error al enviar correo de notificación:', error));
      }
    }

    res.json(serializeBigInt(ventaResp));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar la venta' });
  }
};

export const desactivarVenta = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.venta.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Venta desactivada' });
};

export const devolverVenta = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = req.user?.userId;

  try {
    const venta = await prisma.venta.findUnique({
      where: { id },
        include: {
          cliente: { select: { razon_social: true } },
        detalles: {
          where: { activo: 1 },
          include: {
            producto: {
              select: { nombre: true, codigo: true },
            },
          },
        },
      },
    });

    if (!venta) {
      res.status(404).json({ mensaje: 'Venta no encontrada' });
      return;
    }

    await prisma.venta.update({
      where: { id },
      data: {
        activo: 0,
        // Registrar la fecha de devolución en UTC
        fecha_devolucion: new Date(),
        id_usuario_devolucion: userId ?? null,
      },
    });

    await Promise.all(
      venta.detalles.map(async (d: any) => {
        const productoId = Number(d.id_producto);
        const cantidad = Number(d.cantidad ?? 0);
        const producto = await prisma.producto.findUnique({
          where: { id: BigInt(productoId) },
          select: {
            servicio: true,
            insumos: {
              select: {
                cantidad: true,
                productoInsumo: { select: { id: true } },
              },
            },
          },
        });
        if (producto?.servicio !== 1) {
          if (producto?.insumos && producto.insumos.length > 0) {
            await Promise.all(
              producto.insumos.map(async (ins) => {
                const insumoId = Number(ins.productoInsumo.id);
                const cantInsumo =
                  cantidad * Number(ins.cantidad ?? 0);
                await prisma.producto.update({
                  where: { id: BigInt(insumoId) },
                  data: {
                    cantidad_existencia: {
                      increment: cantInsumo,
                    },
                  },
                });
              })
            );
          } else {
            await prisma.producto.update({
              where: { id: BigInt(productoId) },
              data: {
                cantidad_existencia: {
                  increment: cantidad,
                },
              },
            });
          }
        }
      })
    );

    const usuario = userId
      ? await prisma.usuario.findUnique({
          where: { id: userId },
          select: { nombre: true, apellidos: true },
        })
      : null;

    const clienteNombre = venta.cliente?.razon_social ?? 'Sin cliente'; 
    const usuarioNombre = usuario
      ? `${usuario.nombre} ${usuario.apellidos}`
      : 'N/A';

    const devueltos = venta.detalles.map(
      (d: any) =>
        `${d.producto?.codigo ?? 'SF'} - ${d.producto?.nombre ?? 'Producto'} (cantidad: ${d.cantidad})`
    );

    if (devueltos.length > 0) {
     const folioVenta = venta.numdoc ?? `VV-${String(venta.id).padStart(5, '0')}-${new Date(venta.fecha).getFullYear()}`;
      notifySucursal(
        venta.sucursalId,
        'Devolución de venta',
        `<p>Se ha registrado la devolución de la venta con folio ${folioVenta} del cliente ${clienteNombre} por el usuario ${usuarioNombre} con los siguientes productos:</p><ul>${devueltos
          .map(d => `<li>${d}</li>`)
          .join('')}</ul>`
        ).catch((error: unknown) => console.error('Error al notificar sucursal:', error));
    }

    //res.json({ mensaje: 'Devolución realizada' });
    res.json({ mensaje: 'Devoluci\u00F3n realizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al realizar la devoluci\u00F3n' });
  }
};
type VentaConSaldo = {
  id: number;
  total: number;
  saldo_pendiente: number | null;
  totalAbonado: number | null;
};

type PrismaVentaDelegate = Pick<typeof prisma, 'venta'>;

const calcularSaldoPendiente = (venta: VentaConSaldo) => {
  const saldo = Number(
    Number.isFinite(Number(venta.saldo_pendiente))
      ? venta.saldo_pendiente
      : Math.max(Number(venta.total) - Number(venta.totalAbonado ?? 0), 0)
  );
  return Number.isFinite(saldo) && saldo > 0 ? saldo : 0;
};

const aplicarAbonoVenta = async (
  tx: PrismaVentaDelegate,
  venta: VentaConSaldo,
  monto: number
) => {
  const saldoPendiente = calcularSaldoPendiente(venta);
  if (saldoPendiente <= 0) return { aplicado: 0, saldoPendiente };

  const aplicado = Math.min(saldoPendiente, monto);
  if (aplicado <= 0) return { aplicado: 0, saldoPendiente };

  const nuevoSaldo = Math.max(saldoPendiente - aplicado, 0);
  const totalAbonadoActual = Number(venta.totalAbonado ?? 0);

  await tx.venta.update({
    where: { id: venta.id },
    data: {
      saldo_pendiente: nuevoSaldo,
      totalAbonado: totalAbonadoActual + aplicado,
    },
  });

  return { aplicado, saldoPendiente: nuevoSaldo };
};

export const registrarAbonoGeneral = async (req: Request, res: Response) => {
  const clienteId = Number(req.body.clienteId);
  const sucursalId = Number(req.body.sucursalId);
  const monto = Number(req.body.monto);

  if (!clienteId || Number.isNaN(clienteId)) {
    res.status(400).json({ error: 'clienteId es requerido y debe ser numérico' });
    return;
  }

  if (!sucursalId || Number.isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
    return;
  }

  try {
    const ventas = (await prisma.venta.findMany({
      where: {
        sucursalId,
        id_cliente: clienteId,
        estado: 'CREDITO',
        activo: 1,
      },
      orderBy: { fecha: 'asc' },
      select: {
        id: true,
        total: true,
        saldo_pendiente: true,
        totalAbonado: true,
      },
    })) as VentaConSaldo[];

    if (!ventas.length) {
      res.status(404).json({ error: 'No se encontraron ventas a crédito para el cliente' });
      return;
    }

    let restante = monto;
    const aplicaciones: { ventaId: number; aplicado: number }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const venta of ventas) {
        if (restante <= 0) break;
        const { aplicado } = await aplicarAbonoVenta(
          tx as PrismaVentaDelegate,
          venta,
          restante
        );
        if (aplicado > 0) {
          restante -= aplicado;
          aplicaciones.push({ ventaId: venta.id, aplicado });
        }
      }

      if (!aplicaciones.length) {
        throw new Error('NO_PENDING_BALANCE');
      }
    });

    res.json({
      mensaje: 'Abono registrado correctamente',
      aplicado: monto - restante,
      restante,
      aplicaciones,
    });
  } catch (error: any) {
    if (error?.message === 'NO_PENDING_BALANCE') {
      res.status(400).json({ error: 'Las ventas del cliente no tienen saldo pendiente' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el abono' });
  }
};

export const registrarAbono = async (req: Request, res: Response) => {
  if (req.body?.general) {
    await registrarAbonoGeneral(req, res);
    return;
  }

  const ventaId = Number(
    req.body.ventaId ?? req.body.idVenta ?? req.body.venta_id ?? req.body.id
  );
  const monto = Number(req.body.monto);

  if (!ventaId || Number.isNaN(ventaId)) {
    res.status(400).json({ error: 'ventaId es requerido y debe ser numérico' });
    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
    return;
  }

  try {
    const venta = (await prisma.venta.findUnique({
      where: { id: ventaId },
      select: {
        id: true,
        total: true,
        saldo_pendiente: true,
        totalAbonado: true,
      },
    })) as VentaConSaldo | null;

    if (!venta) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }

    const resultado = await aplicarAbonoVenta(
      prisma as PrismaVentaDelegate,
      venta,
      monto
    );

    if (resultado.aplicado <= 0) {
      res.status(400).json({ error: 'La venta no tiene saldo pendiente' });
      return;
    }

    res.json({
      mensaje: 'Abono registrado correctamente',
      ventaId: venta.id,
      aplicado: resultado.aplicado,
      restante: Math.max(monto - resultado.aplicado, 0),
      saldoPendiente: resultado.saldoPendiente,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el abono' });
  }
};