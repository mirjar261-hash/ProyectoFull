-- CreateTable
CREATE TABLE `permisosinternal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `scrum_master` INTEGER NOT NULL DEFAULT 0,
    `tester` INTEGER NOT NULL DEFAULT 0,
    `desarrollador` INTEGER NOT NULL DEFAULT 0,
    `ventas` INTEGER NOT NULL DEFAULT 0,
    `sla` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_permisosinternal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleadoId` INTEGER NOT NULL,
    `permisoId` INTEGER NOT NULL,
    `permitido` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `historial_permisosinternal` ADD CONSTRAINT `historial_permisosinternal_empleadoId_fkey` FOREIGN KEY (`empleadoId`) REFERENCES `empleados_CROV`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_permisosinternal` ADD CONSTRAINT `historial_permisosinternal_permisoId_fkey` FOREIGN KEY (`permisoId`) REFERENCES `permisosinternal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
