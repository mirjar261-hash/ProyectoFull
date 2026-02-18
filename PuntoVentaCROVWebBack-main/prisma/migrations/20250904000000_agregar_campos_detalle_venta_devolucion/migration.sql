-- AlterTable
ALTER TABLE `Detalle_venta` ADD COLUMN `fecha_devolucion` DATETIME(3) NULL,
    ADD COLUMN `id_usuario_devolucion` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Detalle_venta` ADD CONSTRAINT `Detalle_venta_id_usuario_devolucion_fkey` FOREIGN KEY (`id_usuario_devolucion`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
