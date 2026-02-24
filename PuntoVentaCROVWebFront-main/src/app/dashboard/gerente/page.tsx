"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GuideArrowOverlay from "@/components/GuideArrows";
import GuideModal, { GuideStep } from "@/components/GuideModal";
import { BookOpen, ChevronDown, Video, PlayCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SimpleBarChart from "@/components/SimpleBarChart";
import SimplePieChart from "@/components/SimplePieChart";
import SimpleRadarChart, { SimpleRadarDatum,} from "@/components/SimpleRadarChart";
import KpiFinancialSection from "@/components/gerente/KpiFinancialSection";
import WeeklyPeriodCardsSection from "@/components/gerente/WeeklyPeriodCardsSection";
import MetasImpactoCards from "@/components/gerente/MetasImpactoCards";
import ManagerialAlertsPanel from "@/components/gerente/ManagerialAlertsPanel";
import QuickAlertsPanel from "@/components/gerente/QuickAlertsPanel";
import TopCustomersCard from "@/components/gerente/TopCustomersCard";
import TopProductsCard from "@/components/gerente/TopProductsCard";
import ProjectionCardsRow from "@/components/gerente/ProjectionCardsRow";
import InventoryRiskAlertCard from "@/components/gerente/InventoryRiskAlertCard";
import MinimumInventoryCard from "@/components/gerente/MinimumInventoryCard";
import NegativeInventoryProjectionCard from "@/components/gerente/NegativeInventoryProjectionCard";
import PerformanceByPeriodCard from "@/components/gerente/PerformanceByPeriodCard";
import WeeklySalesUtilityComparisonCard from "@/components/gerente/WeeklySalesUtilityComparisonCard";
import LowRotationProductsCard from "@/components/gerente/LowRotationProductsCard";
import { buildFinancialTableData } from "@/app/dashboard/gerente/helpers/financialTable.helper";
import { fetchGerenteResumenData } from "@/app/dashboard/gerente/helpers/gerenteDashboardClient.helper";
import { buildTopProductosPieData, hasPositiveTotals, sumWeeklyTotals }
 from "@/app/dashboard/gerente/helpers/analisisPanels.helper";
import { buildPeriodCardsState } from "@/app/dashboard/gerente/helpers/periodCards.helper";
import { buildPerformanceSummaryRows } from "@/app/dashboard/gerente/helpers/rendimiento.helper";
import useGerenteDashboard from "@/app/dashboard/gerente/hooks/useGerenteDashboard";
//import DailyComparisonChart from '@/components/DailyComparisonChart'

import GerenteChatDialog from "@/components/GerenteChatDialog";

import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  ArrowDownCircle,
  Activity,
  RotateCcw,
  Percent,
  AlertTriangle,
  Crown,
  Users,
  Lightbulb,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";

interface Venta {
  id: number;
  folio?: string;
  numdoc: string;
  total: number;
  fecha: string;
  estado: string;
  fecha_devolucion?: string;
  descuento?: number;
  tipo_descuento?: string;
  descuentos?: number[];
  activo?: number;
}
interface ProductoBajaRotacion {
  id: number
  nombre: string
  existencia: number
  ultimaVenta: string | null
  ultimaCompra: string | null
  diasSinVenta: number
  precioVenta: number
  valorEstancado: number
}

interface Detalle {
  id: number;
  cantidad: number;
  total: number;
  costo?: number;
  venta?: { numdoc: string };
  producto?: { nombre: string };
  activo?: number;
  descuento?: number;
}

interface GastoPeriodo {
  id: number;
  monto: number;
  fecha?: string;
  activo?: number;
}

interface Producto {
  id: number;
  nombre: string;
  cantidad_existencia: number;
  stock_min: number;
}

interface Prediccion {
  productoId: number;
  nombre: string;
  promedioDiario: number;
  prediccion: number;
  stockActual: number;
  stockEsperado: number;
}
interface PrediccionMonto {
  totalUltimos30Dias: number;
  promedioDiario: number;
  prediccion: number;
}

interface KpisDia {
  ventasTotales: number;
  metaDiaria: number;
  ticketPromedio: number;
  numeroTransacciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalCheque: number;
  totalVale: number;
  totalCredito: number;
  porcentajeDevoluciones: number;
  totalCompras: number;
  totalGastos: number;
}

interface KpisSemana {
  ventasTotales: number;
  metaDiaria: number;
  metaSemanal: number;
  ticketPromedio: number;
  numeroTransacciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalCheque: number;
  totalVale: number;
  totalCredito: number;
  porcentajeDevoluciones: number;
  totalCompras: number;
  totalGastos: number;
}

interface KpisMes {
  ventasTotales: number;
  metaDiaria: number;
  metaMensual: number;
  ticketPromedio: number;
  numeroTransacciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalCheque: number;
  totalVale: number;
  totalCredito: number;
  porcentajeDevoluciones: number;
  totalCompras: number;
  totalGastos: number;
}

interface TopProducto {
  productoId: number;
  nombre: string;
  cantidadVendida: number;
}

interface TopCliente {
  clienteId: number;
  nombre: string;
  compras: number;
  totalVendido: number;
}

interface MonthlyTotals {
  ventas: number;
  gastos: number;
  utilidad: number;
  label: string;
}

interface MonthlyComparison {
  current: MonthlyTotals;
  previous: MonthlyTotals;
}

interface PeriodoComparativoItem {
  label: string;
  ventas: number;
  costo: number;
  utilidad: number;
  gastos: number;
  detail?: string;
  monthKey: string;
  weekIndex: number;
  rangeStartTime: number;
  rangeEndTime: number;
}
//
// ==========================================
// DEFINICIÓN DE LOS FLUJOS DE GUÍA (CORREGIDOS)
// ==========================================
// 0. RECORRIDO GENERAL (NUEVO)

//
const GUIDE_FLOW_GENERAL: GuideStep[] = [
  {
    targetKey: "btn-chat-gerente",
    title: "1. Habla con tu Gerente CROV",
    content:
      "Este es tu asistente de Inteligencia Artificial. Puedes chatear con él para pedirle consejos, interpretaciones de tus datos o resolver dudas operativas al instante.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "tab-resumen",
    title: "2. Resumen Financiero",
    content:
      "Tu balance general. Aquí verás ingresos, gastos y utilidad neta. (Entra a esta pestaña para ver su guía detallada).",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "tab-rendimiento",
    title: "3. Rendimiento Comercial",
    content:
      "Proyecciones a futuro con IA y comparativas semanales. (Tiene su propia guía interactiva adentro).",
    placement: "bottom",
    modalPosition: "bottom-center",
  },
  {
    targetKey: "tab-analisis",
    title: "4. Análisis de Clientes",
    content:
      "Ranking de mejores clientes, productos estrella y devoluciones. (Consulta su guía específica para más detalle).",
    placement: "bottom",
    modalPosition: "bottom-center",
  },
  {
    targetKey: "tab-inventario",
    title: "5. Inventario",
    content:
      "Monitoreo de stock crítico y predicciones de quiebre de inventario. (Cuenta con guía operativa interna).",
    placement: "bottom",
    modalPosition: "bottom-center",
  },
  {
    targetKey: "tab-kpis", // Asegúrate de que el Tab tenga este data-guide
    title: "6. Datos Financieros",
    content:
      "Tablas detalladas de ingresos y egresos (Diario, Semanal, Mensual) para auditoría.",
    placement: "bottom",
    modalPosition: "bottom-right",
  },
  {
    targetKey: "tab-alertas", // Asegúrate de que el Tab tenga este data-guide
    title: "7. Alertas y Sugerencias",
    content:
      "El centro de inteligencia. Avisos automáticos sobre riesgos operativos y financieros urgentes.",
    placement: "bottom",
    modalPosition: "bottom-right",
  },
];
// 1. RESUMEN MENSUAL
const GUIDE_FLOW_RESUMEN: GuideStep[] = [
  {
    targetKey: "config-periodo",
    title: "1. Configuración del periodo",
    content: "Panel general para definir el rango de tiempo.",
    placement: "right", // Cambiado a derecha para no tapar el contenido
    modalPosition: "right",
  },
  {
    targetKey: "input-fecha-inicio",
    title: "1.1 Fecha de inicio",
    content: "Selecciona el día de inicio.",
    placement: "bottom", // Cambiado a bottom para no tapar el label
    modalPosition: "bottom-left",
  },
  {
    targetKey: "input-fecha-fin",
    title: "1.2 Fecha de fin",
    content: "Selecciona el día de fin.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "select-mes",
    title: "1.3 Seleccionar mes",
    content: "O elige un mes completo rápidamente.",
    placement: "bottom",
    modalPosition: "bottom-center",
  },
  {
    targetKey: "select-semanas",
    title: "1.4 Semanas del mes",
    content: "Filtra por semanas específicas.",
    placement: "bottom",
    modalPosition: "bottom-right",
  },
  {
    targetKey: "card-ingresos",
    title: "2. Ingresos totales",
    content: "Ventas totales del periodo.",
    placement: "right",
    modalPosition: "left",
  },
  {
    targetKey: "card-gastos",
    title: "3. Gastos totales",
    content: "Egresos operativos totales.",
    placement: "left", // Cambiado para evitar bordes
    modalPosition: "right",
  },
  {
    targetKey: "card-utilidad",
    title: "4. Utilidad neta",
    content: "Ingresos menos gastos.",
    placement: "top",
    modalPosition: "top-center",
  },
  {
    targetKey: "card-crecimiento",
    title: "5. Crecimiento mensual",
    content: "Comparativa vs mes anterior.",
    placement: "top",
    modalPosition: "top-left",
  },
];

// 2. RENDIMIENTO COMERCIAL
const GUIDE_FLOW_RENDIMIENTO: GuideStep[] = [
  {
    targetKey: "card-pred-ventas",
    title: "1. Proyección de ventas",
    content: "Estimación IA a 7 días.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "card-pred-compras",
    title: "2. Proyección de compras",
    content: "Estimación de resurtido.",
    placement: "bottom",
    modalPosition: "bottom-center",
  },
  {
    targetKey: "card-pred-gastos",
    title: "3. Proyección de gastos",
    content: "Estimación de gastos fijos/variables.",
    placement: "bottom",
    modalPosition: "bottom-right",
  },
  {
    targetKey: "card-alerta-inventario",
    title: "4. Alerta de inventario",
    content: "Aviso de productos por agotarse.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "tabla-rendimiento",
    title: "5. Rendimiento por periodo",
    content: "Tabla Diario vs Mensual.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "chart-comparativa",
    title: "6. Comparativa semanal",
    content: "Tendencia entre semanas.",
    placement: "top",
    modalPosition: "top-left",
  },
];

// 3. ANÁLISIS DE CLIENTES Y PRODUCTOS
const GUIDE_FLOW_ANALISIS: GuideStep[] = [
  {
    targetKey: "segmentacion-temporal",
    title: "1. Segmentación temporal",
    content: "Filtros para este reporte.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "select-mes-analisis",
    title: "1.1 Mes de análisis",
    content: "Selecciona el mes base.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "select-semanas-analisis",
    title: "1.2 Semanas",
    content: "Filtra por semana.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "card-mejores-clientes",
    title: "2. Mejores clientes",
    content: "Top compradores.",
    placement: "right",
    modalPosition: "left",
  },
  {
    targetKey: "chart-ventas-semanales",
    title: "3. Ventas semanales",
    content: "Gráfica de comportamiento.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "card-productos-vendidos",
    title: "4. Productos más vendidos",
    content: "Ranking de rotación.",
    placement: "left",
    modalPosition: "right",
  },
  {
    targetKey: "card-devoluciones",
    title: "5. Devoluciones por mes",
    content: "Análisis de devoluciones.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "card-descuentos",
    title: "6. Ventas con descuento",
    content: "Impacto de promociones.",
    placement: "top",
    modalPosition: "top-right",
  },
];

// 4. INVENTARIO
const GUIDE_FLOW_INVENTARIO: GuideStep[] = [
  {
    targetKey: "card-stock-minimo",
    title: "1. Productos con inventario mínimo",
    content: "Artículos en el límite de seguridad.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "card-proyeccion-quiebre",
    title: "2. Proyección inventario negativo",
    content: "Predicción de agotamiento.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
];

// 5. DATOS FINANCIEROS
const GUIDE_FLOW_KPIS: GuideStep[] = [
  {
    targetKey: "card-kpi-diario",
    title: "1. Ingresos/Egresos Diarios",
    content: "Desglose detallado del día actual.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "card-kpi-semanal",
    title: "2. Ingresos/Egresos Semanales",
    content: "Resumen acumulado de la semana.",
    placement: "top",
    modalPosition: "top-center",
  },
  {
    targetKey: "card-kpi-mensual",
    title: "3. Ingresos/Egresos Mensuales",
    content: "Visión global del mes.",
    placement: "top",
    modalPosition: "top-right",
  },
];

// 6. ALERTAS Y SUGERENCIAS
const GUIDE_FLOW_ALERTAS: GuideStep[] = [
  {
    targetKey: "tabla-alertas-gerenciales",
    title: "1. Panel Gerente",
    content: "Alertas profundas de rentabilidad.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "tabla-alertas-rapidas",
    title: "2. Alertas Rápidas",
    content: "Alertas operativas inmediatas.",
    placement: "bottom",
    modalPosition: "bottom-left",
  },
  {
    targetKey: "card-meta-diaria",
    title: "3. Meta Diaria de Ventas",
    content: "Visualiza si has alcanzado el objetivo.",
    placement: "top",
    modalPosition: "top-left",
  },
  {
    targetKey: "card-devoluciones-semanales",
    title: "4. Devoluciones Semanales",
    content: "Monitoreo del porcentaje de devoluciones.",
    placement: "top",
    modalPosition: "top-right",
  },
];
// 8. GUÍA GERENTE CROV
const GUIDE_FLOW_GERENTE: GuideStep[] = [
  {
    targetKey: "btn-chat-gerente",
    title: "1. Gerente Virtual CROV",
    content:
      "Este es el cerebro de tu operación. Haz clic aquí para abrir el chat con tu asistente IA capaz de ejecutar acciones en la base de datos.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "btn-help-chat",
    title: "2. Menú de Comandos (?)",
    content:
      "Dentro del chat, encontrarás este icono. Al pulsarlo, verás el menú de comandos rápidos divididos por áreas.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-0", // Clientes
    title: "3. Gestión de Clientes",
    content:
      "Administra tu cartera. Pregunta: '¿Quién es mi mejor cliente?', 'Registrar nuevo cliente' o modifica sus datos.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-1", // Proveedores
    title: "4. Proveedores",
    content:
      "Control de suministros. Consulta a quién le compras más o registra nuevos proveedores en el sistema.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-2", // Créditos
    title: "5. Créditos y Cobranza",
    content:
      "Gestión de deuda. Revisa créditos pendientes o registra abonos a cuentas específicas.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-3", // Caja
    title: "6. Caja y Movimientos",
    content:
      "Control de efectivo. Registra retiros, gastos varios o ingresos de fondo de caja.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-4", // Cortes
    title: "7. Cortes e Historial",
    content:
      "Cierres de turno. Solicita 'Hacer un pre-corte' para ver el balance actual o realiza el corte definitivo.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-5", // Análisis
    title: "8. Análisis y Reportes",
    content:
      "Inteligencia de negocio. Consulta ventas del día, top productos o rendimiento de tus cajeros.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-6", // Ventas/Devoluciones
    title: "9. Operaciones y Devoluciones",
    content:
      "Realiza ventas rápidas, compras a proveedor o gestiona devoluciones de mercancía.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-7", // Inventario
    title: "10. Inventario",
    content:
      "Gestión de catálogo. Registra nuevos productos o modifica precios rápidamente.",
    placement: "left",
    modalPosition: "left",
  },
  {
    targetKey: "help-item-8", // Soporte
    title: "11. Soporte Técnico",
    content:
      "Ayuda directa. Si detectas un error, usa 'Levantar reporte de fallo' para notificar al equipo.",
    placement: "left",
    modalPosition: "left",
  },
];
//fin guias
//

//
const formatCurrency = (value: number | undefined | null) => {
  // BLINDAJE: Si el valor no existe o no es un número, devolvemos $0.00 en vez de tronar
  if (value === undefined || value === null || isNaN(value)) {
    return "$0.00";
  }
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const computeDailyNetProfit = (kpis: KpisDia | null): number | null => {
  if (!kpis) {
    return null;
  }

  const ventas = Number(kpis.ventasTotales);
  const compras = Number(kpis.totalCompras);
  const gastos = Number(kpis.totalGastos);

  if ([ventas, compras, gastos].some((value) => Number.isNaN(value))) {
    return null;
  }

  // MODIFICACIÓN: Ahora la utilidad resta tanto gastos como compras
  return ventas - (gastos + compras);
};

type QuickAlertContext = {
  kpisDia: KpisDia | null;
  dailyNetProfit: number | null;
  kpisSemana: KpisSemana | null;
  metasIA: {
    metaMensual: number;
    metaSemanal: number;
    metaDiaria: number;
    metaExtraordinaria: number;
    hayExtraordinaria: boolean;
  } | null;
  bajaRotacion?: any[] | null;
  comparativaPeriodo?: any[] | null;
  impactoDevoluciones?: { 
    totalDevuelto: number; 
    flujoCaja: number; 
    tasaDevolucion: number;
  } | null;
};

interface QuickAlertDefinition {
  icon: string;
  title: string;
  condition: string;
  action: string | ((context: QuickAlertContext) => string);
  evaluate: (context: QuickAlertContext) => boolean;
  detail?: (context: QuickAlertContext) => string | null;
  getProgress?: (context: QuickAlertContext) => number;
}

type QuickAlertInstance = QuickAlertDefinition & {
  isActive: boolean;
  detailText: string | null;
  progress?: number;
};
type ManagerialAlertContext = {
  kpisDia: KpisDia | null;
  kpisSemana: KpisSemana | null;
  kpisMes: KpisMes | null;
  monthlyComparison: MonthlyComparison | null;
  comparativaPeriodo: PeriodoComparativoItem[];
  dailyNetProfit: number | null;
  impactoDevoluciones?: { totalDevuelto: number; flujoCaja: number; tasaDevolucion: number } | null;
};

type ManagerialAlertLevel =
  | "critical"
  | "warning"
  | "neutral"
  | "info"
  | "stable";

type ManagerialAlertEvaluation = {
  severity: ManagerialAlertLevel;
  isTriggered: boolean;
  detail?: string;
  actionDetail?: string;
  statusNote?: string;
  progress?: number;
  action?: string;
};
type ManagerialAlertDefinition = {
  icon: string;
  alert: string;
  condition: string;
  action: string;
  evaluate: (context: ManagerialAlertContext) => ManagerialAlertEvaluation;
};
//
interface KPIValues {
  ventasTotales: number;
  totalGastos: number;
  totalCompras: number;
  metaDiaria: number;
  porcentajeDevoluciones: number;
}

// CORRECCIÓN AQUÍ: Agregamos kpisSemana al contexto

//
const quickAlertDefinitions: QuickAlertDefinition[] = [
  {
    icon: "📉",
    title: "Ritmo de Venta",
    condition: "Ventas vs Meta Diaria",
    action: (ctx) => {
      const meta = ctx.metasIA?.metaDiaria ?? ctx.kpisDia?.metaDiaria ?? 0;
      const actual = ctx.kpisDia?.ventasTotales ?? 0;
      const falta = meta - actual;

      if (falta <= 0) return "✅ ¡Meta superada! Ritmo excelente.";

      const porcentaje = meta > 0 ? actual / meta : 0;
      if (porcentaje < 0.5)
        return `⚠️ LENTO: Faltan ${formatCurrency(falta)}. ¡Contacta clientes!`;
      return `📉 ACELERA: Faltan ${formatCurrency(falta)}.`;
    },
    evaluate: ({ kpisDia, metasIA }) => {
      const meta = metasIA?.metaDiaria ?? kpisDia?.metaDiaria ?? 0;
      if (!kpisDia || meta <= 0) return false;
      return kpisDia.ventasTotales < meta; // Activa solo si NO llegamos
    },
    detail: ({ kpisDia, metasIA }) => {
      if (!kpisDia) return null;
      const meta = metasIA?.metaDiaria ?? kpisDia?.metaDiaria ?? 0;
      const pct = meta > 0 ? (kpisDia.ventasTotales / meta) * 100 : 0;
      return `Avance: ${pct.toFixed(1)}%`;
    },
    getProgress: ({ kpisDia, metasIA }) => {
      const meta = metasIA?.metaDiaria ?? kpisDia?.metaDiaria ?? 0;
      if (!kpisDia || meta <= 0) return 0;
      return Math.min((kpisDia.ventasTotales / meta) * 100, 100);
    },
  },
  {
    icon: "🚨",
    title: "Pérdida Operativa",
    condition: "Utilidad Neta Negativa",
    action: (ctx) => {
      const utilidad = ctx.dailyNetProfit ?? 0;
      if (utilidad >= 0) return "Operación saludable. Sin acciones.";

      const perdida = Math.abs(utilidad);
      if (perdida > 1000)
        return `🛑 ¡DÉFICIT GRAVE DE ${formatCurrency(perdida)}! Audita caja.`;
      return `⚠️ Cuidado: Estás perdiendo ${formatCurrency(perdida)}.`;
    },
    evaluate: ({ dailyNetProfit }) =>
      typeof dailyNetProfit === "number" && dailyNetProfit < 0,
    detail: ({ dailyNetProfit }) =>
      typeof dailyNetProfit === "number"
        ? `Saldo: ${formatCurrency(dailyNetProfit)}`
        : null,
    getProgress: ({ dailyNetProfit }) => {
      return (dailyNetProfit || 0) < 0 ? 100 : 0;
    },
  },
  {
    icon: "🛡️",
    title: "Margen Crítico",
    condition: "Rentabilidad Negativa",
    action: (ctx) => {
      const utilidad = ctx.dailyNetProfit ?? 0;
      // 👇 Si es 0 o mayor, todo está bien
      if (utilidad >= 0) return "Margen saludable o sin ventas aún.";
      return "📉 Revisa urgentemente costos.";
    },
    evaluate: ({ dailyNetProfit }) => {
      // 👇 CAMBIO CLAVE: Solo se activa si es MENOR a cero (pérdida real)
      return typeof dailyNetProfit === "number" && dailyNetProfit < 0;
    },
    detail: ({ kpisDia, dailyNetProfit }) => {
      if (!kpisDia || typeof dailyNetProfit !== "number") return null;
      const margin =
        kpisDia.ventasTotales > 0
          ? (dailyNetProfit / kpisDia.ventasTotales) * 100
          : 0;
      return `Margen: ${margin.toFixed(1)}%`;
    },
    getProgress: ({ dailyNetProfit }) => {
      // 👇 La barra solo se llena si hay pérdida
      return (dailyNetProfit || 0) < 0 ? 100 : 0;
    },
  },

  //  
{
    icon: "💰",
    title: "Capital Estancado",
    condition: "Productos > 30 días sin venta",
    action: (ctx) => {
      const estancados = (ctx.bajaRotacion as any[])?.filter((p) => p.diasSinVenta > 30) || [];
      const totalEstancado = estancados.reduce((acc, p) => acc + (p.valorEstancado || 0), 0);

      if (estancados.length === 0) return "Rotación de inventario fluida. Sin acciones.";
      // 👇 Ahora la acción también te motiva con el dinero
      return `⚠️ ¡Acción! Recupera ${formatCurrency(totalEstancado)} rematando ${estancados.length} productos.`;
    },
    evaluate: ({ bajaRotacion }) => {
      const estancados = (bajaRotacion as any[])?.filter((p) => p.diasSinVenta > 30) || [];
      return estancados.length > 0;
    },
    detail: ({ bajaRotacion }) => {
      const estancados = (bajaRotacion as any[])?.filter((p) => p.diasSinVenta > 30) || [];
      const totalEstancado = estancados.reduce((acc, p) => acc + (p.valorEstancado || 0), 0);
      
      // 👇 Forzamos a que SIEMPRE muestre la moneda, aunque sea cero
      return `Retenido: ${formatCurrency(totalEstancado)}`;
    },
    getProgress: ({ bajaRotacion }) => {
      const estancados = (bajaRotacion as any[])?.filter((p) => p.diasSinVenta > 30) || [];
      return estancados.length > 0 ? 100 : 0; 
    },
  },
];
//
const managerialAlertDefinitions: ManagerialAlertDefinition[] = [
  {
    // 💰 UTILIDAD
    icon: "",
    alert: "Margen de Utilidad Neta",
    condition: "Rentabilidad sobre ventas",
    action: "Auditoría financiera", // Fallback
    evaluate: ({ kpisMes }): ManagerialAlertEvaluation => {
      if (!kpisMes)
        return {
          severity: "info",
          isTriggered: false,
          detail: "Sin datos",
          progress: 0,
          action: "Esperando cierre de caja...",
        };

      const ventas = Number(kpisMes.ventasTotales) || 0;
      if (ventas <= 0)
        return {
          severity: "info",
          isTriggered: false,
          detail: "Sin ventas",
          progress: 0,
          action: "Inicia operaciones para calcular.",
        };

      const utilidad =
        ventas -
        (Number(kpisMes.totalCompras) || 0) -
        (Number(kpisMes.totalGastos) || 0);
      const margen = utilidad / ventas;
      const margenPct = (margen * 100).toFixed(1);
      const progress = Math.min(Math.max(margen * 100, 0), 100);

      const detail = `Margen: ${margenPct}%`;
      const actionDetail = `Utilidad: ${formatCurrency(utilidad)}`;

      // ROJO: < 5% (Emergencia)
      if (margen < 0.05)
        return {
          severity: "critical",
          isTriggered: true,
          detail,
          actionDetail,
          progress: 0,
          statusNote: "Rentabilidad crítica.",
          action: "¡URGENTE! Detén compras y audita fugas de dinero/merma.",
        };
      // NARANJA: 5% a 15% (Peligro)
      if (margen < 0.15)
        return {
          severity: "warning",
          isTriggered: true,
          detail,
          actionDetail,
          progress,
          statusNote: "Margen bajo.",
          action: "Sube precios selectivos o renegocia con proveedores.",
        };
      // AMARILLO: 15% a 25% (Aceptable)
      if (margen < 0.25)
        return {
          severity: "neutral",
          isTriggered: false,
          detail,
          actionDetail,
          progress,
          statusNote: "Margen saludable.",
          action: "Reduce gastos hormiga para saltar al siguiente nivel.",
        };
      // AZUL: > 25% (Excelente)
      return {
        severity: "stable",
        isTriggered: false,
        detail,
        actionDetail,
        progress,
        statusNote: "Rentabilidad excelente.",
        action: "Capitaliza: Invierte en stock de alta rotación o expansión.",
      };
    },
  },
  {
    // 📉 FLUJO DE CAJA
    icon: "",
    alert: "Estatus de Flujo de Caja",
    condition: "Balance reciente (2 sem)",
    action: "Gestión de tesorería", // Fallback
    evaluate: ({ comparativaPeriodo }): ManagerialAlertEvaluation => {
      if (!comparativaPeriodo?.length)
        return {
          severity: "info",
          isTriggered: false,
          detail: "Calculando...",
          progress: 0,
        };

      const ultimas = [...comparativaPeriodo]
        .sort((a, b) => a.rangeEndTime - b.rangeEndTime)
        .slice(-2);
      const flujoAcumulado = ultimas.reduce(
        (sum, item) => sum + (Number(item.utilidad) || 0),
        0,
      );

      const detail = `Flujo: ${formatCurrency(flujoAcumulado)}`;

      // ROJO: Pérdida fuerte
      if (flujoAcumulado < -5000)
        return {
          severity: "critical",
          isTriggered: true,
          detail,
          progress: 0,
          statusNote: "Fuga de capital.",
          actionDetail: "Detener gastos.",
          action: "¡Corte de gastos total! Solo paga nómina y luz.",
        };
      // NARANJA: Pérdida leve
      if (flujoAcumulado < 0)
        return {
          severity: "warning",
          isTriggered: true,
          detail,
          progress: 20,
          statusNote: "Balance negativo.",
          actionDetail: "Revisar salidas.",
          action: "Incentiva pagos en efectivo o de contado ya.",
        };
      // AMARILLO: Ganancia pequeña
      if (flujoAcumulado < 5000)
        return {
          severity: "neutral",
          isTriggered: false,
          detail,
          progress: 50,
          statusNote: "Flujo positivo ajustado.",
          actionDetail: "Vigilancia.",
          action: "Cuidado con las fechas de pago a proveedores.",
        };
      // AZUL: Ganancia sólida
      return {
        severity: "stable",
        isTriggered: false,
        detail,
        progress: 100,
        statusNote: "Finanzas sanas.",
        actionDetail: "Flujo libre.",
        action: "Crea un fondo de emergencia con este excedente.",
      };
    },
  },
  {
    // 📊 VENTAS
    icon: "",
    alert: "Tendencia de Ventas",
    condition: "Comparativa mensual",
    action: "Estrategia comercial", // Fallback
    evaluate: ({ monthlyComparison }): ManagerialAlertEvaluation => {
      if (!monthlyComparison || monthlyComparison.previous.ventas <= 0)
        return {
          severity: "info",
          isTriggered: false,
          detail: "Sin historial",
          progress: 0,
          action: "Recolectando data histórica...",
        };

      const actual = Number(monthlyComparison.current.ventas);
      const anterior = Number(monthlyComparison.previous.ventas);
      const crecimiento = (actual - anterior) / anterior;

      const detail = `Variación: ${(crecimiento * 100).toFixed(1)}%`;
      const actionDetail = `Venta actual: ${formatCurrency(actual)}`;

      // GRIS: Inicio de mes
      if (crecimiento < -0.8)
        return {
          severity: "info",
          isTriggered: false,
          detail: "Inicio de periodo",
          progress: 10,
          statusNote: "Acumulando datos...",
          actionDetail: "Pendiente.",
          action: 'Lanza una oferta "Inicio de Mes" para arrancar fuerte.',
        };

      // ROJO: Caída > 10%
      if (crecimiento < -0.1)
        return {
          severity: "critical",
          isTriggered: true,
          detail,
          actionDetail,
          progress: 20,
          statusNote: "Caída significativa.",
          action: 'Activa "Liquidación Flash" para recuperar liquidez.',
        };
      // NARANJA: Caída leve
      if (crecimiento < 0)
        return {
          severity: "warning",
          isTriggered: true,
          detail,
          actionDetail,
          progress: 40,
          statusNote: "Ligero descenso.",
          action: "Contacta clientes inactivos por WhatsApp/Email.",
        };
      // AMARILLO: Crecimiento lento (0-5%)
      if (crecimiento < 0.05)
        return {
          severity: "neutral",
          isTriggered: false,
          detail,
          actionDetail,
          progress: 60,
          statusNote: "Ventas estables.",
          action: "Arma paquetes (Bundles) para subir el ticket promedio.",
        };
      // AZUL: Crecimiento sólido (> 5%)
      return {
        severity: "stable",
        isTriggered: false,
        detail,
        actionDetail,
        progress: 100,
        statusNote: "Crecimiento sólido.",
        action: "Momento ideal para probar nuevos canales de venta.",
      };
    },
  },
 {
    icon: "", 
    alert: "Tasa de Devoluciones",
    condition: "Control de calidad",
    action: "Gestión de calidad",
    evaluate: (ctx: any): ManagerialAlertEvaluation => {
      const impacto = ctx.impactoDevoluciones;

      if (!impacto || impacto.totalDevuelto === 0) {
        return {
          severity: "stable",
          isTriggered: false,
          detail: "0.0% ($0.00)", 
          progress: 0,
          statusNote: "Tasa óptima.",
          actionDetail: "Excelente.",
          action: "Felicita a tu equipo: Calidad impecable.",
        };
      }

      const pct = Number(impacto.tasaDevolucion);
      const devueltoStr = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(impacto.totalDevuelto);
      
      const detail = `${pct.toFixed(2)}% retenido (${devueltoStr})`;
      // 👇 La barra de la tabla ahora se llena basándose en 30
      const progress = Math.min((pct / 30) * 100, 100);

      // 🔴 ROJO: >= 30%
      if (pct >= 30)
        return {
          severity: "critical",
          isTriggered: true,
          detail,
          progress: 100,
          statusNote: `Impacto de ${devueltoStr}.`,
          actionDetail: "Revisar urgente.",
          action: `¡Alto! Límite mensual (30%) rebasado. Fuga de ${devueltoStr}.`,
        };
      
      // 🟠 NARANJA: >= 20%
      if (pct >= 20)
        return {
          severity: "warning",
          isTriggered: true,
          detail,
          progress,
          statusNote: "Acercándose al límite.",
          actionDetail: "Monitorear.",
          action: `Merma de ${devueltoStr}. Revisa si el fallo es de fábrica o por empaque.`,
        };
        
      // 🟡 AMARILLO: >= 10% (Aquí va a caer tu 15.64% actual)
      if (pct >= 10)
        return {
          severity: "neutral",
          isTriggered: false,
          detail,
          progress,
          statusNote: "Nivel aceptable.",
          actionDetail: "Reducir incidencias.",
          action: "Implementa encuesta de satisfacción post-venta.",
        };

      // 🟢 VERDE: < 10%
      return {
        severity: "stable",
        isTriggered: false,
        detail,
        progress: Math.max(progress, 5), // Le damos un 5% mínimo visual
        statusNote: "Tasa óptima.",
        actionDetail: "Excelente.",
        action: `Devoluciones mínimas (${devueltoStr}). Calidad impecable.`,
      };
    },
  },
];

// ============================================================================
// 1. ESTILOS DEL SEMÁFORO (Colores personalizados)
// ============================================================================
const managerialAlertStyles = {
  stable: {
    // AZUL: Todo excelente
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "🟢", 
    label: "Óptimo",
    row: "",
  },
  neutral: {
   
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: "🟡",
    label: "Regular",
    row: "",
  },
  warning: {
    // AMARILLO FUERTE / NARANJA: Alerta de peligro cercano
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "⚠️",
    label: "Cuidado",
    row: "bg-amber-50/40", // Un fondo muy sutil para destacar la fila
  },
  critical: {
    // ROJO: Peligro total
    badge: "bg-red-100 text-red-700 border-red-200",
    icon: "🔴",
    label: "Crítico",
    row: "bg-red-50/50",
  },
  info: {
    // GRIS: Faltan datos / Inicio de mes
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "⚪",
    label: "Info",
    row: "",
  },
};
const PRODUCTOS_MIN_LIMITS = [5, 10, 15, 20, 30];
const PRODUCTOS_MIN_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];
const TOP_PRODUCTOS_LIMITS = [5, 6, 7, 8, 9, 10];
const TOP_PRODUCTOS_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#f43f5e",
  "#a855f7",
  "#14b8a6",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
];
const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
const WEEK_ORDINALS = ["1ra", "2da", "3ra", "4ta", "5ta"];
const getWeekOptionsForMonth = (year: number, monthIndex: number) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);

  return Array.from({ length: weekCount }, (_, index) => ({
    value: index,
    label: `${WEEK_ORDINALS[index] ?? `${index + 1}ta`} semana`,
  }));
};
const toInputDate = (date: Date) => {
  const reference = new Date(date);
  reference.setHours(0, 0, 0, 0);
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getMonthRange = (year: number, monthIndex: number) => {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
};

const getWeekRangeForMonth = (
  year: number,
  monthIndex: number,
  weekIndex: number,
) => {
  if (weekIndex < 0) {
    return null;
  }

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDay = weekIndex * 7 + 1;
  if (startDay > lastDayOfMonth) {
    return null;
  }

  const endDay = Math.min(startDay + 6, lastDayOfMonth);

  const weekStart = new Date(year, monthIndex, startDay);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(year, monthIndex, endDay);
  weekEnd.setHours(0, 0, 0, 0);

  return { start: weekStart, end: weekEnd };
};
const parseDateInput = (value: string): Date | null => {
  const [year, month, day] = value.split("-").map(Number);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(0, 0, 0, 0);
  return result;
};
const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getDefaultDateRange = () => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const currentWeekEnd = endOfWeek(today);

  return {
    start: toInputDate(previousWeekStart),
    end: toInputDate(currentWeekEnd),
  };
};
export default function GerentePage() {
  // --- ESTADOS PARA LA GUÍA ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHelpOpen, setChatHelpOpen] = useState(false);
  //
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen"); // Necesario para controlar las pestañas

  // --- FUNCIONES DE LA GUÍA ---
  const startGuide = (
    mode:
      | "GENERAL"
      | "RESUMEN"
      | "RENDIMIENTO"
      | "ANALISIS"
      | "INVENTARIO"
      | "KPIS"
      | "ALERTAS"
      | "GERENTE",
  ) => {
    let steps = GUIDE_FLOW_RESUMEN;
    let targetTab = "resumen";

    // --- NUEVO CASO GENERAL ---
    if (mode === "GENERAL") {
      steps = GUIDE_FLOW_GENERAL;
      // No cambiamos de pestaña forzosamente, o podemos ir a la primera ('resumen')
      targetTab = "resumen";
    }

    if (mode === "RENDIMIENTO") {
      steps = GUIDE_FLOW_RENDIMIENTO;
      targetTab = "rendimiento";
    }
    if (mode === "ANALISIS") {
      steps = GUIDE_FLOW_ANALISIS;
      targetTab = "analisis";
    }
    if (mode === "INVENTARIO") {
      steps = GUIDE_FLOW_INVENTARIO;
      targetTab = "inventario";
    }
    if (mode === "KPIS") {
      steps = GUIDE_FLOW_KPIS;
      targetTab = "kpis";
    }
    if (mode === "ALERTAS") {
      steps = GUIDE_FLOW_ALERTAS;
      targetTab = "alertas";
    }
    if (mode === "GERENTE") {
      steps = GUIDE_FLOW_GERENTE;
    }

    setTimeout(() => {
      setCurrentSteps(steps);
      setCurrentStepIndex(0);
      setGuideActive(true);
      window.dispatchEvent(new Event("resize"));
    }, 500);
  };

  const closeGuide = () => setGuideActive(false);
  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex((p) => p + 1);
    } else {
      if (currentSteps === GUIDE_FLOW_GENERAL) {
        startGuide("RESUMEN");
      } else if (currentSteps === GUIDE_FLOW_RESUMEN) {
        startGuide("RENDIMIENTO");
      } else if (currentSteps === GUIDE_FLOW_RENDIMIENTO) {
        startGuide("ANALISIS");
      } else if (currentSteps === GUIDE_FLOW_ANALISIS) {
        startGuide("INVENTARIO");
      } else if (currentSteps === GUIDE_FLOW_INVENTARIO) {
        startGuide("KPIS");
      } else if (currentSteps === GUIDE_FLOW_KPIS) {
        startGuide("ALERTAS");
      } else if (currentSteps === GUIDE_FLOW_ALERTAS) {
        startGuide("GERENTE");
      } else {
        closeGuide();
        toast.success("¡Guía completada!");
      }
    }
  };
  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((p) => p - 1);
  };

  const {
    defaultDateRange,
    bottomProductos,
    setBottomProductos,
    bottomProductosLimit,
    setBottomProductosLimit,
    productosMin,
    setProductosMin,
    productosMinLimit,
    setProductosMinLimit,
    predicciones,
    setPredicciones,
    predVentas,
    setPredVentas,
    predCompras,
    setPredCompras,
    predGastos,
    setPredGastos,
    kpisDia,
    setKpisDia,
    kpisSemana,
    setKpisSemana,
    kpisMes,
    setKpisMes,
    topProductos,
    setTopProductos,
    topProductosLimit,
    setTopProductosLimit,
    topClientes,
    setTopClientes,
    topClientesPeriodo,
    setTopClientesPeriodo,
    bajaRotacion,
    setBajaRotacion,
    bajaRotacionLimit,
    setBajaRotacionLimit,
    impactoDevoluciones,
    setImpactoDevoluciones,
    monthlyComparison,
    setMonthlyComparison,
    loadingMonthlyGrowth,
    setLoadingMonthlyGrowth,
    monthlyGrowthError,
    setMonthlyGrowthError,
    dailyComparisonData,
    setDailyComparisonData,
    dailyGrowthData,
    setDailyGrowthData,
    ventasRaw,
    setVentasRaw,
    gastosRaw,
    setGastosRaw,
    devolucionesRaw,
    setDevolucionesRaw,
    metasIA,
    setMetasIA,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    selectedMonth,
    setSelectedMonth,
    selectedWeeks,
    setSelectedWeeks,
    weekOptions,
    comparativaPeriodo,
    setComparativaPeriodo,
    gastosSemanalPeriodo,
    setGastosSemanalPeriodo,
    devolucionesSemanalPeriodo,
    setDevolucionesSemanalPeriodo,
    financialTableDia,
    financialTableSemana,
    financialTableMes,
    triggeredQuickAlertsRef,
    periodCardsRef,
    didSelectDateRangeRef,
    dailyNetProfit,
    evaluatedQuickAlerts,
    currentWeekRange,
    ventasDescuentoSemanal,
    setVentasDescuentoSemanal,
    loadingPeriodo,
    setLoadingPeriodo,
    errorPeriodo,
    setErrorPeriodo,
    loadingDevolucionesPeriodo,
    setLoadingDevolucionesPeriodo,
    errorDevolucionesPeriodo,
    setErrorDevolucionesPeriodo,
    apiUrl,
    token,
    sucursalId,
    diasPrediccion,
    topProductosFiltrados,
    topProductosPieData,
    bottomProductosFiltrados,
    bottomProductosPieData,
    monthOptions,
    handleFechaInicioChange,
    handleFechaFinChange,
    isDateWithinRange,
    getWeekIndexForMonth,
    getWeekInfo,
    handleMonthSelect,
    handleWeekSelect,
    quiebres,
    periodoStartTime,
    periodoEndTime,
    selectedWeeksSet,
    shouldFilterByWeeks,
    comparativaPeriodoFiltrada,
    gastosSemanalPeriodoFiltrado,
    devolucionesSemanalPeriodoDisplay,
    ventasDescuentoSemanalDisplay,
    resumenSemanal,
    resumenGastosSemanal,
    comparativaPeriodoDisplay,
    ingresosBarChartData,
    gastosBarChartData,
    totalIngresosPeriodo,
    totalCostosPeriodo,
    totalGastosOperativosPeriodo,
    totalEgresosPeriodo,
    utilidadNetaPeriodo,
    utilidadPieChartData,
    resumenDevolucionesSemanal,
    totalVentasDescuentoPeriodo,
    hayVentasDescuento,
    evaluatedManagerialAlerts,
    monthlyGrowthEntries,
    monthlyGrowthMaxValue,
    monthlyGrowthRadarData,
    topClientesTop10,
    performanceSummaryRows,
    monthlyGrowthTableData,
    currentMonthLabel,
    previousMonthLabel,
    filterByWeeks,
    ventasFiltradas,
    gastosFiltrados,
    totalIngresosFiltrados,
    totalCostosFiltrados
  } = useGerenteDashboard({
    getDefaultDateRange,
    getWeekOptionsForMonth,
    buildFinancialTableData,
    computeDailyNetProfit,
    quickAlertDefinitions,
    fetchGerenteResumenData,
    buildTopProductosPieData,
    hasPositiveTotals,
    sumWeeklyTotals,
    buildPeriodCardsState,
    buildPerformanceSummaryRows,
    capitalize,
    parseDateInput,
    startOfWeek,
    endOfWeek,
    toInputDate,
    getWeekRangeForMonth,
    getMonthRange,
    addDays,
    PRODUCTOS_MIN_COLORS,
    TOP_PRODUCTOS_COLORS,
    managerialAlertDefinitions,
  });

  // --- EFECTO: INICIAR GUÍA AUTOMÁTICAMENTE LA PRIMERA VEZ ---
  useEffect(() => {
    // 1. Verificar si ya vio la guía anteriormente
    const hasSeenGuide = localStorage.getItem("gerente_guide_seen");

    if (!hasSeenGuide) {
      // 2. Si no la ha visto, esperamos un momento a que cargue la página
      const timer = setTimeout(() => {
        startGuide("GENERAL"); // Inicia el tour principal
        localStorage.setItem("gerente_guide_seen", "true"); // Marca como visto para el futuro
      }, 1500); // 1.5 segundos de espera

      return () => clearTimeout(timer);
    }
  }, []);
  const totalDineroEstancado = bajaRotacion
  .filter(p => p.diasSinVenta > 30)
  .reduce((acc, p) => acc + (p.valorEstancado || 0), 0);
  const conteoProductosEstancados = bajaRotacion.filter(p => p.diasSinVenta > 30).length;
  //
  return (
    <div className="space-y-8 py-4 relative">
      {/* 1. COMPONENTES DE LA GUÍA (Overlay y Modal) */}
      {guideActive && currentSteps.length > 0 && (
        <>
          <GuideArrowOverlay
            activeKey={currentSteps[currentStepIndex].targetKey}
            placement={currentSteps[currentStepIndex].placement}
          />
          <GuideModal
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      {/* 2. HEADER: TÍTULO Y BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col gap-4">
        {/* Fila Superior: Título y Chat */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-600">
            Panel del Gerente
          </h1>

          {/* Wrapper con data-guide para la flecha */}
          <div data-guide="btn-chat-gerente">
            <GerenteChatDialog
              externalOpen={chatOpen}
              onOpenChange={setChatOpen}
              externalShowHelp={chatHelpOpen}
              onHelpChange={setChatHelpOpen}
            />
          </div>
        </div>

        {/* Fila Inferior: Botones de Guías (Debajo del título) */}
        <div className="flex items-center gap-2">
          {/* A. Botón Guía Interactiva */}
          <div className="relative inline-block text-left">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuideMenu(!showGuideMenu)}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Guía Interactiva
              <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
            </Button>

            {showGuideMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-900 z-50 p-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                  {/* SE ELIMINÓ EL BOTÓN DE RECORRIDO GENERAL AQUÍ */}

                  <button
                    onClick={() => startGuide("RESUMEN")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📊 Resumen Mensual
                  </button>
                  <button
                    onClick={() => startGuide("RENDIMIENTO")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📈 Rendimiento
                  </button>
                  <button
                    onClick={() => startGuide("ANALISIS")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    👥 Análisis Clientes
                  </button>
                  <button
                    onClick={() => startGuide("INVENTARIO")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    📦 Inventario
                  </button>
                  <button
                    onClick={() => startGuide("KPIS")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    💰 Datos Financieros
                  </button>
                  <button
                    onClick={() => startGuide("ALERTAS")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border-t mt-1"
                  >
                    🚨 Alertas y Sugerencias
                  </button>
                  <button
                    onClick={() => startGuide("GERENTE")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border-t mt-1"
                  >
                    🧑‍💼 Gerente Crov
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Botón Guía Rápida (Video) */}
          <div className="relative inline-block text-left">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoMenu(!showVideoMenu)}
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Guía Rápida
              <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
            </Button>

            {showVideoMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-900 z-50 p-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                  <button
                    onClick={() =>
                      window.open(
                        "https://www.youtube.com/watch?v=RlstVZSiRM4&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=12",
                        "_blank",
                      )
                    }
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" />{" "}
                    Ver Video Tutorial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. TABS PRINCIPALES */}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-8"
      >
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="resumen" data-guide="tab-resumen">
            Resumen Financiero Mensual
          </TabsTrigger>
          <TabsTrigger value="rendimiento" data-guide="tab-rendimiento">
            Rendimiento Comercial y Proyecciones
          </TabsTrigger>
          <TabsTrigger value="analisis" data-guide="tab-analisis">
            Análisis de Clientes y Productos
          </TabsTrigger>
          <TabsTrigger value="inventario" data-guide="tab-inventario">
            Inventario e Indicadores Operativos
          </TabsTrigger>
          <TabsTrigger value="kpis" data-guide="tab-kpis">
            Datos financieros
          </TabsTrigger>
          <TabsTrigger value="alertas" data-guide="tab-alertas">
            Alertas y sugerencias
          </TabsTrigger>
        </TabsList>

        {/* --- CONTENIDO: RESUMEN (Original) --- */}
        <TabsContent value="resumen" className="space-y-8">
          <Card
            className="border border-orange-200/60 bg-orange-50/50 shadow-sm"
            data-guide="config-periodo"
          >
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white p-2 shadow-sm">
                  <CalendarRange className="h-5 w-5 text-orange-500" />
                </span>
                <div>
                  <CardTitle className="text-lg font-semibold text-orange-600">
                    Configuración del periodo
                  </CardTitle>
                  <CardDescription>
                    Ajusta el mes y las semanas para actualizar el resumen
                    financiero.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                <div
                  className="flex flex-col gap-1 md:w-48"
                  data-guide="input-fecha-inicio"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Fecha inicio
                  </span>
                  <Input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin}
                    onChange={(event) =>
                      handleFechaInicioChange(event.target.value)
                    }
                  />
                </div>
                <div
                  className="flex flex-col gap-1 md:w-48"
                  data-guide="input-fecha-fin"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Fecha fin
                  </span>
                  <Input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio}
                    onChange={(event) =>
                      handleFechaFinChange(event.target.value)
                    }
                  />
                </div>

                <div
                  className="flex flex-col gap-1 md:w-60"
                  data-guide="select-mes"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Seleccionar mes
                  </span>
                  <Select
                    value={selectedMonth}
                    onValueChange={handleMonthSelect}
                  >
                    <SelectTrigger className="w-full bg-white border border-slate-200 shadow-sm transition-all hover:border-orange-300 focus:ring-2 focus:ring-orange-100">
                      <SelectValue placeholder="Seleccionar periodo" />
                    </SelectTrigger>
                    <SelectContent
                      className="bg-white border border-slate-100 shadow-xl rounded-lg z-[100] max-h-[250px] overflow-hidden"
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={5}
                    >
                      <div className="overflow-y-auto max-h-[240px] p-1 custom-scrollbar">
                        {monthOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="cursor-pointer rounded-md py-2 px-3 text-sm text-slate-600 focus:bg-orange-50 focus:text-orange-700 data-[state=checked]:bg-orange-50 data-[state=checked]:text-orange-800 data-[state=checked]:font-semibold transition-colors mb-1"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className="flex flex-col gap-1"
                  data-guide="select-semanas"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Semanas del mes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {weekOptions.map((week) => (
                      <Button
                        key={week.value}
                        type="button"
                        variant={
                          selectedWeeks.includes(week.value)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleWeekSelect(week.value)}
                      >
                        {week.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card
              className="border border-emerald-100 bg-white shadow-sm"
              data-guide="card-ingresos"
            >
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-50 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Ingresos totales del mes
                    </CardTitle>
                    <CardDescription>
                      Ventas acumuladas por semana.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total del periodo
                  </span>
                  <span className="text-xl font-semibold text-emerald-600">
                    {formatCurrency(totalIngresosFiltrados)}
                  </span>
                </div>
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">
                    Procesando datos...
                  </p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : ventasFiltradas.length > 0 ? (
                  <SimpleBarChart
                    rawData={ventasFiltradas}
                    dataKey="total"
                    gradient="from-emerald-400 to-emerald-600"
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay ingresos en las semanas seleccionadas.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card
              className="border border-rose-100 bg-white shadow-sm"
              data-guide="card-gastos"
            >
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-rose-50 p-2">
                    <ArrowDownCircle className="h-5 w-5 text-rose-500" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Gastos totales del mes
                    </CardTitle>
                    <CardDescription>
                      Desembolsos clasificados por semana.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total del periodo
                  </span>
                  <span className="text-xl font-semibold text-rose-500">
                    {formatCurrency(totalCostosFiltrados)}
                  </span>
                </div>
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">
                    Procesando datos...
                  </p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : gastosFiltrados.length > 0 ? (
                  <SimpleBarChart
                    rawData={gastosFiltrados}
                    dataKey="monto"
                    gradient="from-rose-400 to-purple-500"
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay gastos en las semanas seleccionadas.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card
              className="border border-sky-100 bg-white shadow-sm"
              data-guide="card-utilidad"
            >
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-sky-50 p-2">
                    <Wallet className="h-5 w-5 text-sky-500" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Utilidad neta del mes
                    </CardTitle>
                    <CardDescription>
                      Relación entre ingresos y gastos del periodo.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">
                    Procesando datos...
                  </p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Resultado acumulado
                          </p>
                          <p
                            className={`text-2xl font-semibold ${
                              utilidadNetaPeriodo > 0
                                ? "text-emerald-600"
                                : utilidadNetaPeriodo < 0
                                  ? "text-rose-500"
                                  : "text-slate-700"
                            }`}
                          >
                            {formatCurrency(utilidadNetaPeriodo)}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`border ${
                            utilidadNetaPeriodo > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : utilidadNetaPeriodo < 0
                                ? "border-rose-200 bg-rose-50 text-rose-600"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {utilidadNetaPeriodo > 0
                            ? "Utilidad positiva"
                            : utilidadNetaPeriodo < 0
                              ? "En negativo"
                              : "Equilibrado"}
                        </Badge>
                      </div>
                     <div className="grid gap-1 text-sm text-muted-foreground">
                        <span>
                          Total ventas:{" "}
                          {formatCurrency(resumenSemanal.totalVentas)}
                        </span>
                        <span>
                          Total gastos operativos:{" "}
                          {formatCurrency(resumenSemanal.totalGastos)}
                        </span>
                        <span>
                          Total compras:{" "}
                          {formatCurrency(resumenSemanal.totalCompras)}
                        </span>
                        <span
                          className={
                            resumenSemanal.totalUtilidad < 0
                              ? "text-red-500 font-semibold"
                              : "text-slate-700"
                          }
                        >
                          Total utilidad:{" "}
                          {formatCurrency(resumenSemanal.totalUtilidad)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <SimplePieChart
                        data={utilidadPieChartData}
                        valueFormatter={(value) => formatCurrency(value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card
            className="border border-slate-200 bg-white shadow-sm"
            data-guide="card-crecimiento"
          >
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-cyan-50 p-2">
                  <Activity className="h-5 w-5 text-cyan-600" />
                </span>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Crecimiento mensual
                  </CardTitle>
                  <CardDescription>
                    Comparativa detallada del rango seleccionado.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {monthlyGrowthTableData.length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                  {/* TABLA DINÁMICA DE MESES (Modo Utilidad) */}
                  <div className="order-2 space-y-4 lg:order-1 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periodo</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Gastos</TableHead>
                          <TableHead className="text-right">Utilidad</TableHead>
                          <TableHead className="text-right">
                            Crecimiento (Utilidad)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyGrowthTableData.map((row) => (
                          <TableRow key={row.label}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {row.label}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600/80 text-xs">
                              {formatCurrency(row.ingresos)}
                            </TableCell>
                            <TableCell className="text-right text-rose-500/80 text-xs">
                              {formatCurrency(row.gastos)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-bold ${row.isNegative ? "text-orange-600" : "text-slate-700"}`}
                            >
                              {formatCurrency(row.utilidad)}
                            </TableCell>

                            <TableCell className="text-right">
                              {!row.hasPrevious ? (
                                <Badge
                                  variant="outline"
                                  className="text-slate-500 font-normal"
                                >
                                  Base
                                </Badge>
                              ) : (
                                <div
                                  className={`flex items-center justify-end gap-1 font-medium ${
                                    row.isNegative
                                      ? "text-orange-600"
                                      : row.variacion > 0
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {row.isNegative ? (
                                    <>
                                      <span className="text-xs">
                                        Sin ganancia real
                                      </span>
                                      <AlertTriangle className="h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      {row.variacion > 0 ? "+" : ""}
                                      {row.variacion.toFixed(1)}%
                                      {row.variacion > 0 ? (
                                        <TrendingUp className="h-4 w-4" />
                                      ) : (
                                        <TrendingUp className="h-4 w-4 rotate-180" />
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span>= Crecimiento de utilidad</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 rotate-180 text-red-600" />
                        <span>= Decrecimiento de utilidad</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                        <span className="font-medium text-orange-700">
                          = Pérdida operativa (Utilidad negativa)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GRÁFICA RADAR LOCAL */}
                  <div className="order-1 flex justify-center lg:order-2">
                    <SimpleRadarChart data={dailyComparisonData} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground">
                    Selecciona un rango de fechas válido para calcular el
                    crecimiento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- CONTENIDO: RENDIMIENTO (REFactor COMPONENTES) --- */}
        <TabsContent value="rendimiento" className="space-y-8">
          <ProjectionCardsRow
            diasPrediccion={diasPrediccion}
            predVentas={predVentas}
            predCompras={predCompras}
            predGastos={predGastos}
            formatCurrency={formatCurrency}
          />

          <InventoryRiskAlertCard quiebres={quiebres} diasPrediccion={diasPrediccion} />

          <PerformanceByPeriodCard
            rows={performanceSummaryRows}
            formatCurrency={(value) => formatCurrency(value)}
          />

          <WeeklySalesUtilityComparisonCard
            loading={loadingPeriodo}
            error={errorPeriodo}
            data={comparativaPeriodoDisplay as any}
          />
        </TabsContent>

        {/* --- CONTENIDO: ANALISIS (TU CÓDIGO ORIGINAL) --- */}
        <TabsContent value="analisis" className="space-y-8">
          <Card
            className="border border-indigo-100 bg-indigo-50/40"
            data-guide="segmentacion-temporal"
          >
            <CardHeader>
              <CardTitle>Segmentación temporal</CardTitle>
              <CardDescription>
                Ajusta el mes y las semanas para que los listados reflejen la
                información deseada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                <div
                  className="flex flex-col gap-1 md:w-56"
                  data-guide="select-mes-analisis"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Mes de análisis
                  </span>
                  <Select
                    value={selectedMonth}
                    onValueChange={handleMonthSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  className="flex flex-col gap-1"
                  data-guide="select-semanas-analisis"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Semanas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {weekOptions.map((week) => (
                      <Button
                        key={`analisis-week-${week.value}`}
                        type="button"
                        size="sm"
                        variant={
                          selectedWeeks.includes(week.value)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleWeekSelect(week.value)}
                      >
                        {week.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estos filtros afectan tanto las tablas como las gráficas de este
                apartado.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopCustomersCard
              customers={topClientesTop10}
              ingresosBarChartData={ingresosBarChartData}
              formatCurrency={formatCurrency}
              periodo={topClientesPeriodo}
              onPeriodoChange={setTopClientesPeriodo}
            />

            <TopProductsCard
              products={topProductosFiltrados}
              pieData={topProductosPieData}
              topProductosLimit={topProductosLimit}
              limits={TOP_PRODUCTOS_LIMITS}
              onLimitChange={setTopProductosLimit}
            />
          </div>
          <LowRotationProductsCard
            items={bajaRotacion}
            limit={bajaRotacionLimit}
            limits={[5, 10, 20, 30, 50]}
            onLimitChange={setBajaRotacionLimit}
          />

          <WeeklyPeriodCardsSection
            containerRef={periodCardsRef}
            loadingReturns={loadingDevolucionesPeriodo}
            returnsError={errorDevolucionesPeriodo}
            returnsItems={devolucionesSemanalPeriodoDisplay}
            returnsTotal={resumenDevolucionesSemanal}
            loadingDiscounts={loadingPeriodo}
            discountsError={errorPeriodo}
            discountsItems={ventasDescuentoSemanalDisplay}
            discountsTotal={totalVentasDescuentoPeriodo}
            hasDiscountSales={hayVentasDescuento}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* --- CONTENIDO: INVENTARIO  --- */}
        <TabsContent value="inventario" className="space-y-8">
          <MinimumInventoryCard
            products={productosMin}
            limit={productosMinLimit}
            limits={PRODUCTOS_MIN_LIMITS}
            onLimitChange={setProductosMinLimit}
            colors={PRODUCTOS_MIN_COLORS}
          />

          <NegativeInventoryProjectionCard
            diasPrediccion={diasPrediccion}
            predicciones={predicciones}
          />
        </TabsContent>

        {/* --- CONTENIDO: KPIs (TU CÓDIGO ORIGINAL) --- */}
        <TabsContent value="kpis" className="space-y-8">
          <KpiFinancialSection
            financialTableDia={financialTableDia}
            financialTableSemana={financialTableSemana}
            financialTableMes={financialTableMes}
            currentWeekLabel={currentWeekRange.label}
          />
        </TabsContent>

        {/* --- CONTENIDO: ALERTAS (LÓGICA BLINDADA Y CORREGIDA) --- */}
        <TabsContent value="alertas" className="space-y-8">
          <p>
            Alertas estratégicas y sugerencias basadas en tus proyecciones
            financieras y de inventario.
          </p>

          {/* === 1. SECCIÓN MOVIDA AQUÍ: METAS INTELIGENTES (IA) === */}
          <MetasImpactoCards
            metasIA={metasIA}
            kpisDia={kpisDia}
            kpisSemana={kpisSemana}
            kpisMes={kpisMes}
            impactoDevoluciones={impactoDevoluciones}
            formatCurrency={formatCurrency}
          />

          {/* --- TABLA 1: ALERTAS GERENCIALES (AHORA ABAJO DE METAS) --- */}
          <ManagerialAlertsPanel
            alerts={evaluatedManagerialAlerts}
            stylesBySeverity={managerialAlertStyles}
          />

          {/* --- TABLA 2: ALERTAS RÁPIDAS  --- */}
          <QuickAlertsPanel alerts={evaluatedQuickAlerts} />
                </TabsContent>
      </Tabs>
    </div>
  );
}
