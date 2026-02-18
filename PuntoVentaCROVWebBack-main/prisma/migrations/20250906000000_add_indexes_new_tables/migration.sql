-- CreateIndex
CREATE INDEX `Actividad_sucursalId_activo_idx` ON `Actividad`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Actividad_sucursalId_fecha_calendario_idx` ON `Actividad`(`sucursalId`, `fecha_calendario`);

-- CreateIndex
CREATE INDEX `Datos_cliente_taecel_sucursal_id_activo_idx` ON `Datos_cliente_taecel`(`sucursal_id`, `activo`);

-- CreateIndex
CREATE INDEX `Inventario_esa_sucursalId_id_producto_fecha_idx` ON `Inventario_esa`(`sucursalId`, `id_producto`, `fecha`);
