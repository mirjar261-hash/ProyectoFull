-- CreateTable
CREATE TABLE `Operador_movil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operador_movil_sku` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_operador_movil` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `activo` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `vigencia` INTEGER NOT NULL,
    `comments` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Historial_recargas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_gv_operador_movil_sku` INTEGER NOT NULL,
    `numero_telefonico` VARCHAR(191) NOT NULL,
    `transID_taecel` VARCHAR(191) NULL,
    `fecha_taecel` VARCHAR(191) NULL,
    `folio_taecel` VARCHAR(191) NULL,
    `status_taecel` VARCHAR(191) NULL,
    `success_taecel` INTEGER NULL,
    `monto_pagado` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `igv` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `efectivo` DOUBLE NULL,
    `tarjeta` DOUBLE NULL,
    `vale` DOUBLE NULL,
    `cheque` DOUBLE NULL,
    `transferencia` DOUBLE NULL,
    `referencia` VARCHAR(45) NULL,
    `tarjeta_tipo` ENUM('CREDITO', 'DEBITO') NULL,
    `id_cuenta_empresa` INTEGER NULL,
    `descripcion` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Operador_movil_sku` ADD CONSTRAINT `Operador_movil_sku_id_operador_movil_fkey` FOREIGN KEY (`id_operador_movil`) REFERENCES `Operador_movil`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Historial_recargas` ADD CONSTRAINT `Historial_recargas_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Historial_recargas` ADD CONSTRAINT `Historial_recargas_id_gv_operador_movil_sku_fkey` FOREIGN KEY (`id_gv_operador_movil_sku`) REFERENCES `Operador_movil_sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
