import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SimplePieChart from "@/components/SimplePieChart";

type ProductoBajaRotacion = {
  id: number;
  nombre: string;
  existencia: number;
  ultimaVenta: string | null;
  ultimaCompra: string | null;
  diasSinVenta: number;
};

type Props = {
  items: ProductoBajaRotacion[];
  limit: number;
  limits: number[];
  onLimitChange: (next: number) => void;
};

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6"];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const buildPieData = (items: ProductoBajaRotacion[], limit: number) => {
  const base = items.slice(0, limit).filter((p) => p.existencia > 0);

  if (base.length > 6) {
    const top = base.slice(0, 5).map((prod, index) => ({
      label: prod.nombre.length > 15 ? `${prod.nombre.substring(0, 15)}...` : prod.nombre,
      value: prod.existencia,
      color: PIE_COLORS[index],
    }));

    const otrosTotal = base.slice(5).reduce((acc, p) => acc + p.existencia, 0);

    return [
      ...top,
      {
        label: `Otros (${base.length - 5} prod.)`,
        value: otrosTotal,
        color: "#cbd5e1",
      },
    ];
  }

  return base.map((prod, index) => ({
    label: prod.nombre.length > 15 ? `${prod.nombre.substring(0, 15)}...` : prod.nombre,
    value: prod.existencia,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));
};

export default function LowRotationProductsCard({
  items,
  limit,
  limits,
  onLimitChange,
}: Props) {
  const pieData = buildPieData(items, limit);
  const hasPieData = pieData.length > 0;

  return (
    <Card data-guide="card-productos-menos-vendidos">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle>Productos de Baja Rotación (Histórico)</CardTitle>
            <CardDescription>Productos estancados desde su llegada al inventario.</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="w-full sm:w-[130px] bg-white">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-md z-50">
              {limits.map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num} registros
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="overflow-x-auto max-h-[400px] rounded-md border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-700 min-w-[150px]">Producto</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Existencia</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Última Venta</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Última Compra</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Días sin mov.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.slice(0, limit).map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-medium text-slate-700">{prod.nombre}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {prod.existencia}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(prod.ultimaVenta) ?? <span className="text-slate-400 italic">Nunca</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(prod.ultimaCompra) ?? <span className="text-slate-400 italic">---</span>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold ${prod.diasSinVenta > 90 ? "text-red-600" : "text-orange-600"}`}>
                          {prod.diasSinVenta} días
                        </span>
                        {prod.diasSinVenta > 90 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron productos estancados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-center min-h-[300px]">
          {hasPieData ? (
            <SimplePieChart
              data={pieData}
              valueFormatter={(value) =>
                `${value.toLocaleString("es-MX")} unidad${value === 1 ? "" : "es"}`
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm text-muted-foreground">
                {items.length > 0
                  ? "Los productos estancados no tienen existencias físicas."
                  : "Sin datos suficientes para la gráfica."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
