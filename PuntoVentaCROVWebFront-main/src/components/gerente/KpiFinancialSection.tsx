import FinancialSummaryCard from "@/components/gerente/FinancialSummaryCard";
import type { FinancialTableData } from "@/gerente/helpers/financialTable.helper";

interface KpiFinancialSectionProps {
  financialTableDia: FinancialTableData | null;
  financialTableSemana: FinancialTableData | null;
  financialTableMes: FinancialTableData | null;
  currentWeekLabel: string;
}

export default function KpiFinancialSection({
  financialTableDia,
  financialTableSemana,
  financialTableMes,
  currentWeekLabel,
}: KpiFinancialSectionProps) {
  return (
    <>
      <p>
        Principales indicadores financieros (KPIs) que el Gerente CROV te reportará de manera diaria,
        semanal y mensual en tu negocio. El objetivo es garantizar un control financiero adecuado,
        optimizar la rentabilidad y apoyar la toma de decisiones estratégicas.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <FinancialSummaryCard
          title="Ingresos/egresos diarios"
          guideKey="card-kpi-diario"
          data={financialTableDia}
        />
        <FinancialSummaryCard
          title="Ingresos/egresos semanales"
          guideKey="card-kpi-semanal"
          data={financialTableSemana}
          subtitle={`Semana actual: ${currentWeekLabel}`}
        />
        <FinancialSummaryCard
          title="Ingresos/egresos mensuales"
          guideKey="card-kpi-mensual"
          data={financialTableMes}
        />
      </div>
    </>
  );
}
