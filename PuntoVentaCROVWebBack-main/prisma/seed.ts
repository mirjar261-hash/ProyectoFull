import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permisos = [
    { id: 1, nombre: 'Catálogo/Configuración', administrador: 1, caja: 1, gerencia: 0 },
    { id: 2, nombre: 'Catálogo/Cambiar Contraseña', administrador: 1, caja: 1, gerencia: 0 },
    { id: 3, nombre: 'Catálogo/Envío de mails', administrador: 1, caja: 1, gerencia: 0 },
    { id: 4, nombre: 'Catálogo/Promociones', administrador: 1, caja: 1, gerencia: 0 },
    { id: 5, nombre: 'Catálogo/Solicitar pago de Servicios', administrador: 1, caja: 1, gerencia: 0 },
    { id: 6, nombre: 'Catálogo/empresa', administrador: 1, caja: 1, gerencia: 0 },
    { id: 7, nombre: 'Registros/Registrar Proveedores', administrador: 1, caja: 1, gerencia: 0 },
    { id: 8, nombre: 'Registros/Registrar Clientes', administrador: 1, caja: 1, gerencia: 0 },
    { id: 9, nombre: 'Registros/Registrar Productos', administrador: 1, caja: 1, gerencia: 0 },
    { id: 10, nombre: 'Caja/Fondo de Caja', administrador: 1, caja: 1, gerencia: 0 },
    { id: 11, nombre: 'Caja/CXC Clientes (Cuentas por cobrar)', administrador: 1, caja: 1, gerencia: 0 },
    { id: 12, nombre: 'Caja/CXP Proveedores (Cuentas por pagar)', administrador: 1, caja: 1, gerencia: 0 },
    { id: 13, nombre: 'Caja/Gastos', administrador: 1, caja: 1, gerencia: 0 },
    { id: 14, nombre: 'Caja/Retiros', administrador: 1, caja: 1, gerencia: 0 },
    { id: 15, nombre: 'Caja/Transferencias entre usuarios', administrador: 1, caja: 1, gerencia: 0 },
    { id: 16, nombre: 'Caja/Historial de transferencias', administrador: 1, caja: 1, gerencia: 0 },
    { id: 17, nombre: 'Caja/Pre-corte', administrador: 1, caja: 1, gerencia: 0 },
    { id: 18, nombre: 'Caja/Historial de Pre-cortes', administrador: 1, caja: 1, gerencia: 0 },
    { id: 19, nombre: 'Otros/Verificar Precio', administrador: 1, caja: 1, gerencia: 0 },
    { id: 20, nombre: 'Compra-Venta/Compras', administrador: 1, caja: 0, gerencia: 1 },
    { id: 21, nombre: 'Compra-Venta/Venta', administrador: 1, caja: 0, gerencia: 1 },
    { id: 22, nombre: 'Compra-Venta/Ordenes de compra', administrador: 1, caja: 0, gerencia: 1 },
    { id: 23, nombre: 'Compra-Venta/Devolución Producto', administrador: 1, caja: 0, gerencia: 1 },
    { id: 24, nombre: 'Compra-Venta/Compras Sugeridas', administrador: 1, caja: 0, gerencia: 1 },
    { id: 25, nombre: 'Facturación/Facturación', administrador: 1, caja: 0, gerencia: 1 },
    { id: 26, nombre: 'Facturación/Facturación Público General', administrador: 1, caja: 0, gerencia: 1 },
    { id: 27, nombre: 'Facturación/Historial Facturas', administrador: 1, caja: 0, gerencia: 1 },
    { id: 28, nombre: 'Facturación/Complemento Pago', administrador: 1, caja: 0, gerencia: 1 },
    { id: 29, nombre: 'Recargas y Servicios/Verificar saldo', administrador: 1, caja: 0, gerencia: 1 },
    { id: 30, nombre: 'Recargas y Servicios/Recargar saldo', administrador: 1, caja: 0, gerencia: 1 },
    { id: 31, nombre: 'Recargas y Servicios/Historial recargas', administrador: 1, caja: 0, gerencia: 1 },
    { id: 32, nombre: 'Recargas y Servicios/Pagar servicio', administrador: 1, caja: 0, gerencia: 1 },
    { id: 33, nombre: 'Recargas y Servicios/Historial pago de servicios', administrador: 1, caja: 0, gerencia: 1 },
    { id: 34, nombre: 'Inventario/Inventario', administrador: 1, caja: 0, gerencia: 1 },
    { id: 35, nombre: 'Inventario/Historial De Inventario', administrador: 1, caja: 0, gerencia: 1 },
    { id: 36, nombre: 'Inventario/Cotejo', administrador: 1, caja: 0, gerencia: 1 },
    { id: 37, nombre: 'Inventario/Kardex', administrador: 1, caja: 0, gerencia: 1 },
    { id: 38, nombre: 'Inventario/Cambio de precios', administrador: 1, caja: 0, gerencia: 1 },
  ];

  for (const permiso of permisos) {
    await prisma.permiso.upsert({
      where: { id: permiso.id },
      update: permiso,
      create: permiso,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
