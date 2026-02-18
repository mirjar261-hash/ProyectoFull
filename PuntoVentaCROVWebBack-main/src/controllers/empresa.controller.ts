import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

export const obtenerEmpresas = async (_req: Request, res: Response) => {
  try {
    const empresas = await prisma.empresa.findMany();
    res.json(empresas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las empresas' });
  }
};

// GET /empresas/activas
export const obtenerEmpresasActivas = async (_req: Request, res: Response) => {
  try {
    const hoy = new Date();

    const empresas = await prisma.empresa.findMany({
      include: {
        sucursal: {
          where: { activo: 1 }, // solo sucursales activas
          select: { id: true, activo: true, nombre_comercial: true },
        },
      },
    });

    // Filtrar empresas con fecha de vencimiento válida
    const empresasActivas = empresas.filter(
      (e) => new Date(e.fecha_vencimiento) >= hoy && e.sucursal.length > 0
    );

    res.json(empresasActivas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener empresas activas' });
  }
};

export const actualizarFechaVencimiento = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { fecha_vencimiento } = req.body;

  if (!fecha_vencimiento) {
    res.status(400).json({ error: 'fecha_vencimiento requerido' });
    return;
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id },
      data: { fecha_vencimiento: toUTC(fecha_vencimiento), activo: 1 }
    });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la empresa' });
  }
};

export const actualizarDatosEmpresa = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { fecha_vencimiento, token, stripeCustomerId } = req.body;

  if (!fecha_vencimiento || !token) {
    res.status(400).json({ error: 'fecha_vencimiento y token son requeridos' });
    return;
  }

  const data: Prisma.EmpresaUpdateInput = {
    fecha_vencimiento: toUTC(fecha_vencimiento),
    token,
    activo: 1
  };

  if (stripeCustomerId !== undefined) {
    data.stripeCustomerId = stripeCustomerId;
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id },
      data
    });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la empresa' });
  }
};

export const desactivarEmpresa = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID de empresa inválido' });
    return;
  }

  try {
    await prisma.empresa.update({
      where: { id },
      data: { activo: 0 },
    });

    res.json({ mensaje: 'Empresa desactivada' });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Error al desactivar la empresa' });
  }
};

export const activarEmpresa = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID de empresa inválido' });
    return;
  }

  try {
    await prisma.empresa.update({
      where: { id },
      data: { activo: 1 },
    });

    res.json({ mensaje: 'Empresa activada' });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Error al activar la empresa' });
  }
};

export const actualizarPlanEmpresa = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { token } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID de empresa inválido' });
    return;
  }

  if (!token) {
    res.status(400).json({ error: 'token requerido' });
    return;
  }

  try {
    const empresa = await prisma.empresa.update({
      where: { id },
      data: { token },
    });

    res.json(empresa);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el plan de la empresa' });
  }
};

/*EndPoint para CrovInternal */
export const obtenerUsuariosPorEmpresa = async (req: Request, res: Response) => {
  try {
    const empresaId = Number(req.params.empresaId);

    const sucursales = await prisma.sucursal.findMany({
      where: { empresaId },
      select: {
        usuarios: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            correo: true,
            perfil: true,
            sucursal: {
              select: { nombre_comercial: true }
            }
          }
        }
      }
    });

    // Aplanar usuarios de todas las sucursales
    const usuarios = sucursales.flatMap((s) =>
      s.usuarios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        correo: u.correo,
        perfil: u.perfil,
        sucursal: u.sucursal?.nombre_comercial || ''
      }))
    );

    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios de la empresa' });
  }
};
