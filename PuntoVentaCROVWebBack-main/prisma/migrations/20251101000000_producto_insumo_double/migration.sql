-- Convert producto.insumo to DOUBLE to allow decimal quantities without rounding
ALTER TABLE `pos_web`.`producto`
CHANGE COLUMN `insumo` `insumo` DOUBLE NULL DEFAULT NULL;