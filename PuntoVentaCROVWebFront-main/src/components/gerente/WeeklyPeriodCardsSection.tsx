import type { RefObject } from "react";
import DiscountSalesCard from "@/components/gerente/DiscountSalesCard";
import WeeklyReturnsDetailCard from "@/components/gerente/WeeklyReturnsDetailCard";

type WeeklyItem = {
  label: string;
  total: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
};

interface WeeklyPeriodCardsSectionProps {
  containerRef: RefObject<HTMLDivElement | null>;
  loadingReturns: boolean;
  returnsError: string | null;
  returnsItems: WeeklyItem[];
  returnsTotal: number;
  loadingDiscounts: boolean;
  discountsError: string | null;
  discountsItems: WeeklyItem[];
  discountsTotal: number;
  hasDiscountSales: boolean;
  formatCurrency: (value: number) => string;
}

export default function WeeklyPeriodCardsSection({
  containerRef,
  loadingReturns,
  returnsError,
  returnsItems,
  returnsTotal,
  loadingDiscounts,
  discountsError,
  discountsItems,
  discountsTotal,
  hasDiscountSales,
  formatCurrency,
}: WeeklyPeriodCardsSectionProps) {
  return (
    <div ref={containerRef} className="space-y-6">
      <WeeklyReturnsDetailCard
        loading={loadingReturns}
        error={returnsError}
        items={returnsItems}
        total={returnsTotal}
        formatCurrency={formatCurrency}
      />

      <DiscountSalesCard
        loading={loadingDiscounts}
        error={discountsError}
        items={discountsItems}
        total={discountsTotal}
        hasDiscountSales={hasDiscountSales}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
