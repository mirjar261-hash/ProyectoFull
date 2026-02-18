import { Request, Response } from 'express';
import prisma from '../utils/prisma';

function normalizaClaveRegimen(input?: unknown): string | null {
  if (input === undefined || input === null) return null;
  const s = String(input).trim();
  return s.length ? s : null;
}

function tipoPersonaPorRFC(rfc?: string | null): 'FISICA' | 'MORAL' | null {
  if (!rfc) return null;
  const len = rfc.trim().length;
  if (len === 13) return 'FISICA';
  if (len === 12) return 'MORAL';
  return null;
}

async function validaRegimenFiscalOThrow(
  clave: string,
  rfc_facturacion?: string | null
) {
  const regimen = await prisma.catRegimenFiscal.findUnique({
    where: { clave },
  });
  if (!regimen || regimen.activo !== 1) {
    const e: any = new Error('Régimen fiscal inválido o inactivo');
    e.status = 400;
    throw e;
  }

  // Validación por vigencia (si viene en catálogo)
  const hoy = new Date();
  if (regimen.fecha_inicio_vigencia && regimen.fecha_inicio_vigencia > hoy) {
    const e: any = new Error('Régimen fiscal fuera de vigencia (aún no inicia)');
    e.status = 400;
    throw e;
  }
  if (regimen.fecha_fin_vigencia && regimen.fecha_fin_vigencia < hoy) {
    const e: any = new Error('Régimen fiscal fuera de vigencia (finalizado)');
    e.status = 400;
    throw e;
  }

  // Validación por tipo de persona (si se puede inferir por RFC)
  const tp = tipoPersonaPorRFC(rfc_facturacion ?? null);
  if (tp === 'FISICA' && !regimen.aplica_fisica) {
    const e: any = new Error('El régimen no aplica a Personas Físicas');
    e.status = 400;
    throw e;
  }
  if (tp === 'MORAL' && !regimen.aplica_moral) {
    const e: any = new Error('El régimen no aplica a Personas Morales');
    e.status = 400;
    throw e;
  }

  return regimen;
}


// Crear cliente
// Crear cliente (POST)
export const crearCliente = async (req: Request, res: Response) => {
  try {
    const {
      razon_social,
      telefono,
      movil,
      nom_contacto,
      email,
      limite_credito,
      dias_credito,
      tipo_precio,
      razon_social_facturacion,
      rfc_facturacion,
      curp_facturacion,
      domicilio_facturacion,
      no_ext_facturacion,
      no_int_facturacion,
      cp_facturacion,
      colonia_facturacion,
      ciudad_facturacion,
      localidad_facturacion,
      estado_facturacion,
      pais_facturacion,
      regimen_fiscal,
      sucursalId,
    } = req.body;

    // Normalizador numérico
    const toIntOrNull = (v: any) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    };

    // 1) Resolver tipo_persona: toma el enviado, si no, infiere por RFC
    const parseTipoPersona = (v: any): 'FISICA' | 'MORAL' | null => {
      if (v == null) return null;
      const s = String(v).trim().toUpperCase();
      return s === 'FISICA' ? 'FISICA' : s === 'MORAL' ? 'MORAL' : null;
    };
    const tipo_persona: 'FISICA' | 'MORAL' | null =
      parseTipoPersona(req.body?.tipo_persona) ?? tipoPersonaPorRFC(rfc_facturacion ?? null);

    // 2) Validar régimen (tu helper valida por RFC)
    const claveRegimen = normalizaClaveRegimen(regimen_fiscal);
    if (claveRegimen) {
      await validaRegimenFiscalOThrow(claveRegimen, rfc_facturacion);
    }

    // 3) Crear
    const cliente = await prisma.cliente.create({
      data: {
        razon_social,
        telefono,
        sucursalId: Number(sucursalId),
        activo: 1,
        movil: movil ?? null,
        nom_contacto: nom_contacto ?? null,
        email: email ?? null,
        limite_credito: toIntOrNull(limite_credito),
        dias_credito: toIntOrNull(dias_credito),
        tipo_precio: toIntOrNull(tipo_precio),
        tipo_persona,
        razon_social_facturacion: razon_social_facturacion ?? null,
        rfc_facturacion: rfc_facturacion ?? null,
        curp_facturacion: curp_facturacion ?? null,
        domicilio_facturacion: domicilio_facturacion ?? null,
        no_ext_facturacion: no_ext_facturacion ?? null,
        no_int_facturacion: no_int_facturacion ?? null,
        cp_facturacion: cp_facturacion ?? null,
        colonia_facturacion: colonia_facturacion ?? null,
        ciudad_facturacion: ciudad_facturacion ?? null,
        localidad_facturacion: localidad_facturacion ?? null,
        estado_facturacion: estado_facturacion ?? null,
        pais_facturacion: pais_facturacion ?? null,
        regimen_fiscal: claveRegimen,
      },
      include: { regimen: true },
    });

    res.json(cliente);
  } catch (error: any) {
    console.error(error);
    res
      .status(error?.status || 500)
      .json({ error: error?.message || 'Error al crear el cliente' });
  }
};


// Obtener clientes por sucursal
export const obtenerClientes = async (req: Request, res: Response) => {
  const sucursalId = Number(req.query.sucursalId);

  if (!sucursalId || isNaN(sucursalId)) {
    res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    return;
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: { sucursalId, activo: 1 },
      include: {
        regimen: true,
      },
      orderBy: { id: 'desc' },
    });
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
};

// GET /clientes/:id?sucursalId=1
export const obtenerClientePorId = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const sucursalId = Number(req.query.sucursalId);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'id de cliente inválido' });
    }
    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ error: 'sucursalId es requerido y debe ser numérico' });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id, sucursalId, activo: 1 },
      include: { regimen: true },
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado en esa sucursal' });
    }

    return res.json(cliente);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener el cliente por id' });
  }
};


export const buscarClientesPorSucursal = async (req: Request, res: Response) => {
  try {
    const sucursalId = Number(req.query.sucursalId ?? req.body?.sucursalId);
    const q = String(req.query.q ?? '').trim();
    if (!sucursalId) return res.status(400).json({ error: 'sucursalId requerido' });

    const where: any = { sucursalId, activo: 1 };
    if (q) {
      where.OR = [
        { razon_social: { contains: q } },
        { razon_social_facturacion: { contains: q } },
        { rfc_facturacion: { contains: q } },
        { nom_contacto: { contains: q } },
        { email: { contains: q } },
        { telefono: { contains: q } },
        { movil: { contains: q } },
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      take: 25,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        razon_social: true,
        razon_social_facturacion: true,
        rfc_facturacion: true,
        nom_contacto: true,
        telefono: true,
        email: true,
        sucursalId: true,
        regimen_fiscal: true,
      },
    });

    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar clientes' });
  }
};

// Asignar un cliente existente a una venta (cuando es PÚBLICO EN GENERAL)
export const asignarClienteAVenta = async (req: Request, res: Response) => {
  try {
    const ventaId = Number(req.body?.ventaId ?? req.query.ventaId);
    const clienteId = Number(req.body?.clienteId ?? req.query.clienteId);
    const sucursalId = Number(req.body?.sucursalId ?? req.query.sucursalId);
    if (!ventaId || !clienteId || !sucursalId) {
      return res.status(400).json({ error: 'ventaId, clienteId y sucursalId son requeridos' });
    }

    const [venta, cliente] = await Promise.all([
      prisma.venta.findFirst({ where: { id: ventaId, sucursalId } }),
      prisma.cliente.findFirst({ where: { id: clienteId, sucursalId, activo: 1 } }),
    ]);

    if (!venta) return res.status(404).json({ error: 'Venta no encontrada en la sucursal' });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado/activo en la sucursal' });

    const updated = await prisma.venta.update({
      where: { id: ventaId },
      data: { id_cliente: clienteId },
      include: { cliente: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar cliente a la venta' });
  }
};

// Crear un nuevo cliente (si no existe) y asignarlo a la venta indicada
export const crearYAsignarClienteAVenta = async (req: Request, res: Response) => {
  try {
    const ventaId = Number(req.body?.ventaId);
    const sucursalId = Number(req.body?.sucursalId ?? req.body?.cliente?.sucursalId);
    const clientePayload = (req.body?.cliente ?? {}) as any;

    if (!Number.isFinite(ventaId) || ventaId <= 0) {
      return res.status(400).json({ error: 'ventaId inválido' });
    }
    if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ error: 'sucursalId inválido' });
    }

    const razon_social = String(clientePayload?.razon_social ?? '').trim();
    const telefono = String(clientePayload?.telefono ?? '').trim();
    const rfc_facturacion_raw = (clientePayload?.rfc_facturacion ?? clientePayload?.rfc ?? '').toString().trim();

    if (!razon_social) {
      return res.status(400).json({ error: 'razon_social es requerido' });
    }
    if (!telefono) {
      return res.status(400).json({ error: 'telefono es requerido' });
    }

    const rfc_facturacion = rfc_facturacion_raw ? rfc_facturacion_raw.toUpperCase() : null;
    const razon_social_facturacion = String(
      clientePayload?.razon_social_facturacion ?? razon_social
    ).trim();

    const venta = await prisma.venta.findFirst({
      where: { id: ventaId, sucursalId },
      select: { id: true, id_cliente: true, sucursalId: true },
    });
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada en la sucursal' });
    }

    const result = await prisma.$transaction(async (tx) => {

      const clienteIdDirecto = Number(clientePayload?.id);
      if (Number.isFinite(clienteIdDirecto) && clienteIdDirecto! > 0) {
        const existente = await tx.cliente.findFirst({
          where: { id: clienteIdDirecto, sucursalId, activo: 1 },
        });
        if (!existente) throw new Error('Cliente indicado no existe/activo en la sucursal');

        const ventaActualizada = await tx.venta.update({
          where: { id: ventaId },
          data: { id_cliente: existente.id },
          include: { cliente: true },
        });
        return ventaActualizada;
      }

      let cliente = null as any;
      if (rfc_facturacion) {
        cliente = await tx.cliente.findFirst({
          where: { sucursalId, rfc_facturacion, activo: 1 },
        });
      }

      if (!cliente) {
        cliente = await tx.cliente.findFirst({
          where: {
            sucursalId,
            activo: 1,
            razon_social: razon_social,
            telefono: telefono,
          },
        });
      }

      // Crear si no existe
      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            razon_social,
            telefono,
            activo: 1,

            razon_social_facturacion: razon_social_facturacion || null,
            rfc_facturacion,
            curp_facturacion: clientePayload?.curp_facturacion
              ? String(clientePayload.curp_facturacion).trim().toUpperCase()
              : null,
            domicilio_facturacion: clientePayload?.domicilio_facturacion?.trim() || null,
            no_ext_facturacion: clientePayload?.no_ext_facturacion?.trim() || null,
            no_int_facturacion: clientePayload?.no_int_facturacion?.trim() || null,
            cp_facturacion: clientePayload?.cp_facturacion?.trim() || null,
            colonia_facturacion: clientePayload?.colonia_facturacion?.trim() || null,
            ciudad_facturacion: clientePayload?.ciudad_facturacion?.trim() || null,
            localidad_facturacion: clientePayload?.localidad_facturacion?.trim() || null,
            estado_facturacion: clientePayload?.estado_facturacion?.trim() || null,
            pais_facturacion: clientePayload?.pais_facturacion?.trim() || null,
            regimen_fiscal: clientePayload?.regimen_fiscal?.trim() || null,
            sucursalId,
          },
        });
      }

      const ventaActualizada = await tx.venta.update({
        where: { id: ventaId },
        data: { id_cliente: cliente.id },
        include: { cliente: true },
      });

      return ventaActualizada;
    });

    return res.status(201).json(result);
  } catch (err: any) {
    console.error(err);
    const msg = err?.message?.includes('no existe/activo')
      ? 'Cliente indicado no existe/activo en la sucursal'
      : 'Error al crear y asignar cliente a la venta';
    return res.status(500).json({ error: msg });
  }
};




// Editar cliente
export const actualizarCliente = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const toIntOrNull = (v: any) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    };

    const data: any = { ...req.body };
    delete data.id;
    delete data.ventas;
    delete data.regimen;

    if ('limite_credito' in data) data.limite_credito = toIntOrNull(data.limite_credito);
    if ('dias_credito' in data) data.dias_credito = toIntOrNull(data.dias_credito);
    if ('tipo_precio' in data) data.tipo_precio = toIntOrNull(data.tipo_precio);


    const actual = await prisma.cliente.findUnique({
      where: { id: Number(id) },
      select: { rfc_facturacion: true, tipo_persona: true },
    });

    const parseTipoPersona = (v: any): 'FISICA' | 'MORAL' | null => {
      if (v == null) return null;
      const s = String(v).trim().toUpperCase();
      return s === 'FISICA' ? 'FISICA' : s === 'MORAL' ? 'MORAL' : null;
    };

    let tipoPersonaFinal: 'FISICA' | 'MORAL' | null = parseTipoPersona(req.body?.tipo_persona);
    if (!tipoPersonaFinal) {

      const rfcParaInferir =
        (Object.prototype.hasOwnProperty.call(req.body, 'rfc_facturacion')
          ? req.body.rfc_facturacion
          : actual?.rfc_facturacion) ?? null;
      tipoPersonaFinal = tipoPersonaPorRFC(rfcParaInferir);
    }


    if (Object.prototype.hasOwnProperty.call(req.body, 'tipo_persona') ||
      Object.prototype.hasOwnProperty.call(req.body, 'rfc_facturacion')) {
      data.tipo_persona = tipoPersonaFinal ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'regimen_fiscal')) {
      const clave = normalizaClaveRegimen(req.body.regimen_fiscal);

      if (clave) {
        const rfcParaValidar =
          req.body.rfc_facturacion ?? actual?.rfc_facturacion ?? null;

        await validaRegimenFiscalOThrow(clave, rfcParaValidar);
      }

      data.regimen_fiscal = clave;
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data,
      include: { regimen: true },
    });

    res.json(cliente);
  } catch (error: any) {
    console.error(error);
    res
      .status(error?.status || 500)
      .json({ error: error?.message || 'Error al actualizar el cliente' });
  }
};

// Eliminar (desactivar) cliente
export const eliminarCliente = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.cliente.update({
      where: { id: Number(id) },
      data: { activo: 0 },
    });
    res.json({ mensaje: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el cliente' });
  }
};
