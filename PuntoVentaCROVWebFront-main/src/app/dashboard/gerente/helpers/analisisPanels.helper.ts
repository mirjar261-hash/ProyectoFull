export type WeeklyPanelItem = {
  label: string;
  total: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
};

export const mapWeeklyToBarChart = (items: WeeklyPanelItem[]) =>
  items.map((item) => ({
    label: item.label,
    value: item.total,
    detail: item.detail,
  }));

export const sumWeeklyTotals = (items: WeeklyPanelItem[]) =>
  items.reduce((acc, item) => acc + item.total, 0);

export const hasPositiveTotals = (items: WeeklyPanelItem[]) =>
  items.some((item) => item.total > 0);

export const withSequentialWeekLabels = <T extends { label: string }>(items: T[]) =>
  items.map((item, index) => ({
    ...item,
    label: `Semana ${index + 1}`,
  }));

export const buildTopProductosPieData = (
  items: { nombre: string; cantidadVendida: number }[],
  colors: string[],
) =>
  items.map((producto, index) => ({
    label: producto.nombre,
    value: Number(producto.cantidadVendida ?? 0),
    color: colors[index % colors.length],
  }));
