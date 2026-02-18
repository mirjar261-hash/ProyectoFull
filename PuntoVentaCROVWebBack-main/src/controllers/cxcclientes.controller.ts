import { CxcMetodoPago, CxcTarjetaTipo } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { serializeBigInt } from '../utils/serializeBigInt';

const METODOS_VALIDOS = new Set(Object.values(CxcMetodoPago));
const TARJETAS_VALIDAS = new Set(Object.values(CxcTarjetaTipo));

const normalizarMetodoPago = (valor?: string | null): CxcMetodoPago | undefined => {
  if (!valor) return undefined;
  const metodo = valor.toString().toUpperCase();
  if (!METODOS_VALIDOS.has(metodo as CxcMetodoPago)) {
    throw new Error('metodo_pago inválido');
  }
  return metodo as CxcMetodoPago;
};

const normalizarTarjetaTipo = (valor?: string | null): CxcTarjetaTipo | undefined => {
  if (!valor) return undefined;
  const tipo = valor.toString().toUpperCase();
  if (!TARJETAS_VALIDAS.has(tipo as CxcTarjetaTipo)) {
    throw new Error('tarjeta_tipo inválido');
  }
  return tipo as CxcTarjetaTipo;
};

export const listarCxcClientes = async (req: Request, res: Response) => {
  const activos = req.query.activos !== '0';
  const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : undefined;
  const clienteId = req.query.clienteId ? Number(req.query.clienteId) : undefined;
  const ventaId = req.query.ventaId ? Number(req.query.ventaId) : undefined;

  const movimientos = await prisma.cxc_cliente.findMany({
    where: {
      idsucursal: sucursalId,
      idcliente: clienteId,
      idventa: ventaId,
      activo: activos ? 1 : undefined,
    },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });

  res.json(serializeBigInt(movimientos));
};

const gestionarMovimientoCxc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const {
      saldo_pendiente,
      saldo_abonado,
      idcliente,
      idventa,
      comentarios,
      metodo_pago,
      referencia,
      tarjeta_tipo,
      idsucursal,
      monto: montoAbonoBody,
    } = req.body;

    const ventaIdParametro = req.params.ventaId !== undefined ? Number(req.params.ventaId) : undefined;
    const ventaIdBody = idventa !== undefined && idventa !== null ? Number(idventa) : undefined;
    const ventaId = ventaIdParametro ?? ventaIdBody;

    if (ventaId !== undefined && (Number.isNaN(ventaId) || ventaId === 0)) {
      res.status(400).json({ error: 'ventaId es requerido y debe ser numérico' });
      return;
    }

    const venta = ventaId
      ? await prisma.venta.findUnique({
          where: { id: ventaId },
          select: {
            estado: true,
            total: true,
            saldo_pendiente: true,
            sucursalId: true,
            id_cliente: true,
          },
        })
      : null;

    if (ventaId && !venta) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }

    if (venta && (venta.estado ?? '').toUpperCase() !== 'CREDITO') {
      res.status(400).json({ error: 'Solo se pueden crear CxC para ventas a crédito' });
      return;
    }

    const ultimoMovimiento = ventaId
      ? await prisma.cxc_cliente.findFirst({
          where: { idventa: ventaId, activo: 1 },
          orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        })
      : null;

    const montoAbono = montoAbonoBody ?? saldo_abonado;
    const abonoSolicitado = montoAbono !== undefined && Number(montoAbono) !== 0;
    const esAbono = ventaId !== undefined && abonoSolicitado;

    if (abonoSolicitado && ventaId === undefined) {
      res.status(400).json({ error: 'ventaId es requerido para registrar un abono' });
      return;
    }

    const clienteId = Number(idcliente ?? venta?.id_cliente ?? ultimoMovimiento?.idcliente);
    const sucursal = Number(idsucursal ?? venta?.sucursalId ?? ultimoMovimiento?.idsucursal);

    if (!clienteId || Number.isNaN(clienteId)) {
      res.status(400).json({ error: 'idcliente es requerido y debe ser numérico' });
      return;
    }

    if (!sucursal || Number.isNaN(sucursal)) {
      res.status(400).json({ error: 'idsucursal es requerido y debe ser numérico' });
      return;
    }

    if (esAbono) {
      const monto = Number(montoAbono);
      if (!monto || Number.isNaN(monto) || monto <= 0) {
        res.status(400).json({ error: 'cantidad a abonar es requerida y debe ser mayor a 0' });
        return;
      }

      const metodoPagoNormalizado = normalizarMetodoPago(metodo_pago);
      if (!metodoPagoNormalizado) {
        res.status(400).json({ error: 'metodo_pago es obligatorio' });
        return;
      }

      const tarjetaTipoNormalizado = normalizarTarjetaTipo(tarjeta_tipo);
      if (metodoPagoNormalizado === CxcMetodoPago.TARJETA && !tarjetaTipoNormalizado) {
        res.status(400).json({ error: 'tarjeta_tipo es obligatorio cuando el método de pago es TARJETA' });
        return;
      }
      const saldoPendienteInicialValor =
        ultimoMovimiento?.saldo_pendiente ?? saldo_pendiente ?? venta?.saldo_pendiente ?? venta?.total;
      const saldoPendienteInicial = Number(saldoPendienteInicialValor);

      if (Number.isNaN(saldoPendienteInicial)) {
        res.status(400).json({ error: 'saldo_pendiente es requerido y debe ser numérico' });
        return;
      }

      const nuevoPendiente = saldoPendienteInicial - monto;
      if (nuevoPendiente < 0) {
        res.status(400).json({ error: 'El abono excede el saldo pendiente' });
        return;
      }

      const [nuevoAbono] = await prisma.$transaction([
        prisma.cxc_cliente.create({
          data: {
            saldo_pendiente: nuevoPendiente,
            saldo_abonado: monto,
            idcliente: clienteId,
            idsucursal: sucursal,
            idventa: ventaId,
            idusuariorecibe: userId,
            comentarios: comentarios ?? req.body.comentarios ?? null,
            metodo_pago: metodoPagoNormalizado,
            referencia: referencia ?? req.body.referencia ?? null,
            tarjeta_tipo: metodoPagoNormalizado === CxcMetodoPago.TARJETA ? tarjetaTipoNormalizado : null,
          },
        }),
        prisma.venta.update({ where: { id: ventaId }, data: { saldo_pendiente: nuevoPendiente } }),
      ]);

      res.status(201).json(serializeBigInt(nuevoAbono));
      return;
    }

    
    if (ultimoMovimiento && !abonoSolicitado) {
      res.status(400).json({ error: 'La venta ya tiene movimientos, registra un abono.' });
      return;
    }

   
    const saldoPendienteValor = saldo_pendiente ?? venta?.saldo_pendiente ?? venta?.total;
    const saldoPendiente = Number(saldoPendienteValor);

    if (Number.isNaN(saldoPendiente)) {
      res.status(400).json({ error: 'saldo_pendiente es requerido y debe ser numérico' });
      return;
    }

    const saldoAbonado = saldo_abonado !== undefined ? Number(saldo_abonado) : 0;

    if (Number.isNaN(saldoAbonado)) {
      res.status(400).json({ error: 'saldo_abonado debe ser numérico' });
      return;
    }

    const metodoPagoNormalizado = normalizarMetodoPago(metodo_pago);
    const tarjetaTipoNormalizado = normalizarTarjetaTipo(tarjeta_tipo);

    if (metodoPagoNormalizado === CxcMetodoPago.TARJETA && !tarjetaTipoNormalizado) {
      res.status(400).json({ error: 'tarjeta_tipo es obligatorio cuando el método de pago es TARJETA' });
      return;
    }

    const movimiento = await prisma.cxc_cliente.create({
      data: {
        saldo_pendiente: saldoPendiente,
        saldo_abonado: saldoAbonado,
        idcliente: clienteId,
        idventa: ventaId ?? null,
        comentarios: comentarios ?? null,
        metodo_pago: metodoPagoNormalizado,
        referencia: referencia ?? null,
        tarjeta_tipo: metodoPagoNormalizado === CxcMetodoPago.TARJETA ? tarjetaTipoNormalizado : null,
        idsucursal: sucursal,
        idusuariorecibe: userId,
      },
    });

    if (ventaId) {
      await prisma.venta.update({ where: { id: ventaId }, data: { saldo_pendiente: saldoPendiente } });
    }

    res.status(201).json(serializeBigInt(movimiento));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cuenta por cobrar' });
  }
};

export const crearCxcCliente = gestionarMovimientoCxc;

export const devolverAbonoCxc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const abonoId = Number(req.params.id);
    if (!abonoId || Number.isNaN(abonoId)) {
      res.status(400).json({ error: 'id del abono inválido' });
      return;
    }

    const abono = await prisma.cxc_cliente.findUnique({ where: { id: abonoId } });

    if (!abono) {
      res.status(404).json({ error: 'Abono no encontrado' });
      return;
    }

    if (!abono.idventa) {
      res.status(400).json({ error: 'El abono no está asociado a una venta' });
      return;
    }

    if (abono.abono_devuelto === 1) {
      res.status(400).json({ error: 'El abono ya fue devuelto' });
      return;
    }

    if (abono.saldo_abonado <= 0) {
      res.status(400).json({ error: 'Solo se pueden devolver registros de abono' });
      return;
    }

    const ultimoMovimiento = await prisma.cxc_cliente.findFirst({
      where: { idventa: abono.idventa, activo: 1 },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });

    const pendienteActual = Number(ultimoMovimiento?.saldo_pendiente ?? 0);
    const nuevoPendiente = pendienteActual + Number(abono.saldo_abonado);

    const [_, movimientoAjuste] = await prisma.$transaction([
      prisma.cxc_cliente.update({
        where: { id: abonoId },
        data: {
          abono_devuelto: 1,
          fecha_devolucion: new Date(),
          comentarios: req.body?.comentarios ?? abono.comentarios,
        },
      }),
      prisma.cxc_cliente.create({
        data: {
          saldo_pendiente: nuevoPendiente,
          saldo_abonado: -Number(abono.saldo_abonado),
          idcliente: abono.idcliente,
          idsucursal: abono.idsucursal,
          idventa: abono.idventa,
          idusuariorecibe: userId,
          comentarios:
            req.body?.comentarios ?? 'Devolución de abono',
          metodo_pago: abono.metodo_pago,
          referencia: abono.referencia,
          tarjeta_tipo: abono.tarjeta_tipo,
        },
      }),
      prisma.venta.update({ where: { id: abono.idventa }, data: { saldo_pendiente: nuevoPendiente } }),
    ]);

    res.json(serializeBigInt(movimientoAjuste));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al devolver el abono' });
  }
};

export const listarCreditosPendientes = async (req: Request, res: Response) => {
  const sucursalId = req.query.sucursalId ? Number(req.query.sucursalId) : undefined;
  const clienteId = req.query.clienteId ? Number(req.query.clienteId) : undefined;

  const creditos = await prisma.venta.findMany({
    where: {
      estado: 'CREDITO',
      activo: 1,
      saldo_pendiente: { gt: 0 },
      sucursalId: sucursalId ?? undefined,
      id_cliente: clienteId ?? undefined,
    },
    select: {
      id: true,
      numdoc: true,
      fecha: true,
      total: true,
      saldo_pendiente: true,
      id_cliente: true,
      sucursalId: true,
      cliente: {
        select: {
          id: true,
          razon_social: true,
          nom_contacto: true,
          telefono: true,
        },
      },
    },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });

  res.json(serializeBigInt(creditos));
};

export const listarAbonosActivosPorVenta = async (req: Request, res: Response) => {
  const ventaId = Number(req.params.ventaId);

  if (!ventaId || Number.isNaN(ventaId)) {
    res.status(400).json({ error: 'ventaId es requerido y debe ser numérico' });
    return;
  }

  try {
    const abonos = await prisma.cxc_cliente.findMany({
      where: {
        idventa: ventaId,
        activo: 1,
        abono_devuelto: 0,
        saldo_abonado: { gt: 0 },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });

    res.json(serializeBigInt(abonos));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener historial de abonos' });
  }
};
