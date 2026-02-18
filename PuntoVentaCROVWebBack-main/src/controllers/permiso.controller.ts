import { Request, Response } from 'express';

import { permisosPorPerfil } from '../utils/default-permissions';
import prisma from '../utils/prisma';

async function ensureDefaultPermissions() {
  for (const [perfil, lista] of Object.entries(permisosPorPerfil)) {
    const perfilField = perfil.toLowerCase();
    for (const perm of lista) {
      await prisma.permiso.upsert({
        where: { id: perm.id },
        update: { nombre: perm.nombre, administrador: 1, [perfilField]: 1 },
        create: {
          id: perm.id,
          nombre: perm.nombre,
          administrador: 1,
          gerencia: perfil === 'Gerencia' ? 1 : 0,
          caja: perfil === 'Caja' ? 1 : 0,
        },
      });
    }
  }
}

export const obtenerTodosPermisos = async (_req: Request, res: Response) => {
  try {
    await ensureDefaultPermissions();
    const permisos = await prisma.permiso.findMany({
      select: { id: true, nombre: true, administrador: true, gerencia: true, caja: true },
      orderBy: { id: 'asc' },
    });
    res.json(permisos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

export const obtenerPermisosUsuario = async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await ensureDefaultPermissions();

    const perfilField = usuario.perfil.toLowerCase();
    const base = await prisma.permiso.findMany({
      where: { [perfilField]: 1 },
      select: { id: true, nombre: true },
    });

    const userMods = await prisma.historialPermiso.findMany({
      where: { usuarioId: userId },
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
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

export const actualizarPermisosUsuario = async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  const permisos = req.body.permisos as { permisoId: number; permitido: boolean }[];
  if (!Array.isArray(permisos)) {
    res.status(400).json({ error: 'Formato de permisos inválido' });
    return;
  }

  try {
    await Promise.all(
      permisos.map((p) =>
        prisma.historialPermiso.upsert({
          where: { usuarioId_permisoId: { usuarioId: userId, permisoId: p.permisoId } },
          update: { permitido: p.permitido },
          create: { usuarioId: userId, permisoId: p.permisoId, permitido: p.permitido },
        })
      )
    );
    res.json({ mensaje: 'Permisos actualizados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar permisos' });
  }
};
