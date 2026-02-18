import prisma from '../utils/prisma';

// ==========================================
// 1. INTERFAZ
// ==========================================
export interface DatosProveedorNuevo {
    razon_social: string;    // Obligatorio
    telefono: string;        // Obligatorio
    rfc?: string;            // Opcional
    movil?: string;          // Opcional
    nombre_contacto?: string; // Opcional
    email?: string;          // Opcional
    rubro?: string;          // Opcional
    limite_credito?: number; // Opcional
    dias_credito?: number;   // Opcional
}

// ==========================================
// 2. CREAR PROVEEDOR (NUEVO)
// ==========================================
export const crearProveedorIA = async (sucursalId: number, datos: DatosProveedorNuevo) => {
    
    // Validaciones básicas
    if (!datos.razon_social || !datos.telefono) {
        return { error: "La Razón Social y el Teléfono son obligatorios." };
    }

    try {
        // Verificar duplicados
        const whereClause: any = { sucursalId, activo: 1, razon_social: datos.razon_social };
        
        if (datos.rfc) {
            const rfcExistente = await prisma.proveedor.findFirst({
                where: { sucursalId, rfc: datos.rfc, activo: 1 }
            });
            if (rfcExistente) return { error: `El RFC '${datos.rfc}' ya existe (${rfcExistente.razon_social}).` };
        }

        const nombreExistente = await prisma.proveedor.findFirst({ where: whereClause });
        if (nombreExistente) return { error: `El proveedor '${datos.razon_social}' ya existe.` };

        // Crear
        const nuevoProveedor = await prisma.proveedor.create({
            data: {
                razon_social: datos.razon_social,
                telefono: datos.telefono,
                rfc: datos.rfc || null,
                movil: datos.movil || null,
                nom_contacto: datos.nombre_contacto || null, 
                email: datos.email || null,
                rubro: datos.rubro || "General",
                
                // Conversión Number -> String obligatoria
                limite_credito: (datos.limite_credito || 0).toString(),
                dias_credito: (datos.dias_credito || 0).toString(),

                sucursal: { connect: { id: sucursalId } },
                activo: 1
            }
        });

        return { 
            success: true, 
            mensaje: `✅ **Proveedor Registrado**\n🏢 ${datos.razon_social}\n📞 Tel: ${datos.telefono}`, 
            datos: { id: nuevoProveedor.id } 
        };

    } catch (error: any) {
        console.error("🔴 ERROR TÉCNICO (CREAR PROVEEDOR):", error);
        return { error: "Ocurrió un problema técnico al guardar el proveedor." }; 
    }
};

// ==========================================
// 3. MODIFICAR PROVEEDOR
// ==========================================
export const modificarProveedorIA = async (sucursalId: number, nombreBusqueda: string, datos: Partial<DatosProveedorNuevo>) => {
    try {
        const proveedor = await prisma.proveedor.findFirst({
            where: { 
                sucursalId, 
                razon_social: { contains: nombreBusqueda }, 
                activo: 1 
            }
        });

        if (!proveedor) return { error: `No encontré al proveedor "${nombreBusqueda}".` };

        // Preparar actualización
        const dataUpdate: any = {};
        if (datos.razon_social) dataUpdate.razon_social = datos.razon_social;
        if (datos.telefono) dataUpdate.telefono = datos.telefono;
        if (datos.rfc) dataUpdate.rfc = datos.rfc;
        if (datos.movil) dataUpdate.movil = datos.movil;
        if (datos.nombre_contacto) dataUpdate.nom_contacto = datos.nombre_contacto;
        if (datos.email) dataUpdate.email = datos.email;
        if (datos.rubro) dataUpdate.rubro = datos.rubro;
        
        // Conversión Number -> String también en actualización
        if (datos.limite_credito !== undefined) dataUpdate.limite_credito = datos.limite_credito.toString();
        if (datos.dias_credito !== undefined) dataUpdate.dias_credito = datos.dias_credito.toString();

        await prisma.proveedor.update({
            where: { id: proveedor.id },
            data: dataUpdate
        });

        return { 
            success: true, 
            mensaje: `✅ **Proveedor Actualizado**\nDatos de ${proveedor.razon_social} modificados correctamente.`
        };

    } catch (error: any) {
        console.error("🔴 Error modificarProveedorIA:", error);
        return { error: "Error técnico al modificar el proveedor." };
    }
};

// ==========================================
// 4. CAMBIAR ESTADO (BORRAR / RESTAURAR)
// ==========================================
export const cambiarEstadoProveedorIA = async (
    sucursalId: number,
    nombreProveedor: string,
    nuevoEstado: 0 | 1 // 0 = Inactivo (Borrar), 1 = Activo (Restaurar)
): Promise<any> => {
    try {
        // Validar estado válido
        if (nuevoEstado !== 0 && nuevoEstado !== 1) {
            return { error: "El estado debe ser 0 (Eliminar) o 1 (Restaurar)." };
        }

        // Buscar proveedor (Activos e Inactivos)
        const proveedor = await prisma.proveedor.findFirst({
            where: { 
                sucursalId, 
                razon_social: { contains: nombreProveedor } 
            }
        });

        if (!proveedor) {
            return { error: `No encontré ningún proveedor con el nombre "${nombreProveedor}".` };
        }

        // Verificar si ya está en el estado deseado
        if (proveedor.activo === nuevoEstado) {
            const estadoStr = nuevoEstado === 1 ? "ACTIVO" : "ELIMINADO";
            return { 
                success: true, 
                mensaje: `El proveedor "${proveedor.razon_social}" ya estaba ${estadoStr}.`, 
                datos: proveedor 
            };
        }

        // Actualizar
        const actualizado = await prisma.proveedor.update({
            where: { id: proveedor.id },
            data: { activo: nuevoEstado }
        });

        const accion = nuevoEstado === 1 ? "✅ Restaurado" : "🗑️ Eliminado";
        return { 
            success: true, 
            mensaje: `${accion} correctamente al proveedor: ${actualizado.razon_social}`, 
            datos: actualizado 
        };

    } catch (error) {
        console.error("🔴 Error en cambiarEstadoProveedor:", error);
        return { error: `Error técnico al actualizar proveedor: ${error}` };
    }
};