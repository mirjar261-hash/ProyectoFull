-- CreateTable
CREATE TABLE `Producto` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `cod_barras` VARCHAR(50) NULL,
    `codigo` VARCHAR(50) NULL,
    `cod_del_fabricante` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(125) NULL,
    `costo` DECIMAL(10, 3) NULL,
    `stock_min` INTEGER NOT NULL,
    `imagen` LONGBLOB NOT NULL,
    `idclase` INTEGER NOT NULL,
    `idmarca` INTEGER NOT NULL,
    `idmodelo` INTEGER NOT NULL,
    `activo` INTEGER NOT NULL,
    `servicio` INTEGER NOT NULL,
    `utilidad1` DOUBLE NOT NULL,
    `utilidad2` DOUBLE NOT NULL,
    `utilidad3` DOUBLE NOT NULL,
    `utilidad4` DOUBLE NOT NULL,
    `precio1` DECIMAL(10, 3) NULL,
    `precio2` DECIMAL(10, 3) NULL,
    `precio3` DECIMAL(10, 3) NULL,
    `precio4` DECIMAL(10, 3) NULL,
    `bascula` INTEGER NOT NULL,
    `cantidad_existencia` DOUBLE NOT NULL,
    `cantidad_inicial` DOUBLE NOT NULL,
    `impuesto` VARCHAR(191) NOT NULL,
    `insumo` INTEGER NOT NULL,
    `tipo_medicamento` VARCHAR(191) NOT NULL,
    `tipo_ieps` VARCHAR(45) NOT NULL,
    `cantidad_ieps` DOUBLE NOT NULL,
    `sucursalId` INTEGER NOT NULL,

    UNIQUE INDEX `Producto_codigo_sucursalId_key`(`codigo`, `sucursalId`),
    UNIQUE INDEX `Producto_cod_barras_sucursalId_key`(`cod_barras`, `sucursalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idclase_fkey` FOREIGN KEY (`idclase`) REFERENCES `Clase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idmarca_fkey` FOREIGN KEY (`idmarca`) REFERENCES `Marca`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_idmodelo_fkey` FOREIGN KEY (`idmodelo`) REFERENCES `Modelo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_sucursalId_fkey` FOREIGN KEY (`sucursalId`) REFERENCES `Sucursal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
