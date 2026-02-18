-- CreateTable
CREATE TABLE `Factura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ventaId` INTEGER NOT NULL,
    `sucursalId` INTEGER NOT NULL,
    `rfcEmisor` VARCHAR(191) NULL,
    `nombreEmisor` VARCHAR(191) NULL,
    `regimenEmisor` VARCHAR(3) NULL,
    `rfcReceptor` VARCHAR(191) NULL,
    `nombreReceptor` VARCHAR(191) NULL,
    `regimenReceptor` VARCHAR(3) NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '4.0',
    `tipoComprobante` VARCHAR(1) NOT NULL,
    `serie` VARCHAR(25) NULL,
    `folio` VARCHAR(40) NULL,
    `fechaEmision` DATETIME(3) NOT NULL,
    `moneda` VARCHAR(3) NOT NULL,
    `tipoCambio` DECIMAL(18, 6) NULL,
    `exportacion` VARCHAR(2) NULL,
    `lugarExpedicion` VARCHAR(5) NULL,
    `subtotal` DOUBLE NOT NULL,
    `descuento` DOUBLE NULL DEFAULT 0,
    `impuestosTras` DOUBLE NULL DEFAULT 0,
    `impuestosRet` DOUBLE NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `uuid` VARCHAR(191) NULL,
    `fechaTimbrado` DATETIME(3) NULL,
    `noCertificadoSAT` VARCHAR(20) NULL,
    `rfcProvCertif` VARCHAR(20) NULL,
    `selloSAT` TEXT NULL,
    `noCertificado` VARCHAR(20) NULL,
    `selloCFD` TEXT NULL,
    `xmlUrl` TEXT NULL,
    `pdfUrl` TEXT NULL,
    `acuseUrl` TEXT NULL,
    `estado` ENUM('PENDIENTE', 'TIMBRADA', 'CANCELADA', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizadoEn` DATETIME(3) NOT NULL,
    `formaPago` VARCHAR(2) NULL,
    `metodoPago` VARCHAR(3) NULL,
    `catMetodoPagoId` INTEGER NULL,
    `usoCFDI` VARCHAR(3) NULL,

    UNIQUE INDEX `Factura_ventaId_key`(`ventaId`),
    UNIQUE INDEX `Factura_uuid_key`(`uuid`),
    INDEX `Factura_sucursalId_fechaEmision_idx`(`sucursalId`, `fechaEmision`),
    INDEX `Factura_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatFormaPago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_FormaPago` VARCHAR(2) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `bancarizado` BOOLEAN NOT NULL,
    `reqNumeroOperacion` ENUM('NO', 'OPCIONAL', 'OBLIGATORIO') NOT NULL DEFAULT 'NO',
    `reqRfcEmisorCtaOrd` ENUM('NO', 'OPCIONAL', 'OBLIGATORIO') NOT NULL DEFAULT 'NO',
    `reqCuentaOrdenante` ENUM('NO', 'OPCIONAL', 'OBLIGATORIO') NOT NULL DEFAULT 'NO',
    `patronCuentaOrdenante` VARCHAR(100) NULL,
    `reqCuentaBeneficiaria` VARCHAR(20) NULL,
    `patronCuentaBen` VARCHAR(100) NULL,
    `reqTipoCadenaPago` VARCHAR(20) NULL,
    `reqNombreBancoExtranj` ENUM('NO', 'OPCIONAL', 'OBLIGATORIO') NOT NULL DEFAULT 'NO',
    `condicionBancoExtranj` VARCHAR(200) NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatFormaPago_c_FormaPago_key`(`c_FormaPago`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatMetodoPago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_MetodoPago` VARCHAR(3) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatMetodoPago_c_MetodoPago_key`(`c_MetodoPago`),
    INDEX `CatMetodoPago_c_MetodoPago_idx`(`c_MetodoPago`),
    INDEX `CatMetodoPago_descripcion_idx`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatUsoCFDI` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `c_UsoCFDI` VARCHAR(3) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `aplica_fisica` BOOLEAN NOT NULL,
    `aplica_moral` BOOLEAN NOT NULL,
    `fecha_inicio_vigencia` DATETIME(3) NULL,
    `fecha_fin_vigencia` DATETIME(3) NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `CatUsoCFDI_c_UsoCFDI_key`(`c_UsoCFDI`),
    INDEX `CatUsoCFDI_c_UsoCFDI_idx`(`c_UsoCFDI`),
    INDEX `CatUsoCFDI_descripcion_idx`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatUsoCFDIRegimen` (
    `uso_clave` VARCHAR(3) NOT NULL,
    `regimen_clave` VARCHAR(3) NOT NULL,
    `activo` INTEGER NOT NULL DEFAULT 1,

    INDEX `CatUsoCFDIRegimen_regimen_clave_idx`(`regimen_clave`),
    PRIMARY KEY (`uso_clave`, `regimen_clave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Cliente_regimen_fiscal_idx` ON `Cliente`(`regimen_fiscal`);

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_regimen_fiscal_fkey` FOREIGN KEY (`regimen_fiscal`) REFERENCES `CatRegimenFiscal`(`c_RegimenFiscal`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_ventaId_fkey` FOREIGN KEY (`ventaId`) REFERENCES `Venta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_formaPago_fkey` FOREIGN KEY (`formaPago`) REFERENCES `CatFormaPago`(`c_FormaPago`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_metodoPago_fkey` FOREIGN KEY (`metodoPago`) REFERENCES `CatMetodoPago`(`c_MetodoPago`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Factura` ADD CONSTRAINT `Factura_usoCFDI_fkey` FOREIGN KEY (`usoCFDI`) REFERENCES `CatUsoCFDI`(`c_UsoCFDI`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatUsoCFDIRegimen` ADD CONSTRAINT `CatUsoCFDIRegimen_uso_clave_fkey` FOREIGN KEY (`uso_clave`) REFERENCES `CatUsoCFDI`(`c_UsoCFDI`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatUsoCFDIRegimen` ADD CONSTRAINT `CatUsoCFDIRegimen_regimen_clave_fkey` FOREIGN KEY (`regimen_clave`) REFERENCES `CatRegimenFiscal`(`c_RegimenFiscal`) ON DELETE CASCADE ON UPDATE CASCADE;
