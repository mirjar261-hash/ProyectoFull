CREATE TABLE `mantenimientos_clientes_crov` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_cliente_crov` INT NOT NULL,
  `fecha_mantenimiento` DATE NOT NULL,
  `fecha_proximo_mantenimiento` DATE NOT NULL,
  `comentarios` TEXT NULL,
  `activo` TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `mantenimientos_clientes_crov_id_cliente_crov_idx` (`id_cliente_crov`),
  CONSTRAINT `mantenimientos_clientes_crov_id_cliente_crov_fkey`
    FOREIGN KEY (`id_cliente_crov`) REFERENCES `clientes_CROV`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
