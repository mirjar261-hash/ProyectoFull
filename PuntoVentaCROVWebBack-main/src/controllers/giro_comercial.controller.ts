import { Request, Response } from 'express';
import prisma from '../utils/prisma';

type EstadoActivo = 0 | 1;

function parseEstadoActivo(valor: unknown): EstadoActivo | null {
  if (valor === undefined || valor === null) {
    return null;
  }

  if (typeof valor === 'number' && (valor === 0 || valor === 1)) {
    return valor;
  }

  if (typeof valor === 'string' && valor.trim() !== '') {
    const numero = Number(valor);
    if (!Number.isNaN(numero) && (numero === 0 || numero === 1)) {
      return numero as EstadoActivo;
    }
  }

  if (typeof valor === 'boolean') {
    return valor ? 1 : 0;
  }

  return null;
}

export const listarGirosComerciales = async (req: Request, res: Response) => {
  try {
    const { activo } = req.query as { activo?: string };

    const filtros: { activo?: EstadoActivo } = {};
    if (activo !== undefined) {
      const estado = parseEstadoActivo(activo);
      if (estado === null) {
        res.status(400).json({ message: 'El parámetro activo debe ser 0 o 1' });
        return;
      }
      filtros.activo = estado;
    }

    const giros = await prisma.giroComercial.findMany({
      where: filtros,
      orderBy: { nombre: 'asc' },
    });

    res.json(giros);
  } catch (error) {
    console.error('Error al listar giros comerciales:', error);
    res.status(500).json({ message: 'Error al listar giros comerciales' });
  }
};

export const obtenerGiroComercial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const giro = await prisma.giroComercial.findUnique({ where: { id } });

    if (!giro) {
      res.status(404).json({ message: 'Giro comercial no encontrado' });
      return;
    }

    res.json(giro);
  } catch (error) {
    console.error('Error al obtener giro comercial:', error);
    res.status(500).json({ message: 'Error al obtener el giro comercial' });
  }
};

export const crearGiroComercial = async (req: Request, res: Response) => {
  try {
    const { nombre, activo } = req.body as { nombre?: string; activo?: unknown };

    const nombreNormalizado = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nombreNormalizado) {
      res.status(400).json({ message: 'El nombre es obligatorio' });
      return;
    }

    const estado = parseEstadoActivo(activo ?? 1);
    if (estado === null) {
      res.status(400).json({ message: 'El campo activo debe ser 0 o 1' });
      return;
    }

    const giro = await prisma.giroComercial.create({
      data: { nombre: nombreNormalizado, activo: estado },
    });

    res.status(201).json(giro);
  } catch (error) {
    console.error('Error al crear giro comercial:', error);
    res.status(500).json({ message: 'Error al crear el giro comercial' });
  }
};

export const actualizarGiroComercial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const { nombre, activo } = req.body as { nombre?: string; activo?: unknown };

    const data: { nombre?: string; activo?: EstadoActivo } = {};

    if (nombre !== undefined) {
      const nombreNormalizado = typeof nombre === 'string' ? nombre.trim() : '';
      if (!nombreNormalizado) {
        res.status(400).json({ message: 'El nombre no puede estar vacío' });
        return;
      }
      data.nombre = nombreNormalizado;
    }

    if (activo !== undefined) {
      const estado = parseEstadoActivo(activo);
      if (estado === null) {
        res.status(400).json({ message: 'El campo activo debe ser 0 o 1' });
        return;
      }
      data.activo = estado;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
      return;
    }

    const giro = await prisma.giroComercial.update({
      where: { id },
      data,
    });

    res.json(giro);
  } catch (error) {
    console.error('Error al actualizar giro comercial:', error);
    res.status(500).json({ message: 'Error al actualizar el giro comercial' });
  }
};

export const eliminarGiroComercial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    await prisma.giroComercial.delete({ where: { id } });

    res.json({ message: 'Giro comercial eliminado' });
  } catch (error) {
    console.error('Error al eliminar giro comercial:', error);
    res.status(500).json({ message: 'Error al eliminar el giro comercial' });
  }
};
