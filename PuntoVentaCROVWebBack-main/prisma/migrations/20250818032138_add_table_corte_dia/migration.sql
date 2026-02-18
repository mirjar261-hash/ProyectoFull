-- CreateTable
CREATE TABLE `Corte_dia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario_entrega` INTEGER NOT NULL,
    `id_usuario_recibe` INTEGER NOT NULL,
    `monto_reportado` DOUBLE NOT NULL,
    `monto_esperado` DOUBLE NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `comentarios` VARCHAR(200) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Corte_dia_detalle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_corte` INTEGER NOT NULL,
    `tipo` VARCHAR(200) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `comentarios` VARCHAR(500) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Corte_dia` ADD CONSTRAINT `Corte_dia_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Corte_dia` ADD CONSTRAINT `Corte_dia_id_usuario_entrega_fkey` FOREIGN KEY (`id_usuario_entrega`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Corte_dia` ADD CONSTRAINT `Corte_dia_id_usuario_recibe_fkey` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Corte_dia_detalle` ADD CONSTRAINT `Corte_dia_detalle_id_corte_fkey` FOREIGN KEY (`id_corte`) REFERENCES `Corte_dia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
