import { Request, Response } from 'express';

import { serializeBigInt } from '../utils/serializeBigInt';
import prisma from '../utils/prisma';

// Crear médico
export const crearMedico = async (req: Request, res: Response) => {
  try {
    const { cedula, nombre_completo, direccion, sucursalId } = req.body;
    const medico = await prisma.medico.create({
      data: {
        cedula,
        nombre_completo,
        direccion,
        sucursalId: Number(sucursalId),
        activo: 1,
      },
    });
    res.json(serializeBigInt(medico));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el médico' });
  }
};

// Obtener médicos por sucursal
export const obtenerMedicos = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  try {
    const medicos = await prisma.medico.findMany({
      where: { sucursalId, activo: 1 },
    });
    res.json(serializeBigInt(medicos));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los médicos' });
  }
};

// Obtener médico por cédula profesional
export const obtenerMedicoPorCedula = async (req: Request, res: Response) => {
  const cedula = typeof req.params.cedula === 'string' ? req.params.cedula.trim() : '';
  const sucursalId = Number(req.query.sucursalId);

  if (!cedula) {
    res.status(400).json({ error: 'La cédula profesional es requerida' });
    return;
  }

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  try {
    const medico = await prisma.medico.findFirst({
      where: { cedula, sucursalId, activo: 1 },
    });

    if (!medico) {
      res.status(404).json({ error: 'Médico no encontrado' });
      return;
    }

    res.json(serializeBigInt(medico));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar el médico' });
  }
};

// Actualizar médico
export const actualizarMedico = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const medico = await prisma.medico.update({
      where: { id: BigInt(id) },
      data: req.body,
    });
    res.json(serializeBigInt(medico));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el médico' });
  }
};

// Eliminar (desactivar) médico
export const eliminarMedico = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.medico.update({
      where: { id: BigInt(id) },
      data: { activo: 0 },
    });
    res.json({ mensaje: 'Médico desactivado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el médico' });
  }
};
