-- CreateTable
CREATE TABLE `Detalle_venta_promocion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_detalle_venta` INTEGER NOT NULL,
    `id_promocion` INTEGER NOT NULL,
    INDEX `Detalle_venta_promocion_id_detalle_venta_idx`(`id_detalle_venta`),
    INDEX `Detalle_venta_promocion_id_promocion_idx`(`id_promocion`),
    PRIMARY KEY (`id`),
    CONSTRAINT `Detalle_venta_promocion_id_detalle_venta_fkey` FOREIGN KEY (`id_detalle_venta`) REFERENCES `Detalle_venta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `Detalle_venta_promocion_id_promocion_fkey` FOREIGN KEY (`id_promocion`) REFERENCES `Promocion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
