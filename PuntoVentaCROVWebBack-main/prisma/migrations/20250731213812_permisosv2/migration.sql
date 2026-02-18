/*
  Warnings:

  - You are about to drop the `perfilpermiso` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuariopermiso` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `perfilpermiso` DROP FOREIGN KEY `PerfilPermiso_permisoId_fkey`;

-- DropForeignKey
ALTER TABLE `usuariopermiso` DROP FOREIGN KEY `UsuarioPermiso_permisoId_fkey`;

-- DropForeignKey
ALTER TABLE `usuariopermiso` DROP FOREIGN KEY `UsuarioPermiso_usuarioId_fkey`;

-- AlterTable
ALTER TABLE `permiso` ADD COLUMN `administrador` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `caja` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `gerencia` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `perfilpermiso`;

-- DropTable
DROP TABLE `usuariopermiso`;

-- CreateTable
CREATE TABLE `HistorialPermiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `permisoId` INTEGER NOT NULL,
    `permitido` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `HistorialPermiso_usuarioId_permisoId_key`(`usuarioId`, `permisoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HistorialPermiso` ADD CONSTRAINT `HistorialPermiso_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistorialPermiso` ADD CONSTRAINT `HistorialPermiso_permisoId_fkey` FOREIGN KEY (`permisoId`) REFERENCES `Permiso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
