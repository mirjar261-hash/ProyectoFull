import { Request, Response } from 'express';
import { TarjetaTipo } from '@prisma/client';
import { toUTC } from '../utils/date';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import prisma from '../utils/prisma';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const obtenerOperadores = async (_req: Request, res: Response) => {
  const operadores = await prisma.operador_movil.findMany({
    where: { activo: 1 },
    orderBy: { nombre: 'asc' },
  });
  res.json(operadores);
};

export const obtenerProductos = async (req: Request, res: Response) => {
  const operadorId = Number(req.params.operadorId);
  if (!operadorId || isNaN(operadorId)) {
    res
      .status(400)
      .json({ error: 'operadorId es requerido y debe ser numérico' });
    return;
  }
  const productos = await prisma.operador_movil_sku.findMany({
    where: { id_operador_movil: operadorId, activo: 1 },
    orderBy: { descripcion: 'asc' },
  });
  res.json(productos);
};

export const obtenerSaldoTaecel = async (req: Request, res: Response) => {
  const sucursalId = Number(req.params.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) {
    res
      .status(400)
      .json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const datosTaecel = await prisma.datos_cliente_taecel.findFirst({
    where: { sucursal_id: sucursalId },
    select: { keyTaecel: true, nipTaecel: true },
  });

  const key = datosTaecel?.keyTaecel || '';
  const nip = datosTaecel?.nipTaecel || '';

  if (key === '' || nip === '') {
    res.status(404).json({ error: 'Error no se encontró el key o nip Taecel' });
    return;
  }

  try {
    const params = new URLSearchParams({ key, nip });
    const resp = await fetchWithRetry('https://taecel.com/app/api/getBalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = await resp.json();
    const data = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: 'Taecel no disponible' });
  }
};

export const obtenerComisionRecarga = async (req: Request, res: Response) => {
  const sucursalId = Number(req.params.sucursalId);
  if (!sucursalId || isNaN(sucursalId)) {
    res
      .status(400)
      .json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { comision_por_recarga: true },
    });

    if (!sucursal) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }

    res.json(sucursal.comision_por_recarga);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la comisión' });
  }
};

async function verificarStatus(transID: string, key: string, nip: string) {

  for (let i = 0; i < 30; i++) {
    try {
      const params = new URLSearchParams({ key, nip, transID });
      const resp = await fetchWithRetry('https://taecel.com/app/api/StatusTXN', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const json = await resp.json();
      const data = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;
      if (data.Status && data.Status !== 'En proceso') {
        return { json, data };
      }
      if (!json.success) {
        return { json, data };
      }
    } catch (error) {
      // ignore and retry
    }
    await delay(2000);
  }
  throw new Error('Timeout');
}

export const realizarRecarga = async (req: Request, res: Response) => {
  try {
    const {
      skuId,
      numero,
      monto,
      usuarioId,
      sucursalId,
      descripcion,
      pago: {
        efectivo = 0,
        tarjeta = 0,
        vale = 0,
        cheque = 0,
        transferencia = 0,
        tarjetaTipo,
        referenciaPago,
      } = {},
    } = req.body;

    const datosTaecel = await prisma.datos_cliente_taecel.findFirst({
      where: { sucursal_id: sucursalId },
      select: { keyTaecel: true, nipTaecel: true },
    });

    const key = datosTaecel?.keyTaecel || '';
    const nip = datosTaecel?.nipTaecel || '';

    if (key == '' || nip == '') {
      res.status(404).json({ error: 'Error no se encontró el key o nip Taecel' });
      return;
    }

    const comision = parseFloat(process.env.COMISION_RECARGA || '0');

    const sku = await prisma.operador_movil_sku.findUnique({
      where: { id: Number(skuId) },
      include: { operador_movil: true },
    });
    if (!sku) {
      res.status(404).json({ error: 'SKU no encontrado' });
      return;
    }

    const params = new URLSearchParams({
      key,
      nip,
      producto: sku.codigo,
      referencia: String(numero),
    });

    const resp = await fetchWithRetry('https://taecel.com/app/api/RequestTXN', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = await resp.json();
    if (!json.success) {
      res.status(400).json({ error: json.message || 'Error al realizar la recarga' });
      return;
    }
    const dataR = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;

    await delay(2000);
    const status = await verificarStatus(String(dataR.transID || dataR.TransID), key, nip);
    const dataS = typeof status.data === 'string' ? JSON.parse(status.data) : status.data;

    console.warn(dataS);

    const total = Number(monto) + comision;

    await prisma.historial_recargas.create({
      data: {
        id_usuario: Number(usuarioId),
        id_gv_operador_movil_sku: Number(skuId),
        numero_telefonico: String(numero),
        transID_taecel: String(dataR.transID || dataS.TransID),
        fecha_taecel: String(dataR.fecha || dataS.Fecha),
        folio_taecel: dataS.Folio,
        status_taecel: dataS.Status + ': ' + dataS.Nota,
        success_taecel: status.json.success ? 1 : 0,
        monto_pagado: Number(monto),
        subtotal: Number(monto),
        igv: comision,
        total,
        efectivo: Number(efectivo),
        tarjeta: Number(tarjeta),
        vale: Number(vale),
        cheque: Number(cheque),
        transferencia: Number(transferencia),
        referencia: tarjeta > 0 || transferencia > 0 ? referenciaPago : null,
        tarjeta_tipo: tarjeta > 0 ? tarjetaTipo as TarjetaTipo | undefined : null,
        id_cuenta_empresa: null,
        descripcion:
          descripcion ||
          `Recarga ${sku.operador_movil.nombre} $${sku.descripcion} al telefono:${numero}`,
        fecha: new Date(),
      },
    });

    res.json({
      status: status.json.success ? 1 : 0,
      respuesta: dataS.Status + ': ' + dataS.Nota,
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: 'Taecel no disponible' });
  }
};

export const obtenerHistorialRecargas = async (req: Request, res: Response) => {
  const usuarioId = Number(req.params.usuarioId);
  const fechaInicio = req.query.fechaInicio
    ? toUTC(req.query.fechaInicio as string)
    : undefined;
  const fechaFin = req.query.fechaFin
    ? toUTC(req.query.fechaFin as string)
    : undefined;
  if (!usuarioId || isNaN(usuarioId)) {
    res
      .status(400)
      .json({ error: 'usuarioId es requerido y debe ser numérico' });
    return;
  }
  const fechaWhere: any = {};
  if (fechaInicio) fechaWhere.gte = fechaInicio;
  if (fechaFin) fechaWhere.lte = fechaFin;
  const recargas = await prisma.historial_recargas.findMany({
    where: {
      id_usuario: usuarioId,
      activo: 1,
      fecha: Object.keys(fechaWhere).length ? fechaWhere : undefined,
    },
    include: {
      operadorSku: {
        include: { operador_movil: true },
      },
    },
    orderBy: { fecha: 'desc' },
  });
  res.json(recargas);
};

