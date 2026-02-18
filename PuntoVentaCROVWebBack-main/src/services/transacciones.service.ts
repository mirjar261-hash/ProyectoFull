import prisma from '../utils/prisma';

// ==========================================
// 1. INTERFACES Y TIPOS
// ==========================================

export interface ProductoIA {
  nombreProducto: string;
  cantidad: number;
}

export interface ProductoCompraIA {
  nombreProducto: string;
  cantidad: number;
  costo?: number; 
}

interface ItemVenta {
  producto: any;
  cantidad: number;
  precio: number;
  costo: number;
  importe: number;
  iva: number;
}

interface ItemCompra {
  producto: any;
  cantidad: number;
  costo: number;
  importe: number;
  iva: number;
}

export type RespuestaIA = 
  | { error: string; success?: never; mensaje?: never; datos?: never }
  | { success: boolean; mensaje: string; datos: any; error?: never };

// ==========================================
// 2. HELPERS GENERALES
// ==========================================

const obtenerUsuarioVendedor = async (sucursalId: number): Promise<number | null> => {
  const usuario = await prisma.usuario.findFirst({
    where: { sucursalId: sucursalId, activo: 1 },
    select: { id: true }
  });
  return usuario ? usuario.id : null;
};

// Helper para listar cajeros
export const obtenerCajerosDisponiblesIA = async (sucursalId: number) => {
  const cajeros = await prisma.usuario.findMany({
    where: { 
        sucursalId: Number(sucursalId), // Aseguramos que sea número
        activo: 1, 
        // Buscamos variantes comunes para no fallar por mayúsculas/minúsculas
        perfil: { in: ['Caja', 'caja', 'CAJA', 'Cajero', 'CAJERO'] } 
    },
    select: { id: true, nombre: true, apellidos: true, perfil: true }
  });
  
  // Retornamos formato limpio
  return cajeros.map(c => ({ 
      id: c.id, 
      nombre: `${c.nombre} ${c.apellidos || ''}`.trim(),
      perfil: c.perfil 
  }));
};
const buscarProductoInteligente = async (sucursalId: number, termino: string) => {
  let term = String(termino).trim();
  term = term.replace(/^(codigo|código|cod|sku|id|barras|producto|prod)\s*/i, "").trim();

  // 1. Exacta
  let producto = await prisma.producto.findFirst({
    where: { sucursalId, activo: 1, OR: [{ codigo: term }, { cod_barras: term }, { cod_del_fabricante: term }, { nombre: term }] }
  });
  if (producto) return producto;

  // 2. Parcial códigos
  producto = await prisma.producto.findFirst({
    where: { sucursalId, activo: 1, OR: [{ codigo: { contains: term } }, { cod_barras: { contains: term } }] }
  });
  if (producto) return producto;

  // 3. Parcial nombre
  return await prisma.producto.findFirst({
    where: { sucursalId, activo: 1, nombre: { contains: term } }
  });
};

// ==========================================
// 3. LÓGICA INTERNA DE BALANCE (CORE)
// ==========================================
const calcularBalanceCorteInterno = async (sucursalId: number, uid: number) => {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    
    const ultimoCorte = await prisma.corte_dia.findFirst({
         where: { sucursalId, id_usuario_entrega: uid, activo: 1 },
         orderBy: { fecha: 'desc' },
         select: { fecha: true }
    });
    const fechaBase = ultimoCorte?.fecha ?? hoyInicio; 

    const [ventas, gastos, retiros, fondos, inversiones, compras, devolVentas, devolCompras] = await Promise.all([
        prisma.venta.findMany({ 
            where: { sucursalId, id_usuario: uid, fecha: { gt: fechaBase }, activo: 1 },
            select: { efectivo: true, numdoc: true, fecha: true }
        }),
        prisma.gasto.findMany({ 
            where: { sucursalId, id_usuario: uid, fecha: { gt: fechaBase }, activo: 1 },
            select: { monto: true, descripcion: true, fecha: true }
        }),
        prisma.retiro.findMany({ 
            where: { sucursalId, id_usuario: uid, fecha: { gt: fechaBase }, activo: 1 },
            select: { monto: true, descripcion: true, fecha: true }
        }),
        prisma.inicio.findMany({ 
            where: { sucursalId, idusuariorecibe: uid, fecha: { gt: fechaBase }, activo: 1 },
            select: { monto: true, comentarios: true, fecha: true }
        }),
        prisma.inversion.findMany({ 
            where: { sucursalId, id_usuario: uid, fecha: { gt: fechaBase }, activo: 1 },
            select: { monto: true, descripcion: true, fecha: true }
        }),
        prisma.compra.findMany({ 
            where: { sucursalId, id_usuario: uid, fecha: { gt: fechaBase }, activo: 1, estado: 'CONTADO' }, 
            select: { total: true, numdoc: true, fecha: true }
        }),
        prisma.venta.findMany({ 
            where: { sucursalId, id_usuario_devolucion: uid, fecha_devolucion: { gt: fechaBase }, activo: 0 },
            select: { total: true, numdoc: true, fecha_devolucion: true }
        }),
        prisma.compra.findMany({ 
            where: { sucursalId, id_usuario_devolucion: uid, fecha_devolucion: { gt: fechaBase }, activo: 0 },
            select: { total: true, numdoc: true, fecha_devolucion: true }
        })
    ]);

    const sumVentas = ventas.reduce((s, i) => s + Number(i.efectivo || 0), 0);
    const sumFondos = fondos.reduce((s, i) => s + Number(i.monto || 0), 0);
    const sumInversiones = inversiones.reduce((s, i) => s + Number(i.monto || 0), 0);
    const sumDevolCompras = devolCompras.reduce((s, i) => s + Number(i.total || 0), 0);

    const sumGastos = gastos.reduce((s, i) => s + Number(i.monto || 0), 0);
    const sumRetiros = retiros.reduce((s, i) => s + Number(i.monto || 0), 0);
    const sumCompras = compras.reduce((s, i) => s + Number(i.total || 0), 0);
    const sumDevolVentas = devolVentas.reduce((s, i) => s + Number(i.total || 0), 0);

    const montoEsperado = (sumVentas + sumFondos + sumInversiones + sumDevolCompras) - 
                          (sumGastos + sumRetiros + sumCompras + sumDevolVentas);

    return {
        montoEsperado,
        data: { ventas, gastos, retiros, fondos, inversiones, compras, devolVentas, devolCompras }
    };
};

// ==========================================
// 4. FUNCIÓN: PROCESAR VENTA (HÍBRIDA)
// ==========================================
export const procesarVentaIA = async (
  sucursalId: number,
  nombreCliente: string,
  productosSolicitados: ProductoIA[],
  usuarioVendedorId?: number // <--- AHORA ES OPCIONAL (Para pruebas o override)
): Promise<RespuestaIA> => {
  
  let idFinal = usuarioVendedorId;

  // Si NO envían ID, usamos el default (el primero activo)
  if (!idFinal) {
      idFinal = await obtenerUsuarioVendedor(sucursalId) as number;
      if (!idFinal) return { error: `No encontré ningún usuario activo por defecto en la Sucursal ${sucursalId}.` };
  }

  // Validamos que el ID (sea manual o automático) exista y sea válido
  const vendedor = await prisma.usuario.findFirst({
    where: { id: idFinal, sucursalId, activo: 1 }
  });

  if (!vendedor) return { error: `El usuario con ID ${idFinal} no es válido o no está activo.` };

  // Buscar Cliente
  let cliente = await prisma.cliente.findFirst({
    where: { sucursalId, razon_social: { contains: nombreCliente }, activo: 1 },
  });

  if (!cliente) {
    cliente = await prisma.cliente.findUnique({ where: { id: 1 } });
    if (!cliente) return { error: `No encontré al cliente "${nombreCliente}" y no existe el cliente genérico ID 1.` };
  }

  const detallesVenta: any[] = []; 
  let subtotalGeneral = 0;
  let ivaGeneral = 0;
  let totalGeneral = 0;
  let itemsTotales = 0;

  for (const item of productosSolicitados) {
    const producto = await buscarProductoInteligente(sucursalId, item.nombreProducto);

    if (!producto) {
        const termLimpio = item.nombreProducto.replace(/^(codigo|código|cod|sku|id|barras|producto)\s*/i, "").trim();
        return { error: `No encontré el producto "${item.nombreProducto}" (busqué: "${termLimpio}").` };
    }

    if (producto.servicio !== 1 && Number(producto.cantidad_existencia) < item.cantidad) {
      return { error: `Stock insuficiente para "${producto.nombre}". Tienes: ${producto.cantidad_existencia}, Pides: ${item.cantidad}` };
    }

    const cantidad = item.cantidad;
    const precio = Number(producto.precio1 || 0);
    const costo = Number(producto.costo || 0);
    const importe = precio * cantidad;
    const base = importe / 1.16; 
    const iva = importe - base;

    subtotalGeneral += base;
    ivaGeneral += iva;
    totalGeneral += importe;
    itemsTotales += cantidad;

    detallesVenta.push({ producto, cantidad, precio, costo, importe, iva });
  }

  const currentYear = new Date().getFullYear();
  const lastVenta = await prisma.venta.findFirst({ where: { sucursalId }, orderBy: { id: 'desc' } });
  
  let consecutivo = 1;
  if (lastVenta && lastVenta.numdoc) {
      const parts = lastVenta.numdoc.split('-');
      if (parts.length >= 2 && !isNaN(Number(parts[1]))) consecutivo = Number(parts[1]) + 1;
  }
  const folio = `VV-${String(consecutivo).padStart(5, '0')}-${currentYear}`;

  try {
    const resultado = await prisma.$transaction(async (tx: any) => {
      const venta = await tx.venta.create({
        data: {
          numdoc: folio,
          sucursal: { connect: { id: sucursalId } }, 
          cliente: { connect: { id: cliente!.id } },  
          fecha: new Date(),
          
          subtotal: subtotalGeneral,
          iva: ivaGeneral,
          total: totalGeneral,

          // --- CORRECCIÓN EFECTIVO ---
          efectivo: totalGeneral, 
          tarjeta: 0,
          transferencia: 0,
          cheque: 0,
          vale: 0,

          numitems: itemsTotales,
          estado: 'CONTADO',
          activo: 1,
          usuario: { connect: { id: vendedor.id } } // Usamos el ID final (manual o auto)
        },
      });

      for (const det of detallesVenta) {
        await tx.detalle_venta.create({
          data: {
            venta: { connect: { id: venta.id } },          
            producto: { connect: { id: det.producto.id } }, 
            cantidad: det.cantidad,
            precio: det.precio,
            costo: det.costo,
            total: det.importe,
            activo: 1,
          },
        });

        if (det.producto.servicio !== 1) {
          await tx.producto.update({
            where: { id: det.producto.id },
            data: { cantidad_existencia: { decrement: det.cantidad } },
          });

          await tx.inventario_esa.create({
            data: {
              producto: { connect: { id: det.producto.id } }, 
              sucursal: { connect: { id: sucursalId } },
              usuario: { connect: { id: vendedor.id } },
              comentario: `Venta Gerente IA ${folio}`,
              tipo_esa: 'VENTA',
              cantidad: det.cantidad,
              cantidad_antigua: det.producto.cantidad_existencia,
              fecha: new Date(),
              costo: det.costo 
            }
          });
        }
      }
      return venta;
    });

    return { 
      success: true, 
      mensaje: `✅ Venta registrada.\n📄 Folio: ${folio}\n👤 Atendió: ${vendedor.nombre}\n💰 Total: $${totalGeneral.toFixed(2)} (Efectivo)`,
      datos: resultado 
    };

  } catch (error) {
    console.error("Error Transaction Venta:", error);
    return { error: `Error técnico al guardar venta: ${error}` };
  }
};

// ==========================================
// 5. FUNCIÓN: PROCESAR COMPRA
// ==========================================
export const procesarCompraIA = async (
  sucursalId: number,
  nombreProveedor: string,
  productosSolicitados: ProductoCompraIA[]
): Promise<RespuestaIA> => {
  
  const usuarioId = await obtenerUsuarioVendedor(sucursalId);
  if (!usuarioId) return { error: `No encontré usuario activo en la Sucursal ${sucursalId}.` };

  const proveedor = await prisma.proveedor.findFirst({
    where: { sucursalId, razon_social: { contains: nombreProveedor }, activo: 1 },
  });
  
  if (!proveedor) return { error: `No encontré al proveedor "${nombreProveedor}".` };

  const detallesCompra: any[] = [];
  let subtotalGeneral = 0;
  let ivaGeneral = 0;
  let totalGeneral = 0;
  let itemsTotales = 0;

  for (const item of productosSolicitados) {
    const producto = await buscarProductoInteligente(sucursalId, item.nombreProducto);
    if (!producto) return { error: `El producto "${item.nombreProducto}" no existe.` };

    const cantidad = item.cantidad;
    const costoUnitario = item.costo !== undefined ? item.costo : Number(producto.costo || 0); 
    
    if (costoUnitario <= 0) {
        return { error: `El producto "${producto.nombre}" tiene costo $0.00. Necesito que me indiques el costo.` };
    }

    const importe = costoUnitario * cantidad;
    const base = importe / 1.16; 
    const iva = importe - base;

    subtotalGeneral += base;
    ivaGeneral += iva;
    totalGeneral += importe;
    itemsTotales += cantidad;

    detallesCompra.push({ producto, cantidad, costo: costoUnitario, importe, iva });
  }

  const currentYear = new Date().getFullYear();
  const lastCompra = await prisma.compra.findFirst({ where: { sucursalId }, orderBy: { id: 'desc' } });
  
  let consecutivo = 1;
  if (lastCompra && lastCompra.numdoc) {
      const parts = lastCompra.numdoc.split('-');
      if (parts.length >= 2 && !isNaN(Number(parts[1]))) consecutivo = Number(parts[1]) + 1;
  }
  const folio = `CV-${String(consecutivo).padStart(5, '0')}-${currentYear}`;

  try {
    const resultado = await prisma.$transaction(async (tx: any) => {
      const compra = await tx.compra.create({
        data: {
          numdoc: folio,
          sucursal: { connect: { id: sucursalId } },
          proveedor: { connect: { id: proveedor.id } },
          usuarioCompra: { connect: { id: usuarioId } },
          fecha: new Date(),
          subtotal: subtotalGeneral,
          iva: ivaGeneral,
          impuestos: ivaGeneral,
          ieps: 0, 
          total: totalGeneral,
          numitems: itemsTotales,
          estado: 'CONTADO',
          activo: 1,
          saldo_pendiente: 0,
          observaciones: "Compra registrada por IA"
        },
      });

      for (const det of detallesCompra) {
        await tx.detalle_compra.create({
          data: {
            compra: { connect: { id: compra.id } },
            producto: { connect: { id: det.producto.id } },
            cantidad: det.cantidad,
            importe: det.importe,
            iva: det.iva, 
            descuento: 0,
            activo: 1,
            cantidad_existente: Number(det.producto.cantidad_existencia),
            ieps: 0
          },
        });

        if (det.producto.servicio !== 1) {
          const dataUpdate: any = { cantidad_existencia: { increment: det.cantidad } };
          if (Number(det.producto.costo) !== det.costo) {
              dataUpdate.costo = det.costo;
          }
          await tx.producto.update({
            where: { id: det.producto.id },
            data: dataUpdate,
          });

          await tx.inventario_esa.create({
            data: {
              producto: { connect: { id: det.producto.id } },
              sucursal: { connect: { id: sucursalId } },
              usuario: { connect: { id: usuarioId } },
              comentario: `Compra IA ${folio}`,
              tipo_esa: 'ENTRADA',
              cantidad: det.cantidad,
              cantidad_antigua: det.producto.cantidad_existencia,
              fecha: new Date(),
              costo: det.costo
            }
          });
        }
      }
      return compra;
    });

    return { 
      success: true, 
      mensaje: `✅ Compra registrada.\n📄 Folio: ${folio}\n💰 Total: $${totalGeneral.toFixed(2)}`,
      datos: resultado 
    };

  } catch (error) {
    console.error("Error Transaction Compra:", error);
    return { error: `Error técnico al guardar compra: ${error}` };
  }
};

// ==========================================
// 6. FUNCIÓN: BUSCAR USUARIOS PENDIENTES
// ==========================================
export const obtenerUsuariosPendientesDeCorte = async (sucursalId: number) => {
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 999);
  
  const ventas = await prisma.venta.findMany({
    where: { sucursalId, fecha: { gte: hoyInicio, lte: hoyFin }, activo: 1 },
    select: { id_usuario: true }, distinct: ['id_usuario']
  });
  const gastos = await prisma.gasto.findMany({
    where: { sucursalId, fecha: { gte: hoyInicio, lte: hoyFin }, activo: 1 },
    select: { id_usuario: true }, distinct: ['id_usuario']
  });
  const retiros = await prisma.retiro.findMany({
    where: { sucursalId, fecha: { gte: hoyInicio, lte: hoyFin }, activo: 1 },
    select: { id_usuario: true }, distinct: ['id_usuario']
  });

  const idsUnicos = new Set([
      ...ventas.map((v: any) => v.id_usuario),
      ...gastos.map((g: any) => g.id_usuario),
      ...retiros.map((r: any) => r.id_usuario)
  ].filter(id => id !== null));

  if (idsUnicos.size === 0) return [];

  const usuarios = await prisma.usuario.findMany({
      where: { id: { in: Array.from(idsUnicos) as number[] }, activo: 1 },
      select: { id: true, nombre: true, apellidos: true, perfil: true } 
  });

  return usuarios.map(u => ({
    id: u.id,
    nombre: `${u.nombre} ${u.apellidos}`,
    rol: u.perfil 
  }));
};

// ==========================================
// 7. SIMULAR CORTE
// ==========================================
export const simularCorteDiaIA = async (
    sucursalId: number,
    usuarioObjetivoId: number | 'TODOS'
): Promise<RespuestaIA> => {
    
    let usuariosAProcesar: number[] = [];
    if (usuarioObjetivoId === 'TODOS') {
        const lista = await obtenerUsuariosPendientesDeCorte(sucursalId);
        usuariosAProcesar = lista.map(u => u.id).filter(id => typeof id === 'number');
    } else {
        const idNum = Number(usuarioObjetivoId);
        if (!isNaN(idNum) && idNum > 0) usuariosAProcesar = [idNum];
        else return { error: "ID de usuario inválido." };
    }

    if (usuariosAProcesar.length === 0) return { error: "No hay movimientos pendientes para corte hoy." };

    let reporte = "";

    for (const uid of usuariosAProcesar) {
        const usuario = await prisma.usuario.findUnique({ where: { id: uid } });
        if (!usuario) continue;

        const calculo = await calcularBalanceCorteInterno(sucursalId, uid);
        
        reporte += `\n👤 **${usuario.nombre}**: El sistema calcula **$${calculo.montoEsperado.toFixed(2)}**.\n`;
    }

    return { 
        success: true, 
        mensaje: `${reporte}\n⚠️ **¿Es correcto?** Confírmame el monto real en efectivo para guardarlo.`,
        datos: { esSimulacion: true }
    };
};

// ==========================================
// 8. EJECUTAR CORTE
// ==========================================
export const realizarCorteDiaIA = async (
  sucursalId: number,
  usuarioSolicitanteId: number,
  usuarioObjetivoId: number | 'TODOS',
  montoManual?: number 
): Promise<RespuestaIA> => {
  
  let usuariosAProcesar: number[] = [];
  if (usuarioObjetivoId === 'TODOS') {
    const lista = await obtenerUsuariosPendientesDeCorte(sucursalId);
    usuariosAProcesar = lista.map(u => u.id).filter(id => typeof id === 'number');
  } else {
    const idNum = Number(usuarioObjetivoId);
    if (!isNaN(idNum) && idNum > 0) usuariosAProcesar = [idNum];
    else return { error: "ID de usuario inválido." };
  }

  if (usuariosAProcesar.length === 0) return { error: "No hay usuarios pendientes." };

  const resultados: string[] = [];

  try {
    await prisma.$transaction(async (tx: any) => {
      for (const uid of usuariosAProcesar) {
        const usuario = await tx.usuario.findUnique({ where: { id: uid } });
        if (!usuario) continue;

        // 1. Re-Calcular
        const calculo = await calcularBalanceCorteInterno(sucursalId, uid);
        const { montoEsperado, data } = calculo;

        const montoFinalAReportar = montoManual !== undefined ? montoManual : montoEsperado;
        const diferencia = montoFinalAReportar - montoEsperado;
        let estadoStr = "Cuadrado";
        if (diferencia > 0) estadoStr = `Sobrante (+$${diferencia.toFixed(2)})`;
        if (diferencia < 0) estadoStr = `Faltante (-$${Math.abs(diferencia).toFixed(2)})`;

        // 2. Guardar Encabezado
        const nuevoCorte = await tx.corte_dia.create({
          data: {
            sucursal: { connect: { id: sucursalId } },
            usuarioEntrega: { connect: { id: uid } },
            usuarioRecibe: { connect: { id: usuarioSolicitanteId } },
            fecha: new Date(),
            monto_esperado: montoEsperado,
            monto_reportado: montoFinalAReportar, 
            comentarios: `Corte IA: ${estadoStr}. Sistema: $${montoEsperado.toFixed(2)} | Real: $${montoFinalAReportar.toFixed(2)}`,
            activo: 1
          }
        });

        // 3. Guardar Detalles
        const guardar = async (lista: any[], tipo: string, keyMonto: string, keyComent: string, keyFecha: string) => {
            for (const item of lista) {
                 await tx.corte_dia_detalle.create({
                    data: { 
                        corte: { connect: { id: nuevoCorte.id } }, 
                        tipo: tipo, 
                        monto: Number(item[keyMonto]), 
                        comentarios: item[keyComent] || "", 
                        fecha: item[keyFecha], 
                        activo: 1 
                    }
                 });
            }
        };

        await guardar(data.fondos, "Fondo de caja", "monto", "comentarios", "fecha");
        await guardar(data.ventas, "Venta", "efectivo", "numdoc", "fecha");
        await guardar(data.inversiones, "Inversión", "monto", "descripcion", "fecha");
        await guardar(data.devolCompras, "Devolución de compra", "total", "numdoc", "fecha_devolucion");
        
        await guardar(data.gastos, "Gasto", "monto", "descripcion", "fecha");
        await guardar(data.retiros, "Retiro", "monto", "descripcion", "fecha");
        await guardar(data.compras, "Compra", "total", "numdoc", "fecha");
        await guardar(data.devolVentas, "Devolución de venta", "total", "numdoc", "fecha_devolucion");

        resultados.push(`${usuario.nombre}: Guardado $${montoFinalAReportar.toFixed(2)} (${estadoStr})`);
      }
    });

    return {
      success: true,
      mensaje: `✅ **Corte Guardado**\n${resultados.join('\n')}`,
      datos: { cortes_generados: usuariosAProcesar.length }
    };

  } catch (error) {
    console.error("Error Corte Dia IA:", error);
    return { error: `Error al procesar el corte: ${error}` };
  }
};

// ==========================================
// 9. FUNCIÓN: PROCESAR DEVOLUCIÓN
// ==========================================
export const procesarDevolucionIA = async (
    sucursalId: number,
    folio: string,
    tipo: 'VENTA' | 'COMPRA',
    modo: 'COMPLETA' | 'PARCIAL',
    productosADevolver: { nombreProducto: string, cantidad: number }[]
): Promise<RespuestaIA> => {
    
    const usuarioId = await obtenerUsuarioVendedor(sucursalId);
    if (!usuarioId) return { error: "No hay usuario activo." };

    try {
        if (tipo === 'VENTA') {
            const venta = await prisma.venta.findFirst({
                where: { sucursalId, numdoc: folio, activo: 1 },
                include: { detalles: { include: { producto: true } } }
            });

            if (!venta) return { error: `No encontré la venta activa ${folio}.` };

            return await prisma.$transaction(async (tx: any) => {
                let montoDevolucion = 0;
                let ivaDevolucion = 0;

                if (modo === 'COMPLETA') {
                    await tx.venta.update({
                        where: { id: venta.id },
                        data: { activo: 0, fecha_devolucion: new Date(), estado: 'DEVUELTO' }
                    });

                    for (const det of venta.detalles) {
                        if (det.producto.servicio !== 1) {
                            await tx.producto.update({
                                where: { id: det.producto.id },
                                data: { cantidad_existencia: { increment: det.cantidad } }
                            });

                            await tx.inventario_esa.create({
                                data: {
                                    producto: { connect: { id: det.producto.id } },
                                    sucursal: { connect: { id: sucursalId } },
                                    usuario: { connect: { id: usuarioId } },
                                    comentario: `Devolución Completa ${folio}`,
                                    tipo_esa: 'ENTRADA',
                                    cantidad: det.cantidad,
                                    cantidad_antigua: det.producto.cantidad_existencia,
                                    fecha: new Date(),
                                    costo: det.producto.costo
                                }
                            });
                        }
                        await tx.detalle_venta.update({ where: { id: det.id }, data: { activo: 0, fecha_devolucion: new Date() } });
                        montoDevolucion += Number(det.total);
                    }

                } else { 
                    for (const prodReq of productosADevolver) {
                        const termino = String(prodReq.nombreProducto).trim().replace(/^(codigo|código|cod|sku|id|barras|producto)\s*/i, "").toLowerCase();
                        
                        const detalle = venta.detalles.find((d: any) => {
                            const pNombre = d.producto.nombre ? d.producto.nombre.toLowerCase() : "";
                            const pCodigo = d.producto.codigo ? String(d.producto.codigo).toLowerCase() : "";
                            const pBarras = d.producto.cod_barras ? String(d.producto.cod_barras).toLowerCase() : "";
                            return pNombre.includes(termino) || pCodigo === termino || pBarras === termino;
                        });
                        
                        if (!detalle) throw new Error(`El producto ${prodReq.nombreProducto} no se encuentra en esta venta.`);
                        if (detalle.activo === 0) throw new Error(`El producto ${detalle.producto.nombre} ya fue devuelto.`);
                        if (prodReq.cantidad > detalle.cantidad) throw new Error(`No puedes devolver ${prodReq.cantidad} unidades, solo se vendieron ${detalle.cantidad}.`);

                        if (detalle.producto.servicio !== 1) {
                            await tx.producto.update({
                                where: { id: detalle.producto.id },
                                data: { cantidad_existencia: { increment: prodReq.cantidad } }
                            });
                            
                            await tx.inventario_esa.create({
                                data: {
                                    producto: { connect: { id: detalle.producto.id } },
                                    sucursal: { connect: { id: sucursalId } },
                                    usuario: { connect: { id: usuarioId } },
                                    comentario: `Dev. Parcial ${folio}`,
                                    tipo_esa: 'ENTRADA',
                                    cantidad: prodReq.cantidad,
                                    cantidad_antigua: detalle.producto.cantidad_existencia,
                                    fecha: new Date(),
                                    costo: detalle.producto.costo
                                }
                            });
                        }

                        const precioUnitario = Number(detalle.total) / Number(detalle.cantidad);
                        const montoItem = precioUnitario * prodReq.cantidad;
                        const baseItem = montoItem / 1.16;
                        const ivaItem = montoItem - baseItem;

                        montoDevolucion += montoItem;
                        ivaDevolucion += ivaItem;

                        await tx.detalle_venta.update({
                            where: { id: detalle.id },
                            data: { 
                                fecha_devolucion: new Date(), 
                                cantidad: { decrement: prodReq.cantidad },
                                total: { decrement: montoItem }
                            }
                        });
                    }
                    
                    await tx.venta.update({
                        where: { id: venta.id },
                        data: { 
                            total: { decrement: montoDevolucion }, 
                            subtotal: { decrement: (montoDevolucion - ivaDevolucion) },
                            iva: { decrement: ivaDevolucion }
                        }
                    });
                }

                return { 
                    success: true, 
                    mensaje: `Devolución ${modo} procesada para ${folio}. Monto devuelto: $${montoDevolucion.toFixed(2)}`, 
                    datos: {} 
                };
            });
        } 
        
        else if (tipo === 'COMPRA') {
             if (modo === 'PARCIAL') return { error: "Para compras solo se permite cancelación completa." };

             const compra = await prisma.compra.findFirst({
                where: { sucursalId, numdoc: folio, activo: 1 },
                include: { detalles: { include: { producto: true } } }
             });

             if (!compra) return { error: `No encontré la compra activa ${folio}.` };

             return await prisma.$transaction(async (tx: any) => {
                let montoDevolucion = 0;

                await tx.compra.update({ 
                    where: { id: compra.id }, 
                    data: { activo: 0, observaciones: `CANCELADA ${new Date().toLocaleDateString()}` } 
                });

                for (const det of compra.detalles) {
                    if (det.producto.servicio !== 1) {
                        await tx.producto.update({ 
                            where: { id: det.producto.id }, 
                            data: { cantidad_existencia: { decrement: det.cantidad } } 
                        });
                        
                        await tx.inventario_esa.create({
                            data: {
                                producto: { connect: { id: det.producto.id } },
                                sucursal: { connect: { id: sucursalId } },
                                usuario: { connect: { id: usuarioId } },
                                comentario: `Dev. Compra ${folio}`,
                                tipo_esa: 'SALIDA', 
                                cantidad: det.cantidad,
                                cantidad_antigua: det.producto.cantidad_existencia,
                                fecha: new Date(),
                                costo: det.producto.costo
                            }
                        });
                    }
                    await tx.detalle_compra.update({ where: { id: det.id }, data: { activo: 0 } });
                    montoDevolucion += Number(det.importe); 
                }

                return { 
                    success: true, 
                    mensaje: `Cancelación de Compra ${folio}. Monto: $${montoDevolucion.toFixed(2)}`, 
                    datos: {} 
                };
             });
        }

        return { error: "Tipo de transacción inválido." };

    } catch (error: any) {
        console.error("Error Devolución:", error);
        return { error: error.message || "Error interno." };
    }
};