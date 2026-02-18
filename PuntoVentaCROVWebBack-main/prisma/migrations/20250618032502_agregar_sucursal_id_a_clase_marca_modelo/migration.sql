/*
  Warnings:

  - Added the required column `sucursalId` to the `Clase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sucursalId` to the `Marca` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sucursalId` to the `Modelo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `clase` ADD COLUMN `sucursalId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `marca` ADD COLUMN `sucursalId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `modelo` ADD COLUMN `sucursalId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Clase` ADD CONSTRAINT `Clase_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Modelo` ADD CONSTRAINT `Modelo_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marca` ADD CONSTRAINT `Marca_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
