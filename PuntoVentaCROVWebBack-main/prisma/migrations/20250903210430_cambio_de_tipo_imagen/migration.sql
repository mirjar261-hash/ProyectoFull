/*
  Warnings:

  - You are about to alter the column `imagen` on the `producto` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `Text`.

*/
-- AlterTable
ALTER TABLE `producto` MODIFY `imagen` TEXT NULL;
