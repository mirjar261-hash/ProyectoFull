import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import nodemailer from 'nodemailer';
import path from 'path';
import prisma from '../utils/prisma';

const sendCorteEmail = async (corte: any) => {
  const sucursal = await prisma.sucursal.findUnique({
    where: { id: corte.sucursalId },
    select: { correo_notificacion: true, nombre_comercial: true },
  });

  if (!sucursal?.correo_notificacion) return;

  const detallesHtml = corte.detalles
    .map(
      (d: any) => `
        <tr>
          <td style="padding:8px;border:1px solid #ccc;">${d.tipo}</td>
          <td style="padding:8px;border:1px solid #ccc;">$${Number(d.monto).toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #ccc;">${d.comentarios ?? ''}</td>
          <td style="padding:8px;border:1px solid #ccc;">${new Date(d.fecha).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <img src="cid:logo" alt="CROV" style="max-width:150px;" />
      <p>Hola jefe, soy tu gerente CROV.</p>
      <p>Estimado equipo de ${sucursal.nombre_comercial ?? 'sucursal'},</p>
      <p>Se ha registrado un nuevo corte del día:</p>
      <ul>
        <li><strong>Usuario entrega:</strong> ${corte.usuarioEntrega.nombre} ${corte.usuarioEntrega.apellidos}</li>
        <li><strong>Usuario recibe:</strong> ${corte.usuarioRecibe.nombre} ${corte.usuarioRecibe.apellidos}</li>
        <li><strong>Monto reportado:</strong> $${Number(corte.monto_reportado).toFixed(2)}</li>
        <li><strong>Monto esperado:</strong> $${Number(corte.monto_esperado).toFixed(2)}</li>
        <li><strong>Comentarios:</strong> ${corte.comentarios ?? 'N/A'}</li>
        <li><strong>Fecha:</strong> ${new Date(corte.fecha).toLocaleString()}</li>
      </ul>
      <p>Detalles:</p>
      <table style="border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ccc;">Tipo</th>
            <th style="padding:8px;border:1px solid #ccc;">Monto</th>
            <th style="padding:8px;border:1px solid #ccc;">Comentarios</th>
            <th style="padding:8px;border:1px solid #ccc;">Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${detallesHtml}
        </tbody>
      </table>
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
    subject: 'Nuevo corte del día',
    html,
    attachments: [
      {
        filename: 'avatar.png',
        path: path.join(__dirname, '../../assets/avatar.png'),
        cid: 'logo',
      },
    ],
  }).catch((error: unknown) => console.error('Error al enviar correo del corte:', error));
};

export const obtenerCortesDia = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const cortes = await prisma.corte_dia.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioEntrega: {
        select: { nombre: true, apellidos: true },
      },
      usuarioRecibe: {
        select: { nombre: true, apellidos: true },
      },
      detalles: true,
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(cortes);
};

export const crearCorteDia = async (req: Request, res: Response) => {
  const { detalles = [], ...data } = req.body;

  const corte = await prisma.corte_dia.create({
    data: {
      ...data,
      detalles: { create: detalles },
    },
    include: {
      detalles: true,
      usuarioEntrega: { select: { nombre: true, apellidos: true } },
      usuarioRecibe: { select: { nombre: true, apellidos: true } },
    },
  });

    sendCorteEmail(corte).catch((error: unknown) => console.error('Error al enviar correo del corte:', error));

  res.json(corte);
};

export const editarCorteDia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { detalles, ...data } = req.body;

  const corte = await prisma.corte_dia.update({
    where: { id },
    data,
    include: { detalles: true },
  });

  res.json(corte);
};

export const desactivarCorteDia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.corte_dia.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Corte del día desactivado' });
};

export const obtenerCortesPorRango = async (req: Request, res: Response) => {
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

  const cortes = await prisma.corte_dia.findMany({
    where: {
      sucursalId: idSucursal,
      fecha: {
        gte: inicio,
        lte: fin,
      },
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioEntrega: { select: { nombre: true, apellidos: true } },
      usuarioRecibe: { select: { nombre: true, apellidos: true } },
      detalles: true,
    },
    orderBy: { fecha: 'desc' },
  });

  res.json(cortes);
};

export const obtenerUltimoCorteUsuario = async (req: Request, res: Response) => {
  const usuarioId = Number(req.query.usuarioId);

  if (!usuarioId || isNaN(usuarioId)) {
    res
      .status(400)
      .json({ error: 'usuarioId es requerido y debe ser numérico' });
    return;
  }

  const corte = await prisma.corte_dia.findFirst({
    where: { id_usuario_entrega: usuarioId, activo: 1 },
    orderBy: { fecha: 'desc' },
  });

  res.json({
    fecha: (corte?.fecha ?? new Date('2000-01-01T00:00:00.000Z')).toISOString(),
  });
};

export const obtenerDatosCorteDia = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);
  const usuarioId = Number(req.query.usuarioId);

  if (!sucursalId || isNaN(sucursalId) || !usuarioId || isNaN(usuarioId)) {
    res
      .status(400)
      .json({ error: 'sucursalId y usuarioId son requeridos y deben ser numéricos' });
    return;
  }

  const ultimo = await prisma.corte_dia.findFirst({
    where: { sucursalId, id_usuario_entrega: usuarioId, activo: 1 },
    orderBy: { fecha: 'desc' },
    select: { fecha: true },
  });

  const fechaInicio = ultimo?.fecha ?? new Date('2000-01-01T00:00:00.000Z');

  const [gastos, retiros, fondos, inversiones, ventas, compras, devolCompras, devolVentas, devolProductos] =
    await Promise.all([
      prisma.gasto.findMany({
        where: {
          sucursalId,
          id_usuario: usuarioId,
          activo: 1,
          fecha: { gt: fechaInicio },
        },
        select: { monto: true, descripcion: true, fecha: true },
      }),
      prisma.retiro.findMany({
        where: {
          sucursalId,
          id_usuario: usuarioId,
          activo: 1,
          fecha: { gt: fechaInicio },
        },
        select: { monto: true, descripcion: true, fecha: true },
      }),
      prisma.inicio.findMany({
        where: {
          sucursalId,
          idusuariorecibe: usuarioId,
          activo: 1,
          fecha: { gt: fechaInicio },
        },
        select: { monto: true, comentarios: true, fecha: true },
      }),
      prisma.inversion.findMany({
        where: {
          sucursalId,
          id_usuario: usuarioId,
          activo: 1,
          fecha: { gt: fechaInicio },
        },
        select: { monto: true, descripcion: true, fecha: true },
      }),
      prisma.venta.findMany({
        where: {
          sucursalId,
          id_usuario: usuarioId,
          fecha: { gt: fechaInicio },
        },
        select: { efectivo: true, numdoc: true, fecha: true },
      }),
      prisma.compra.findMany({
        where: {
          sucursalId,
          id_usuario: usuarioId,
          fecha: { gt: fechaInicio },
        },
        select: { total: true, numdoc: true, fecha: true },
      }),
      prisma.compra.findMany({
        where: {
          sucursalId,
          id_usuario_devolucion: usuarioId,
          activo: 0,
          fecha_devolucion: { gt: fechaInicio },
        },
        select: { total: true, numdoc: true, fecha_devolucion: true },
      }),
      prisma.venta.findMany({
        where: {
          sucursalId,
          id_usuario_devolucion: usuarioId,
          activo: 0,
          fecha_devolucion: { gt: fechaInicio },
        },
        select: { total: true, numdoc: true, fecha_devolucion: true },
      }),
      prisma.detalle_venta.findMany({
        where: {
          id_usuario_devolucion: usuarioId,
          activo: 0,
          fecha_devolucion: { gt: fechaInicio },
          venta: { sucursalId },
        },
        select: { total: true, fecha_devolucion: true },
      }),
    ]);

  const detalles = [
    ...gastos.map(g => ({
      tipo: 'Gasto',
      monto: g.monto,
      comentarios: g.descripcion ?? null,
      fecha: g.fecha,
    })),
    ...retiros.map(r => ({
      tipo: 'Retiro',
      monto: r.monto,
      comentarios: r.descripcion ?? null,
      fecha: r.fecha,
    })),
    ...fondos.map(f => ({
      tipo: 'Fondo de caja',
      monto: Number(f.monto),
      comentarios: f.comentarios ?? null,
      fecha: f.fecha,
    })),
    ...inversiones.map(i => ({
      tipo: 'Inversión',
      monto: i.monto,
      comentarios: i.descripcion ?? null,
      fecha: i.fecha,
    })),
    ...ventas.map(v => ({
      tipo: 'Venta',
      monto: v.efectivo,
      comentarios: v.numdoc ?? null,
      fecha: v.fecha,
    })),
    ...compras.map(c => ({
      tipo: 'Compra',
      monto: c.total,
      comentarios: c.numdoc ?? null,
      fecha: c.fecha,
    })),
    ...devolCompras.map(c => ({
      tipo: 'Devolución de compra',
      monto: c.total,
      comentarios: c.numdoc ?? null,
      fecha: c.fecha_devolucion!,
    })),
    ...devolVentas.map(v => ({
      tipo: 'Devolución de venta',
      monto: v.total,
      comentarios: v.numdoc ?? null,
      fecha: v.fecha_devolucion!,
    })),
    ...devolProductos.map(d => ({
      tipo: 'Devolución de venta por producto (Informativo)',
      monto: d.total,
      comentarios: null,
      fecha: d.fecha_devolucion!,
    })),
  ];

  const tipos = [
    'Venta',
    'Gasto',
    'Retiro',
    'Fondo de caja',
    'Inversión',
    'Compra',
    'Devolución de compra',
    'Devolución de venta',
    'Devolución de venta por producto (Informativo)',
  ];

  const totales = tipos.map(tipo => ({
    tipo,
    monto: detalles
      .filter(d => d.tipo === tipo)
      .reduce((sum, d) => sum + Number(d.monto), 0),
  }));

  res.json({
    fechaUltimoCorte: fechaInicio.toISOString(),
    totales,
    detalles,
  });
};
