import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /clases
export const obtenerMarca = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }
  const marcas = await prisma.marca.findMany({
    where: { 
      activo: 1,
      sucursalId: sucursalId
     },
    orderBy: { nombre: 'asc' },
  });
  res.json(marcas);
};

export const crearMarca = async (req: Request, res: Response) => {
  const { nombre, sucursalId } = req.body;
  const nuevaMarca = await prisma.marca.create({
    data: { nombre, sucursalId, activo: 1 },
  });
  res.json(nuevaMarca);
};

export const editarMarca = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { nombre } = req.body;

  const marca = await prisma.marca.update({
    where: { id },
    data: { nombre },
  });
  res.json(marca);
};

export const desactivarMarca = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const marca = await prisma.marca.update({
    where: { id },
    data: { activo: 0 },
  });
  res.json({ mensaje: 'Marca desactivada' });
};
