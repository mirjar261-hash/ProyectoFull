type Item = {
  label: string;
  value: number | string;
  detail?: string;
};

const toNumericValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[$,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function WeeklyAmountBarChart({
  items,
  gradient,
  valueFormatter,
}: {
  items: Item[];
  gradient: string;
  valueFormatter: (value: number) => string;
}) {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        label: String(item?.label ?? "Sin etiqueta"),
        value: toNumericValue(item?.value),
      }))
    : [];

  if (!normalizedItems.length) {
    return <p className="text-sm text-muted-foreground text-center">Sin barras para graficar.</p>;
  }

  const gradientByKey: Record<string, string> = {
    "from-sky-400 to-emerald-500": "linear-gradient(to top, #38bdf8, #10b981)",
    "from-purple-400 to-indigo-500": "linear-gradient(to top, #c084fc, #6366f1)",
  };
  const barBackground = gradientByKey[gradient] ?? "linear-gradient(to top, #60a5fa, #34d399)";

  const maxValue = Math.max(...normalizedItems.map((item) => item.value), 1);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-6 px-4 min-w-max items-end h-56">
        {normalizedItems.map((item, idx) => {
          const barHeight = Math.max((item.value / maxValue) * 100, 2);
          return (
            <div key={`${item.label}-${idx}`} className="flex flex-col items-center flex-none min-w-[96px]">
              <div className="h-40 flex items-end w-full justify-center relative">
                <div
                  className="w-12 rounded-t-md transition-all duration-500 opacity-90 shadow-sm border border-black/5"
                  style={{
                    height: `${barHeight}%`,
                    minHeight: "6px",
                    background: barBackground,
                  }}
                  title={`${item.detail ?? item.label}: ${valueFormatter(item.value)}`}
                />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-700">{valueFormatter(item.value)}</span>
              <span className="text-[10px] font-medium text-slate-500 text-center uppercase tracking-wide mt-1">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
