import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { toUTC } from '../utils/date';

const prisma = new PrismaClient();

export const crearHistorialPlan = async (req: Request, res: Response) => {
  const empresaIdRaw = req.body.empresaId ?? req.body.id_empresa;
  const tokenPlanRaw = req.body.token_plan ?? req.body.tokenPlan;

  const empresaId = Number(empresaIdRaw);
  const tokenPlan = typeof tokenPlanRaw === 'string' ? tokenPlanRaw.trim() : undefined;

  if (!empresaIdRaw || Number.isNaN(empresaId) || empresaId <= 0) {
    res.status(400).json({ error: 'empresaId es requerido y debe ser un número válido' });
    return;
  }

  if (!tokenPlan) {
    res.status(400).json({ error: 'token_plan es requerido' });
    return;
  }

  try {
    const historialPlan = await prisma.historialPlan.create({
      data: {
        empresa: { connect: { id: empresaId } },
        token_plan: tokenPlan,
      },
    });

    res.status(201).json(historialPlan);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        res.status(404).json({ error: 'Empresa no encontrada' });
        return;
      }
    }

    console.error(error);
    res.status(500).json({ error: 'Error al crear el historial de planes' });
  }
};

export const obtenerUltimoHistorialPlanPorFecha = async (req: Request, res: Response) => {
  const empresaIdRaw = (req.query.empresaId ?? req.query.id_empresa) as string | string[] | undefined;
  const fechaRaw = req.query.fecha as string | string[] | undefined;

  if (!empresaIdRaw) {
    res.status(400).json({ error: 'empresaId es requerido' });
    return;
  }

  const empresaId = Number(Array.isArray(empresaIdRaw) ? empresaIdRaw[0] : empresaIdRaw);

  if (Number.isNaN(empresaId) || empresaId <= 0) {
    res.status(400).json({ error: 'empresaId debe ser un número válido' });
    return;
  }

  if (!fechaRaw) {
    res.status(400).json({ error: 'fecha es requerida' });
    return;
  }

  const fechaString = Array.isArray(fechaRaw) ? fechaRaw[0] : fechaRaw;
  const fechaBusqueda = toUTC(fechaString);

  if (Number.isNaN(fechaBusqueda.getTime())) {
    res.status(400).json({ error: 'fecha inválida' });
    return;
  }

  try {
    const inicioMes = new Date(Date.UTC(fechaBusqueda.getUTCFullYear(), fechaBusqueda.getUTCMonth(), 1));
    const inicioMesSiguiente = new Date(
      Date.UTC(fechaBusqueda.getUTCFullYear(), fechaBusqueda.getUTCMonth() + 1, 1),
    );

    const historialPlan = await prisma.historialPlan.findFirst({
      where: {
        empresaId,
        creadoEn: {
          gte: inicioMes,
          lt: inicioMesSiguiente,
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    if (!historialPlan) {
      res.status(404).json({ mensaje: 'No se encontró historial de plan para la empresa en la fecha proporcionada' });
      return;
    }

    res.json(historialPlan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial de planes' });
  }
};
