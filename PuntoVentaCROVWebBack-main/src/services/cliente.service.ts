import prisma from '../utils/prisma';

// Helper para convertir texto a ID de precio
const obtenerIdPrecio = (texto: string): number => {
  const mapaPrecios: Record<string, number> = {
    'precio al publico': 1,
    'precio con descuento': 2,
    'precio semi mayoreo': 3,
    'precio mayoreo': 4
  };
  return mapaPrecios[texto.toLowerCase()] || 1; // Default a público
};

export const crearClienteIA = async (sucursalId: number, datos: any) => {
  try {
    const nuevoCliente = await prisma.cliente.create({
      data: {
        sucursalId: Number(sucursalId),
        razon_social: datos.razon_social,
        telefono: datos.telefono,
        movil: datos.movil || null,
        nom_contacto: datos.nombre_contacto || null,
        email: datos.email || null,
        limite_credito: Number(datos.limite_credito) || 0,
        dias_credito: Number(datos.dias_credito) || 0,
        tipo_precio: obtenerIdPrecio(datos.tipo_precio || ''),
        activo: 1,
      }
    });

    return { 
      success: true, 
      mensaje: `Cliente **${nuevoCliente.razon_social}** registrado con éxito jefe.` 
    };
  } catch (error: any) {
    console.error("Error en crearClienteIA:", error);
    return { error: 'No pude registrar al cliente, verifique si ya existe o faltan datos.' };
  }
};

export const actualizarClienteIA = async (sucursalId: number, nombreBusqueda: string, datos: any) => {
  try {
    // Solo buscamos clientes activos para editar
    const clienteEncontrado = await prisma.cliente.findFirst({
      where: {
        sucursalId: Number(sucursalId),
        activo: 1,
        razon_social: { contains: nombreBusqueda }
      }
    });

    if (!clienteEncontrado) {
      return { error: `No encontré ningún cliente activo llamado "${nombreBusqueda}" en esta sucursal jefe.` };
    }

    const dataUpdate: any = {};
    if (datos.razon_social) dataUpdate.razon_social = datos.razon_social;
    if (datos.telefono) dataUpdate.telefono = datos.telefono;
    if (datos.movil) dataUpdate.movil = datos.movil;
    if (datos.email) dataUpdate.email = datos.email;
    if (datos.limite_credito) dataUpdate.limite_credito = Number(datos.limite_credito);
    if (datos.dias_credito) dataUpdate.dias_credito = Number(datos.dias_credito);
    if (datos.tipo_precio) dataUpdate.tipo_precio = obtenerIdPrecio(datos.tipo_precio);

    await prisma.cliente.update({
      where: { id: clienteEncontrado.id },
      data: dataUpdate
    });

    return { 
      success: true, 
      mensaje: `Datos del cliente **${clienteEncontrado.razon_social}** actualizados correctamente jefe.` 
    };
  } catch (error: any) {
    console.error("Error en actualizarClienteIA:", error);
    return { error: 'Ocurrió un error técnico al intentar modificar el cliente.' };
  }
};

export const cambiarEstadoClienteIA = async (sucursalId: number, nombreBusqueda: string, nuevoEstado: number) => {
  try {
    // Lógica inteligente:
    // Si queremos ELIMINAR (0), buscamos prioritariamente los ACTIVOS (1).
    // Si queremos RESTAURAR (1), buscamos prioritariamente los INACTIVOS (0).
    // Si no especificamos, busca en todos.
    const filtroActivo = nuevoEstado === 0 ? 1 : (nuevoEstado === 1 ? 0 : undefined);

    let clienteEncontrado = await prisma.cliente.findFirst({
      where: {
        sucursalId: Number(sucursalId),
        activo: filtroActivo, 
        razon_social: { contains: nombreBusqueda }
      }
    });

    // Si no encontró con el filtro estricto, intenta buscar en general para dar un mejor mensaje de error
    if (!clienteEncontrado) {
        clienteEncontrado = await prisma.cliente.findFirst({
            where: { sucursalId: Number(sucursalId), razon_social: { contains: nombreBusqueda } }
        });

        if (!clienteEncontrado) {
            return { error: `No encontré al cliente "${nombreBusqueda}" en el sistema jefe.` };
        }
        
        // Si lo encontró pero ya tiene el estado deseado
        if (clienteEncontrado.activo === nuevoEstado) {
            const estadoStr = nuevoEstado === 1 ? "activo" : "eliminado";
            return { error: `El cliente ya se encuentra ${estadoStr} jefe.` };
        }
    }

    await prisma.cliente.update({
      where: { id: clienteEncontrado.id },
      data: { activo: nuevoEstado }
    });

    const accion = nuevoEstado === 1 ? "restaurado" : "eliminado";
    return { 
      success: true, 
      mensaje: `El cliente **${clienteEncontrado.razon_social}** ha sido ${accion} del sistema jefe.` 
    };
  } catch (error: any) {
    console.error("Error en cambiarEstadoClienteIA:", error);
    return { error: 'Error al intentar cambiar el estado del cliente.' };
  }
};