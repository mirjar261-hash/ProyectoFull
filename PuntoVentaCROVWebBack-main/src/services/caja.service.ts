import prisma from '../utils/prisma';
// Importamos el Enum real generado por tu Prisma Client
import { CxcMetodoPago } from '@prisma/client';

const getCurrentDate = () => new Date();

// ==========================================
// HELPERS (Buscadores e Intérpretes)
// ==========================================

const resolverUsuario = async (identificador: string | number, sucursalId: number) => {
  if (!identificador) return null;
  const idNumerico = Number(identificador);
  
  if (!isNaN(idNumerico) && idNumerico > 0) {
    return prisma.usuario.findUnique({ where: { id: idNumerico } });
  }
  
  const texto = String(identificador).trim();
  
  return prisma.usuario.findFirst({
    where: {
      sucursalId: Number(sucursalId),
      OR: [
          { nombre: { contains: texto } },
          { correo: { contains: texto } } 
      ],
      activo: 1
    }
  });
};

const resolverVentaCredito = async (identificador: string | number, sucursalId: number) => {
  if (!identificador) return null;
  const termino = String(identificador).trim();
  const esNumero = !isNaN(Number(termino));

  return prisma.venta.findFirst({
    where: {
      sucursalId: Number(sucursalId),
      estado: 'CREDITO', 
      activo: 1,
      OR: [
        ...(esNumero ? [{ id: Number(termino) }] : []),
        { numdoc: { contains: termino } }
      ]
    },
    include: {
      cliente: { select: { id: true, razon_social: true } }
    }
  });
};

// CORREGIDO: Ajustado a los ENUMS reales de tu BD (EFECTIVO, TARJETA)
const interpretarMetodoPago = (texto: string): CxcMetodoPago => {
  const t = texto.toLowerCase().trim();
  
  // Si mencionan tarjeta, débito o crédito -> TARJETA
  if (t.includes('tarjeta') || t.includes('débito') || t.includes('credito') || t.includes('crédito')) {
      return CxcMetodoPago.TARJETA;
  }
  
  if (t.includes('transf') || t.includes('spei')) {
      // Como no existe TRANSFERENCIA en tu enum, usamos TARJETA (bancario)
      return CxcMetodoPago.TARJETA; 
  }

  // Default: EFECTIVO
  return CxcMetodoPago.EFECTIVO; 
};


// ==========================================
// FUNCIONES DE CAJA (GASTOS, RETIROS, CORTES)
// ==========================================

export const registrarGastoIA = async (sucursalId: number, usuarioIdentificador: string | number, monto: number, descripcion: string) => {
  try {
    if (monto <= 0) return { error: "El monto debe ser mayor a 0." };
    const usuario = await resolverUsuario(usuarioIdentificador, sucursalId);
    if (!usuario) return { error: `No ubico al usuario '${usuarioIdentificador}'.` };

    await prisma.gasto.create({
      data: { sucursalId: Number(sucursalId), id_usuario: usuario.id, monto: Number(monto), descripcion, fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Gasto registrado: $${monto} (${descripcion}) - ${usuario.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al registrar gasto." }; }
};

export const registrarRetiroIA = async (sucursalId: number, usuarioIdentificador: string | number, monto: number, descripcion: string) => {
  try {
    if (monto <= 0) return { error: "Monto inválido." };
    const usuario = await resolverUsuario(usuarioIdentificador, sucursalId);
    if (!usuario) return { error: `Usuario '${usuarioIdentificador}' no encontrado.` };

    await prisma.retiro.create({
      data: { sucursalId: Number(sucursalId), id_usuario: usuario.id, monto: Number(monto), descripcion, fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Retiro registrado: $${monto} (${descripcion}) - ${usuario.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al registrar retiro." }; }
};

export const registrarFondoCajaIA = async (sucursalId: number, monto: number, idAdminEntrega: number, cajeroIdentificador: string | number) => {
  try {
    if (monto <= 0) return { error: "Monto inválido." };
    const admin = await prisma.usuario.findUnique({ where: { id: Number(idAdminEntrega) }});
    if (!admin) return { error: "No se identificó quién entrega." };
    const cajero = await resolverUsuario(cajeroIdentificador, sucursalId);
    if (!cajero) return { error: `No encontré al cajero '${cajeroIdentificador}'.` };

    await prisma.inicio.create({
      data: { sucursalId: Number(sucursalId), idusuarioentrega: admin.id, idusuariorecibe: cajero.id, monto: Number(monto), fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Fondo asignado: $${monto} a ${cajero.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al asignar fondo." }; }
};

export const registrarInversionIA = async (sucursalId: number, monto: number, descripcion: string, usuarioInversionistaId: number) => {
  try {
    if (monto <= 0) return { error: "Monto inválido." };
    const existe = await prisma.usuario.findUnique({ where: { id: Number(usuarioInversionistaId) }});
    if (!existe) return { error: "Inversionista no encontrado." };

    await prisma.inversion.create({
      data: { sucursalId: Number(sucursalId), id_usuario: Number(usuarioInversionistaId), id_usuario_creacion: Number(usuarioInversionistaId), monto: Number(monto), descripcion: descripcion || "Inversión", fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Inversión registrada: $${monto} por ${existe.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al guardar inversión." }; }
};

export const obtenerHistorialCortesIA = async (sucursalId: number, fechaInicio?: string | Date, fechaFin?: string | Date) => {
  try {
    const fin = fechaFin ? new Date(fechaFin) : new Date();
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date();
    fin.setHours(23, 59, 59, 999);
    if (!fechaInicio) { inicio.setMonth(inicio.getMonth() - 2); inicio.setHours(0, 0, 0, 0); }

    const cortes = await prisma.corte_dia.findMany({
      where: { sucursalId: Number(sucursalId), activo: 1, fecha: { gte: inicio, lte: fin } },
      include: { usuarioEntrega: { select: { nombre: true } }, usuarioRecibe: { select: { nombre: true } }, detalles: { where: { activo: 1 } } },
      orderBy: { fecha: 'desc' }
    });

    if (cortes.length === 0) return { success: false, mensaje: "No hay cortes en ese periodo." };
    return { success: true, mensaje: `Encontré ${cortes.length} cortes.`, datos: cortes };
  } catch (error) { console.error(error); return { error: "Error al consultar historial." }; }
};


// ==========================================
// NUEVAS FUNCIONES: CUENTAS POR COBRAR (CxC)
// ==========================================

// 1. LISTA DETALLADA DE VENTAS (POR FOLIO)
export const obtenerCreditosPendientesIA = async (sucursalId: number, nombreCliente?: string) => {
  try {
    const filtros: any = { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } };
    if (nombreCliente) filtros.cliente = { razon_social: { contains: nombreCliente } };

    const creditos = await prisma.venta.findMany({
      where: filtros,
      select: { id: true, numdoc: true, fecha: true, total: true, saldo_pendiente: true, cliente: { select: { razon_social: true } } },
      orderBy: { fecha: 'asc' }
    });

    if (creditos.length === 0) return { success: true, mensaje: "No hay créditos pendientes con esos criterios. 🎉" };
    return { success: true, mensaje: `Encontré ${creditos.length} ventas a crédito pendientes.`, datos: creditos };
  } catch (error) { console.error(error); return { error: "Error al consultar créditos." }; }
};

// 2. RESUMEN DE SALDOS POR CLIENTE (NUEVO REQUERIMIENTO)
export const obtenerSaldosPorClienteIA = async (sucursalId: number) => {
  try {
    // Buscamos todas las ventas con deuda
    const deudas = await prisma.venta.findMany({
      where: { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } },
      select: { saldo_pendiente: true, cliente: { select: { id: true, razon_social: true, telefono: true } } }
    });

    if (deudas.length === 0) return { success: true, mensaje: "No hay clientes con deuda pendiente. 🎉" };

    // Agrupamos en memoria (más flexible que groupBy raw para incluir nombres)
    const agrupado: Record<number, any> = {};
    
    deudas.forEach(d => {
        if (!d.cliente) return;
        if (!agrupado[d.cliente.id]) {
            agrupado[d.cliente.id] = {
                nombre: d.cliente.razon_social,
                telefono: d.cliente.telefono || '-',
                total_deuda: 0,
                conteo: 0
            };
        }
        agrupado[d.cliente.id].total_deuda += Number(d.saldo_pendiente);
        agrupado[d.cliente.id].conteo += 1;
    });

    // Convertimos a array y ordenamos por mayor deuda
    const lista = Object.values(agrupado).sort((a: any, b: any) => b.total_deuda - a.total_deuda);

    return { 
        success: true, 
        mensaje: `Hay ${lista.length} clientes con cuentas pendientes.`, 
        datos: lista 
    };

  } catch (error) { console.error(error); return { error: "Error al calcular saldos por cliente." }; }
};

export const registrarAbonoIA = async (
  sucursalId: number, 
  usuarioId: number, 
  ventaIdentificador: string | number, 
  monto: number, 
  metodoPagoTxt: string = 'EFECTIVO',
  comentarios: string = 'Abono vía Chatbot'
) => {
  try {
    if (monto <= 0) return { error: "El monto del abono debe ser mayor a 0." };

    const venta = await resolverVentaCredito(ventaIdentificador, sucursalId);
    if (!venta) return { error: `No encontré venta a crédito con folio/ID "${ventaIdentificador}".` };
    
    if (!venta.cliente) {
        return { error: "Datos corruptos: La venta no tiene cliente asignado." };
    }

    const saldoActual = Number(venta.saldo_pendiente);
    if (saldoActual <= 0) return { error: `La venta ${venta.numdoc} ya está pagada.` };
    if (monto > saldoActual) return { error: `El abono ($${monto}) excede la deuda ($${saldoActual}).` };

    const metodoPagoEnum = interpretarMetodoPago(metodoPagoTxt);
    const nuevoSaldo = saldoActual - monto;

    await prisma.$transaction(async (tx: any) => {
      await tx.cxc_cliente.create({
        data: {
          idsucursal: Number(sucursalId),
          idcliente: venta.cliente!.id, 
          idventa: venta.id,
          idusuariorecibe: Number(usuarioId),
          saldo_pendiente: nuevoSaldo,
          saldo_abonado: Number(monto),
          metodo_pago: metodoPagoEnum,
          fecha: getCurrentDate(),
          comentarios: comentarios,
          activo: 1
        }
      });
      await tx.venta.update({ where: { id: venta.id }, data: { saldo_pendiente: nuevoSaldo } });
    });

    const estadoFinal = nuevoSaldo === 0 ? "¡Deuda Liquidada! 🎉" : `Resta: $${nuevoSaldo.toFixed(2)}`;
    return { success: true, mensaje: `✅ Abono registrado a **${venta.numdoc}** (${venta.cliente.razon_social}).\n💰 Abonado: $${monto.toFixed(2)} (${metodoPagoEnum})\n📉 ${estadoFinal}` };

  } catch (error) { console.error("Error Abono:", error); return { error: "Ocurrió un error técnico al registrar el abono." }; }
};

export const consultarHistorialAbonosIA = async (sucursalId: number, ventaIdentificador: string | number) => {
  try {
    const venta = await resolverVentaCredito(ventaIdentificador, sucursalId);
    if (!venta) return { error: `No encontré crédito para "${ventaIdentificador}".` };
    
    if (!venta.cliente) return { error: "Datos corruptos: Venta sin cliente." };

    const abonos = await prisma.cxc_cliente.findMany({
      where: { idventa: venta.id, activo: 1, saldo_abonado: { gt: 0 } },
      orderBy: { fecha: 'desc' }
    });

    if (abonos.length === 0) return { success: true, mensaje: `La venta ${venta.numdoc} no tiene abonos registrados. Saldo: $${Number(venta.saldo_pendiente).toFixed(2)}` };
    
    return { 
        success: true, 
        mensaje: `Historial de abonos para ${venta.numdoc} (Cliente: ${venta.cliente.razon_social})`, 
        datos: abonos 
    };

  } catch (error) { console.error("Error Historial:", error); return { error: "Error al consultar historial." }; }
};