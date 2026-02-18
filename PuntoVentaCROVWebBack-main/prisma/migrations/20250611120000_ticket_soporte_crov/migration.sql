CREATE TABLE `ticket_soporte_crov` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `folio` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NULL,
    `nombre_cliente` VARCHAR(191) NOT NULL,
    `nombre_negocio` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `garantia` ENUM('SI', 'NO') NOT NULL,
    `descripcion` TEXT NULL,
    `tipo_problema` ENUM('DUDA', 'FALLA_SISTEMA', 'MANTENIMIENTO', 'ERROR_CLIENTE', 'ASISTENCIA_CON_EL_SISTEMA', 'INSTALACION_DE_DEMO', 'CAMBIO') NOT NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',
    `descripcion_solucion` TEXT NULL,
    `id_empleado_crov` INTEGER NULL,
    `fecha_solucion` DATETIME(3) NULL,
    `estado_solicitud` ENUM('RECIBIDO', 'EN_PROCESO', 'RESUELTO', 'PENDIENTE', 'SIN_SOPORTE', 'CLIENTE_NO_RESPONDE') NOT NULL DEFAULT 'RECIBIDO',
    `tiempo_atencion` VARCHAR(191) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ticket_soporte_crov`
  ADD CONSTRAINT `ticket_soporte_crov_id_empleado_crov_fkey`
  FOREIGN KEY (`id_empleado_crov`) REFERENCES `empleados_CROV`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
