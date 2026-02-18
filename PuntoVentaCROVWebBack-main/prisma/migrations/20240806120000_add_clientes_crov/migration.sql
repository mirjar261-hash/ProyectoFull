-- CreateTable
CREATE TABLE `clientes_CROV` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_cliente` VARCHAR(191) NOT NULL,
    `nombre_negocio` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `correo` VARCHAR(191) NULL,
    `tipo_sistema` ENUM('PUNTO_DE_VENTA_CROV', 'CROV_RESTAURANTE', 'CROV_HOTEL', 'CROV_SPA', 'CROV_INMOBILIARIA') NOT NULL,
    `fecha_instalacion` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
