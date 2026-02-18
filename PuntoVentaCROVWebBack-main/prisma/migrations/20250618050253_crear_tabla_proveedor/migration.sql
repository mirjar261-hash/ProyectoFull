-- CreateTable
CREATE TABLE `Proveedor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rfc` VARCHAR(191) NOT NULL,
    `razon_social` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `movil` VARCHAR(191) NOT NULL,
    `nom_contacto` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `rubro` VARCHAR(191) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `limite_credito` VARCHAR(191) NOT NULL,
    `dias_credito` VARCHAR(191) NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Proveedor` ADD CONSTRAINT `Proveedor_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
