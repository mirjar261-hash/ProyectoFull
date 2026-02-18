-- CreateEnum
-- Prisma will translate enums inline for MySQL

CREATE TABLE `sprint_crov` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL DEFAULT 'Sprint_',
    `fecha_inicio` DATE NULL,
    `fecha_final` DATE NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `en_uso` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tarea_crov` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` TEXT NOT NULL,
    `descripcion` TEXT NULL,
    `id_sistemas_crov` INTEGER NOT NULL,
    `id_empleados_crov` INTEGER NOT NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'BAJA',
    `estatus` ENUM('POR_HACER', 'EN_CURSO', 'IMPLEMENTACION_LISTA', 'PRUEBAS', 'LISTO') NOT NULL DEFAULT 'POR_HACER',
    `reabierto` INTEGER NOT NULL DEFAULT 0,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_vencimiento` DATETIME(3) NULL,
    `tipo` ENUM('TAREA', 'ERROR', 'SOPORTE', 'HISTORIA') NOT NULL DEFAULT 'TAREA',
    `complejidad` INTEGER NOT NULL DEFAULT 1,
    `id_sprint` INTEGER NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `tarea_crov_id_sistemas_crov_idx` ON `tarea_crov`(`id_sistemas_crov`);
CREATE INDEX `tarea_crov_id_empleados_crov_idx` ON `tarea_crov`(`id_empleados_crov`);
CREATE INDEX `tarea_crov_id_sprint_idx` ON `tarea_crov`(`id_sprint`);
CREATE INDEX `tarea_crov_prioridad_idx` ON `tarea_crov`(`prioridad`);
CREATE INDEX `tarea_crov_estatus_idx` ON `tarea_crov`(`estatus`);
CREATE INDEX `tarea_crov_activo_idx` ON `tarea_crov`(`activo`);

ALTER TABLE `tarea_crov`
  ADD CONSTRAINT `tarea_crov_id_sistemas_crov_fkey`
    FOREIGN KEY (`id_sistemas_crov`) REFERENCES `sistemas_crov`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `tarea_crov_id_empleados_crov_fkey`
    FOREIGN KEY (`id_empleados_crov`) REFERENCES `empleados_CROV`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `tarea_crov_id_sprint_fkey`
    FOREIGN KEY (`id_sprint`) REFERENCES `sprint_crov`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
