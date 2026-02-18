import { Request, Response } from 'express';

import { toUTC } from '../utils/date';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import prisma from '../utils/prisma';

export const obtenerDatosTaecel = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  const datos = await prisma.datos_cliente_taecel.findMany({
    where: { sucursal_id: sucursalId, activo: 1 },
    orderBy: { id: 'asc' },
  });

  res.json(datos);
};

export const crearDatosTaecel = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, telefono, correo, sucursalId, userId } = req.body;

    const key = process.env.TAECEL_KEY || '';
    const nip = process.env.TAECEL_NIP || '';

    const params = new URLSearchParams({
      key,
      nip,
      nombre: nombres,
      apellidos,
      correo,
      telefono,
      forzarActivacion: '1',
    });

    const resp = await fetchWithRetry('https://taecel.com/app/api/RegistroCuenta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = await resp.json();

    if (!json.success) {
      res.status(400).json({ error: json.message || 'Error al realizar la solicitud' });
      return;
    }

    const dataR = typeof json.data === 'string' ? JSON.parse(json.data) : json.data;

    const nuevo = await prisma.datos_cliente_taecel.create({
      data: {
        cuentaID: String(dataR.cuentaID),
        usuarioID: String(dataR.usuarioID),
        perfilID: String(dataR.perfilID),
        contactoID: String(dataR.contactoID),
        status: dataR.Status,
        referenciaPagos: dataR.ReferenciaPagos,
        referenciaServicios: dataR.ReferenciaServicios,
        numeroCuenta: dataR.NumeroCuenta,
        usuarioTaecel: dataR.Usuario,
        keyTaecel: dataR.ws?.key,
        nipTaecel: dataR.ws?.nip,
        nombreCompleto: dataR.Nombre,
        UID: dataR.UID,
        password: dataR.Password,
        phone: dataR.phone,
        email: dataR.Email,
        envioEmail: String(dataR.envioEmail),
        fecha: toUTC(),
        activo: 1,
        sucursal_id: sucursalId,
        usuario_id: userId,
      },
    });
    res.json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: 'Taecel no disponible' });
  }
};

export const actualizarDatosTaecel = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    const actualizado = await prisma.datos_cliente_taecel.update({
      where: { id },
      data: req.body,
    });
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
};

export const eliminarDatosTaecel = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.datos_cliente_taecel.update({
      where: { id },
      data: { activo: 0 },
    });
    res.json({ mensaje: 'Registro desactivado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
};
