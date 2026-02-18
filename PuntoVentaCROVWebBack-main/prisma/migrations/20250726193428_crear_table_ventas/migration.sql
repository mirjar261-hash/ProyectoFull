-- AlterTable
ALTER TABLE `producto` MODIFY `imagen` LONGBLOB NULL;

-- CreateTable
CREATE TABLE `Venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NULL,
    `id_usuario` INTEGER NOT NULL,
    `numitems` INTEGER NOT NULL,
    `observaciones` VARCHAR(191) NULL,
    `subtotal` DOUBLE NOT NULL,
    `iva` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Detalle_venta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_venta` INTEGER NOT NULL,
    `id_producto` BIGINT NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `descuento` DOUBLE NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detalle_venta` ADD CONSTRAINT `Detalle_venta_id_venta_fkey` FOREIGN KEY (`id_venta`) REFERENCES `Venta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Detalle_venta` ADD CONSTRAINT `Detalle_venta_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
