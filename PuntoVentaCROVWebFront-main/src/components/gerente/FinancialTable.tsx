import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FinancialTableData } from "@/app/dashboard/gerente/helpers/financialTable.helper";

const formatCurrency = (value: number | undefined | null) => {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
};

export default function FinancialTable({ data }: { data: FinancialTableData | null }) {
  if (!data) return null;

  return (
    <Table className="w-full table-auto">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[70%]">Indicador</TableHead>
          <TableHead className="w-[30%] text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => {
          let amountClassName = "text-right";
          if (row.isTotal) {
            amountClassName += " text-lg";
            if (typeof row.rawValue === "number") {
              amountClassName += row.rawValue < 0 ? " text-red-600" : " text-green-600";
            }
          } else if (typeof row.rawValue === "number" && row.rawValue < 0) {
            amountClassName += " text-red-600";
          }

          return (
            <TableRow key={row.indicator} className={row.isTotal ? "bg-gray-50 font-semibold text-base" : ""}>
              <TableCell className="w-[70%] whitespace-normal break-words align-top">{row.indicator}</TableCell>
              <TableCell className={`w-[30%] ${amountClassName} whitespace-nowrap align-top`}>{row.displayValue}</TableCell>
            </TableRow>
          );
        })}

        {typeof data.generalTotal === "number" && (
          <TableRow className="bg-gray-100 font-semibold text-base">
            <TableCell className="w-[70%] whitespace-normal break-words align-top text-lg">{data.generalTotalLabel}</TableCell>
            <TableCell
              className={`w-[30%] whitespace-nowrap align-top text-right text-lg ${
                data.generalTotal < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(data.generalTotal)}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
