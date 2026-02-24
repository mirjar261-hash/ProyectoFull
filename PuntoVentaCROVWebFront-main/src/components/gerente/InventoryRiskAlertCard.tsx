import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Prediccion = { productoId: number; nombre: string; stockEsperado: number };

export default function InventoryRiskAlertCard({ quiebres, diasPrediccion }: { quiebres: Prediccion[]; diasPrediccion: number }) {
  return (
    <Card className="border border-orange-200 bg-orange-50" data-guide="card-alerta-inventario">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle>Alerta de inventario proyectado</CardTitle>
        </div>
        {quiebres.length > 0 && (
          <Badge variant="secondary" className="border border-orange-300 bg-white text-orange-600">
            {quiebres.length} producto{quiebres.length === 1 ? "" : "s"} en riesgo
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {quiebres.length > 0 ? (
          <>
            <p>Se proyecta inventario negativo en {quiebres.length} producto{quiebres.length === 1 ? "" : "s"} durante los próximos {diasPrediccion} días.</p>
            <p className="text-muted-foreground">Revisa el detalle en la pestaña «Inventario e Indicadores Operativos» para priorizar el reabastecimiento.</p>
            <ul className="list-disc pl-5 text-orange-800">
              {quiebres.slice(0, 6).map((q) => (
                <li key={q.productoId}>{q.nombre} ({q.stockEsperado.toFixed(2)})</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted-foreground">No se proyectan quiebres de inventario en el periodo analizado.</p>
        )}
      </CardContent>
    </Card>
  );
}
