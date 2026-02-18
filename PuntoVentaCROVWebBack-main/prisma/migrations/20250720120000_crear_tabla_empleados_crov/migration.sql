-- CreateTable
CREATE TABLE `empleados_CROV` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre_completo` VARCHAR(191) NOT NULL,
  `fecha_nacimiento` DATE NOT NULL,
  `celular` VARCHAR(191) NOT NULL,
  `correo` VARCHAR(191) NOT NULL,
  `puesto` ENUM('SCRUM_MASTER', 'TESTER', 'DESARROLLADOR', 'VENTAS', 'SLA') NOT NULL,
  `activo` INTEGER NOT NULL DEFAULT 1,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
