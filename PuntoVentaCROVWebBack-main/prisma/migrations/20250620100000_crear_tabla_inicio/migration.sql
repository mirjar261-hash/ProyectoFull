-- CreateTable
CREATE TABLE `Inicio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idusuarioentrega` INTEGER NOT NULL,
    `idusuariorecibe` INTEGER NOT NULL,
    `monto` DECIMAL(8, 2) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `comentarios` VARCHAR(200) NULL,
    `fecha` DATETIME NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Inicio` ADD CONSTRAINT `Inicio_idusuarioentrega_fkey` FOREIGN KEY (`idusuarioentrega`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inicio` ADD CONSTRAINT `Inicio_idusuariorecibe_fkey` FOREIGN KEY (`idusuariorecibe`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inicio` ADD CONSTRAINT `Inicio_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
