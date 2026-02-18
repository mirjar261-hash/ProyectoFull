-- CreateTable
CREATE TABLE `Retiro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `monto` DOUBLE NOT NULL,
    `descripcion` VARCHAR(200) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Retiro` ADD CONSTRAINT `Retiro_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Retiro` ADD CONSTRAINT `Retiro_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
