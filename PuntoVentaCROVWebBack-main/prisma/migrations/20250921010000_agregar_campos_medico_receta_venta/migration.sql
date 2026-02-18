-- AlterTable
ALTER TABLE `Venta` ADD COLUMN `receta` VARCHAR(191) NULL,
    ADD COLUMN `medico_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `Venta` ADD CONSTRAINT `Venta_medico_id_fkey` FOREIGN KEY (`medico_id`) REFERENCES `Medico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
