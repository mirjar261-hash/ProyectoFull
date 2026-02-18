/*
  Warnings:

  - Added the required column `estado` to the `Venta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numdoc` to the `Venta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `venta` ADD COLUMN `ahorro` DOUBLE NULL,
    ADD COLUMN `descuento` DOUBLE NULL,
    ADD COLUMN `estado` VARCHAR(191) NOT NULL,
    ADD COLUMN `fecha_devolucion` DATETIME(3) NULL,
    ADD COLUMN `id_usuario_devolucion` INTEGER NULL,
    ADD COLUMN `numdoc` VARCHAR(191) NOT NULL,
    ADD COLUMN `saldo_pendiente` DOUBLE NULL,
    ADD COLUMN `tipo_descuento` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_id_usuario_devolucion_fkey` FOREIGN KEY (`id_usuario_devolucion`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
