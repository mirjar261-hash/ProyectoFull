-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `razon_social` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `movil` VARCHAR(191) NOT NULL,
    `nom_contacto` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,
    `razon_social_facturacion` VARCHAR(191) NOT NULL,
    `rfc_facturacion` VARCHAR(191) NOT NULL,
    `curp_facturacion` VARCHAR(191) NOT NULL,
    `domicilio_facturacion` VARCHAR(191) NOT NULL,
    `no_ext_facturacion` VARCHAR(191) NOT NULL,
    `no_int_facturacion` VARCHAR(191) NOT NULL,
    `cp_facturacion` VARCHAR(191) NOT NULL,
    `colonia_facturacion` VARCHAR(191) NOT NULL,
    `ciudad_facturacion` VARCHAR(191) NOT NULL,
    `localidad_facturacion` VARCHAR(191) NOT NULL,
    `estado_facturacion` VARCHAR(191) NOT NULL,
    `pais_facturacion` VARCHAR(191) NOT NULL,
    `limite_credito` DOUBLE NOT NULL,
    `dias_credito` INTEGER NOT NULL,
    `tipo_precio` INTEGER NOT NULL,
    `regimen_fiscal` INTEGER NOT NULL,
    `numero_cliente` VARCHAR(191) NOT NULL,
    `saldo_inicial` DOUBLE NOT NULL,
    `fecha_nacimiento` DATETIME(3) NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
