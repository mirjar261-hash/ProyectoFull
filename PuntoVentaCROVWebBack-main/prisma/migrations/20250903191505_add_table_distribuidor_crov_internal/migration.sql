-- CreateTable
CREATE TABLE `Distribuidor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_completo` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `domicilio` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `nivel` ENUM('BRONCE', 'PLATA', 'ORO') NOT NULL DEFAULT 'BRONCE',
    `descuento` DOUBLE NOT NULL DEFAULT 0,
    `nombre_comercial` VARCHAR(191) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sucursalId` INTEGER NOT NULL,

    INDEX `Distribuidor_sucursalId_activo_nivel_idx`(`sucursalId`, `activo`, `nivel`),
    INDEX `Distribuidor_sucursalId_nombre_completo_idx`(`sucursalId`, `nombre_completo`),
    UNIQUE INDEX `Distribuidor_sucursalId_email_key`(`sucursalId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Distribuidor` ADD CONSTRAINT `Distribuidor_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
