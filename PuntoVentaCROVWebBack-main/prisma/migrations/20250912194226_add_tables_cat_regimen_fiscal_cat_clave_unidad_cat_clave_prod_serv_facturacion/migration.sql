-- AlterTable
ALTER TABLE `producto`
    ADD COLUMN `clave_prodserv` VARCHAR(10) NULL,
    ADD COLUMN `clave_unidad_medida` VARCHAR(3) NULL;
-- AlterTable
ALTER TABLE `promocion` MODIFY `descripcion` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `sucursal` ADD COLUMN `regimen_fiscal` VARCHAR(3) NULL,
    ADD COLUMN `tipo_persona` ENUM('FISICA', 'MORAL') NULL,
    MODIFY `direccion` VARCHAR(191) NULL,
    MODIFY `estado` VARCHAR(191) NULL,
    MODIFY `municipio` VARCHAR(191) NULL,
    MODIFY `cp` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CatRegimenFiscal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_RegimenFiscal` VARCHAR(3) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `aplica_fisica` BOOLEAN NOT NULL,
    `aplica_moral` BOOLEAN NOT NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatRegimenFiscal_c_RegimenFiscal_key`(`c_RegimenFiscal`),
    INDEX `CatRegimenFiscal_c_RegimenFiscal_idx`(`c_RegimenFiscal`),
    INDEX `CatRegimenFiscal_descripcion_idx`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatClaveUnidad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_ClaveUnidad` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `nota` VARCHAR(191) NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `simbolo` VARCHAR(191) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatClaveUnidad_c_ClaveUnidad_key`(`c_ClaveUnidad`),
    INDEX `CatClaveUnidad_c_ClaveUnidad_idx`(`c_ClaveUnidad`),
    INDEX `CatClaveUnidad_nombre_idx`(`nombre`),
    INDEX `CatClaveUnidad_descripcion_idx`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatClaveProdServ` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_ClaveProdServ` VARCHAR(10) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `incluir_iva_trasladado` VARCHAR(20) NULL,
    `incluir_ieps_trasladado` VARCHAR(20) NULL,
    `complemento_que_debe_incluir` VARCHAR(255) NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `estimulo_franja_fronteriza` INTEGER NULL,
    `palabras_similares` TEXT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatClaveProdServ_c_ClaveProdServ_key`(`c_ClaveProdServ`),
    INDEX `CatClaveProdServ_c_ClaveProdServ_idx`(`c_ClaveProdServ`),
    INDEX `CatClaveProdServ_descripcion_idx`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sucursal` ADD CONSTRAINT `Sucursal_regimen_fiscal_fkey` FOREIGN KEY (`regimen_fiscal`) REFERENCES `CatRegimenFiscal`(`c_RegimenFiscal`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_clave_unidad_medida_fkey` FOREIGN KEY (`clave_unidad_medida`) REFERENCES `CatClaveUnidad`(`c_ClaveUnidad`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_clave_prodserv_fkey` FOREIGN KEY (`clave_prodserv`) REFERENCES `CatClaveProdServ`(`c_ClaveProdServ`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cliente`
  MODIFY COLUMN `regimen_fiscal` VARCHAR(3) NULL;
