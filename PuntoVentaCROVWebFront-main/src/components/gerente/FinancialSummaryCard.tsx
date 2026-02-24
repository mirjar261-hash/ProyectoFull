import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FinancialTable from "@/components/gerente/FinancialTable";
import type { FinancialTableData } from "@/app/dashboard/gerente/helpers/financialTable.helper";

interface FinancialSummaryCardProps {
  title: string;
  guideKey: string;
  data: FinancialTableData | null;
  subtitle?: string;
}

export default function FinancialSummaryCard({
  title,
  guideKey,
  data,
  subtitle,
}: FinancialSummaryCardProps) {
  return (
    <Card data-guide={guideKey}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {subtitle && data && <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>}
        <FinancialTable data={data} />
      </CardContent>
    </Card>
  );
}
