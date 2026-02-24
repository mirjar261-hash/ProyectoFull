import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetasIA = {
  metaDiaria: number;
  metaSemanal: number;
  metaMensual: number;
  metaExtraordinaria: number;
  hayExtraordinaria: boolean;
};

type KpisBase = { ventasTotales: number } | null;
type KpisSemana = { porcentajeDevoluciones: number; ventasTotales: number } | null;
type ImpactoDevoluciones = { tasaDevolucion: number } | null;

type CurrencyFormatter = (value: number | undefined | null) => string;

export function MetaDiariaCard({
  metasIA,
  kpisDia,
  formatCurrency,
}: {
  metasIA: MetasIA;
  kpisDia: KpisBase;
  formatCurrency: CurrencyFormatter;
}) {
  return (
    <Card className="border-slate-200 shadow-sm" data-guide="card-meta-diaria">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Meta Diaria</CardTitle>
        <CardDescription>Objetivo hoy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(kpisDia?.ventasTotales)}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Meta: {formatCurrency(metasIA.metaDiaria)}
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-1000 ${(kpisDia?.ventasTotales || 0) >= metasIA.metaDiaria ? "bg-emerald-500" : "bg-orange-500"}`}
            style={{ width: `${Math.min(((kpisDia?.ventasTotales || 0) / (metasIA.metaDiaria || 1)) * 100, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetaSemanalCard({
  metasIA,
  kpisSemana,
  formatCurrency,
}: {
  metasIA: MetasIA;
  kpisSemana: KpisSemana;
  formatCurrency: CurrencyFormatter;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Meta Semanal</CardTitle>
        <CardDescription>Acumulado 6 días</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(kpisSemana?.ventasTotales)}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Meta: {formatCurrency(metasIA.metaSemanal)}
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-blue-500 h-full transition-all duration-1000"
            style={{ width: `${Math.min(((kpisSemana?.ventasTotales || 0) / (metasIA.metaSemanal || 1)) * 100, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetaMensualCard({
  metasIA,
  kpisMes,
  formatCurrency,
}: {
  metasIA: MetasIA;
  kpisMes: KpisBase;
  formatCurrency: CurrencyFormatter;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-semibold">Meta Mensual</CardTitle>
            <CardDescription>{metasIA.hayExtraordinaria ? "Meses normales" : "Promedio histórico"}</CardDescription>
          </div>
          {metasIA.hayExtraordinaria && (
            <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">
              Extra: {formatCurrency(metasIA.metaExtraordinaria)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold text-slate-800">{formatCurrency(kpisMes?.ventasTotales)}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Meta: {formatCurrency(metasIA.metaMensual)}
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
          <div
            className="bg-indigo-500 h-full transition-all duration-1000"
            style={{ width: `${Math.min(((kpisMes?.ventasTotales || 0) / (metasIA.metaMensual || 1)) * 100, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DevolucionesCard({
  kpisSemana,
  impactoDevoluciones,
}: {
  kpisSemana: KpisSemana;
  impactoDevoluciones: ImpactoDevoluciones;
}) {
  if (!kpisSemana) return null;

  return (
    <Card
      className={kpisSemana.porcentajeDevoluciones > 5 ? "border-red-500" : "border-green-500"}
      data-guide="card-devoluciones-semanales"
    >
      <CardHeader className="pb-2 flex flex-row justify-between">
        <CardTitle className="text-base font-semibold">Devoluciones</CardTitle>
        <AlertTriangle className={kpisSemana.porcentajeDevoluciones > 5 ? "text-red-500 h-5 w-5" : "text-green-500 h-5 w-5"} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <span className={`text-3xl font-bold ${(impactoDevoluciones?.tasaDevolucion || 0) >= 30 ? "text-red-600" : "text-slate-800"}`}>
            {(impactoDevoluciones?.tasaDevolucion || 0).toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground">Máx: 30.0%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${(impactoDevoluciones?.tasaDevolucion || 0) >= 30 ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(((impactoDevoluciones?.tasaDevolucion || 0) / 30) * 100, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MetasImpactoCards({
  metasIA,
  kpisDia,
  kpisSemana,
  kpisMes,
  impactoDevoluciones,
  formatCurrency,
}: {
  metasIA: MetasIA | null;
  kpisDia: KpisBase;
  kpisSemana: KpisSemana;
  kpisMes: KpisBase;
  impactoDevoluciones: ImpactoDevoluciones;
  formatCurrency: CurrencyFormatter;
}) {
  if (!metasIA) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      <MetaDiariaCard metasIA={metasIA} kpisDia={kpisDia} formatCurrency={formatCurrency} />
      <MetaSemanalCard metasIA={metasIA} kpisSemana={kpisSemana} formatCurrency={formatCurrency} />
      <MetaMensualCard metasIA={metasIA} kpisMes={kpisMes} formatCurrency={formatCurrency} />
      <DevolucionesCard kpisSemana={kpisSemana} impactoDevoluciones={impactoDevoluciones} />
    </div>
  );
}
