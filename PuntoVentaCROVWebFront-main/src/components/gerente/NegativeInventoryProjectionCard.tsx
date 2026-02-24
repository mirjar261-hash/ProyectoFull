import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Prediccion = {
  productoId: number;
  nombre: string;
  promedioDiario: number;
  prediccion: number;
  stockActual: number;
  stockEsperado: number;
};

export default function NegativeInventoryProjectionCard({
  diasPrediccion,
  predicciones,
}: {
  diasPrediccion: number;
  predicciones: Prediccion[];
}) {
  const [search, setSearch] = useState("");

  const prediccionesFiltradas = useMemo(
    () =>
      predicciones.filter((p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase()),
      ),
    [predicciones, search],
  );

  const quiebres = useMemo(
    () => predicciones.filter((p) => p.stockEsperado < 0),
    [predicciones],
  );

  return (
    <Card data-guide="card-proyeccion-quiebre">
      <CardHeader>
        <CardTitle>
          Proyección de inventario negativo (próximos {diasPrediccion} días)
        </CardTitle>
        <CardDescription>
          Identifica productos que podrían presentar quiebre de stock.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:w-72"
          />
          {quiebres.length > 0 && (
            <Badge variant="outline" className="border-red-300 text-red-600">
              {quiebres.length} producto{quiebres.length === 1 ? "" : "s"} con riesgo
            </Badge>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Prom. diario</TableHead>
              <TableHead>Proyección</TableHead>
              <TableHead>Stock actual</TableHead>
              <TableHead>Stock esperado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prediccionesFiltradas.length > 0 ? (
              prediccionesFiltradas.map((prediccion) => (
                <TableRow
                  key={prediccion.productoId}
                  className={prediccion.stockEsperado < 0 ? "bg-red-50/80" : ""}
                >
                  <TableCell>{prediccion.nombre}</TableCell>
                  <TableCell>{prediccion.promedioDiario.toFixed(2)}</TableCell>
                  <TableCell>{prediccion.prediccion.toFixed(2)}</TableCell>
                  <TableCell>{prediccion.stockActual}</TableCell>
                  <TableCell
                    className={
                      prediccion.stockEsperado < 0
                        ? "text-red-600 font-semibold"
                        : "text-slate-700"
                    }
                  >
                    {prediccion.stockEsperado.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay predicciones registradas para el rango seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
