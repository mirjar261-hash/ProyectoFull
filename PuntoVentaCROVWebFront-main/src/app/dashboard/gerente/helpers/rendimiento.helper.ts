export type KpisMesLike = {
  ventasTotales: number;
  totalCompras: number;
  totalGastos: number;
};

export type PerformanceSummaryRow = {
  periodo: string;
  ingresos: number;
  compras: number;
  gastos: number;
  utilidad: number;
};

export const buildPerformanceSummaryRows = (
  kpisMes: KpisMesLike | null,
  referenceDate = new Date(),
): PerformanceSummaryRow[] => {
  if (!kpisMes) return [];

  const dayOfMonth = Math.max(1, referenceDate.getDate());
  const elapsedWeeksInMonth = Math.max(1, Math.ceil(dayOfMonth / 7));

  const diarioIngresos = kpisMes.ventasTotales / dayOfMonth;
  const diarioCompras = kpisMes.totalCompras / dayOfMonth;
  const diarioGastos = kpisMes.totalGastos / dayOfMonth;

  const semanalIngresos = kpisMes.ventasTotales / elapsedWeeksInMonth;
  const semanalCompras = kpisMes.totalCompras / elapsedWeeksInMonth;
  const semanalGastos = kpisMes.totalGastos / elapsedWeeksInMonth;

  return [
    {
      periodo: 'Diario',
      ingresos: diarioIngresos,
      compras: diarioCompras,
      gastos: diarioGastos,
      utilidad: diarioIngresos - diarioCompras - diarioGastos,
    },
    {
      periodo: 'Semanal',
      ingresos: semanalIngresos,
      compras: semanalCompras,
      gastos: semanalGastos,
      utilidad: semanalIngresos - semanalCompras - semanalGastos,
    },
    {
      periodo: 'Mensual',
      ingresos: kpisMes.ventasTotales,
      compras: kpisMes.totalCompras,
      gastos: kpisMes.totalGastos,
      utilidad: kpisMes.ventasTotales - kpisMes.totalCompras - kpisMes.totalGastos,
    },
  ];
};
