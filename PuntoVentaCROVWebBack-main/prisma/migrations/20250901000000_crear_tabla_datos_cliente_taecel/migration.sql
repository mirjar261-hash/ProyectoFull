-- CreateTable
CREATE TABLE `Datos_cliente_taecel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuentaID` VARCHAR(191) NULL,
    `usuarioID` VARCHAR(191) NULL,
    `perfilID` VARCHAR(191) NULL,
    `contactoID` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `referenciaPagos` VARCHAR(191) NULL,
    `referenciaServicios` VARCHAR(191) NULL,
    `numeroCuenta` VARCHAR(191) NULL,
    `usuario` VARCHAR(191) NULL,
    `keyTaecel` VARCHAR(191) NULL,
    `nipTaecel` VARCHAR(191) NULL,
    `nombreCompleto` VARCHAR(191) NULL,
    `UID` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `envioEmail` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NULL,
    `activo` INTEGER NULL,
    `sucursal_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Datos_cliente_taecel` ADD CONSTRAINT `Datos_cliente_taecel_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `Sucursal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Datos_cliente_taecel` ADD CONSTRAINT `Datos_cliente_taecel_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
