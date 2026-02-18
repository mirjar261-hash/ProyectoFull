-- CreateIndex
CREATE INDEX `Cliente_sucursalId_activo_idx` ON `Cliente`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Compra_sucursalId_activo_idx` ON `Compra`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Compra_sucursalId_fecha_idx` ON `Compra`(`sucursalId`, `fecha`);

-- CreateIndex
CREATE INDEX `Corte_dia_sucursalId_activo_idx` ON `Corte_dia`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Corte_dia_sucursalId_fecha_idx` ON `Corte_dia`(`sucursalId`, `fecha`);

-- CreateIndex
CREATE INDEX `Detalle_venta_id_venta_activo_idx` ON `Detalle_venta`(`id_venta`, `activo`);

-- CreateIndex
CREATE INDEX `Gasto_sucursalId_activo_idx` ON `Gasto`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Gasto_sucursalId_fecha_idx` ON `Gasto`(`sucursalId`, `fecha`);

-- CreateIndex
CREATE INDEX `Inicio_sucursalId_activo_idx` ON `Inicio`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Inicio_sucursalId_fecha_idx` ON `Inicio`(`sucursalId`, `fecha`);

-- CreateIndex
CREATE INDEX `Inversion_sucursalId_activo_idx` ON `Inversion`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Inversion_sucursalId_fecha_idx` ON `Inversion`(`sucursalId`, `fecha`);

-- CreateIndex
CREATE INDEX `Producto_sucursalId_activo_idx` ON `Producto`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Producto_cod_barras_sucursalId_activo_idx` ON `Producto`(`cod_barras`, `sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Producto_codigo_sucursalId_activo_idx` ON `Producto`(`codigo`, `sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Proveedor_sucursalId_activo_idx` ON `Proveedor`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Retiro_sucursalId_activo_fecha_idx` ON `Retiro`(`sucursalId`, `activo`, `fecha`);

-- CreateIndex
CREATE INDEX `Usuario_sucursalId_activo_perfil_idx` ON `Usuario`(`sucursalId`, `activo`, `perfil`);

-- CreateIndex
CREATE INDEX `Venta_sucursalId_activo_idx` ON `Venta`(`sucursalId`, `activo`);

-- CreateIndex
CREATE INDEX `Venta_sucursalId_fecha_idx` ON `Venta`(`sucursalId`, `fecha`);

-- RenameIndex
ALTER TABLE `detalle_compra` RENAME INDEX `Detalle_compra_id_compra_fkey` TO `Detalle_compra_id_compra_idx`;

-- RenameIndex
ALTER TABLE `payment` RENAME INDEX `Payment_empresaId_fkey` TO `Payment_empresaId_idx`;
