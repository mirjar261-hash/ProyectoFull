-- CreateTable
CREATE TABLE `ProductoInsumo` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `productoId` BIGINT NOT NULL,
    `productoIdInsumo` BIGINT NOT NULL,
    `cantidad` DOUBLE NOT NULL,

    INDEX `ProductoInsumo_productoId_idx`(`productoId`),
    INDEX `ProductoInsumo_productoIdInsumo_idx`(`productoIdInsumo`),
    UNIQUE INDEX `ProductoInsumo_productoId_productoIdInsumo_key`(`productoId`, `productoIdInsumo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductoInsumo` ADD CONSTRAINT `ProductoInsumo_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductoInsumo` ADD CONSTRAINT `ProductoInsumo_productoIdInsumo_fkey` FOREIGN KEY (`productoIdInsumo`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
