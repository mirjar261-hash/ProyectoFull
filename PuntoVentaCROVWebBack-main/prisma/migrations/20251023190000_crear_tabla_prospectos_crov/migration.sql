CREATE TABLE `prospectos_crov` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(191) NOT NULL,
  `telefono` VARCHAR(191) NOT NULL,
  `correo` VARCHAR(191) NULL,
  `interes` ENUM('PUNTO_DE_VENTA_CROV','CROV_RESTAURANTE','PUNTO_DE_VENTA_WEB') NOT NULL,
  `id_cliente_crov` INTEGER NULL,
  `nombre_negocio` VARCHAR(191) NULL,
  `direccion_negocio` VARCHAR(191) NULL,
  `activo` INTEGER NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `prospectos_crov_id_cliente_crov_idx`(`id_cliente_crov`),
  PRIMARY KEY (`id`),
  CONSTRAINT `prospectos_crov_id_cliente_crov_fkey`
    FOREIGN KEY (`id_cliente_crov`) REFERENCES `clientes_CROV`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);
