import prisma from '../utils/prisma';

// ==========================================
// 1. INTERFACES
// ==========================================
export interface DatosProductoNuevo {
    // -- Datos Generales --
    codigo: string;              
    codigo_barras?: string;      
    codigo_fabricante?: string;  
    nombre: string;              
    stock_min?: number;          
    costo: number;               
    stock_inicial: number;       

    // -- Precios --
    precio_publico: number;      // Precio 1
    precio_descuento?: number;   // Precio 2
    precio_semimayoreo?: number; // Precio 3
    precio_mayoreo?: number;     // Precio 4
}

export interface InsumoRequerido {
    nombreInsumo: string;
    cantidad: number;
}

// ==========================================
// 2. HELPER: BÚSQUEDA INTELIGENTE
// ==========================================
const buscarProductoInteligente = async (sucursalId: number, termino: string, incluirInactivos: boolean = false) => {
    let term = String(termino).trim();
    // Limpieza de prefijos comunes
    term = term.replace(/^(codigo|código|cod|sku|id|barras|producto|prod)\s*/i, "").trim();

    // Filtro base (si incluirInactivos es false, solo busca activos)
    const filtroActivo = incluirInactivos ? {} : { activo: 1 };

    // 1. Búsqueda EXACTA (Prioridad Alta: Códigos)
    let producto = await prisma.producto.findFirst({
        where: { 
            sucursalId, 
            ...filtroActivo,
            OR: [
                { codigo: term },                   
                { cod_barras: term },               
                { cod_del_fabricante: term },
                // A veces el nombre es exactamente el término corto
                { nombre: term } 
            ]
        }
    });

    if (producto) return producto;

    // 2. Búsqueda FLEXIBLE (Prioridad Media: Contiene el código)
    producto = await prisma.producto.findFirst({
        where: { 
            sucursalId, 
            ...filtroActivo,
            OR: [
                { codigo: { contains: term } },
                { cod_barras: { contains: term } }
            ]
        }
    });

    if (producto) return producto;

    // 3. Búsqueda por NOMBRE (Prioridad Baja: Contiene texto)
    return await prisma.producto.findFirst({
        where: { 
            sucursalId, 
            ...filtroActivo,
            nombre: { contains: term }
        }
    });
};

// ==========================================
// 3. CREAR PRODUCTO (NUEVO)
// ==========================================
export const crearProductoCompletoIA = async (sucursalId: number, datos: DatosProductoNuevo) => {
    
    // Validaciones básicas
    if (!datos.nombre || !datos.codigo) {
        return { error: "El Nombre y el Código son obligatorios." };
    }
    if (datos.costo < 0 || datos.precio_publico < 0) {
        return { error: "El Costo y el Precio no pueden ser negativos." };
    }

    try {
        // 1. Verificar duplicados (Búsqueda estricta por código)
        const existe = await prisma.producto.findFirst({
            where: { sucursalId, codigo: datos.codigo, activo: 1 }
        });

        if (existe) {
            return { error: `El código '${datos.codigo}' ya existe (${existe.nombre}).` };
        }

        // 2. Calcular Utilidades
        const p1 = Number(datos.precio_publico);
        const p2 = datos.precio_descuento ? Number(datos.precio_descuento) : p1;
        const p3 = datos.precio_semimayoreo ? Number(datos.precio_semimayoreo) : p1;
        const p4 = datos.precio_mayoreo ? Number(datos.precio_mayoreo) : p1;

        const calcularUtilidad = (precio: number, costo: number) => {
            if (costo <= 0) return 100; 
            return ((precio - costo) / costo) * 100;
        };

        // 3. Crear el Producto
        const nuevoProducto = await prisma.producto.create({
            data: {
                // --- DATOS BÁSICOS ---
                nombre: datos.nombre,
                codigo: datos.codigo,
                cod_barras: datos.codigo_barras || null,
                cod_del_fabricante: datos.codigo_fabricante || null,
                stock_min: datos.stock_min || 5,
                costo: datos.costo,
                
                // --- STOCK ---
                cantidad_existencia: datos.stock_inicial,
                cantidad_inicial: datos.stock_inicial,

                // --- PRECIOS ---
                precio1: p1,
                precio2: p2,
                precio3: p3,
                precio4: p4,

                // --- UTILIDADES ---
                utilidad1: calcularUtilidad(p1, datos.costo),
                utilidad2: calcularUtilidad(p2, datos.costo),
                utilidad3: calcularUtilidad(p3, datos.costo),
                utilidad4: calcularUtilidad(p4, datos.costo),

                // --- DEFAULTS ---
                sucursal: { connect: { id: sucursalId } },
                activo: 1,
                servicio: 0,       
                impuesto: "0",     
                insumo: 0,         
                bascula: 0,
                
                // --- RELACIONES (IDs por defecto 1) ---
                clase: { connect: { id: 1 } }, 
                marca: { connect: { id: 1 } }, 
                modelo: { connect: { id: 1 } }
            } as any 
        });

        // 4. Registrar Entrada en KARDEX
        if (datos.stock_inicial > 0) {
            const usuarioKardex = await prisma.usuario.findFirst({ where: { sucursalId, activo: 1 } });
            
            await prisma.inventario_esa.create({
                data: {
                    producto: { connect: { id: nuevoProducto.id } },
                    sucursal: { connect: { id: sucursalId } },
                    usuario: { connect: { id: usuarioKardex?.id || 1 } },
                    tipo_esa: 'ENTRADA',
                    cantidad: datos.stock_inicial,
                    cantidad_antigua: 0,
                    fecha: new Date(),
                    comentario: 'Inventario Inicial (Alta Chatbot)',
                    costo: datos.costo
                }
            });
        }

        return { 
            success: true, 
            mensaje: `✅ **Producto Registrado**\n📌 ${datos.nombre}\n💲 Precio: $${p1}\n📦 Stock: ${datos.stock_inicial}`, 
            datos: { id: nuevoProducto.id } 
        };

    } catch (error: any) {
        console.error("🔴 ERROR TÉCNICO (CREAR PRODUCTO):", error);
        return { error: "Error técnico al guardar el producto. Por favor revisa los datos." };
    }
};

// ==========================================
// 4. ASIGNAR INSUMOS (RECETAS)
// ==========================================
export const agregarInsumosIA = async (
    sucursalId: number, 
    identificadorPadre: string, // Cambiado de nombreProductoPadre a identificadorPadre
    listaInsumos: InsumoRequerido[]
) => {
    try {
        // Uso de Búsqueda Inteligente
        const padre = await buscarProductoInteligente(sucursalId, identificadorPadre);

        if (!padre) return { error: `No encontré el producto principal "${identificadorPadre}".` };

        let reporte = "";
        let costoTotalInsumos = 0;

        for (const item of listaInsumos) {
            // Uso de Búsqueda Inteligente para el insumo también
            const insumo = await buscarProductoInteligente(sucursalId, item.nombreInsumo);

            if (!insumo) {
                reporte += `❌ No encontré el ingrediente "${item.nombreInsumo}".\n`;
                continue;
            }

            // Crear relación
            await (prisma as any).productoInsumo.create({
                data: {
                   id_producto: padre.id,
                   id_insumo: insumo.id,
                   cantidad: item.cantidad
                }
            });

            const costoInsumo = Number(insumo.costo) * item.cantidad;
            costoTotalInsumos += costoInsumo;
            reporte += `✅ Agregado: ${item.cantidad} de ${insumo.nombre}.\n`;
        }

        if (costoTotalInsumos > 0) {
            await prisma.producto.update({
                where: { id: padre.id },
                data: { servicio: 1 } // Marcar como compuesto
            });
        }

        return { 
            success: true, 
            mensaje: `📝 **Receta Actualizada para ${padre.nombre}**\n${reporte}` 
        };

    } catch (error: any) {
        console.error("🔴 Error agregarInsumosIA:", error);
        return { error: "Error técnico al guardar la receta." };
    }
};

// ==========================================
// 5. MODIFICAR PRODUCTO
// ==========================================
export const modificarProductoIA = async (sucursalId: number, identificador: string, datos: Partial<DatosProductoNuevo>) => {
    try {
        // Uso de Búsqueda Inteligente
        const producto = await buscarProductoInteligente(sucursalId, identificador);

        if (!producto) return { error: `No encontré el producto "${identificador}".` };

        const dataUpdate: any = {};
        
        // Mapeo básico
        if (datos.nombre) dataUpdate.nombre = datos.nombre;
        if (datos.codigo) dataUpdate.codigo = datos.codigo;
        if (datos.codigo_barras) dataUpdate.cod_barras = datos.codigo_barras;
        if (datos.stock_min !== undefined) dataUpdate.stock_min = datos.stock_min;

        // Recálculo de utilidad si cambian precio o costo
        const nuevoCosto = datos.costo !== undefined ? Number(datos.costo) : Number(producto.costo);
        const nuevoPrecio = datos.precio_publico !== undefined ? Number(datos.precio_publico) : Number(producto.precio1);

        if (datos.costo !== undefined || datos.precio_publico !== undefined) {
            dataUpdate.costo = nuevoCosto;
            dataUpdate.precio1 = nuevoPrecio;
            if (nuevoCosto <= 0) dataUpdate.utilidad1 = 100;
            else dataUpdate.utilidad1 = ((nuevoPrecio - nuevoCosto) / nuevoCosto) * 100;
        }

        // Otros precios
        if (datos.precio_descuento !== undefined) dataUpdate.precio2 = datos.precio_descuento;
        if (datos.precio_semimayoreo !== undefined) dataUpdate.precio3 = datos.precio_semimayoreo;
        if (datos.precio_mayoreo !== undefined) dataUpdate.precio4 = datos.precio_mayoreo;

        await prisma.producto.update({
            where: { id: producto.id },
            data: dataUpdate
        });

        return { 
            success: true, 
            mensaje: `✅ **Producto Actualizado**\n${producto.nombre} ha sido modificado correctamente.`
        };

    } catch (error: any) {
        console.error("🔴 Error modificarProductoIA:", error);
        return { error: "Error técnico al modificar el producto." };
    }
};

// ==========================================
// 6. CAMBIAR ESTADO (BORRAR / RESTAURAR)
// ==========================================
export const cambiarEstadoProductoIA = async (
    sucursalId: number,
    identificador: string, // Nombre, código o barras
    nuevoEstado: 0 | 1     // 0 = Inactivo (Borrar), 1 = Activo (Restaurar)
  ): Promise<any> => {
    
    // Usamos el helper con true para buscar también en los inactivos
    const producto = await buscarProductoInteligente(sucursalId, identificador, true);
  
    if (!producto) {
        return { error: `No encontré ningún producto que coincida con "${identificador}".` };
    }
  
    // Validar si ya está en el estado deseado
    if (producto.activo === nuevoEstado) {
        const estadoStr = nuevoEstado === 1 ? "ACTIVO" : "ELIMINADO";
        return { success: true, mensaje: `El producto "${producto.nombre}" ya está ${estadoStr}.`, datos: producto };
    }
  
    try {
        const actualizado = await prisma.producto.update({
            where: { id: producto.id },
            data: { activo: nuevoEstado }
        });
  
        const accion = nuevoEstado === 1 ? "✅ Restaurado" : "🗑️ Eliminado";
        return { 
            success: true, 
            mensaje: `${accion} el producto: ${actualizado.nombre} (${actualizado.codigo})`, 
            datos: actualizado 
        };
    } catch (error) {
        return { error: `Error al cambiar estado del producto: ${error}` };
    }
  };