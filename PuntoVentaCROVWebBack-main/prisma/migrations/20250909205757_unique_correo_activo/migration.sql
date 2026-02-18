/*
  Warnings:

  - A unique constraint covering the columns `[correo,activo]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Usuario_correo_key` ON `usuario`;

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_correo_activo_key` ON `Usuario`(`correo`, `activo`);
