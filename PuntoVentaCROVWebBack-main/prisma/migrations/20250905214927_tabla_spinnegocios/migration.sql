-- CreateTable
CREATE TABLE `SolicitudSpinNegocios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ineFrente` TEXT NULL,
    `ineReverso` TEXT NULL,
    `comprobanteDomicilio` TEXT NULL,
    `constanciaFiscal` TEXT NULL,
    `estadocuenta` TEXT NULL,
    `correoElectronico` VARCHAR(191) NULL,
    `linkRedSocial` VARCHAR(191) NULL,
    `nombreCompleto` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `numeroTerminales` VARCHAR(191) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivoFotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('FOTOS_INTERIOR', 'FOTOS_EXTERIOR', 'OTRO') NOT NULL,
    `url` TEXT NOT NULL,
    `solicitudId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArchivoFotos` ADD CONSTRAINT `ArchivoFotos_solicitudId_fkey` FOREIGN KEY (`solicitudId`) REFERENCES `SolicitudSpinNegocios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
