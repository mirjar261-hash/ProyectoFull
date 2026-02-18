import { RequestHandler } from "express";
import prisma from '../utils/prisma';

// Función para convertir BigInt a string en toda la respuesta
function bigintToString(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}


// Obtener insumos de un producto
export const obtenerInsumosDeProducto: RequestHandler = async (req, res, next) => {
  try {
    const productoIdNum = Number(req.params.productoId);
    if (!Number.isFinite(productoIdNum) || productoIdNum <= 0) {
      res.status(400).json({ message: "ID de producto inválido" });
      return;
    }

    const producto = await prisma.producto.findUnique({
      where: { id: BigInt(productoIdNum) },
      select: {
        id: true,
        insumos: {
          select: {
            // cantidad típica de la tabla puente
            cantidad: true,
            // el producto que funge como insumo
            productoInsumo: {
              select: {
                id: true,
                nombre: true,
                costo: true,
                precio1: true,
              },
            },
          },
        },
      },
    });

    if (!producto) {
      res.status(404).json({ message: "Producto no encontrado" });
      return;
    }

    // Si usas Prisma.Decimal o BigInt, normaliza aquí
    const toNumberIfDecimal = (v: any) =>
      v && typeof v === "object" && "toNumber" in v ? v.toNumber() : v;

    const insumos = producto.insumos.map((i) => ({
      id: i.productoInsumo.id?.toString?.() ?? i.productoInsumo.id,
      nombre: i.productoInsumo.nombre,
      costo: toNumberIfDecimal(i.productoInsumo.costo),
      precio1: toNumberIfDecimal(i.productoInsumo.precio1),
      cantidad: toNumberIfDecimal(i.cantidad),
    }));

    res.json(insumos);
  } catch (error) {
    console.error("Error al obtener insumos:", error);
    next(error);
  }
};


// Obtener el total de insumos de un producto utilizando únicamente la tabla puente
export const obtenerNumeroInsumosDeProducto: RequestHandler = async (req, res, next) => {
  try {
    const productoIdNum = Number(req.params.productoId);
    if (!Number.isFinite(productoIdNum) || productoIdNum <= 0) {
      res.status(400).json({ message: "ID de producto inválido" });
      return;
    }

    const sumResult = await prisma.productoInsumo.aggregate({
      where: { productoId: BigInt(productoIdNum) },
      _sum: { cantidad: true },
    });

    const insumoCantidad = Number(sumResult._sum.cantidad ?? 0);

    res.json({ productoId: productoIdNum, insumoCantidad });
  } catch (error) {
    console.error("Error al obtener número de insumos:", error);
    next(error);
  }
};


export const agregarInsumoAProducto: RequestHandler = async (req, res, next) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const productoIdRaw =
      body.productoId ?? body.producto_id ?? body.idProducto ?? body.id_producto ?? body.producto ?? null;

    const productoIdInsumoRaw =
      body.productoIdInsumo ?? body.producto_id_insumo ?? body.insumoId ?? body.idInsumo ?? body.id_insumo ?? null;

    const cantidadRaw = body.cantidad ?? body.qty ?? body.quantity ?? null;

    if (productoIdRaw == null || productoIdInsumoRaw == null || cantidadRaw == null) {
      return res.status(400).json({
        message: 'Faltan datos requeridos',
        required: ['productoId', 'productoIdInsumo', 'cantidad'],
        received: { productoId: productoIdRaw, productoIdInsumo: productoIdInsumoRaw, cantidad: cantidadRaw },
      });
    }

    const parseBig = (v: unknown) => {
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') return BigInt(Math.trunc(v));
      if (typeof v === 'string' && v.trim() !== '' && /^-?\d+$/u.test(v.trim())) return BigInt(v.trim());
      throw new Error('ID inválido');
    };
    const parseNum = (v: unknown) => {
      const n = typeof v === 'string' ? Number(v.trim()) : Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    let pid: bigint, pin: bigint;
    try {
      pid = parseBig(productoIdRaw);
      pin = parseBig(productoIdInsumoRaw);
    } catch {
      return res.status(400).json({ message: 'IDs inválidos. Deben ser enteros.' });
    }

    const cant = parseNum(cantidadRaw);
    if (!Number.isFinite(cant)) return res.status(400).json({ message: 'Cantidad inválida. Debe ser numérica.' });
    if (cant < 0) return res.status(400).json({ message: 'Cantidad inválida. No se permiten negativos.' });
    // if (pid === pin) return res.status(400).json({ message: 'Un producto no puede ser insumo de sí mismo.' });

    const result = await prisma.$transaction(async (tx) => {
      // 1) Verificar existencia
      const [productoPadre, productoHijo] = await Promise.all([
        tx.producto.findUnique({ where: { id: pid }, select: { id: true } }),
        tx.producto.findUnique({ where: { id: pin }, select: { id: true } }),
      ]);
      if (!productoPadre) throw Object.assign(new Error('PRODUCTO_PADRE_NO_EXISTE'), { code: 'NOT_FOUND_PADRE' });
      if (!productoHijo) throw Object.assign(new Error('PRODUCTO_INSUMO_NO_EXISTE'), { code: 'NOT_FOUND_INSUMO' });

      // 2) Upsert del vínculo
      const existente = await tx.productoInsumo.findFirst({
        where: { productoId: pid, productoIdInsumo: pin },
        select: { id: true, cantidad: true },
      });

      let registro;
      if (existente) {
        registro = await tx.productoInsumo.update({
          where: { id: existente.id },
          data: { cantidad: (existente.cantidad ?? 0) + cant },
        });
      } else {
        registro = await tx.productoInsumo.create({
          data: {
            cantidad: cant,
            producto: { connect: { id: pid } },
            productoInsumo: { connect: { id: pin } },
          },
        });
      }

      // 3) Total SOLO del producto afectado (no global)
      const sumResult = await tx.productoInsumo.aggregate({
        where: { productoId: pid }, // ← sólo ese producto
        _sum: { cantidad: true },
      });
      const totalFloat = Number(sumResult._sum.cantidad ?? 0);
      //const totalInt = Math.trunc(totalFloat);

      // Guardar en Producto.insumo
      await tx.producto.update({
        where: { id: pid },
        data: { insumo: totalFloat },
      });

      return {
        registro, // incluye la cantidad de ese vínculo
        cantidadPar: Number(registro.cantidad ?? 0),
        totalProducto: totalFloat,
      };
    });

    return res.status(201).json({
      message: 'Insumo agregado al producto',
      cantidadInsumoRelacion: result.cantidadPar,   // ← cantidad de (productoId, productoIdInsumo)
      totalInsumosProducto: result.totalProducto,   // ← total SOLO del productoId
      insumo: bigintToString(result.registro),
    });
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND_PADRE') return res.status(404).json({ message: 'El producto padre no existe' });
    if (error?.code === 'NOT_FOUND_INSUMO') return res.status(404).json({ message: 'El producto insumo no existe' });
    if (error?.code === 'P2003') {
      return res.status(400).json({
        message: 'Violación de llave foránea. Verifica que productoId y productoIdInsumo existan.',
        constraint: error?.meta?.constraint,
      });
    }
    console.error('Error al agregar insumo:', error);
    return next(error);
  }
};

// Actualizar la cantidad de un productoInsumo y recalcular el total\
export const actualizarCantidadProductoInsumo: RequestHandler = async (req, res, next) => {
  try {
    // ←— cuerpo flexible como en el POST
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;

    const productoIdRaw =
      body.productoId ?? body.producto_id ?? body.idProducto ?? body.id_producto ?? body.producto ?? null;

    const productoIdInsumoRaw =
      body.productoIdInsumo ?? body.producto_id_insumo ?? body.insumoId ?? body.idInsumo ?? body.id_insumo ?? null;

    const cantidadRaw = body.cantidad ?? body.qty ?? body.quantity ?? null;

    if (productoIdRaw == null || productoIdInsumoRaw == null || cantidadRaw == null) {
      return res.status(400).json({
        message: 'Faltan datos requeridos',
        required: ['productoId', 'productoIdInsumo', 'cantidad'],
        received: { productoId: productoIdRaw, productoIdInsumo: productoIdInsumoRaw, cantidad: cantidadRaw },
      });
    }

    // Helpers idénticos al POST
    const parseBig = (v: unknown) => {
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') return BigInt(Math.trunc(v));
      if (typeof v === 'string' && v.trim() !== '' && /^-?\d+$/u.test(v.trim())) return BigInt(v.trim());
      throw new Error('ID inválido');
    };
    const parseNum = (v: unknown) => {
      const n = typeof v === 'string' ? Number(v.trim()) : Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    let pid: bigint, pin: bigint;
    try {
      pid = parseBig(productoIdRaw);
      pin = parseBig(productoIdInsumoRaw);
    } catch {
      return res.status(400).json({ message: 'IDs inválidos. Deben ser enteros.' });
    }

    const cant = parseNum(cantidadRaw);
    if (!Number.isFinite(cant)) return res.status(400).json({ message: 'Cantidad inválida. Debe ser numérica.' });
    if (cant < 0) return res.status(400).json({ message: 'Cantidad inválida. No se permiten negativos.' });
    // if (pid === pin) return res.status(400).json({ message: 'Un producto no puede ser insumo de sí mismo.' });

    const result = await prisma.$transaction(async (tx) => {
      // 1) Verificar existencia de ambos productos (mismo patrón del POST)
      const [productoPadre, productoHijo] = await Promise.all([
        tx.producto.findUnique({ where: { id: pid }, select: { id: true } }),
        tx.producto.findUnique({ where: { id: pin }, select: { id: true } }),
      ]);
      if (!productoPadre) throw Object.assign(new Error('PRODUCTO_PADRE_NO_EXISTE'), { code: 'NOT_FOUND_PADRE' });
      if (!productoHijo) throw Object.assign(new Error('PRODUCTO_INSUMO_NO_EXISTE'), { code: 'NOT_FOUND_INSUMO' });

      // 2) Buscar el vínculo y actualizar su cantidad (SET, no suma)
      const existente = await tx.productoInsumo.findFirst({
        where: { productoId: pid, productoIdInsumo: pin },
        select: { id: true },
      });
      if (!existente) throw Object.assign(new Error('NO_EXISTE_VINCULO'), { code: 'NOT_FOUND_LINK' });

      const registro = await tx.productoInsumo.update({
        where: { id: existente.id },
        data: { cantidad: cant },
      });

      // 3) Recalcular total SOLO del producto afectado
      const sumResult = await tx.productoInsumo.aggregate({
        where: { productoId: pid },
        _sum: { cantidad: true },
      });
      const totalFloat = Number(sumResult._sum.cantidad ?? 0);
      //const totalInt = Math.trunc(totalFloat);

      // Sincronizar campo producto.insumo
      await tx.producto.update({
        where: { id: pid },
        data: { insumo: totalFloat },
      });

      return {
        registro,
        cantidadPar: Number(registro.cantidad ?? 0),
        totalProducto: totalFloat,
      };
    });

    return res.status(200).json({
      message: 'Cantidad de insumo actualizada para el producto',
      nuevaCantidadRelacion: result.cantidadPar,    // cantidad final del par (productoId, productoIdInsumo)
      totalInsumosProducto: result.totalProducto,   // total SOLO del productoId
      insumo: bigintToString(result.registro),      // registro actualizado de la tabla puente
    });
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND_PADRE') return res.status(404).json({ message: 'El producto padre no existe' });
    if (error?.code === 'NOT_FOUND_INSUMO') return res.status(404).json({ message: 'El producto insumo no existe' });
    if (error?.code === 'NOT_FOUND_LINK') return res.status(404).json({ message: 'No existe ese productoInsumo' });
    if (error?.code === 'P2003') {
      return res.status(400).json({
        message: 'Violación de llave foránea. Verifica que productoId y productoIdInsumo existan.',
        constraint: error?.meta?.constraint,
      });
    }
    console.error('Error al actualizar cantidad de insumo:', error);
    return next(error);
  }
};


export const eliminarProductoInsumo: RequestHandler = async (req, res, next) => {
  try {
    const body = (req && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const productoIdRaw =
      body.productoId ?? body.producto_id ?? body.idProducto ?? body.id_producto ?? body.producto ?? null;
    const productoIdInsumoRaw =
      body.productoIdInsumo ?? body.producto_id_insumo ?? body.insumoId ?? body.idInsumo ?? body.id_insumo ?? null;

    if (productoIdRaw == null || productoIdInsumoRaw == null) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    const parseBig = (v: unknown) => {
      if (typeof v === 'bigint') return v;
      if (typeof v === 'number') return BigInt(Math.trunc(v));
      if (typeof v === 'string' && v.trim() !== '' && /^-?\d+$/u.test(v.trim())) return BigInt(v.trim());
      throw new Error('ID inválido');
    };

    let pid: bigint, pin: bigint;
    try {
      pid = parseBig(productoIdRaw);
      pin = parseBig(productoIdInsumoRaw);
    } catch {
      return res.status(400).json({ message: 'IDs inválidos. Deben ser enteros.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Leemos la cantidad actual del vínculo para reportarla
      const vinculo = await tx.productoInsumo.findFirst({
        where: { productoId: pid, productoIdInsumo: pin },
        select: { id: true, cantidad: true },
      });

      if (!vinculo) {
        throw new Error('No existe ese productoInsumo');
      }

      const deleted = await tx.productoInsumo.deleteMany({
        where: { productoId: pid, productoIdInsumo: pin },
      });

      // Recalcular total SOLO del producto afectado
      const sumResult = await tx.productoInsumo.aggregate({
        where: { productoId: pid },
        _sum: { cantidad: true },
      });
      const totalFloat = Number(sumResult._sum.cantidad ?? 0);
      //const totalInt = Math.trunc(totalFloat);

      await tx.producto.update({
        where: { id: pid },
        data: { insumo: totalFloat },
      });

      return {
        cantidadEliminada: Number(vinculo.cantidad ?? 0),
        totalProducto: totalFloat,
      };
    });

    return res.status(200).json({
      message: 'Insumo eliminado del producto',
      cantidadEliminadaRelacion: result.cantidadEliminada, // ← lo que tenía ese par
      totalInsumosProducto: result.totalProducto,          // ← total SOLO del productoId
    });
  } catch (e: any) {
    if (String(e?.message || '').includes('No existe ese productoInsumo')) {
      return res.status(404).json({ message: 'No existe ese productoInsumo' });
    }
    console.error(e);
    return next(e);
  }
};



// Obtener el total de insumos del producto
export const obtenerTotalInsumosProducto: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pid = BigInt(id);

    const sumResult = await prisma.productoInsumo.aggregate({
      where: { productoId: pid },
      _sum: { cantidad: true },
    });

    const total = Number(sumResult._sum.cantidad ?? 0);

    res.status(200).json({ total });
  } catch (e) {
    console.error(e);
    next(e);
  }
};
