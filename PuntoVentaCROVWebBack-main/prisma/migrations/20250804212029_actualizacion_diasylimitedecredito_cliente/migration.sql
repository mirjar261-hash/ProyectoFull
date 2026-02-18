/*
  Warnings:

  - You are about to alter the column `dias_credito` on the `cliente` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `limite_credito` on the `cliente` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `cliente` MODIFY `dias_credito` INTEGER NULL,
    MODIFY `limite_credito` INTEGER NULL;
