-- CreateTable
CREATE TABLE `Compra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numdoc` VARCHAR(20) NOT NULL,
    `id_proveedor` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `estado` ENUM('CONTADO', 'CREDITO', 'TARJETA') NOT NULL,
    `numitems` INTEGER NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `subtotal` DOUBLE NOT NULL,
    `iva` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `activo` INTEGER NOT NULL,
    `saldo_pendiente` DOUBLE NOT NULL,
    `fecha_devolucion` DATETIME(3) NULL,
    `id_usuario_devolucion` INTEGER NULL,
    `fecha_vencimiento` DATETIME(3) NULL,
    `cuenta_empresa` VARCHAR(50) NULL,
    `impuestos` DOUBLE NOT NULL,
    `ieps` DOUBLE NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detalle_compra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_compra` INTEGER NOT NULL,
    `id_producto` BIGINT NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `importe` DOUBLE NOT NULL,
    `descuento` DOUBLE NOT NULL,
    `activo` INTEGER NOT NULL,
    `cantidad_existente` DOUBLE NOT NULL,
    `iva` DOUBLE NOT NULL,
    `ieps` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_id_proveedor_fkey` FOREIGN KEY (`id_proveedor`) REFERENCES `Proveedor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_id_usuario_devolucion_fkey` FOREIGN KEY (`id_usuario_devolucion`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detalle_compra` ADD CONSTRAINT `Detalle_compra_id_compra_fkey` FOREIGN KEY (`id_compra`) REFERENCES `Compra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detalle_compra` ADD CONSTRAINT `Detalle_compra_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
