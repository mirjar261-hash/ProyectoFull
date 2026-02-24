export type WeeklyRangeItem = {
  weekIndex?: number;
  monthKey?: string;
  rangeStartTime?: number;
  rangeEndTime?: number;
  detail?: string;
  label?: string;
};

const toDate = (value?: number) => {
  if (typeof value !== "number") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const monthShort = (date: Date) =>
  capitalize(
    date
      .toLocaleDateString("es-MX", { month: "short" })
      .replace(".", ""),
  );

export const formatWeekLabel = (item: WeeklyRangeItem) => {
  if (typeof item.weekIndex === "number") {
    const endDate = toDate(item.rangeEndTime) ?? toDate(item.rangeStartTime);
    const suffix = endDate ? ` ${monthShort(endDate)}` : "";
    return `Semana ${item.weekIndex}${suffix}`;
  }

  return item.label ?? "Semana";
};

export const formatWeekRange = (item: WeeklyRangeItem) => {
  const start = toDate(item.rangeStartTime);
  const end = toDate(item.rangeEndTime);

  if (!start || !end) {
    return item.detail ?? "—";
  }

  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`.replaceAll(".", "");
};
