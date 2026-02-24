import { Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimplePieChart from "@/components/SimplePieChart";

type TopProducto = { productoId: number; nombre: string; cantidadVendida: number };
type PieItem = { label: string; value: number; color: string };

export default function TopProductsCard({
  products,
  pieData,
  topProductosLimit,
  limits,
  onLimitChange,
}: {
  products: TopProducto[];
  pieData: PieItem[];
  topProductosLimit: number;
  limits: number[];
  onLimitChange: (value: number) => void;
}) {
  return (
    <Card data-guide="card-productos-vendidos">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <CardTitle>Productos más vendidos</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={String(topProductosLimit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="5 productos" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black border border-gray-300 shadow-md">
              {limits.map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit} producto{limit === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((producto) => (
                    <TableRow key={producto.productoId}>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell className="text-right">{producto.cantidadVendida}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      No hay ventas registradas durante el periodo seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <SimplePieChart
                data={pieData}
                valueFormatter={(value) => `${value.toLocaleString("es-MX")} unidad${value === 1 ? "" : "es"}`}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center">No hay datos suficientes para generar la gráfica.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
