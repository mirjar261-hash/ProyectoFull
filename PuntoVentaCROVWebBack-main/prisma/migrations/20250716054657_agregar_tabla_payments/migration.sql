-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentIntentId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `created` DATETIME(3) NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `orderId` INTEGER NULL,
    `empresaId` INTEGER NULL,
    `cardLast4` VARCHAR(191) NULL,
    `cardBrand` VARCHAR(191) NULL,
    `cardCountry` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
