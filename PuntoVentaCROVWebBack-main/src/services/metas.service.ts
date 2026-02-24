import prisma from '../utils/prisma';

interface ResultadoMetas {
  metaMensual: number;
  metaSemanal: number;
  metaDiaria: number; 
  metaExtraordinaria: number;
  hayExtraordinaria: boolean;
  promedioHistorico: number;
  mesesAnalizados: number;
}


export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const validarSucursalId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export interface GerenteDashboardMetasResponse {
  success: boolean;
  data: {
    metas: ResultadoMetas;
    kpisDia: null;
    kpisSemana: null;
    kpisMes: null;
  };
}

// --- SERVICIO DE METAS FINANCIERAS 2.2 (HISTÓRICO COMPLETO INTELIGENTE) ---
export const calcularMetasFinancierasIA = async (sucursalId: number): Promise<ResultadoMetas> => {
  try {
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const [ventasHistoricas, gastosHistoricos, comprasHistoricas] = await Promise.all([
      prisma.venta.findMany({
        where: {
          sucursalId: Number(sucursalId),
          activo: 1,
          fecha: { lt: inicioMesActual }
        },
        select: { total: true, fecha: true }
      }),
      prisma.gasto.findMany({
        where: {
          sucursalId: Number(sucursalId),
          fecha: { lt: inicioMesActual }
        },
        select: { monto: true, fecha: true }
      }),
      prisma.compra.findMany({
        where: {
          sucursalId: Number(sucursalId),
          activo: 1,
          fecha: { lt: inicioMesActual }
        },
        select: { total: true, fecha: true }
      })
    ]);

    const utilidadPorMes: Record<string, number> = {};

    ventasHistoricas.forEach(v => {
      const mesKey = `${v.fecha.getFullYear()}-${String(v.fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!utilidadPorMes[mesKey]) utilidadPorMes[mesKey] = 0;
      utilidadPorMes[mesKey] += Number(v.total);
    });

    gastosHistoricos.forEach(g => {
      const mesKey = `${g.fecha.getFullYear()}-${String(g.fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!utilidadPorMes[mesKey]) utilidadPorMes[mesKey] = 0; 
      utilidadPorMes[mesKey] -= Number(g.monto);
    });

    comprasHistoricas.forEach(c => {
      const mesKey = `${c.fecha.getFullYear()}-${String(c.fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!utilidadPorMes[mesKey]) utilidadPorMes[mesKey] = 0;
      utilidadPorMes[mesKey] -= Number(c.total);
    });

    const utilidadesHistoricas = Object.values(utilidadPorMes).filter(u => u > 0);

    if (utilidadesHistoricas.length === 0) {
      return { metaMensual: 0, metaSemanal: 0, metaDiaria: 0, metaExtraordinaria: 0, hayExtraordinaria: false, promedioHistorico: 0, mesesAnalizados: 0 };
    }

    let metaMensual = 0;
    let metaExtraordinaria = 0;
    let hayExtraordinaria = false;

    const sumaTotal = utilidadesHistoricas.reduce((a, b) => a + b, 0);
    const promedioGeneral = sumaTotal / utilidadesHistoricas.length;

    const varianza = utilidadesHistoricas.reduce((sum, val) => sum + Math.pow(val - promedioGeneral, 2), 0) / utilidadesHistoricas.length;
    const desviacionEstandar = Math.sqrt(varianza);

    const umbralTope = promedioGeneral + desviacionEstandar;

    const mesesNormales = utilidadesHistoricas.filter(u => u <= umbralTope);
    const mesesGrandes = utilidadesHistoricas.filter(u => u > umbralTope);

    hayExtraordinaria = mesesGrandes.length > 0;

    if (mesesNormales.length > 0) {
        metaMensual = mesesNormales.reduce((a, b) => a + b, 0) / mesesNormales.length;
    } else {
        metaMensual = promedioGeneral;
    }

    metaExtraordinaria = promedioGeneral;

    const metaSemanal = metaMensual / 4.33; 
    const metaDiaria = metaSemanal / 6;

    return {
      metaMensual,
      metaSemanal,
      metaDiaria,
      metaExtraordinaria,
      hayExtraordinaria,
      promedioHistorico: metaMensual,
      mesesAnalizados: utilidadesHistoricas.length
    };

  } catch (error) {
    console.error("Error calcularMetasFinancierasIA:", error);
    return { metaMensual: 0, metaSemanal: 0, metaDiaria: 0, metaExtraordinaria: 0, hayExtraordinaria: false, promedioHistorico: 0, mesesAnalizados: 0 };
  }
};

export const calcularProductosBajaRotacion = async (sucursalId: number) => {
  try {
    const hoy = new Date();

    const productos = await prisma.producto.findMany({
      where: { sucursalId: Number(sucursalId), activo: 1 },
      include: {
        detalles_venta: {
          where: { venta: { activo: 1 } },
          // 👇 EL ARREGLO 1: Ordenamos por el ID del detalle para traer siempre el MÁS NUEVO
          orderBy: { id: 'desc' }, 
          take: 1,
          include: { venta: true }
        },
        detalles_compra: { 
          where: { compra: { activo: 1 } },
          // 👇 Igual aquí, garantizamos la compra más reciente
          orderBy: { id: 'desc' }, 
          take: 1,
          include: { compra: true }
        }
      }
    });

    const productosProcesados = productos.map((prod: any) => {
      const ultimaVenta = prod.detalles_venta?.[0]?.venta?.fecha || null;
      const ultimaCompra = prod.detalles_compra?.[0]?.compra?.fecha || null;

      let diasSinVenta = 0;
      if (ultimaVenta) {
        const diffTime = Math.abs(hoy.getTime() - new Date(ultimaVenta).getTime());
        diasSinVenta = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (ultimaCompra) {
        const diffTime = Math.abs(hoy.getTime() - new Date(ultimaCompra).getTime());
        diasSinVenta = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (Number(prod.cantidad_existencia || 0) > 0) {
        // 👇 EL ARREGLO 2: Los verdaderos estancados (Nunca se han vendido)
        diasSinVenta = 999; 
      }

      // Buscamos el precio de venta con los nombres posibles en tu esquema
      const pVenta = Number(prod.precio1 || 0);
      const existencia = Number(prod.cantidad_existencia || 0);
    
      return {
        id: Number(prod.id),
        nombre: prod.nombre,
        existencia,
        precioVenta: pVenta,
        valorEstancado: existencia * pVenta, 
        ultimaVenta,
        ultimaCompra,
        diasSinVenta
      };
    });

    productosProcesados.sort((a, b) => b.diasSinVenta - a.diasSinVenta);
    return productosProcesados;
  } catch (error) {
    console.error("🔴 ERROR EN PRISMA BAJA ROTACIÓN:", error);
    return [];
  }
};
export const calcularImpactoDevoluciones = async (sucursalId: number) => {
  try {
    const hoy = new Date();
    
    // 🌟 EL FILTRO EXACTO: Desde el día 1 del mes hasta HOY a las 23:59:59
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
    const hastaHoy = new Date(hoy.setHours(23, 59, 59, 999));

    // 1. 💰 BUSCAR EL DINERO DEVUELTO (Del día 1 a HOY)
    const devoluciones = await prisma.venta.aggregate({
      where: {
        sucursalId: Number(sucursalId),
        fecha: { gte: inicioMes, lte: hastaHoy }, // 👈 Aquí está la magia del rango
        activo: 0 
      },
      _sum: { total: true } 
    });

    const totalDevuelto = Number(devoluciones._sum.total || 0);

    const ventasBuenas = await prisma.venta.aggregate({
      where: { 
        sucursalId: Number(sucursalId), 
        fecha: { gte: inicioMes, lte: hastaHoy }, 
        activo: 1 
      },
      _sum: { total: true }
    });
    
    const gastos = await prisma.gasto.aggregate({
      where: { sucursalId: Number(sucursalId), fecha: { gte: inicioMes, lte: hastaHoy }, activo: 1 },
      _sum: { monto: true } 
    }).catch(() => ({ _sum: { monto: 0 } })); 

    const totalVentas = Number(ventasBuenas._sum.total || 0);
    const totalGastos = Number(gastos._sum.monto || 0);
    
    // Flujo de caja real en lo que va del mes
    const flujoCaja = totalVentas - totalGastos;

    // 3. 🧮 LA MATEMÁTICA
    let tasaDevolucion = 0;
    if (flujoCaja > 0) {
      tasaDevolucion = (totalDevuelto / flujoCaja) * 100;
    } else if (totalDevuelto > 0) {
      tasaDevolucion = 100; 
    }

    console.log(`🛠️ BACKEND DEVOLUCIONES | Rango: ${inicioMes.toLocaleDateString()} a ${hastaHoy.toLocaleDateString()} | Devuelto: $${totalDevuelto} | Flujo: $${flujoCaja}`);

    return {
      totalDevuelto,
      flujoCaja,
      tasaDevolucion
    };

  } catch (error) {
    console.error("🔴 ERROR CALCULANDO IMPACTO DE DEVOLUCIONES:", error);
    return { totalDevuelto: 0, flujoCaja: 0, tasaDevolucion: 0 };
  }
};

export const obtenerDashboardGerenteMetas = async (
  sucursalId: number,
): Promise<GerenteDashboardMetasResponse> => {
  const metas = await calcularMetasFinancierasIA(sucursalId);

  return {
    success: true,
    data: {
      metas,
      kpisDia: null,
      kpisSemana: null,
      kpisMes: null,
    },
  };
};


export const obtenerProductosBajaRotacionService = async (
  sucursalId: number,
): Promise<ServiceResponse<Awaited<ReturnType<typeof calcularProductosBajaRotacion>>>> => {
  const productos = await calcularProductosBajaRotacion(sucursalId);
  return { success: true, data: productos };
};

export const obtenerImpactoDevolucionesService = async (
  sucursalId: number,
): Promise<ServiceResponse<Awaited<ReturnType<typeof calcularImpactoDevoluciones>>>> => {
  const impacto = await calcularImpactoDevoluciones(sucursalId);
  return { success: true, data: impacto };
};


const startOfMonthsAgo = (monthsAgo: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
};

export const obtenerTopProductosUltimoMesService = async (sucursalId: number) => {
  const start = startOfMonthsAgo(1);
  const ventas = await prisma.detalle_venta.groupBy({
    by: ['id_producto'],
    _sum: { cantidad: true },
    where: {
      venta: { sucursalId, fecha: { gte: start }, activo: 1 },
      activo: 1,
    },
    orderBy: { _sum: { cantidad: 'desc' } },
    take: 10,
  });

  const productos = await prisma.producto.findMany({
    where: { id: { in: ventas.map((v) => v.id_producto) } },
    select: { id: true, nombre: true },
  });

  return ventas.map((v) => {
    const prod = productos.find((p) => p.id === v.id_producto);
    return {
      productoId: v.id_producto,
      nombre: prod?.nombre ?? '',
      cantidadVendida: v._sum.cantidad ?? 0,
    };
  });
};

export const obtenerTopClientesUltimoMesService = async (
  sucursalId: number,
  periodo: 'historico' | '1m' | '2m' = 'historico',
) => {
  const whereFecha =
    periodo === 'historico'
      ? undefined
      : { gte: startOfMonthsAgo(periodo === '2m' ? 2 : 1) };

  const ventas = await prisma.venta.groupBy({
    by: ['id_cliente'],
    _sum: { total: true },
    _count: { id: true },
    where: {
      sucursalId,
      ...(whereFecha ? { fecha: whereFecha } : {}),
      activo: 1,
      id_cliente: { not: null },
    },
    orderBy: { _sum: { total: 'desc' } },
    take: 10,
  });

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: ventas.map((v) => v.id_cliente as number) } },
    select: { id: true, razon_social: true },
  });

  return ventas.map((v) => {
    const cliente = clientes.find((c) => c.id === v.id_cliente);
    return {
      clienteId: v.id_cliente,
      nombre: cliente?.razon_social ?? '',
      compras: v._count.id ?? 0,
      totalVendido: v._sum.total ?? 0,
    };
  });
};
