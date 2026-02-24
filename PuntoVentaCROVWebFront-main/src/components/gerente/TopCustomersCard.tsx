import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleBarChart from "@/components/SimpleBarChart";

type TopCliente = { clienteId: number; nombre: string; compras: number; totalVendido: number };
type BarItem = { label: string; value: number; detail?: string };

export default function TopCustomersCard({
  customers,
  ingresosBarChartData,
  formatCurrency,
  periodo,
  onPeriodoChange,
}: {
  customers: TopCliente[];
  ingresosBarChartData: BarItem[];
  formatCurrency: (value: number) => string;
  periodo: "historico" | "1m" | "2m";
  onPeriodoChange: (value: "historico" | "1m" | "2m") => void;
}) {
  return (
    <Card data-guide="card-mejores-clientes">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          <CardTitle>Mejores clientes</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Periodo</span>
          <Select value={periodo} onValueChange={(value) => onPeriodoChange(value as "historico" | "1m" | "2m") }>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Histórico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="historico">Histórico</SelectItem>
              <SelectItem value="1m">Último mes</SelectItem>
              <SelectItem value="2m">Últimos 2 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50">
                <TableHead className="uppercase tracking-wide text-amber-900 font-bold text-center">Cliente</TableHead>
                <TableHead className="uppercase tracking-wide text-amber-900 font-bold text-center">Compras</TableHead>
                <TableHead className="uppercase tracking-wide text-amber-900 font-bold text-right">Total gastado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? (
                customers.map((cliente) => (
                  <TableRow key={cliente.clienteId}>
                    <TableCell className="font-semibold text-slate-700 text-center">{cliente.nombre}</TableCell>
                    <TableCell className="text-center">{cliente.compras}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(cliente.totalVendido))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No hay clientes destacados para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div data-guide="chart-ventas-semanales">
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Ventas semanales del periodo</h4>
          {ingresosBarChartData.length > 0 ? (
            <SimpleBarChart data={ingresosBarChartData} gradient="from-indigo-400 to-blue-500" valueFormatter={(value) => formatCurrency(value)} />
          ) : (
            <p className="text-sm text-muted-foreground text-center">No hay ventas registradas en las semanas seleccionadas.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
