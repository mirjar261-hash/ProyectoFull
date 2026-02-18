/*
  Warnings:

  - You are about to drop the column `sucursalId` on the `distribuidor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Distribuidor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `distribuidor` DROP FOREIGN KEY `Distribuidor_sucursalId_fkey`;

-- DropIndex
DROP INDEX `Distribuidor_sucursalId_activo_nivel_idx` ON `distribuidor`;

-- DropIndex
DROP INDEX `Distribuidor_sucursalId_email_key` ON `distribuidor`;

-- DropIndex
DROP INDEX `Distribuidor_sucursalId_nombre_completo_idx` ON `distribuidor`;

-- AlterTable
ALTER TABLE `distribuidor` DROP COLUMN `sucursalId`;

-- CreateIndex
CREATE UNIQUE INDEX `Distribuidor_email_key` ON `Distribuidor`(`email`);

-- CreateIndex
CREATE INDEX `Distribuidor_activo_nivel_idx` ON `Distribuidor`(`activo`, `nivel`);

-- CreateIndex
CREATE INDEX `Distribuidor_nombre_completo_idx` ON `Distribuidor`(`nombre_completo`);
