import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ManagerialAlertSeverity = "critical" | "warning" | "neutral" | "info" | "stable";

type ManagerialAlertItem = {
  severity: ManagerialAlertSeverity;
  isTriggered: boolean;
  icon: string;
  alert: string;
  condition: string;
  action: string;
  actionDetail?: string;
  statusNote?: string;
  progress?: number;
  detail?: string;
};

type ManagerialAlertStyle = {
  badge: string;
  icon: string;
  label: string;
  row: string;
};

export default function ManagerialAlertsPanel({
  alerts,
  stylesBySeverity,
}: {
  alerts: ManagerialAlertItem[];
  stylesBySeverity: Record<ManagerialAlertSeverity, ManagerialAlertStyle>;
}) {
  return (
    <Card data-guide="tabla-alertas-gerenciales">
      <CardHeader>
        <CardTitle>Panel del gerente: alertas gerenciales automáticas</CardTitle>
        <CardDescription>
          Señales clave monitoreadas de forma continua para anticipar riesgos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Severidad</TableHead>
              <TableHead className="w-[220px]">Alerta</TableHead>
              <TableHead>Condición de activación</TableHead>
              <TableHead>Acción correctiva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alertItem) => {
              const styles = stylesBySeverity[alertItem.severity];
              const shouldHighlightRow =
                alertItem.isTriggered ||
                (alertItem.severity !== "stable" && alertItem.severity !== "info");

              return (
                <TableRow
                  key={alertItem.alert}
                  className={
                    shouldHighlightRow
                      ? `${styles.row} transition-colors`
                      : "transition-colors"
                  }
                >
                  <TableCell className="align-top">
                    <Badge className={`${styles.badge} border px-3 py-1 text-base font-semibold`}>
                      <span aria-hidden="true" className="mr-2 text-xl">
                        {styles.icon}
                      </span>
                      <span className="sr-only">{styles.icon} </span>
                      {styles.label}
                    </Badge>
                    {alertItem.statusNote && (
                      <p className="mt-1 text-xs text-muted-foreground">{alertItem.statusNote}</p>
                    )}
                  </TableCell>
                  <TableCell className="align-top font-medium">{alertItem.alert}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-slate-500 mb-1">{alertItem.condition}</span>
                      {typeof alertItem.progress === "number" && (
                        <div className="w-full max-w-[160px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700">
                              {alertItem.detail ? alertItem.detail.split(": ")[1] : ""}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                alertItem.severity === "critical"
                                  ? "bg-red-500"
                                  : alertItem.severity === "warning"
                                    ? "bg-orange-500"
                                    : alertItem.severity === "neutral"
                                      ? "bg-yellow-400"
                                      : "bg-emerald-500"
                              }`}
                              style={{ width: `${alertItem.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {!alertItem.progress && alertItem.detail && (
                        <span className="text-xs text-slate-600">{alertItem.detail}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {alertItem.action}
                    {alertItem.actionDetail && (
                      <p className="mt-1 text-sm text-muted-foreground">{alertItem.actionDetail}</p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
