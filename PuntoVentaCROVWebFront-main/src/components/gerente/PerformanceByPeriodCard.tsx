import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceSummaryRow } from "@/gerente/helpers/rendimiento.helper";

export default function PerformanceByPeriodCard({ rows, formatCurrency }: { rows: PerformanceSummaryRow[]; formatCurrency: (value: number)=>string }) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm" data-guide="tabla-rendimiento">
      <CardHeader className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-sky-500" />
        <CardTitle>Rendimiento comercial por periodo</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Ingresos</TableHead>
                <TableHead>Compras</TableHead>
                <TableHead>Gastos</TableHead>
                <TableHead>Utilidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.periodo}>
                  <TableCell>{row.periodo}</TableCell>
                  <TableCell>{formatCurrency(row.ingresos)}</TableCell>
                  <TableCell>{formatCurrency(row.compras)}</TableCell>
                  <TableCell>{formatCurrency(row.gastos)}</TableCell>
                  <TableCell>{formatCurrency(row.utilidad)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No hay datos suficientes para mostrar el rendimiento comercial.</p>
        )}
      </CardContent>
    </Card>
  );
}
