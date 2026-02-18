CREATE TABLE `giro_comercial` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(191) NOT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `clientes_CROV`
  ADD COLUMN `id_giro_comercial` INTEGER NULL;

CREATE INDEX `clientes_CROV_id_giro_comercial_idx` ON `clientes_CROV`(`id_giro_comercial`);

ALTER TABLE `clientes_CROV`
  ADD CONSTRAINT `clientes_CROV_id_giro_comercial_fkey`
    FOREIGN KEY (`id_giro_comercial`) REFERENCES `giro_comercial`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
