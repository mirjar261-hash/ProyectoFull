-- CreateTable
CREATE TABLE `Inventario_esa` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `id_producto` BIGINT NOT NULL,
    `comentario` VARCHAR(150) NULL,
    `tipo_esa` ENUM('VENTA', 'DEVOLUCION_VENTA', 'COMPRA', 'DEVOLUCION_COMPRA', 'ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `cantidad_antigua` DOUBLE NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `id_user` INTEGER NOT NULL,
    `costo` DOUBLE NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Inventario_esa` ADD CONSTRAINT `Inventario_esa_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventario_esa` ADD CONSTRAINT `Inventario_esa_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventario_esa` ADD CONSTRAINT `Inventario_esa_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
