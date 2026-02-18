/*
  Warnings:

  - Made the column `cod_barras` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `codigo` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nombre` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `costo` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `precio1` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `precio2` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `precio3` on table `producto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `precio4` on table `producto` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_idclase_fkey`;

-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_idmarca_fkey`;

-- DropForeignKey
ALTER TABLE `producto` DROP FOREIGN KEY `Producto_idmodelo_fkey`;

-- DropIndex
DROP INDEX `Producto_idclase_fkey` ON `producto`;

-- DropIndex
DROP INDEX `Producto_idmarca_fkey` ON `producto`;

-- DropIndex
DROP INDEX `Producto_idmodelo_fkey` ON `producto`;

-- AlterTable
ALTER TABLE `producto` MODIFY `cod_barras` VARCHAR(50) NOT NULL,
    MODIFY `codigo` VARCHAR(50) NOT NULL,
    MODIFY `cod_del_fabricante` VARCHAR(30) NULL,
    MODIFY `nombre` VARCHAR(125) NOT NULL,
    MODIFY `costo` DECIMAL(10, 3) NOT NULL,
    MODIFY `stock_min` INTEGER NULL,
    MODIFY `idclase` INTEGER NULL,
    MODIFY `idmarca` INTEGER NULL,
    MODIFY `idmodelo` INTEGER NULL,
    MODIFY `servicio` INTEGER NULL,
    MODIFY `precio1` DECIMAL(10, 3) NOT NULL,
    MODIFY `precio2` DECIMAL(10, 3) NOT NULL,
    MODIFY `precio3` DECIMAL(10, 3) NOT NULL,
    MODIFY `precio4` DECIMAL(10, 3) NOT NULL,
    MODIFY `bascula` INTEGER NULL,
    MODIFY `impuesto` VARCHAR(191) NULL,
    MODIFY `insumo` INTEGER NULL,
    MODIFY `tipo_medicamento` VARCHAR(191) NULL,
    MODIFY `tipo_ieps` VARCHAR(45) NULL,
    MODIFY `cantidad_ieps` DOUBLE NULL;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idclase_fkey` FOREIGN KEY (`idclase`) REFERENCES `Clase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idmarca_fkey` FOREIGN KEY (`idmarca`) REFERENCES `Marca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idmodelo_fkey` FOREIGN KEY (`idmodelo`) REFERENCES `Modelo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
