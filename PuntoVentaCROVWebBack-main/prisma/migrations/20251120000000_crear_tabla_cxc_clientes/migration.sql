CREATE TABLE `cxc_clientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saldo_pendiente` DOUBLE NOT NULL,
    `saldo_abonado` DOUBLE NOT NULL DEFAULT 0,
    `idusuariorecibe` INTEGER NOT NULL,
    `comentarios` TEXT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `idcliente` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `idventa` INTEGER NULL,
    `metodo_pago` ENUM('EFECTIVO', 'TARJETA') NULL,
    `referencia` VARCHAR(45) NULL,
    `tarjeta_tipo` ENUM('CREDITO', 'DEBITO') NULL,
    `idsucursal` INTEGER NOT NULL,
    `abono_devuelto` INTEGER NOT NULL DEFAULT 0,
    `fecha_devolucion` DATETIME(3) NULL,

    INDEX `Cxc_cliente_idsucursal_activo_idx`(`idsucursal`, `activo`),
    INDEX `Cxc_cliente_idcliente_idx`(`idcliente`),
    INDEX `Cxc_cliente_idventa_idx`(`idventa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
