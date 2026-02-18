-- CreateTable
CREATE TABLE `HistorialPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `token_plan` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `HistorialPlan_empresaId_creadoEn_idx` ON `HistorialPlan`(`empresaId`, `creadoEn`);

-- AddForeignKey
ALTER TABLE `HistorialPlan` ADD CONSTRAINT `HistorialPlan_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
