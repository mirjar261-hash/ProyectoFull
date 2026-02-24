import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type QuickAlertItem = {
  title: string;
  icon: string;
  condition: string;
  action: string;
  isActive: boolean;
  detailText: string | null;
  progress?: number;
};

export default function QuickAlertsPanel({ alerts }: { alerts: QuickAlertItem[] }) {
  return (
    <Card data-guide="tabla-alertas-rapidas">
      <CardHeader>
        <CardTitle>Alertas rápidas automáticas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Estado</TableHead>
              <TableHead className="w-[160px]">Alerta</TableHead>
              <TableHead>Condición de activación</TableHead>
              <TableHead>Acción correctiva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow
                key={alert.title}
                className={alert.isActive ? "bg-red-50/80 transition-colors" : ""}
              >
                <TableCell className="align-top">
                  <Badge
                    className={
                      alert.isActive
                        ? "border border-red-200 bg-red-100 text-red-700"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }
                  >
                    {alert.isActive ? "Activa" : "Estable"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <span className="mr-2 text-xl" aria-hidden="true">
                    {alert.icon}
                  </span>
                  <span className="sr-only">{alert.icon} </span>
                  {alert.title}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-slate-500 mb-1">{alert.condition}</span>
                    <div className="w-full max-w-[120px]">
                      {alert.detailText && (
                        <div className="text-xs font-bold text-slate-700 mb-1">{alert.detailText}</div>
                      )}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            alert.isActive
                              ? (alert.progress || 0) < 50
                                ? "bg-orange-500"
                                : "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${alert.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p>{alert.action}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
