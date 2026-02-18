-- CreateTable
CREATE TABLE `Promocion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('POR_PRODUCTO','POR_CANTIDAD','AL_MAYOREO','GENERAL') NOT NULL,
    `tipo_descuento` ENUM('PORCENTAJE','MONTO') NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `productoId` BIGINT NULL,
    `sucursalId` INTEGER NOT NULL,
    `fecha_inicio` DATETIME(3) NULL,
    `fecha_fin` DATETIME(3) NULL,
    `hora_inicio` TIME NULL,
    `hora_fin` TIME NULL,
    `descripcion` TEXT NOT NULL,
    `cantidad` INTEGER NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Promocion_productoId_idx`(`productoId`),
    INDEX `Promocion_sucursalId_idx`(`sucursalId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `Promocion_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `Producto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Promocion_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
