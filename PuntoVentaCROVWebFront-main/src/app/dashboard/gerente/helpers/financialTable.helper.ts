export type PeriodKey = "día" | "semana" | "mes";

export type FinancialRow = {
  indicator: string;
  displayValue: string;
  isTotal?: boolean;
  rawValue?: number;
};

export type FinancialTableData = {
  rows: FinancialRow[];
  generalTotalLabel: string;
  generalTotal: number | null;
};

type KpisFinancialBase = {
  ventasTotales: number;
  ticketPromedio: number;
  numeroTransacciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalCheque: number;
  totalVale: number;
  totalCredito: number;
  porcentajeDevoluciones: number;
  totalCompras: number;
  totalGastos: number;
};

const PERIOD_CONFIG: Record<
  PeriodKey,
  {
    totalIndicator: string;
    generalLabel: string;
  }
> = {
  día: {
    totalIndicator: "Ventas totales del día",
    generalLabel: "Total general diario",
  },
  semana: {
    totalIndicator: "Ventas totales de la semana",
    generalLabel: "Total general semanal",
  },
  mes: {
    totalIndicator: "Ventas totales del mes",
    generalLabel: "Total general mensual",
  },
};

const formatCurrency = (value: number | undefined | null) => {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
};

export const buildFinancialTableData = (
  kpis: KpisFinancialBase,
  period: PeriodKey,
): FinancialTableData => {
  const periodConfig = PERIOD_CONFIG[period];
  const totalBancos = kpis.totalTransferencia + kpis.totalTarjeta;

  const rows: FinancialRow[] = [
    { indicator: "Venta promedio", displayValue: formatCurrency(kpis.ticketPromedio) },
    { indicator: "Ventas en efectivo", displayValue: formatCurrency(kpis.totalEfectivo) },
    { indicator: "Ventas por transferencia", displayValue: formatCurrency(kpis.totalTransferencia) },
    { indicator: "Ventas por tarjeta", displayValue: formatCurrency(kpis.totalTarjeta) },
    { indicator: "Total en bancos", displayValue: formatCurrency(totalBancos) },
    { indicator: "Ventas por cheque", displayValue: formatCurrency(kpis.totalCheque) },
    { indicator: "Ventas con vales", displayValue: formatCurrency(kpis.totalVale) },
    { indicator: "Total de venta a crédito", displayValue: formatCurrency(kpis.totalCredito) },
    { indicator: "% de devoluciones sobre ventas", displayValue: `${kpis.porcentajeDevoluciones.toFixed(2)}%` },
    { indicator: "Número de ventas", displayValue: kpis.numeroTransacciones.toLocaleString("es-MX") },
    {
      indicator: periodConfig.totalIndicator,
      displayValue: formatCurrency(kpis.ventasTotales),
      rawValue: kpis.ventasTotales,
      isTotal: true,
    },
    {
      indicator: "Total en compras",
      displayValue: formatCurrency(-kpis.totalCompras),
      rawValue: -kpis.totalCompras,
      isTotal: true,
    },
    {
      indicator: "Total en gastos",
      displayValue: formatCurrency(-kpis.totalGastos),
      rawValue: -kpis.totalGastos,
      isTotal: true,
    },
  ];

  const generalTotal = rows
    .filter((row) => row.isTotal)
    .reduce((sum, row) => sum + (row.rawValue ?? 0), 0);

  return {
    rows,
    generalTotalLabel: periodConfig.generalLabel,
    generalTotal,
  };
};
