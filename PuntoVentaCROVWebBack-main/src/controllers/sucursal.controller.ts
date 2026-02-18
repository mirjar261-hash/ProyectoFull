import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

const isEmptyValue = (v: any) => v === '' || v === undefined;
const toOptionalNullable = (v: any) => {
  if (v === null) return null;
  return isEmptyValue(v) ? undefined : v;
};
const toUndefinedIfEmpty = (v: any) =>
  v === '' || v === undefined || v === null ? undefined : v;
const toUppercaseOptionalNullable = (v: any) => {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed.toUpperCase();
};


function buildSucursalUpdateData(body: any): Prisma.SucursalUpdateInput {
  const {
    razon_social,
    rfc,
    contacto,
    direccion,
    colonia,
    estado,
    municipio,
    cp,
    correo,
    correo_notificacion,
    tel,
    cel,
    giro_comercial,
    nombre_comercial,
    tipo_persona,           // enum 'FISICA' | 'MORAL'
    regimen_fiscal,         
    comision_por_recarga,   // number
    inventario_negativo,    // boolean
    activo,                 // number
  } = body || {};

  const data: Prisma.SucursalUpdateInput = {
    razon_social: toOptionalNullable(razon_social),
    rfc: toUppercaseOptionalNullable(rfc),
    contacto: toUndefinedIfEmpty(contacto),
    direccion: toOptionalNullable(direccion),
    colonia: toUndefinedIfEmpty(colonia),
    estado: toOptionalNullable(estado),
    municipio: toOptionalNullable(municipio),
    cp: toOptionalNullable(cp),
    correo: toUndefinedIfEmpty(correo),
    correo_notificacion: toOptionalNullable(correo_notificacion),
    tel: toUndefinedIfEmpty(tel),
    cel: toUndefinedIfEmpty(cel),
    giro_comercial: toUndefinedIfEmpty(giro_comercial),
    nombre_comercial: toOptionalNullable(nombre_comercial),
    tipo_persona: toOptionalNullable(tipo_persona) as any,
    comision_por_recarga:
      comision_por_recarga === '' ||
      comision_por_recarga === undefined ||
      comision_por_recarga === null
        ? undefined
        : Number(comision_por_recarga),
    inventario_negativo:
      typeof inventario_negativo === 'boolean' ? inventario_negativo : undefined,
    activo: typeof activo === 'number' ? activo : undefined,
  };
  // RELACIÓN: régimen fiscal
  if (regimen_fiscal === '' || regimen_fiscal === null || regimen_fiscal === undefined) {
    (data as any).regimen = { disconnect: true };
  } else if (typeof regimen_fiscal === 'string') {
    (data as any).regimen = { connect: { clave: regimen_fiscal } };
  }

  return data;
}

// GET /sucursales/:id
export const obtenerSucursal = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const sucursal = await prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
    }
    res.json(sucursal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la sucursal' });
  }
};

// PUT /sucursales/:id/taecel
export const actualizarDatosTaecelSucursal = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { comision_por_recarga, keyTaecel, nipTaecel } = req.body;

  try {
    const sucursal = await prisma.sucursal.update({
      where: { id },
      data: { comision_por_recarga: Number(comision_por_recarga) },
    });

    await prisma.datos_cliente_taecel.updateMany({
      where: { sucursal_id: id, activo: 1 },
      data: { keyTaecel, nipTaecel },
    });

    res.json(sucursal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar datos de Taecel' });
  }
};

// GET /sucursales/:id/taecel
export const obtenerDatosTaecelSucursal = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id },
      select: { comision_por_recarga: true },
    });

    if (!sucursal) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }

    const datos = await prisma.datos_cliente_taecel.findFirst({
      where: { sucursal_id: id, activo: 1 },
      select: { keyTaecel: true, nipTaecel: true },
    });

    res.json({
      comision_por_recarga: sucursal.comision_por_recarga,
      keyTaecel: datos?.keyTaecel,
      nipTaecel: datos?.nipTaecel,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos de Taecel' });
  }
};

// GET /sucursales/:id/correo-notificacion
export const obtenerCorreoNotificacion = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id },
      select: { correo_notificacion: true }
    });

    if (!sucursal) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }

    res.json(sucursal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el correo de notificación' });
  }
};

// PUT /sucursales/:id
export const editarSucursal = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const data = buildSucursalUpdateData(req.body);

    const sucursal = await prisma.sucursal.update({
      where: { id },
      data,
      include: { regimen: { select: { clave: true, descripcion: true } } },
    });

    res.json(sucursal);
  } catch (err: any) {
    console.error(err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }
    if (err?.code === 'P2003') {
      return res.status(400).json({ error: 'La clave de régimen fiscal no existe' });
    }
    res.status(500).json({ error: 'Error al actualizar la sucursal' });
  }
};
