import { TrendingUp, ShoppingCart, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PrediccionMonto = {
  totalUltimos30Dias: number;
  promedioDiario: number;
  prediccion: number;
};

export default function ProjectionCardsRow({
  diasPrediccion,
  predVentas,
  predCompras,
  predGastos,
  formatCurrency,
}: {
  diasPrediccion: number;
  predVentas: PrediccionMonto | null;
  predCompras: PrediccionMonto | null;
  predGastos: PrediccionMonto | null;
  formatCurrency: (value: number | undefined | null) => string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3" data-guide="grid-proyecciones">
      <Card data-guide="card-pred-ventas">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Proyección de ventas (próximos {diasPrediccion} días)</CardTitle>
          <TrendingUp className="text-green-500" />
        </CardHeader>
        <CardContent>{predVentas ? <div className="space-y-2 text-sm"><p>Total de ventas últimos 30 días: {formatCurrency(predVentas.totalUltimos30Dias)}</p><p>Promedio de ventas diario: {formatCurrency(predVentas.promedioDiario)}</p><p>Proyección de ventas: {formatCurrency(predVentas.prediccion)}</p></div> : <p className="text-sm text-muted-foreground">Sin información disponible.</p>}</CardContent>
      </Card>
      <Card data-guide="card-pred-compras">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Proyección de compras (próximos {diasPrediccion} días)</CardTitle>
          <ShoppingCart className="text-yellow-500" />
        </CardHeader>
        <CardContent>{predCompras ? <div className="space-y-2 text-sm"><p>Total de compras últimos 30 días: {formatCurrency(predCompras.totalUltimos30Dias)}</p><p>Promedio de compras diario: {formatCurrency(predCompras.promedioDiario)}</p><p>Proyección de compras: {formatCurrency(predCompras.prediccion)}</p></div> : <p className="text-sm text-muted-foreground">Sin información disponible.</p>}</CardContent>
      </Card>
      <Card data-guide="card-pred-gastos">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Proyección de gastos (próximos {diasPrediccion} días)</CardTitle>
          <Wallet className="text-red-500" />
        </CardHeader>
        <CardContent>{predGastos ? <div className="space-y-2 text-sm"><p>Total de gastos últimos 30 días: {formatCurrency(predGastos.totalUltimos30Dias)}</p><p>Promedio de gastos diario: {formatCurrency(predGastos.promedioDiario)}</p><p>Proyección de gastos: {formatCurrency(predGastos.prediccion)}</p></div> : <p className="text-sm text-muted-foreground">Sin información disponible.</p>}</CardContent>
      </Card>
    </div>
  );
}
