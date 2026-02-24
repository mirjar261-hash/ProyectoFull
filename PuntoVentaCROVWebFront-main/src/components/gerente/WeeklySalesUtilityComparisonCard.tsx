import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WeeklyComparisonChart from "@/components/WeeklyComparisonChart";
import { formatWeekLabel, formatWeekRange } from "@/components/gerente/weeklyDisplay.helper";

type Item = {
  label: string;
  ventas: number;
  utilidad: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
};

export default function WeeklySalesUtilityComparisonCard({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: string | null;
  data: Item[];
}) {
  const chartData = data.map((item) => ({
    label: formatWeekLabel(item),
    detail: formatWeekRange(item),
    ventas: item.ventas,
    utilidad: item.utilidad,
  }));

  return (
    <Card className="bg-white border border-slate-200 shadow-sm" data-guide="chart-comparativa">
      <CardHeader className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5 text-cyan-500" />
        <CardTitle>Comparativa semanal de ventas y utilidad</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Procesando datos...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <WeeklyComparisonChart data={chartData} />
        )}
      </CardContent>
    </Card>
  );
}
