import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /clases
export const obtenerModelo = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }
  const modelos = await prisma.modelo.findMany({
    where: { 
      activo: 1,
      sucursalId: sucursalId
     },
    orderBy: { nombre: 'asc' },
  });
  res.json(modelos);
};

export const crearModelo = async (req: Request, res: Response) => {
  const { nombre, sucursalId } = req.body;
  const nuevoModelo = await prisma.modelo.create({
    data: { nombre, sucursalId, activo: 1 },
  });
  res.json(nuevoModelo);
};

export const editarModelo = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { nombre } = req.body;

  const modelo = await prisma.modelo.update({
    where: { id },
    data: { nombre },
  });
  res.json(modelo);
};

export const desactivarModelo = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const modelo = await prisma.modelo.update({
    where: { id },
    data: { activo: 0 },
  });
  res.json({ mensaje: 'Modelo desactivada' });
};
