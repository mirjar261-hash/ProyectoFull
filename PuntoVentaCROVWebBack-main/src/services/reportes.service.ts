import prisma from '../utils/prisma';

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const getMonthName = (date: Date) => {
  return new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(date);
};

// --- REPORTE DE VENTAS ---
export const generarReporteVentasIA = async (sucursalId: number, tipo: 'SEMANAL' | 'MENSUAL' | 'COMPARATIVA_MES_ANTERIOR' | 'ANUAL') => {
  try {
    const hoy = new Date();
    let fechaInicio = new Date();
    let comparativa = false;

    if (tipo === 'SEMANAL') fechaInicio.setDate(hoy.getDate() - 7);
    else if (tipo === 'MENSUAL') fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    else if (tipo === 'COMPARATIVA_MES_ANTERIOR') {
      comparativa = true;
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    } else if (tipo === 'ANUAL') {
        fechaInicio = new Date(hoy.getFullYear(), 0, 1);
    }

    const ventas = await prisma.venta.findMany({
      where: { 
        sucursalId: Number(sucursalId), 
        activo: 1, 
        fecha: { gte: fechaInicio, lte: new Date() } 
      },
      select: { fecha: true, total: true },
      orderBy: { fecha: 'asc' }
    });

    if (ventas.length === 0) return { mensaje: "No se encontraron ventas en el periodo seleccionado jefe." };

    return procesarDatosReporte(ventas, comparativa, "Ventas");

  } catch (error: any) {
    console.error("Error generarReporteVentasIA:", error);
    return { error: 'Ocurrió un error al generar el reporte de ventas.' };
  }
};

// --- REPORTE DE COMPRAS ---
export const generarReporteComprasIA = async (sucursalId: number, tipo: 'SEMANAL' | 'MENSUAL' | 'COMPARATIVA_MES_ANTERIOR' | 'ANUAL') => {
    try {
      const hoy = new Date();
      let fechaInicio = new Date();
      let comparativa = false;
  
      if (tipo === 'SEMANAL') fechaInicio.setDate(hoy.getDate() - 7);
      else if (tipo === 'MENSUAL') fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      else if (tipo === 'COMPARATIVA_MES_ANTERIOR') {
        comparativa = true;
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      } else if (tipo === 'ANUAL') {
          fechaInicio = new Date(hoy.getFullYear(), 0, 1);
      }
  
      const compras = await prisma.compra.findMany({
        where: { 
            sucursalId: Number(sucursalId), 
            activo: 1, 
            fecha: { gte: fechaInicio, lte: new Date() } 
        },
        select: { fecha: true, total: true },
        orderBy: { fecha: 'asc' }
      });
  
      if (compras.length === 0) return { mensaje: "No se encontraron compras registradas en el periodo seleccionado jefe." };
  
      return procesarDatosReporte(compras, comparativa, "Compras");
  
    } catch (error: any) {
      console.error("Error generarReporteComprasIA:", error);
      return { error: 'Ocurrió un error al generar el reporte de compras.' };
    }
};

// --- TOP MEJORES CLIENTES ---
export const obtenerMejoresClientesIA = async (sucursalId: number, limite: number = 5) => {
    try {
        const topClientes = await prisma.venta.groupBy({
            by: ['id_cliente'], 
            where: {
                sucursalId: Number(sucursalId),
                activo: 1,
                id_cliente: { not: null } 
            },
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limite
        });

        if (topClientes.length === 0) return { mensaje: "No hay suficientes datos de clientes para generar un top." };

        const clientesIds = topClientes.map(c => c.id_cliente as number);
        
        const infoClientes = await prisma.cliente.findMany({
            where: { id: { in: clientesIds } },
            select: { id: true, razon_social: true } 
        });

        const filas = topClientes.map(item => {
            const cliente = infoClientes.find(c => c.id === item.id_cliente);
            return {
                nombre: cliente ? cliente.razon_social : 'Desconocido',
                cantidad: item._count.id,
                total: item._sum?.total || 0 
            };
        });

        return formatearTablaTop(filas, ["Cliente", "Compras", "Total Gastado"]);

    } catch (error) {
        console.error("Error obtenerMejoresClientesIA:", error);
        return { error: 'Error al calcular los mejores clientes.' };
    }
};

// --- TOP MEJORES PROVEEDORES ---
export const obtenerMejoresProveedoresIA = async (sucursalId: number, limite: number = 5) => {
    try {
        const topProveedores = await prisma.compra.groupBy({
            by: ['id_proveedor'],
            where: {
                sucursalId: Number(sucursalId),
                activo: 1,
                id_proveedor: { not: null }
            },
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limite
        });

        if (topProveedores.length === 0) return { mensaje: "No hay historial de compras a proveedores." };

        const proveedorIds = topProveedores.map(p => p.id_proveedor as number);
        const infoProveedores = await prisma.proveedor.findMany({
            where: { id: { in: proveedorIds } },
            select: { id: true, razon_social: true } 
        });

        const filas = topProveedores.map(item => {
            const proveedor = infoProveedores.find(p => p.id === item.id_proveedor);
            return {
                nombre: proveedor ? proveedor.razon_social : 'Desconocido',
                cantidad: item._count.id,
                total: item._sum?.total || 0
            };
        });

        return formatearTablaTop(filas, ["Proveedor", "Pedidos", "Total Comprado"]);

    } catch (error) {
        console.error("Error obtenerMejoresProveedoresIA:", error);
        return { error: 'Error al calcular los mejores proveedores.' };
    }
};

// --- TOP MEJORES CAJEROS ---
export const obtenerMejoresCajerosIA = async (sucursalId: number, limite: number = 5) => {
    try {
        const topCajeros = await prisma.venta.groupBy({
            by: ['id_usuario'], 
            where: {
                sucursalId: Number(sucursalId),
                activo: 1
            },
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limite
        });

        if (topCajeros.length === 0) return { mensaje: "No hay registros de ventas por usuarios." };

        const usuarioIds = topCajeros.map(u => u.id_usuario as number);
        
        const infoUsuarios = await prisma.usuario.findMany({
            where: { id: { in: usuarioIds } },
            select: { id: true, nombre: true, apellidos: true } 
        });

        const filas = topCajeros.map(item => {
            const usuario = infoUsuarios.find(u => u.id === item.id_usuario);
            const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Usuario Eliminado';
            return {
                nombre: nombreCompleto,
                cantidad: item._count.id,
                total: item._sum?.total || 0 
            };
        });

        return formatearTablaTop(filas, ["Cajero", "Ventas Realizadas", "Dinero Ingresado"]);

    } catch (error) {
        console.error("Error obtenerMejoresCajerosIA:", error);
        return { error: 'Error al calcular el rendimiento de cajeros.' };
    }
};

// --- LISTA GENERAL DE PROVEEDORES (CORREGIDO nom_contacto) ---
export const obtenerListaProveedoresGeneralIA = async (sucursalId: number) => {
    try {
        const proveedores = await prisma.proveedor.findMany({
            where: { sucursalId: Number(sucursalId), activo: 1 },
            select: { 
                razon_social: true, 
                telefono: true, 
                nom_contacto: true // <--- CORREGIDO: Se usa nom_contacto
            },
            orderBy: { razon_social: 'asc' },
            take: 10 
        });

        if (proveedores.length === 0) return { mensaje: "No tiene proveedores registrados activos jefe." };

        let reporte = `📋 **Lista de Proveedores (Primeros 10)**\n\n`;
        reporte += `| Empresa | Teléfono | Contacto |\n`;
        reporte += `| :--- | :--- | :--- |\n`;

        proveedores.forEach((p: any) => {
            const tel = p.telefono || 'S/N';
            const contacto = p.nom_contacto || '-'; // <--- CORREGIDO
            reporte += `| ${p.razon_social} | ${tel} | ${contacto} |\n`;
        });

        reporte += `\n⚠️ **Nota:** Esta es solo una vista rápida. Si necesita la lista completa o editar datos, por favor vaya al **Módulo de Proveedores**.\n`;

        return { success: true, mensaje: reporte };

    } catch (error) {
        console.error("Error obtenerListaProveedoresGeneralIA:", error);
        return { error: 'Error al obtener la lista de proveedores.' };
    }
};

// --- LISTA GENERAL DE CLIENTES (AGREGADA) ---
export const obtenerListaClientesGeneralIA = async (sucursalId: number) => {
    try {
        const clientes = await prisma.cliente.findMany({
            where: { sucursalId: Number(sucursalId), activo: 1 },
            select: { 
                razon_social: true, 
                telefono: true, 
                nom_contacto: true 
            },
            orderBy: { razon_social: 'asc' },
            take: 10 
        });

        if (clientes.length === 0) return { mensaje: "No tiene clientes registrados activos jefe." };

        let reporte = `👥 **Lista de Clientes (Primeros 10)**\n\n`;
        reporte += `| Cliente | Teléfono | Contacto |\n`;
        reporte += `| :--- | :--- | :--- |\n`;

        clientes.forEach((c: any) => {
            const tel = c.telefono || 'S/N';
            const contacto = c.nom_contacto || '-';
            reporte += `| ${c.razon_social} | ${tel} | ${contacto} |\n`;
        });

        reporte += `\n⚠️ **Nota:** Para ver la cartera completa, por favor acceda al **Módulo de Clientes**.\n`;

        return { success: true, mensaje: reporte };

    } catch (error) {
        console.error("Error obtenerListaClientesGeneralIA:", error);
        return { error: 'Error al obtener la lista de clientes.' };
    }
};

// --- LÓGICA COMPARTIDA DE FORMATO ---
const procesarDatosReporte = (datos: any[], comparativa: boolean, titulo: string) => {
    if (comparativa) {
        const fechaActual = new Date();
        const fechaPasada = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1);
        const nombreMesActual = getMonthName(fechaActual);
        const nombreMesPasado = getMonthName(fechaPasada);
        const mesActualCap = nombreMesActual.charAt(0).toUpperCase() + nombreMesActual.slice(1);
        const mesPasadoCap = nombreMesPasado.charAt(0).toUpperCase() + nombreMesPasado.slice(1);
        const mesActualIdx = fechaActual.getMonth();
        const mesPasadoIdx = fechaPasada.getMonth();
        const datosMesActual: Record<number, number> = {};
        const datosMesPasado: Record<number, number> = {};
        datos.forEach((v: any) => {
            const d = new Date(v.fecha);
            const dia = d.getDate();
            const mes = d.getMonth(); 
            if (mes === mesActualIdx) datosMesActual[dia] = (datosMesActual[dia] || 0) + Number(v.total);
            else if (mes === mesPasadoIdx) datosMesPasado[dia] = (datosMesPasado[dia] || 0) + Number(v.total);
        });
        let reporte = `📊 **Comparativa ${titulo}: ${mesPasadoCap} vs ${mesActualCap}**\n\n`;
        reporte += `| Día | ${mesPasadoCap} | ${mesActualCap} | Diferencia | Estado |\n`;
        reporte += `| :---: | :---: | :---: | :---: | :---: |\n`;
        let totalMesPasado = 0;
        let totalMesActual = 0;
        const maxDias = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 0).getDate();
        const diasMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
        const limiteLoop = Math.max(maxDias, diasMesActual);
        for (let i = 1; i <= limiteLoop; i++) {
            const valPasado = datosMesPasado[i] || 0;
            const valActual = datosMesActual[i] || 0;
            totalMesPasado += valPasado;
            totalMesActual += valActual;
            const diffDia = valActual - valPasado;
            const simbolo = diffDia > 0 ? '+' : '';
            const diffTexto = valPasado === 0 && valActual === 0 ? '-' : `${simbolo}${formatMoney(diffDia)}`;
            let estado = "-";
            if (valActual > valPasado) estado = "✅"; 
            else if (valActual < valPasado) estado = "🔻";
            else if (valActual === valPasado && valActual > 0) estado = "🟰";
            reporte += `| ${i} | ${formatMoney(valPasado)} | ${formatMoney(valActual)} | ${diffTexto} | ${estado} |\n`;
        }
        reporte += `\n**Resumen Global:**\n`;
        reporte += `🔹 Total ${mesPasadoCap}: **${formatMoney(totalMesPasado)}**\n`;
        reporte += `🔸 Total ${mesActualCap}: **${formatMoney(totalMesActual)}**\n`;
        const diff = totalMesActual - totalMesPasado;
        const simbolo = diff >= 0 ? '+' : '';
        reporte += `📈 Diferencia neta: **${simbolo}${formatMoney(diff)}**`;
        return { success: true, mensaje: reporte };
    } else {
        const datosAgrupados: Record<string, number> = {};
        datos.forEach((v: any) => {
            const d = new Date(v.fecha);
            const fechaKey = `${d.getDate()}/${d.getMonth() + 1}`;
            datosAgrupados[fechaKey] = (datosAgrupados[fechaKey] || 0) + Number(v.total);
        });
        let reporte = `📊 **Reporte de ${titulo}**\n\n`;
        reporte += `| Fecha | Total |\n`;
        reporte += `| :--- | :---: |\n`;
        let granTotal = 0;
        for (const [f, t] of Object.entries(datosAgrupados)) {
            granTotal += t;
            reporte += `| ${f} | ${formatMoney(t)} |\n`;
        }
        reporte += `\n💰 **GRAN TOTAL:** ${formatMoney(granTotal)}`;
        return { success: true, mensaje: reporte };
    }
};

// --- HELPER PARA TABLAS TOP ---
const formatearTablaTop = (datos: { nombre: string, cantidad: number, total: number }[], headers: string[]) => {
    let reporte = `🏆 **Top ${headers[0]}**\n\n`;
    reporte += `| ${headers[0]} | ${headers[1]} | ${headers[2]} |\n`;
    reporte += `| :--- | :---: | :---: |\n`; 

    datos.forEach(d => {
        reporte += `| ${d.nombre} | ${d.cantidad} | ${formatMoney(d.total)} |\n`;
    });

    return { success: true, mensaje: reporte };
};