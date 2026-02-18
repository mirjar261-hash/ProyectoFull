-- AlterTable
ALTER TABLE `venta` ADD COLUMN `cheque` DOUBLE NULL,
    ADD COLUMN `efectivo` DOUBLE NULL,
    ADD COLUMN `referencia` VARCHAR(191) NULL,
    ADD COLUMN `tarjeta` DOUBLE NULL,
    ADD COLUMN `tarjeta_tipo` VARCHAR(191) NULL,
    ADD COLUMN `transferencia` DOUBLE NULL,
    ADD COLUMN `vale` DOUBLE NULL;
