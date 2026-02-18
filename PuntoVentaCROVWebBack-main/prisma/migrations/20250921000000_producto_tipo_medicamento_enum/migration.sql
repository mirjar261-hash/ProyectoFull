UPDATE `producto`
SET `tipo_medicamento` = NULL
WHERE `tipo_medicamento` IS NOT NULL
  AND `tipo_medicamento` NOT IN ('ANTIBIOTICO', 'CONTROLADO');

ALTER TABLE `producto`
    MODIFY `tipo_medicamento` ENUM('ANTIBIOTICO', 'CONTROLADO') NULL;
