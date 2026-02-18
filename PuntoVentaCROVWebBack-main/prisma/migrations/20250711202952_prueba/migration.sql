-- DropForeignKey
ALTER TABLE `compra` DROP FOREIGN KEY `Compra_id_proveedor_fkey`;

-- DropIndex
DROP INDEX `Compra_id_proveedor_fkey` ON `compra`;

-- AlterTable
ALTER TABLE `compra` MODIFY `id_proveedor` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Compra` ADD CONSTRAINT `Compra_id_proveedor_fkey` FOREIGN KEY (`id_proveedor`) REFERENCES `Proveedor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
