-- Alter Empresa to store Stripe customer id
ALTER TABLE `Empresa` ADD COLUMN `stripeCustomerId` VARCHAR(191) NULL;