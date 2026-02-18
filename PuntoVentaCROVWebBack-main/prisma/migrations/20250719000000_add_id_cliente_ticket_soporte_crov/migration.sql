ALTER TABLE `ticket_soporte_crov`
  ADD COLUMN `id_cliente` INTEGER NULL,
  ADD CONSTRAINT `ticket_soporte_crov_id_cliente_fkey`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes_CROV`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
