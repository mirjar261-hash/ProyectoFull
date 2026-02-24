import { Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import WeeklyAmountBarChart from "@/components/gerente/WeeklyAmountBarChart";
import { formatWeekLabel, formatWeekRange } from "@/components/gerente/weeklyDisplay.helper";

type WeeklyItem = {
  label: string;
  total: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
};

export default function DiscountSalesCard({
  loading,
  error,
  items,
  total,
  hasDiscountSales,
  formatCurrency,
}: {
  loading: boolean;
  error: string | null;
  items?: WeeklyItem[];
  total: number;
  hasDiscountSales: boolean;
  formatCurrency: (value: number) => string;
}) {
  const safeItems = Array.isArray(items) ? items : [];

  const displayItems = safeItems.map((item) => ({
    ...item,
    displayLabel: formatWeekLabel(item),
    displayRange: formatWeekRange(item),
  }));

  const chartData = displayItems.map((item) => ({
    label: item.displayLabel,
    value: item.total,
    detail: item.displayRange,
  }));

  return (
    <Card data-guide="card-descuentos">
      <CardHeader className="flex items-center gap-2">
        <Percent className="h-5 w-5 text-purple-500" />
        <CardTitle>Ventas con descuento</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto max-h-[400px]">
          {loading ? (
            <p className="text-sm text-muted-foreground">Procesando datos...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : displayItems.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item) => (
                    <TableRow key={`${item.monthKey}-W${item.weekIndex}`}>
                      <TableCell>{item.displayLabel}</TableCell>
                      <TableCell>{item.displayRange}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-right text-sm font-semibold">Total acumulado: {formatCurrency(total)}</div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No hay información disponible para el periodo seleccionado.</p>
          )}
        </div>

        <div className="flex flex-col justify-center w-full overflow-hidden">
          {loading ? (
            <p className="text-sm text-muted-foreground">Procesando datos...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : displayItems.length > 0 ? (
            <>
              <div className="w-full overflow-x-auto pb-2">
                <div style={{ minWidth: `${Math.max(400, displayItems.length * 80)}px` }}>
                  <WeeklyAmountBarChart
                    items={chartData}
                    gradient="from-purple-400 to-indigo-500"
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                </div>
              </div>
              {!hasDiscountSales && (
                <p className="text-xs text-muted-foreground text-center mt-2">No se registraron ventas con descuento en el periodo seleccionado.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No hay ventas con descuento en el periodo seleccionado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
