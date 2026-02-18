import { Request, Response } from 'express';

import { permisosCrovInternalPorPuesto } from '../utils/default-internal-permissions';
import prisma from '../utils/prisma';
import { ensureDefaultInternalPermissions } from '../services/internal-permissions-sync';

export const obtenerTodosPermisosInternal = async (_req: Request, res: Response) => {
  try {
    await ensureDefaultInternalPermissions();
    const permisos = await prisma.permisoInternal.findMany({
      select: {
        id: true,
        nombre: true,
        scrum_master: true,
        tester: true,
        desarrollador: true,
        ventas: true,
        sla: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(permisos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener permisos internos' });
  }
};

export const obtenerPermisosEmpleadoInternal = async (req: Request, res: Response) => {
  const empleadoId = Number(req.params.id);
  try {
    const empleado = await prisma.empleados_CROV.findUnique({ where: { id: empleadoId } });
    if (!empleado) {
      res.status(404).json({ error: 'Empleado CROV no encontrado' });
      return;
    }

    await ensureDefaultInternalPermissions();

    const perfilField = empleado.puesto.toUpperCase();
    const base = permisosCrovInternalPorPuesto[perfilField] ?? [];

    const userMods = await prisma.historialPermisoInternal.findMany({
      where: { empleadoId },
      include: { permiso: true },
    });

    const mapa = new Map<number, string>();
    base.forEach((p) => mapa.set(p.id, p.nombre));
    userMods.forEach((p) => {
      if (p.permitido) mapa.set(p.permisoId, p.permiso.nombre);
      else mapa.delete(p.permisoId);
    });

    const result = Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener permisos internos' });
  }
};

export const actualizarPermisosEmpleadoInternal = async (req: Request, res: Response) => {
  const empleadoId = Number(req.params.id);
  const permisos = req.body.permisos as { permisoId: number; permitido: boolean }[];
  if (!Array.isArray(permisos)) {
    res.status(400).json({ error: 'Formato de permisos inválido' });
    return;
  }

  try {
    await Promise.all(
      permisos.map((p) =>
        prisma.historialPermisoInternal.upsert({
          where: { empleadoId_permisoId: { empleadoId, permisoId: p.permisoId } },
          update: { permitido: p.permitido },
          create: { empleadoId, permisoId: p.permisoId, permitido: p.permitido },
        })
      )
    );
    res.json({ mensaje: 'Permisos internos actualizados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar permisos internos' });
  }
};
