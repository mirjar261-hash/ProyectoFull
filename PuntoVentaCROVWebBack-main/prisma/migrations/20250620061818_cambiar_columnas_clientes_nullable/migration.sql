/*
  Warnings:

  - You are about to drop the column `dias_credito` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_nacimiento` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `limite_credito` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `numero_cliente` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `saldo_inicial` on the `cliente` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_precio` on the `cliente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cliente` DROP COLUMN `dias_credito`,
    DROP COLUMN `fecha_nacimiento`,
    DROP COLUMN `limite_credito`,
    DROP COLUMN `numero_cliente`,
    DROP COLUMN `saldo_inicial`,
    DROP COLUMN `tipo_precio`,
    MODIFY `movil` VARCHAR(191) NULL,
    MODIFY `nom_contacto` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `razon_social_facturacion` VARCHAR(191) NULL,
    MODIFY `rfc_facturacion` VARCHAR(191) NULL,
    MODIFY `curp_facturacion` VARCHAR(191) NULL,
    MODIFY `domicilio_facturacion` VARCHAR(191) NULL,
    MODIFY `no_ext_facturacion` VARCHAR(191) NULL,
    MODIFY `no_int_facturacion` VARCHAR(191) NULL,
    MODIFY `cp_facturacion` VARCHAR(191) NULL,
    MODIFY `colonia_facturacion` VARCHAR(191) NULL,
    MODIFY `ciudad_facturacion` VARCHAR(191) NULL,
    MODIFY `localidad_facturacion` VARCHAR(191) NULL,
    MODIFY `estado_facturacion` VARCHAR(191) NULL,
    MODIFY `pais_facturacion` VARCHAR(191) NULL,
    MODIFY `regimen_fiscal` INTEGER NULL;
