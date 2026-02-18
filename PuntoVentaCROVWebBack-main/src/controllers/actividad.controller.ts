import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

export const obtenerActividades = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  const actividades = await prisma.actividad.findMany({
    where: {
      sucursalId,
      activo: activos ? 1 : undefined,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true }
      }
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  res.json(actividades);
};

export const crearActividad = async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      descripcion,
      usuario_id,
      sucursalId,
      fecha_calendario,
      horario,
      fecha_registro,
      activo,
    } = req.body;

    // Validar campos requeridos
    if (!titulo || !fecha_calendario || !usuario_id || !sucursalId) {
      res.status(400).json({ error: 'Faltan campos requeridos.' });
      return;
    }

    const nuevaActividad = await prisma.actividad.create({
      data: {
        titulo,
        descripcion,
        usuario_id: Number(usuario_id),
        sucursalId: Number(sucursalId),
        fecha_calendario: toUTC(fecha_calendario),
        horario,
        fecha_registro: fecha_registro ? toUTC(fecha_registro) : toUTC(),
        activo: activo ?? 1,
      },
    });

    res.json(nuevaActividad);
  } catch (err) {
    console.error('Error al crear actividad:', err);
    res.status(500).json({ error: 'Error al crear actividad.' });
  }
};

export const editarActividad = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const {
      titulo,
      descripcion,
      usuario_id,
      sucursalId,
      fecha_calendario,
      horario,
      fecha_registro,
      activo,
    } = req.body as Record<string, any>;

    // Validaciones básicas
    if (!titulo || !usuario_id || !sucursalId || !fecha_calendario) {
      res.status(400).json({ error: 'Faltan campos requeridos.' });
      return;
    }

    // Casteos + normalización (idéntico criterio que en crearActividad)
    const dataUpdate: any = {
      titulo: String(titulo),
      descripcion: descripcion ?? null,
      usuario_id: Number(usuario_id),
      sucursalId: Number(sucursalId),
      fecha_calendario: toUTC(fecha_calendario), // ⟵ normaliza a UTC
      horario: horario ?? null,
      fecha_registro: fecha_registro ? toUTC(fecha_registro) : undefined,
      activo: typeof activo === 'number' ? activo : (activo ? 1 : 0),
    };

    // Limpia undefined para que no intente sobreescribir
    Object.keys(dataUpdate).forEach((k) => dataUpdate[k] === undefined && delete dataUpdate[k]);

    const actividad = await prisma.actividad.update({
      where: { id },
      data: dataUpdate,
    });

    res.json(actividad);
  } catch (error: any) {
    console.error('Error al actualizar actividad:', error?.meta ?? error);
    res.status(500).json({
      message: 'Error al actualizar la actividad',
      error: error?.message ?? String(error),
    });
  }
};


export const desactivarActividad = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.actividad.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Actividad desactivada' });
};

export const obtenerActividadesPorMes = async (req: Request, res: Response) => {
  const { mes, anio, sucursalId } = req.query;

  const m = Number(mes);
  const y = Number(anio);
  const idSucursal = Number(sucursalId);

  if (!idSucursal || isNaN(idSucursal)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  if (!m || isNaN(m) || !y || isNaN(y)) {
    res.status(400).json({ error: 'mes y anio son requeridos y deben ser num\u00E9ricos' });
    return;
  }

  const inicio = toUTC(new Date(y, m - 1, 1));
  const fin = toUTC(new Date(y, m, 0, 23, 59, 59, 999));

  const actividades = await prisma.actividad.findMany({
    where: {
      sucursalId: idSucursal,
      fecha_calendario: { gte: inicio, lte: fin },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true }
      }
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  res.json(actividades);
};

export const obtenerActividadesPorSemana = async (req: Request, res: Response) => {
  const { fecha, sucursalId } = req.query;
  const idSucursal = Number(sucursalId);

  if (!idSucursal || isNaN(idSucursal)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  if (!fecha) {
    res.status(400).json({ error: 'fecha es requerida' });
    return;
  }

  const base = toUTC(fecha.toString());
  if (isNaN(base.getTime())) {
    res.status(400).json({ error: 'fecha inv\u00E1lida' });
    return;
  }

  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const inicio = new Date(base);
  inicio.setDate(diff);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  const inicioUTC = toUTC(inicio);
  const finUTC = toUTC(fin);

  const actividades = await prisma.actividad.findMany({
    where: {
      sucursalId: idSucursal,
      fecha_calendario: { gte: inicioUTC, lte: finUTC },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true }
      }
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  res.json(actividades);
};

export const obtenerActividadesPorDia = async (req: Request, res: Response) => {
  const { fecha, sucursalId } = req.query;
  const idSucursal = Number(sucursalId);

  if (!idSucursal || isNaN(idSucursal)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser num\u00E9rico' });
    return;
  }

  if (!fecha) {
    res.status(400).json({ error: 'fecha es requerida' });
    return;
  }

  const dia = toUTC(fecha.toString());
  if (isNaN(dia.getTime())) {
    res.status(400).json({ error: 'fecha inv\u00E1lida' });
    return;
  }

  const inicio = new Date(dia);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(dia);
  fin.setHours(23, 59, 59, 999);

  const actividades = await prisma.actividad.findMany({
    where: {
      sucursalId: idSucursal,
      fecha_calendario: { gte: toUTC(inicio), lte: toUTC(fin) },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true }
      }
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  res.json(actividades);
};

export const obtenerActividadesDelUsuario = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.userId;
  const sucursalId = req.user?.sucursalId;

  if (!userId || !sucursalId) {
    res.status(400).json({ error: 'Usuario no válido' });
    return;
  }

  const hoy = toUTC();
  hoy.setHours(0, 0, 0, 0);
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);
  const hoyUTC = toUTC(hoy);
  const finHoyUTC = toUTC(finHoy);

  const day = hoy.getDay();
  const diffToNextMonday = ((8 - day) % 7) || 7;
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() + diffToNextMonday);
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);
  finSemana.setHours(23, 59, 59, 999);
  const inicioSemanaUTC = toUTC(inicioSemana);
  const finSemanaUTC = toUTC(finSemana);

  const actividadesHoy = await prisma.actividad.findMany({
    where: {
      sucursalId,
      usuario_id: userId,
      fecha_calendario: { gte: hoyUTC, lte: finHoyUTC },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true },
      },
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  const actividadesSemana = await prisma.actividad.findMany({
    where: {
      sucursalId,
      usuario_id: userId,
      fecha_calendario: { gte: inicioSemanaUTC, lte: finSemanaUTC },
      activo: 1,
    },
    include: {
      usuarioActividad: {
        select: { nombre: true, apellidos: true },
      },
    },
    orderBy: { fecha_calendario: 'asc' },
  });

  res.json({ hoy: actividadesHoy, semanaProxima: actividadesSemana });
};

