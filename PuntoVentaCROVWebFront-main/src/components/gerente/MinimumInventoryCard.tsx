import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Producto = {
  id: number;
  nombre: string;
  cantidad_existencia: number;
  stock_min: number;
};

type Props = {
  products: Producto[];
  limit: number;
  limits: number[];
  onLimitChange: (next: number) => void;
  colors: string[];
};

export default function MinimumInventoryCard({
  products,
  limit,
  limits,
  onLimitChange,
  colors,
}: Props) {
  const filteredProducts = useMemo(
    () => products.slice(0, limit),
    [products, limit],
  );

  const pieData = useMemo(
    () =>
      filteredProducts.map((producto, index) => ({
        label: producto.nombre,
        value: Number(producto.cantidad_existencia),
        color: colors[index % colors.length],
      })),
    [filteredProducts, colors],
  );

  return (
    <Card data-guide="card-stock-minimo">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle>Productos con inventario mínimo</CardTitle>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="10 registros" />
            </SelectTrigger>
            <SelectContent>
              {limits.map((itemLimit) => (
                <SelectItem key={itemLimit} value={String(itemLimit)}>
                  {itemLimit} registro{itemLimit === 1 ? "" : "s"}
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
                  <TableHead>Existencia</TableHead>
                  <TableHead>Stock mín.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{producto.cantidad_existencia}</Badge>
                      </TableCell>
                      <TableCell>{producto.stock_min}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      No hay productos con inventario mínimo.
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
                valueFormatter={(value) => {
                  const unidades = value === 1 ? "existencia" : "existencias";
                  return `${value.toLocaleString("es-MX")} ${unidades}`;
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No hay datos suficientes para generar la gráfica.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
