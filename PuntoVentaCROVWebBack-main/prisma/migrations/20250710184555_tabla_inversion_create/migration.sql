-- CreateTable
CREATE TABLE `Inversion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `monto` DOUBLE NOT NULL,
    `descripcion` VARCHAR(200) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `id_usuario_creacion` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Inversion` ADD CONSTRAINT `Inversion_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inversion` ADD CONSTRAINT `Inversion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inversion` ADD CONSTRAINT `Inversion_id_usuario_creacion_fkey` FOREIGN KEY (`id_usuario_creacion`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
