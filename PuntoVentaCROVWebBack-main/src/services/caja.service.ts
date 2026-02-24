import prisma from '../utils/prisma';
import { CxcMetodoPago } from '@prisma/client';

const getCurrentDate = () => new Date();
const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

// ==========================================
// HELPERS
// ==========================================

const resolverUsuarioInteligente = async (identificador: string | number, sucursalId: number) => {
  if (!isNaN(Number(identificador))) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(identificador) }
    });
    if (usuario && usuario.sucursalId === Number(sucursalId) && usuario.activo === 1) {
      return usuario;
    }
  }

  const termino = String(identificador).toLowerCase().trim();
  
  const usuarios = await prisma.usuario.findMany({
    where: { sucursalId: Number(sucursalId), activo: 1 }
  });

  const encontrados = usuarios.filter(u => {
    const nombreCompleto = `${u.nombre} ${u.apellidos || ''}`.toLowerCase();
    const nombreSolo = u.nombre.toLowerCase();
    const apellidos = (u.apellidos || '').toLowerCase();

    return nombreCompleto.includes(termino) || 
           nombreSolo.includes(termino) || 
           (apellidos && apellidos.includes(termino));
  });

  if (encontrados.length > 1) return null;

  return encontrados.length === 1 ? encontrados[0] : null;
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
      cliente: { select: { id: true, razon_social: true, telefono: true } }
    }
  });
};

const interpretarMetodoPago = (texto: string): CxcMetodoPago => {
  const t = texto.toLowerCase().trim();
  if (t.includes('tarjeta') || t.includes('débito') || t.includes('credito') || t.includes('crédito')) {
      return CxcMetodoPago.TARJETA;
  }
  if (t.includes('transf') || t.includes('spei')) {
      return CxcMetodoPago.TARJETA; 
  }
  return CxcMetodoPago.EFECTIVO; 
};


// ==========================================
// FUNCIONES DE CAJA
// ==========================================

export const registrarGastoIA = async (sucursalId: number, usuarioIdentificador: string | number, monto: number, descripcion: string) => {
  try {
    if (monto <= 0) return { error: "El monto debe ser mayor a 0." };
    const usuario = await resolverUsuarioInteligente(usuarioIdentificador, sucursalId);
    if (!usuario) return { error: `No ubico al usuario '${usuarioIdentificador}' en esta sucursal jefe.` };

    await prisma.gasto.create({
      data: { sucursalId: Number(sucursalId), id_usuario: usuario.id, monto: Number(monto), descripcion, fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Gasto registrado: ${formatMoney(monto)} (${descripcion}) - ${usuario.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al registrar gasto." }; }
};

export const registrarRetiroIA = async (sucursalId: number, usuarioIdentificador: string | number, monto: number, descripcion: string) => {
  try {
    if (monto <= 0) return { error: "Monto inválido." };
    const usuario = await resolverUsuarioInteligente(usuarioIdentificador, sucursalId);
    if (!usuario) return { error: `Usuario '${usuarioIdentificador}' no encontrado.` };

    await prisma.retiro.create({
      data: { sucursalId: Number(sucursalId), id_usuario: usuario.id, monto: Number(monto), descripcion, fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Retiro registrado: ${formatMoney(monto)} (${descripcion}) - ${usuario.nombre}` };
  } catch (error) { console.error(error); return { error: "Error al registrar retiro." }; }
};

export const registrarFondoCajaIA = async (sucursalId: number, monto: number, idAdminEntrega: number, cajeroIdentificador: string | number) => {
  try {
    if (monto <= 0) return { error: "El monto debe ser mayor a 0." };
    
    const admin = await prisma.usuario.findUnique({ where: { id: Number(idAdminEntrega) }});
    if (!admin) return { error: "No se identificó quién entrega." };

    const cajero = await resolverUsuarioInteligente(cajeroIdentificador, sucursalId);
    
    if (!cajero) {
        const todos = await prisma.usuario.findMany({
            where: { sucursalId: Number(sucursalId), activo: 1 },
            select: { id: true, nombre: true, apellidos: true }
        });

        const coincidencias = todos.filter(u => {
            const nombreCompleto = `${u.nombre} ${u.apellidos || ''}`.trim().toLowerCase();
            const termino = String(cajeroIdentificador).toLowerCase();
            return nombreCompleto.includes(termino);
        });

        let msg = "";

        if (coincidencias.length > 0) {
            msg = `⚠️ **Conflicto de nombres jefe.**\n`;
            msg += `Hay varios usuarios que coinciden con "${cajeroIdentificador}":\n\n`;
            coincidencias.forEach(u => {
                msg += `🚫 **${u.nombre} ${u.apellidos || ''}** (ID: ${u.id})\n`;
            });
            msg += `\nPor seguridad, realicelo desde el **Módulo de Caja** o sea más específico con el nombre.`;
        } else {
            msg = `⚠️ **No encontré al cajero "${cajeroIdentificador}" jefe.**\n\n`;
            msg += `Pero aquí le dejo la lista del personal activo para que verifique el nombre:\n`;
            todos.forEach(u => {
                msg += `👤 **${u.nombre} ${u.apellidos || ''}** (ID: ${u.id})\n`;
            });
            msg += `\nIntente de nuevo con el nombre correcto.`;
        }

        return { success: true, mensaje: msg };
    }

    await prisma.inicio.create({
      data: { sucursalId: Number(sucursalId), idusuarioentrega: admin.id, idusuariorecibe: cajero.id, monto: Number(monto), fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Fondo asignado: ${formatMoney(monto)} a ${cajero.nombre} ${cajero.apellidos || ''}` };

  } catch (error) { console.error(error); return { error: "Error al asignar fondo." }; }
};

export const registrarInversionIA = async (sucursalId: number, monto: number, descripcion: string, usuarioInversionistaIdentificador: string | number) => {
  try {
    if (monto <= 0) return { error: "Monto inválido." };
    
    const existe = await resolverUsuarioInteligente(usuarioInversionistaIdentificador, sucursalId);
    if (!existe) return { error: "Inversionista no encontrado." };

    await prisma.inversion.create({
      data: { sucursalId: Number(sucursalId), id_usuario: existe.id, id_usuario_creacion: existe.id, monto: Number(monto), descripcion: descripcion || "Inversión", fecha: getCurrentDate(), activo: 1 }
    });
    return { success: true, mensaje: `✅ Inversión registrada: ${formatMoney(monto)} por ${existe.nombre}` };
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
      include: { usuarioEntrega: { select: { nombre: true, apellidos: true } }, usuarioRecibe: { select: { nombre: true, apellidos: true } }, detalles: { where: { activo: 1 } } },
      orderBy: { fecha: 'desc' }
    });

    if (cortes.length === 0) return { success: false, mensaje: "No hay cortes en ese periodo." };
    
    const datos = cortes.map(c => ({
        ...c,
        usuarioEntrega: { nombre: `${c.usuarioEntrega?.nombre} ${c.usuarioEntrega?.apellidos || ''}` },
        usuarioRecibe: { nombre: `${c.usuarioRecibe?.nombre} ${c.usuarioRecibe?.apellidos || ''}` }
    }));

    return { success: true, mensaje: `Encontré ${cortes.length} cortes.`, datos: datos };
  } catch (error) { console.error(error); return { error: "Error al consultar historial." }; }
};


// ==========================================
// NUEVAS FUNCIONES: CUENTAS POR COBRAR (CxC)
// ==========================================

export const obtenerCreditosPendientesIA = async (sucursalId: number, nombreCliente?: string) => {
  try {
    const filtros: any = { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } };
    if (nombreCliente) filtros.cliente = { razon_social: { contains: nombreCliente } };

    const creditos = await prisma.venta.findMany({
      where: filtros,
      select: { id: true, numdoc: true, fecha: true, total: true, saldo_pendiente: true, cliente: { select: { razon_social: true, telefono: true } } },
      orderBy: { fecha: 'asc' },
      take: 15
    });

    if (creditos.length === 0) {
        if (nombreCliente) {
            const otrosDeudores = await prisma.venta.findMany({
                where: { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } },
                select: { id: true, numdoc: true, fecha: true, total: true, saldo_pendiente: true, cliente: { select: { razon_social: true } } },
                take: 5
            });

            if (otrosDeudores.length > 0) {
                return { 
                    success: true, 
                    mensaje: `❌ No encontré deudas para "${nombreCliente}".\n\n👀 **Pero aquí le muestro los clientes que sí tienen deuda (Datos Reales):**`, 
                    datos: otrosDeudores 
                };
            }
        }

        return { 
            success: true, 
            mensaje: `ℹ️ **Sin cuentas por cobrar por el momento.**\n\nEl sistema funciona así jefe:\n1. Cuando realice una venta, seleccione el método **"Crédito"**.\n2. Esa venta aparecerá automáticamente en esta lista.\n3. Desde aquí podrá registrar abonos parciales o liquidaciones.` 
        };
    }

    return { success: true, mensaje: `Encontré ${creditos.length} ventas a crédito pendientes.`, datos: creditos };
  } catch (error) { console.error(error); return { error: "Error al consultar créditos." }; }
};

export const obtenerSaldosPorClienteIA = async (sucursalId: number) => {
  try {
    const deudas = await prisma.venta.findMany({
      where: { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } },
      select: { saldo_pendiente: true, cliente: { select: { id: true, razon_social: true, telefono: true } } }
    });

    if (deudas.length === 0) {
        return { 
            success: true, 
            mensaje: `ℹ️ **¡Buenas noticias jefe! No hay clientes con deuda pendiente.**\n\n(Datos de ejemplo: Aquí vería el resumen de cuánto debe cada cliente acumulado de todas sus notas).` 
        };
    }

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

    const lista = Object.values(agrupado).sort((a: any, b: any) => b.total_deuda - a.total_deuda);

    return { 
        success: true, 
        mensaje: `Hay ${lista.length} clientes con cuentas pendientes.`, 
        datos: lista 
    };

  } catch (error) { console.error(error); return { error: "Error al calcular saldos por cliente." }; }
};

// 🔥 MEJORADO: BÚSQUEDA INTELIGENTE CON TRIM Y PLAN B 🔥
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

    const termino = String(ventaIdentificador).trim();

    // 1. BÚSQUEDA 100% ESTRICTA
    const venta = await prisma.venta.findFirst({
        where: {
            sucursalId: Number(sucursalId),
            estado: 'CREDITO',
            activo: 1,
            OR: [
                { numdoc: { equals: termino } },
                { id: !isNaN(Number(termino)) ? Number(termino) : undefined }
            ]
        },
        include: { cliente: { select: { id: true, razon_social: true, telefono: true } } }
    });
    
    // Fallback: Sugerencias
    const mostrarOtrasDeudas = async (mensajeError: string) => {
        const otrasDeudas = await prisma.venta.findMany({
            where: { 
                sucursalId: Number(sucursalId), 
                estado: 'CREDITO', 
                activo: 1, 
                saldo_pendiente: { gt: 0 },
                numdoc: { contains: termino }
            },
            select: { numdoc: true, fecha: true, saldo_pendiente: true, cliente: { select: { razon_social: true, telefono: true } } },
            orderBy: { fecha: 'asc' },
            take: 5
        });

        let listaFinal = otrasDeudas;
        let msgContexto = `No encontré el folio exacto **"${termino}"**, ¿se refiere a alguna de estas?`;
        
        if (otrasDeudas.length === 0) {
             listaFinal = await prisma.venta.findMany({
                where: { sucursalId: Number(sucursalId), estado: 'CREDITO', activo: 1, saldo_pendiente: { gt: 0 } },
                select: { numdoc: true, fecha: true, saldo_pendiente: true, cliente: { select: { razon_social: true, telefono: true } } },
                orderBy: { fecha: 'asc' }, take: 5
            });
            msgContexto = `No encontré nada parecido a "${termino}". Aquí las deudas más antiguas:`;
        }

        if (listaFinal.length > 0) {
            let tabla = `${mensajeError}\n\n👀 **${msgContexto}**\n\n`;
            tabla += `| Venta | Cliente | Teléfono | Nota (Fecha) | Deuda |\n| :--- | :--- | :--- | :--- | :---: |\n`;
            listaFinal.forEach(v => {
                const f = new Date(v.fecha).toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'});
                const deu = formatMoney(Number(v.saldo_pendiente));
                tabla += `| ${v.numdoc} | ${v.cliente?.razon_social || 'S/N'} | ${v.cliente?.telefono || '-'} | ${f} | ${deu} |\n`;
            });
            return { success: true, mensaje: tabla + "\n**Por favor escriba el folio tal cual aparece en la tabla para abonar.**" };
        }
        return { error: mensajeError };
    };

    if (!venta) return await mostrarOtrasDeudas(`❌ No encontré la venta exacta **"${ventaIdentificador}"**.`);
    
    const saldoActual = Number(venta.saldo_pendiente);
    if (saldoActual <= 0.5) return await mostrarOtrasDeudas(`❌ La venta **${venta.numdoc}** ya está liquidada (Saldo: $0.00).`);
    if (monto > saldoActual) return { error: `El abono ($${monto}) excede la deuda ($${saldoActual}).` };

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
          metodo_pago: interpretarMetodoPago(metodoPagoTxt),
          fecha: getCurrentDate(),
          comentarios: comentarios,
          activo: 1
        }
      });
      await tx.venta.update({ where: { id: venta.id }, data: { saldo_pendiente: nuevoSaldo } });
    });
    return { success: true, mensaje: `✅ Abono registrado a **${venta.numdoc}** (${venta.cliente?.razon_social}).\n💰 Abonado: ${formatMoney(monto)}\n📉 Resta: ${formatMoney(nuevoSaldo)}` };
  } catch (error) { console.error("Error Abono:", error); return { error: "Ocurrió un error técnico al registrar el abono." }; }
};

export const consultarHistorialAbonosIA = async (sucursalId: number, ventaIdentificador: string | number) => {
  try {
    const termino = String(ventaIdentificador).trim();

    // 1. Intento Exacto
    let venta = await prisma.venta.findFirst({
        where: { sucursalId: Number(sucursalId), OR: [{ numdoc: { equals: termino } }, { id: !isNaN(Number(termino)) ? Number(termino) : undefined }] },
        include: { cliente: { select: { razon_social: true } } }
    });

    // 2. Intento Flexible (si falló el exacto)
    if (!venta) {
        venta = await prisma.venta.findFirst({
            where: { sucursalId: Number(sucursalId), numdoc: { contains: termino } },
            include: { cliente: { select: { razon_social: true } } }
        });
    }

    const sugerir = async (msg: string) => {
        const ultimos = await prisma.cxc_cliente.findMany({ where: { idsucursal: Number(sucursalId), activo: 1 }, distinct: ['idventa'], orderBy: { fecha: 'desc' }, take: 5, select: { idventa: true } });
        const ids = ultimos.map(m => m.idventa).filter((id): id is number => id !== null);
        
        if (ids.length > 0) {
            const det = await prisma.venta.findMany({ where: { id: { in: ids } }, select: { numdoc: true, total: true, cliente: { select: { razon_social: true } } } });
            let t = `**${msg}**\n\n📋 **Ventas con historial reciente:**\n| Folio | Cliente | Total |\n| :--- | :--- | :---: |\n`;
            det.forEach((d:any) => t += `| ${d.numdoc} | ${d.cliente?.razon_social} | ${formatMoney(Number(d.total))} |\n`);
            return { success: true, mensaje: t + "\nIndíqueme el folio correcto jefe." };
        }
        return { error: msg };
    };

    if (!venta) return await sugerir(`❌ No encontré ninguna venta que contenga "${ventaIdentificador}".`);

    const abonos = await prisma.cxc_cliente.findMany({ where: { idventa: venta.id, activo: 1, saldo_abonado: { gt: 0 } }, orderBy: { fecha: 'desc' } });
    if (abonos.length === 0) return await sugerir(`ℹ️ La venta **${venta.numdoc}** existe pero no tiene abonos.`);
    return { success: true, mensaje: `Historial de **${venta.numdoc}** (${venta.cliente?.razon_social}):`, datos: abonos };
  } catch (error) { console.error(error); return { error: "Error al consultar historial." }; }
};

export const obtenerCajerosPendientesIA = async (sucursalId: number) => {
    try {
        // 1. Obtenemos TODOS los usuarios activos de la sucursal (Sin filtrar por rol)
        const usuarios = await prisma.usuario.findMany({
            where: { sucursalId: Number(sucursalId), activo: 1 },
            select: { id: true, nombre: true, apellidos: true }
        });

        let msg = `⚠️ **Atención jefe, estos usuarios traen dinero y necesitan corte:**\n\n`;
        let hayPendientes = false;
        let sugerenciaNombres = "";

        for (const u of usuarios) {
            // 2. BUSCAMOS SU ÚLTIMO CORTE INDIVIDUAL
            const ultimoCorte = await prisma.corte_dia.findFirst({
                where: { sucursalId: Number(sucursalId), id_usuario_entrega: u.id, activo: 1 },
                orderBy: { fecha: 'desc' }
            });

            // Definimos desde cuándo empezar a sumar (Desde el último corte o desde el inicio de los tiempos)
            const fechaDesde = ultimoCorte ? ultimoCorte.fecha : new Date('2000-01-01');

            // 3. SUMAMOS TODO EL DINERO (Ventas + Fondos + Inversiones + Abonos - Gastos - Retiros)
            
            // Ventas (Total)
            const fVentas = await prisma.venta.findMany({ 
                where: { sucursalId: Number(sucursalId), id_usuario: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { total: true } 
            });
            const sumV = fVentas.reduce((s, x:any) => s + Number(x.total || 0), 0);
            
            // Inicios/Fondo (Monto) - Dinero que recibió para empezar
            const fInicios = await prisma.inicio.findMany({ 
                where: { sucursalId: Number(sucursalId), idusuariorecibe: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { monto: true } 
            });
            const sumI = fInicios.reduce((s, x:any) => s + Number(x.monto || 0), 0);

            // Abonos/CxC (Saldo Abonado) - Dinero que cobró de créditos
            const fAbonos = await prisma.cxc_cliente.findMany({ 
                where: { idsucursal: Number(sucursalId), idusuariorecibe: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { saldo_abonado: true } 
            });
            const sumA = fAbonos.reduce((s, x:any) => s + Number(x.saldo_abonado || 0), 0);

            // Inversiones (Monto) - Dinero inyectado
            const fInv = await prisma.inversion.findMany({ 
                where: { sucursalId: Number(sucursalId), id_usuario: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { monto: true } 
            });
            const sumInv = fInv.reduce((s, x:any) => s + Number(x.monto || 0), 0);

            // Gastos (Monto) - Salidas
            const fGastos = await prisma.gasto.findMany({ 
                where: { sucursalId: Number(sucursalId), id_usuario: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { monto: true } 
            });
            const sumG = fGastos.reduce((s, x:any) => s + Number(x.monto || 0), 0);

            // Retiros (Monto) - Salidas parciales
            const fRetiros = await prisma.retiro.findMany({ 
                where: { sucursalId: Number(sucursalId), id_usuario: u.id, fecha: { gt: fechaDesde }, activo: 1 }, 
                select: { monto: true } 
            });
            const sumR = fRetiros.reduce((s, x:any) => s + Number(x.monto || 0), 0);

            // CALCULO FINAL
            const totalCaja = sumV + sumI + sumA + sumInv - sumG - sumR;

            // 4. VALIDACIÓN: ¿TIENE ALGO PENDIENTE?
            // Si hay movimientos o si el saldo no es cero, lo mostramos.
            const totalMovimientos = fVentas.length + fInicios.length + fAbonos.length + fInv.length + fGastos.length + fRetiros.length;

            if (totalMovimientos > 0 || Math.abs(totalCaja) > 0.1) {
                const nombreCompleto = `${u.nombre} ${u.apellidos || ''}`.trim();
                const ultimaFechaStr = ultimoCorte ? ultimoCorte.fecha.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' }) : 'NUNCA';
                
                msg += `👤 **${nombreCompleto}**\n`;
                msg += `   💰 Saldo al momento: **${formatMoney(totalCaja)}**\n`;
                msg += `   📅 Último corte: ${ultimaFechaStr}\n\n`;
                
                if (sugerenciaNombres) sugerenciaNombres += " o de ";
                sugerenciaNombres += nombreCompleto;
                hayPendientes = true;
            }
        }

        if (!hayPendientes) {
            return { success: true, mensaje: "✅ Todo el personal está en cero y al día con sus cortes, jefe." };
        }

        msg += `¿De quién realizamos el corte definitivo? ¿**${sugerenciaNombres}**?`;
        return { success: true, mensaje: msg };

    } catch (error) {
        console.error("Error pendientes corte:", error);
        return { error: "Error al consultar pendientes de corte." };
    }
};