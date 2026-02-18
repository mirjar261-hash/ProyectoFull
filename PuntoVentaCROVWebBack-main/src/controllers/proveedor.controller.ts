import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /proveedores?activos=1
export const obtenerProveedores = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0'; // por defecto activos
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: activos ? 1 : undefined, sucursalId: sucursalId },
    orderBy: { razon_social: 'asc' },
  });
  res.json(proveedores);
};

// POST /proveedores
export const crearProveedor = async (req: Request, res: Response) => {
  const data = req.body;

  const nuevoProveedor = await prisma.proveedor.create({ data });
  res.json(nuevoProveedor);
};

// PUT /proveedores/:id
export const editarProveedor = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data,
  });
  res.json(proveedor);
};

// DELETE (baja lógica) /proveedores/:id
export const desactivarProveedor = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  await prisma.proveedor.update({
    where: { id },
    data: { activo: 0 },
  });

  res.json({ mensaje: 'Proveedor desactivado' });
};
