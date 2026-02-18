import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// GET /clases
export const obtenerClases = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }
  const clases = await prisma.clase.findMany({
    where: { 
      activo: 1,
      sucursalId: sucursalId
     },
    orderBy: { nombre: 'asc' },
  });
  res.json(clases);
};

// POST /clases
export const crearClase = async (req: Request, res: Response) => {
  const { nombre, sucursalId } = req.body;
  const nuevaClase = await prisma.clase.create({
    data: { nombre, sucursalId, activo: 1 },
  });
  res.json(nuevaClase);
};

// PUT /clases/:id
export const editarClase = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { nombre } = req.body;

  const clase = await prisma.clase.update({
    where: { id },
    data: { nombre },
  });
  res.json(clase);
};

// DELETE (baja lógica) /clases/:id
export const desactivarClase = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const clase = await prisma.clase.update({
    where: { id },
    data: { activo: 0 },
  });
  res.json({ mensaje: 'Departamento desactivado' });
};
