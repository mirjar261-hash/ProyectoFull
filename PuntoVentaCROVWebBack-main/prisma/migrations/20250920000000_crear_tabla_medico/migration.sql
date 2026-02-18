-- CreateTable
CREATE TABLE `Medico` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `cedula` VARCHAR(191) NOT NULL,
    `nombre_completo` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Medico_sucursalId_activo_idx` ON `Medico`(`sucursalId`, `activo`);

-- AddForeignKey
ALTER TABLE `Medico` ADD CONSTRAINT `Medico_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
