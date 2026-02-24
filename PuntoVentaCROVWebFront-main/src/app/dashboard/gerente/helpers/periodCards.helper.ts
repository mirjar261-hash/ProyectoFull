export type WeeklyItem = {
  label: string;
  total: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
};

export const filterWeeklyItems = (
  items: WeeklyItem[],
  {
    periodoStartTime,
    periodoEndTime,
    selectedMonth,
    selectedWeeksSet,
    shouldFilterByWeeks,
  }: {
    periodoStartTime: number | null;
    periodoEndTime: number | null;
    selectedMonth: string;
    selectedWeeksSet: Set<number>;
    shouldFilterByWeeks: boolean;
  },
) =>
  items.filter((item) => {
    const matchesDateRange =
      periodoStartTime === null || periodoEndTime === null
        ? true
        : item.rangeStartTime <= periodoEndTime && item.rangeEndTime >= periodoStartTime;

    const matchesSelectedWeeks = shouldFilterByWeeks
      ? item.monthKey === selectedMonth && selectedWeeksSet.has(item.weekIndex - 1)
      : true;

    return matchesDateRange && matchesSelectedWeeks;
  });

export const buildPeriodCardsState = ({
  devoluciones,
  descuentos,
  periodoStartTime,
  periodoEndTime,
  selectedMonth,
  selectedWeeksSet,
  shouldFilterByWeeks,
}: {
  devoluciones: WeeklyItem[];
  descuentos: WeeklyItem[];
  periodoStartTime: number | null;
  periodoEndTime: number | null;
  selectedMonth: string;
  selectedWeeksSet: Set<number>;
  shouldFilterByWeeks: boolean;
}) => {
  const common = {
    periodoStartTime,
    periodoEndTime,
    selectedMonth,
    selectedWeeksSet,
    shouldFilterByWeeks,
  };

  const devolucionesFiltradas = filterWeeklyItems(devoluciones, common);
  const descuentosFiltrados = filterWeeklyItems(descuentos, common);

  return {
    devolucionesFiltradas,
    descuentosFiltrados,
  };
};
