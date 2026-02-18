'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';
import { BookOpen, ChevronDown, Video, PlayCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SimpleBarChart from '@/components/SimpleBarChart'
import SimplePieChart from '@/components/SimplePieChart'
import SimpleRadarChart, { SimpleRadarDatum } from '@/components/SimpleRadarChart'
import WeeklyComparisonChart from '@/components/WeeklyComparisonChart'

import GerenteChatDialog from '@/components/GerenteChatDialog'

import {
  TrendingUp,
  ShoppingCart,
  Wallet,
  ArrowDownCircle,
  BarChart3,
  Activity,
  RotateCcw,
  FileText,
  Percent,
  AlertTriangle,
  Crown,
  Users,
  Lightbulb,
  CalendarRange,
} from 'lucide-react'
import { toast } from 'sonner'

interface Venta {
  id: number
  folio?: string
  numdoc: string
  total: number
  fecha: string
  fecha_devolucion?: string
  descuento?: number
  tipo_descuento?: string
  descuentos?: number[]
  activo?: number
}

interface Detalle {
  id: number
  cantidad: number
  total: number
  costo?: number
  venta?: { numdoc: string }
  producto?: { nombre: string }
  activo?: number
  descuento?: number
}

interface GastoPeriodo {
  id: number
  monto: number
  fecha?: string
  activo?: number
}

interface Producto {
  id: number
  nombre: string
  cantidad_existencia: number
  stock_min: number
}

interface Prediccion {
  productoId: number
  nombre: string
  promedioDiario: number
  prediccion: number
  stockActual: number
  stockEsperado: number
}
interface PrediccionMonto {
  totalUltimos30Dias: number
  promedioDiario: number
  prediccion: number
}

interface KpisDia {
  ventasTotales: number
  metaDiaria: number
  ticketPromedio: number
  numeroTransacciones: number
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  totalCheque: number
  totalVale: number
  totalCredito: number
  porcentajeDevoluciones: number
  totalCompras: number
  totalGastos: number
}

interface KpisSemana {
  ventasTotales: number
  metaDiaria: number
  metaSemanal: number
  ticketPromedio: number
  numeroTransacciones: number
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  totalCheque: number
  totalVale: number
  totalCredito: number
  porcentajeDevoluciones: number
  totalCompras: number
  totalGastos: number
}

interface KpisMes {
  ventasTotales: number
  metaDiaria: number
  metaMensual: number
  ticketPromedio: number
  numeroTransacciones: number
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  totalCheque: number
  totalVale: number
  totalCredito: number
  porcentajeDevoluciones: number
  totalCompras: number
  totalGastos: number
}

interface TopProducto {
  productoId: number
  nombre: string
  cantidadVendida: number
}

interface TopCliente {
  clienteId: number
  nombre: string
  totalVendido: number
}

interface MonthlyTotals {
  ventas: number
  gastos: number
  utilidad: number
  label: string
}

interface MonthlyComparison {
  current: MonthlyTotals
  previous: MonthlyTotals
}


interface PeriodoComparativoItem {
  label: string
  ventas: number
  costo: number
  utilidad: number
  gastos: number
  detail?: string
  monthKey: string
  weekIndex: number
  rangeStartTime: number
  rangeEndTime: number
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
    content: "Este es tu asistente de Inteligencia Artificial. Puedes chatear con él para pedirle consejos, interpretaciones de tus datos o resolver dudas operativas al instante.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "tab-resumen", 
    title: "2. Resumen Financiero", 
    content: "Tu balance general. Aquí verás ingresos, gastos y utilidad neta. (Entra a esta pestaña para ver su guía detallada).", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "tab-rendimiento", 
    title: "3. Rendimiento Comercial", 
    content: "Proyecciones a futuro con IA y comparativas semanales. (Tiene su propia guía interactiva adentro).", 
    placement: "bottom", 
    modalPosition: "bottom-center" 
  },
  { 
    targetKey: "tab-analisis", 
    title: "4. Análisis de Clientes", 
    content: "Ranking de mejores clientes, productos estrella y devoluciones. (Consulta su guía específica para más detalle).", 
    placement: "bottom", 
    modalPosition: "bottom-center" 
  },
  { 
    targetKey: "tab-inventario", 
    title: "5. Inventario", 
    content: "Monitoreo de stock crítico y predicciones de quiebre de inventario. (Cuenta con guía operativa interna).", 
    placement: "bottom", 
    modalPosition: "bottom-center" 
  },
  { 
    targetKey: "tab-kpis", // Asegúrate de que el Tab tenga este data-guide
    title: "6. Datos Financieros", 
    content: "Tablas detalladas de ingresos y egresos (Diario, Semanal, Mensual) para auditoría.", 
    placement: "bottom", 
    modalPosition: "bottom-right" 
  },
  { 
    targetKey: "tab-alertas", // Asegúrate de que el Tab tenga este data-guide
    title: "7. Alertas y Sugerencias", 
    content: "El centro de inteligencia. Avisos automáticos sobre riesgos operativos y financieros urgentes.", 
    placement: "bottom", 
    modalPosition: "bottom-right" 
  },
];
// 1. RESUMEN MENSUAL
const GUIDE_FLOW_RESUMEN: GuideStep[] = [
  { 
    targetKey: "config-periodo", 
    title: "1. Configuración del periodo", 
    content: "Panel general para definir el rango de tiempo.", 
    placement: "right", // Cambiado a derecha para no tapar el contenido
    modalPosition: "right" 
  },
  { 
    targetKey: "input-fecha-inicio", 
    title: "1.1 Fecha de inicio", 
    content: "Selecciona el día de inicio.", 
    placement: "bottom", // Cambiado a bottom para no tapar el label
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "input-fecha-fin", 
    title: "1.2 Fecha de fin", 
    content: "Selecciona el día de fin.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "select-mes", 
    title: "1.3 Seleccionar mes", 
    content: "O elige un mes completo rápidamente.", 
    placement: "bottom", 
    modalPosition: "bottom-center" 
  },
  { 
    targetKey: "select-semanas", 
    title: "1.4 Semanas del mes", 
    content: "Filtra por semanas específicas.", 
    placement: "bottom", 
    modalPosition: "bottom-right" 
  },
  { 
    targetKey: "card-ingresos", 
    title: "2. Ingresos totales", 
    content: "Ventas totales del periodo.", 
    placement: "right", 
    modalPosition: "left" 
  },
  { 
    targetKey: "card-gastos", 
    title: "3. Gastos totales", 
    content: "Egresos operativos totales.", 
    placement: "left", // Cambiado para evitar bordes
    modalPosition: "right" 
  },
  { 
    targetKey: "card-utilidad", 
    title: "4. Utilidad neta", 
    content: "Ingresos menos gastos.", 
    placement: "top", 
    modalPosition: "top-center" 
  },
  { 
    targetKey: "card-crecimiento", 
    title: "5. Crecimiento mensual", 
    content: "Comparativa vs mes anterior.", 
    placement: "top", 
    modalPosition: "top-left" 
  }
];

// 2. RENDIMIENTO COMERCIAL
const GUIDE_FLOW_RENDIMIENTO: GuideStep[] = [
  { 
    targetKey: "card-pred-ventas", 
    title: "1. Proyección de ventas", 
    content: "Estimación IA a 7 días.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "card-pred-compras", 
    title: "2. Proyección de compras", 
    content: "Estimación de resurtido.", 
    placement: "bottom", 
    modalPosition: "bottom-center" 
  },
  { 
    targetKey: "card-pred-gastos", 
    title: "3. Proyección de gastos", 
    content: "Estimación de gastos fijos/variables.", 
    placement: "bottom", 
    modalPosition: "bottom-right" 
  },
  { 
    targetKey: "card-alerta-inventario", 
    title: "4. Alerta de inventario", 
    content: "Aviso de productos por agotarse.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "tabla-rendimiento", 
    title: "5. Rendimiento por periodo", 
    content: "Tabla Diario vs Mensual.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "chart-comparativa", 
    title: "6. Comparativa semanal", 
    content: "Tendencia entre semanas.", 
    placement: "top", 
    modalPosition: "top-left" 
  }
];

// 3. ANÁLISIS DE CLIENTES Y PRODUCTOS
const GUIDE_FLOW_ANALISIS: GuideStep[] = [
  { 
    targetKey: "segmentacion-temporal", 
    title: "1. Segmentación temporal", 
    content: "Filtros para este reporte.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "select-mes-analisis", 
    title: "1.1 Mes de análisis", 
    content: "Selecciona el mes base.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "select-semanas-analisis", 
    title: "1.2 Semanas", 
    content: "Filtra por semana.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "card-mejores-clientes", 
    title: "2. Mejores clientes", 
    content: "Top compradores.", 
    placement: "right", 
    modalPosition: "left" 
  },
  { 
    targetKey: "chart-ventas-semanales", 
    title: "3. Ventas semanales", 
    content: "Gráfica de comportamiento.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "card-productos-vendidos", 
    title: "4. Productos más vendidos", 
    content: "Ranking de rotación.", 
    placement: "left", 
    modalPosition: "right" 
  },
  { 
    targetKey: "card-devoluciones", 
    title: "5. Devoluciones por mes", 
    content: "Análisis de devoluciones.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "card-descuentos", 
    title: "6. Ventas con descuento", 
    content: "Impacto de promociones.", 
    placement: "top", 
    modalPosition: "top-right" 
  }
];

// 4. INVENTARIO
const GUIDE_FLOW_INVENTARIO: GuideStep[] = [
  { 
    targetKey: "card-stock-minimo", 
    title: "1. Productos con inventario mínimo", 
    content: "Artículos en el límite de seguridad.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "card-proyeccion-quiebre", 
    title: "2. Proyección inventario negativo", 
    content: "Predicción de agotamiento.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  }
];

// 5. DATOS FINANCIEROS
const GUIDE_FLOW_KPIS: GuideStep[] = [
  { 
    targetKey: "card-kpi-diario", 
    title: "1. Ingresos/Egresos Diarios", 
    content: "Desglose detallado del día actual.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "card-kpi-semanal", 
    title: "2. Ingresos/Egresos Semanales", 
    content: "Resumen acumulado de la semana.", 
    placement: "top", 
    modalPosition: "top-center" 
  },
  { 
    targetKey: "card-kpi-mensual", 
    title: "3. Ingresos/Egresos Mensuales", 
    content: "Visión global del mes.", 
    placement: "top", 
    modalPosition: "top-right" 
  }
];

// 6. ALERTAS Y SUGERENCIAS
const GUIDE_FLOW_ALERTAS: GuideStep[] = [
  { 
    targetKey: "tabla-alertas-gerenciales", 
    title: "1. Panel Gerente", 
    content: "Alertas profundas de rentabilidad.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "tabla-alertas-rapidas", 
    title: "2. Alertas Rápidas", 
    content: "Alertas operativas inmediatas.", 
    placement: "bottom", 
    modalPosition: "bottom-left" 
  },
  { 
    targetKey: "card-meta-diaria", 
    title: "3. Meta Diaria de Ventas", 
    content: "Visualiza si has alcanzado el objetivo.", 
    placement: "top", 
    modalPosition: "top-left" 
  },
  { 
    targetKey: "card-devoluciones-semanales", 
    title: "4. Devoluciones Semanales", 
    content: "Monitoreo del porcentaje de devoluciones.", 
    placement: "top", 
    modalPosition: "top-right" 
  }
];
// 8. GUÍA GERENTE CROV 
const GUIDE_FLOW_GERENTE: GuideStep[] = [
  { 
    targetKey: "btn-chat-gerente", 
    title: "1. Gerente Virtual CROV", 
    content: "Este es el cerebro de tu operación. Haz clic aquí para abrir el chat con tu asistente IA capaz de ejecutar acciones en la base de datos.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "btn-help-chat", 
    title: "2. Menú de Comandos (?)", 
    content: "Dentro del chat, encontrarás este icono. Al pulsarlo, verás el menú de comandos rápidos divididos por áreas.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-0", // Clientes
    title: "3. Gestión de Clientes", 
    content: "Administra tu cartera. Pregunta: '¿Quién es mi mejor cliente?', 'Registrar nuevo cliente' o modifica sus datos.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-1", // Proveedores
    title: "4. Proveedores", 
    content: "Control de suministros. Consulta a quién le compras más o registra nuevos proveedores en el sistema.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-2", // Créditos
    title: "5. Créditos y Cobranza", 
    content: "Gestión de deuda. Revisa créditos pendientes o registra abonos a cuentas específicas.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-3", // Caja
    title: "6. Caja y Movimientos", 
    content: "Control de efectivo. Registra retiros, gastos varios o ingresos de fondo de caja.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-4", // Cortes
    title: "7. Cortes e Historial", 
    content: "Cierres de turno. Solicita 'Hacer un pre-corte' para ver el balance actual o realiza el corte definitivo.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-5", // Análisis
    title: "8. Análisis y Reportes", 
    content: "Inteligencia de negocio. Consulta ventas del día, top productos o rendimiento de tus cajeros.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-6", // Ventas/Devoluciones
    title: "9. Operaciones y Devoluciones", 
    content: "Realiza ventas rápidas, compras a proveedor o gestiona devoluciones de mercancía.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-7", // Inventario
    title: "10. Inventario", 
    content: "Gestión de catálogo. Registra nuevos productos o modifica precios rápidamente.", 
    placement: "left", 
    modalPosition: "left" 
  },
  { 
    targetKey: "help-item-8", // Soporte
    title: "11. Soporte Técnico", 
    content: "Ayuda directa. Si detectas un error, usa 'Levantar reporte de fallo' para notificar al equipo.", 
    placement: "left", 
    modalPosition: "left" 
  },
];
//fin guias
const formatCurrency = (value: number | undefined | null) => {
  // BLINDAJE: Si el valor no existe o no es un número, devolvemos $0.00 en vez de tronar
  if (value === undefined || value === null || isNaN(value)) {
    return "$0.00"; 
  }
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

const computeDailyNetProfit = (kpis: KpisDia | null): number | null => {
  if (!kpis) {
    return null
  }

  const ventas = Number(kpis.ventasTotales)
  const compras = Number(kpis.totalCompras)
  const gastos = Number(kpis.totalGastos)

  if ([ventas, compras, gastos].some((value) => Number.isNaN(value))) {
    return null
  }

  return ventas - gastos
}

type QuickAlertContext = {
  kpisDia: KpisDia | null
  dailyNetProfit: number | null
}

interface QuickAlertDefinition {
  icon: string
  title: string
  condition: string
  action: string
  evaluate: (context: QuickAlertContext) => boolean
  detail?: (context: QuickAlertContext) => string | null
}

type QuickAlertInstance = QuickAlertDefinition & {
  isActive: boolean
  detailText: string | null
}

type ManagerialAlertLevel =
  | 'critical'
  | 'warning'
  | 'caution'
  | 'info'
  | 'stable'

type ManagerialAlertContext = {
  kpisDia: KpisDia | null
  kpisSemana: KpisSemana | null
  kpisMes: KpisMes | null
  monthlyComparison: MonthlyComparison | null
  comparativaPeriodo: PeriodoComparativoItem[]
  dailyNetProfit: number | null
}

type ManagerialAlertEvaluation = {
  severity: ManagerialAlertLevel
  isTriggered: boolean
  detail?: string
  actionDetail?: string
  statusNote?: string
}

type ManagerialAlertDefinition = {
  icon: string
  alert: string
  condition: string
  action: string
  evaluate: (context: ManagerialAlertContext) => ManagerialAlertEvaluation
}

const quickAlertDefinitions: QuickAlertDefinition[] = [
  {
    icon: '🚨',
    title: 'Utilidades en negativo',
    condition: 'Cuando la utilidad del día sea negativa',
    action: 'Revisión inmediata de gastos',
    evaluate: ({ dailyNetProfit }) =>
      typeof dailyNetProfit === 'number' && dailyNetProfit < 0,
    detail: ({ dailyNetProfit }) =>
      typeof dailyNetProfit === 'number'
        ? `Utilidad actual: ${formatCurrency(dailyNetProfit)}`
        : null,
  },
  {
    icon: '⚠️',
    title: 'Ventas bajas',
    condition: 'Ventas diarias por debajo de la meta diaria',
    action: 'Reforzar estrategias de ventas',
    evaluate: ({ kpisDia }) => {
      if (!kpisDia) {
        return false
      }

      const meta = Number(kpisDia.metaDiaria)
      const ventas = Number(kpisDia.ventasTotales)

      if (Number.isNaN(meta) || Number.isNaN(ventas) || meta <= 0) {
        return false
      }

      return ventas < meta
    },
    detail: ({ kpisDia }) => {
      if (!kpisDia) {
        return null
      }

      const meta = Number(kpisDia.metaDiaria)
      const ventas = Number(kpisDia.ventasTotales)

      if (Number.isNaN(meta) || Number.isNaN(ventas)) {
        return null
      }

      const missing = meta - ventas

      if (missing <= 0) {
        return null
      }

      return `Faltan ${formatCurrency(missing)} para alcanzar la meta diaria.`
    },
  },
  {
    icon: '🔴',
    title: 'Utilidades < 30%',
    condition: 'Utilidad neta menor al 30% respecto a ingresos',
    action: 'Revisión de costos',
    evaluate: ({ kpisDia, dailyNetProfit }) => {
      if (!kpisDia || typeof dailyNetProfit !== 'number') {
        return false
      }

      const ventas = Number(kpisDia.ventasTotales)

      if (!Number.isFinite(ventas) || ventas <= 0) {
        return false
      }

      const margin = dailyNetProfit / ventas
      return margin < 0.3
    },
    detail: ({ kpisDia, dailyNetProfit }) => {
      if (!kpisDia || typeof dailyNetProfit !== 'number') {
        return null
      }

      const ventas = Number(kpisDia.ventasTotales)

      if (!Number.isFinite(ventas) || ventas <= 0) {
        return null
      }

      const margin = (dailyNetProfit / ventas) * 100
      return `Margen actual: ${margin.toFixed(1)}%`
    },
  },
  {
    icon: '🟠',
    title: 'Devoluciones altas',
    condition: 'Devoluciones del día superiores al 30%',
    action: 'Revisión de calidad de productos',
    evaluate: ({ kpisDia }) => {
      if (!kpisDia) {
        return false
      }

      const porcentaje = Number(kpisDia.porcentajeDevoluciones)

      if (Number.isNaN(porcentaje)) {
        return false
      }

      return porcentaje > 30
    },
    detail: ({ kpisDia }) => {
      if (!kpisDia) {
        return null
      }

      return `Devoluciones actuales: ${kpisDia.porcentajeDevoluciones.toFixed(2)}%`
    },
  },
]
const managerialAlertDefinitions: ManagerialAlertDefinition[] = [
  {
    icon: '🔴',
    alert: 'Utilidad neta < 30%',
    condition: 'Rentabilidad insuficiente',
    action: 'Revisar estructura de costos',
    evaluate: ({ kpisMes }) => {
      if (!kpisMes) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin datos mensuales disponibles.',
          statusNote: 'Esperando información del mes en curso.',
        }
      }

      const ventas = Number(kpisMes.ventasTotales)
      const compras = Number(kpisMes.totalCompras ?? 0)
      const gastos = Number(kpisMes.totalGastos ?? 0)

      if (![ventas, compras, gastos].every((value) => Number.isFinite(value))) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Datos incompletos para calcular la utilidad neta.',
          statusNote: 'Verifica que las ventas y gastos estén actualizados.',
        }
      }

      if (ventas <= 0) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin ventas registradas este mes.',
          statusNote: 'No es posible evaluar el margen sin ventas.',
        }
      }

      const netProfit = ventas - compras - gastos
      const margin = ventas === 0 ? null : netProfit / ventas

      if (margin === null || !Number.isFinite(margin)) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'No fue posible calcular el margen de utilidad.',
          statusNote: 'Revisa los datos capturados para el periodo.',
        }
      }

      const marginPct = (margin * 100).toFixed(1)
      const detail = `Margen actual: ${marginPct}%`
      const actionDetail = `Utilidad neta: ${formatCurrency(netProfit)}`

      if (margin < 0) {
        return {
          severity: 'critical',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Margen negativo detectado.',
        }
      }

      if (margin < 0.3) {
        return {
          severity: 'warning',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Margen por debajo del objetivo del 30%.',
        }
      }

      if (margin < 0.4) {
        return {
          severity: 'caution',
          isTriggered: false,
          detail,
          actionDetail,
          statusNote: 'Margen cercano al umbral crítico.',
        }
      }

      return {
        severity: 'stable',
        isTriggered: false,
        detail,
        actionDetail,
        statusNote: 'Margen saludable.',
      }
    },
  },
  {
    icon: '⚠️',
    alert: 'Flujo de caja negativo 2 semanas',
    condition: 'Fuga de efectivo o cobros lentos',
    action: 'Revisión de gastos no esenciales',
    evaluate: ({ comparativaPeriodo }) => {
      if (!comparativaPeriodo.length) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin semanas registradas en el rango seleccionado.',
          statusNote: 'Ajusta el periodo para evaluar el flujo de caja.',
        }
      }

      const ordered = [...comparativaPeriodo].sort(
        (a, b) => a.rangeEndTime - b.rangeEndTime
      )
      const lastTwo = ordered.slice(-2)

      if (lastTwo.length < 2) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Se requieren al menos dos semanas de datos.',
          statusNote: 'Amplía el rango para analizar tendencias.',
        }
      }

      const detail = lastTwo
        .map((item) => `${item.label}: ${formatCurrency(item.utilidad)}`)
        .join(' · ')
      const cumulative = lastTwo.reduce(
        (sum, item) => sum + (Number(item.utilidad) || 0),
        0
      )
      const actionDetail = `Flujo acumulado: ${formatCurrency(cumulative)}`
      const allNegative = lastTwo.every((item) => (Number(item.utilidad) || 0) < 0)
      const latestNegative = (Number(lastTwo[lastTwo.length - 1].utilidad) || 0) < 0

      if (allNegative) {
        return {
          severity: 'critical',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Dos semanas consecutivas con flujo negativo.',
        }
      }

      if (latestNegative) {
        return {
          severity: 'warning',
          isTriggered: false,
          detail,
          actionDetail,
          statusNote: 'La semana más reciente cerró con flujo negativo.',
        }
      }

      const totalIngresos = lastTwo.reduce(
        (sum, item) => sum + (Number(item.ventas) || 0),
        0
      )
      const margin = totalIngresos === 0 ? 0 : cumulative / totalIngresos

      if (margin < 0.05) {
        return {
          severity: 'caution',
          isTriggered: false,
          detail,
          actionDetail,
          statusNote: 'Flujo positivo pero con margen reducido.',
        }
      }

      return {
        severity: 'stable',
        isTriggered: false,
        detail,
        actionDetail,
        statusNote: 'Flujo saludable en las últimas semanas.',
      }
    },
  },
  {
    icon: '🟡',
    alert: 'Ventas estancadas',
    condition: 'Crecimiento <3% mensual',
    action: 'Reforzar estrategia de ventas o marketing',
    evaluate: ({ monthlyComparison }) => {
      if (!monthlyComparison) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin datos comparativos de ventas mensuales.',
          statusNote: 'Selecciona un mes para analizar el crecimiento.',
        }
      }

      const previous = Number(monthlyComparison.previous.ventas)
      const current = Number(monthlyComparison.current.ventas)

      if (![previous, current].every((value) => Number.isFinite(value))) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Datos incompletos para calcular el crecimiento mensual.',
          statusNote: 'Verifica los ingresos de los dos meses comparados.',
        }
      }

      if (previous <= 0) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin histórico del mes anterior para comparar.',
          actionDetail: `Ingresos actuales: ${formatCurrency(current)}`,
          statusNote: 'Se requiere un mes anterior con ventas para comparar.',
        }
      }

      const growth = (current - previous) / previous
      const growthPct = (growth * 100).toFixed(1)
      const detail = `Crecimiento mensual: ${growthPct}%`
      const actionDetail = `Actual: ${formatCurrency(current)} · Anterior: ${formatCurrency(previous)}`

      if (growth < 0) {
        return {
          severity: 'critical',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Ventas en descenso frente al mes anterior.',
        }
      }

      if (growth < 0.03) {
        return {
          severity: 'warning',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Crecimiento por debajo del objetivo del 3%.',
        }
      }

      if (growth < 0.06) {
        return {
          severity: 'caution',
          isTriggered: false,
          detail,
          actionDetail,
          statusNote: 'Crecimiento moderado, continúa monitoreando.',
        }
      }

      return {
        severity: 'stable',
        isTriggered: false,
        detail,
        actionDetail,
        statusNote: 'Crecimiento saludable.',
      }
    },
  },
  {
    icon: '🔵',
    alert: 'Altas devoluciones',
    condition: 'Devoluciones >10% de ventas',
    action: 'Revisar calidad de productos y procesos',
    evaluate: ({ kpisSemana }) => {
      if (!kpisSemana) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'Sin datos de devoluciones semanales disponibles.',
          statusNote: 'Esperando actualización de KPIs semanales.',
        }
      }

      const porcentaje = Number(kpisSemana.porcentajeDevoluciones)

      if (!Number.isFinite(porcentaje)) {
        return {
          severity: 'info',
          isTriggered: false,
          detail: 'No fue posible calcular el porcentaje de devoluciones.',
          statusNote: 'Verifica las devoluciones registradas.',
        }
      }

      const detail = `Porcentaje actual: ${porcentaje.toFixed(1)}%`
      const actionDetail = 'Objetivo sugerido: ≤ 10%'

      if (porcentaje >= 15) {
        return {
          severity: 'critical',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Nivel de devoluciones muy alto.',
        }
      }

      if (porcentaje > 10) {
        return {
          severity: 'warning',
          isTriggered: true,
          detail,
          actionDetail,
          statusNote: 'Supera el umbral del 10%.',
        }
      }

      if (porcentaje > 8) {
        return {
          severity: 'caution',
          isTriggered: false,
          detail,
          actionDetail,
          statusNote: 'Cerca del umbral crítico, monitorea.',
        }
      }

      return {
        severity: 'stable',
        isTriggered: false,
        detail,
        actionDetail,
        statusNote: 'Devoluciones dentro de parámetros saludables.',
      }
    },
  },
]

const managerialAlertStyles: Record<
  ManagerialAlertLevel,
  { badge: string; row: string; label: string }
> = {
  critical: {
    badge: 'border border-red-200 bg-red-100 text-red-700',
    row: 'bg-red-50/80',
    label: 'Crítica',
  },
  warning: {
    badge: 'border border-amber-200 bg-amber-100 text-amber-700',
    row: 'bg-amber-50',
    label: 'Alerta',
  },
  caution: {
    badge: 'border border-yellow-200 bg-yellow-100 text-yellow-700',
    row: 'bg-yellow-50',
    label: 'Precaución',
  },
  info: {
    badge: 'border border-blue-200 bg-blue-100 text-blue-700',
    row: 'bg-blue-50',
    label: 'Seguimiento',
  },
  stable: {
    badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    row: '',
    label: 'Estable',
  },
}
const getMaxDailyRevenue = (data: unknown): number | null => {
  if (!data || typeof data !== 'object') {
    return null
  }

  const record = data as Record<string, unknown>
  const candidateArrays = Object.values(record).filter(
    (value): value is Record<string, unknown>[] =>
      Array.isArray(value) &&
      value.some(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          ('fecha' in item || 'dia' in item || 'date' in item || 'diaSemana' in item)
      )
  )

  const numericKeys = [
    'ventasTotales',
    'totalVentas',
    'total',
    'recaudacion',
    'monto',
    'ingresos',
    'valor',
  ] as const

  let maxRevenue = Number.NEGATIVE_INFINITY

  for (const collection of candidateArrays) {
    for (const entry of collection) {
      if (!entry || typeof entry !== 'object') {
        continue
      }

      const itemRecord = entry as Record<string, unknown>

      for (const key of numericKeys) {
        const rawValue = itemRecord[key]

        if (typeof rawValue === 'number' && rawValue > maxRevenue) {
          maxRevenue = rawValue
          continue
        }

        if (typeof rawValue === 'string') {
          const parsed = Number(rawValue)
          if (!Number.isNaN(parsed) && parsed > maxRevenue) {
            maxRevenue = parsed
          }
        }
      }
    }
  }

  return Number.isFinite(maxRevenue) ? maxRevenue : null
}
type PeriodKey = 'día' | 'semana' | 'mes'

type FinancialRow = {
  indicator: string
  
  displayValue: string
  isTotal?: boolean
  rawValue?: number
}

type FinancialTableData = {
  rows: FinancialRow[]
  generalTotalLabel: string
  
  generalTotal: number | null
}

const PERIOD_CONFIG: Record<PeriodKey, {
  totalIndicator: string
  
  generalLabel: string
  
}> = {
  día: {
    totalIndicator: 'Ventas totales del día',
    
    generalLabel: 'Total general diario',
   
  },
  semana: {
    totalIndicator: 'Ventas totales de la semana',
   
    generalLabel: 'Total general semanal',
    
  },
  mes: {
    totalIndicator: 'Ventas totales del mes',
    
    generalLabel: 'Total general mensual',
    
  },
}

const buildFinancialTableData = (
  kpis: KpisDia | KpisSemana | KpisMes,
  period: PeriodKey
): FinancialTableData => {
  const periodConfig = PERIOD_CONFIG[period]
  const totalBancos = kpis.totalTransferencia + kpis.totalTarjeta

  const nonTotalRows: FinancialRow[] = [
    {
      indicator: 'Venta promedio',
      
      displayValue: formatCurrency(kpis.ticketPromedio),
    },
    {
      indicator: 'Ventas en efectivo',
      
      displayValue: formatCurrency(kpis.totalEfectivo),
    },
    {
      indicator: 'Ventas por transferencia',
      
      displayValue: formatCurrency(kpis.totalTransferencia),
    },
    {
      indicator: 'Ventas por tarjeta',
     
      displayValue: formatCurrency(kpis.totalTarjeta),
    },
    {
      indicator: 'Total en bancos',
      
      displayValue: formatCurrency(totalBancos),
    },
    {
      indicator: 'Ventas por cheque',
      
      displayValue: formatCurrency(kpis.totalCheque),
    },
    {
      indicator: 'Ventas con vales',
      
      displayValue: formatCurrency(kpis.totalVale),
    },
    {
      indicator: 'Total de venta a crédito',
      
      displayValue: formatCurrency(kpis.totalCredito),
    },
  ]

  const metricsRows: FinancialRow[] = [
    {
      indicator: '% de devoluciones sobre ventas',
      
      displayValue: `${kpis.porcentajeDevoluciones.toFixed(2)}%`,
    },
    {
      indicator: 'Número de ventas',
      
      displayValue: kpis.numeroTransacciones.toLocaleString('es-MX'),
    },
  ]

  const totalsRows: FinancialRow[] = [
    {
      indicator: periodConfig.totalIndicator,
      
      displayValue: formatCurrency(kpis.ventasTotales),
      rawValue: kpis.ventasTotales,
      isTotal: true,
    },
    {
      indicator: 'Total en compras',
      
      displayValue: formatCurrency(-kpis.totalCompras),
      rawValue: -kpis.totalCompras,
      isTotal: true,
    },
    {
      indicator: 'Total en gastos',
      
      displayValue: formatCurrency(-kpis.totalGastos),
      rawValue: -kpis.totalGastos,
      isTotal: true,
    },
  ]

  const generalTotal = totalsRows.reduce((sum, row) => sum + (row.rawValue ?? 0), 0)

  return {
    rows: [...nonTotalRows, ...metricsRows, ...totalsRows],
    generalTotalLabel: periodConfig.generalLabel,
    
    generalTotal,
  }
}

const FinancialTable = ({ data }: { data: FinancialTableData | null }) => {
  if (!data) {
    return null
  }

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
          const isNegative = typeof row.rawValue === 'number' && row.rawValue < 0

          // Validación de color: rojo si negativo, verde si >=0
          let amountClassName = 'text-right'
          if (row.isTotal) {
            amountClassName += ' text-lg'
            if (typeof row.rawValue === 'number') {
              amountClassName += row.rawValue < 0 ? ' text-red-600' : ' text-green-600'
            }
          } else if (isNegative) {
            amountClassName += ' text-red-600'
          }
        


         return (
            <TableRow
              key={row.indicator}
              className={row.isTotal ? 'bg-gray-50 font-semibold text-base' : ''}
            >
              <TableCell className="w-[70%] whitespace-normal break-words align-top">
                {row.indicator}
              </TableCell>
              <TableCell className={`w-[30%] ${amountClassName} whitespace-nowrap align-top`}>
                {row.displayValue}
              </TableCell>
            </TableRow>
          )
        })}

      {/* Ventas totales del día, semana y mes */}
      {['dailyTotal', 'weeklyTotal', 'monthlyTotal'].map((key) => {
        const total = data[key as keyof typeof data] as number | undefined
        const label =
          key === 'dailyTotal'
            ? 'Ventas totales del día'
            : key === 'weeklyTotal'
            ? 'Ventas totales de la semana'
            : 'Ventas totales del mes'

        if (typeof total === 'number') {
          const colorClass = total < 0 ? 'text-red-600' : 'text-green-600'

          return (
            <TableRow key={key} className="bg-gray-50 font-semibold text-base">
               <TableCell className="w-[70%] whitespace-normal break-words align-top text-lg">
                {label}
              </TableCell>
              
              <TableCell
                 className={`w-[30%] whitespace-nowrap align-top text-right text-lg ${colorClass}`}
              >
                {formatCurrency(total)}
              </TableCell>
            </TableRow>
          )
        }
        return null
      })}

      {/* Total general */}
      {typeof data.generalTotal === 'number' && (
                 <TableRow className="bg-gray-100 font-semibold text-base">
          <TableCell className="w-[70%] whitespace-normal break-words align-top text-lg">
            {data.generalTotalLabel}
          </TableCell>
         
          <TableCell
             className={`w-[30%] whitespace-nowrap align-top text-right text-lg ${
              data.generalTotal < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatCurrency(data.generalTotal)}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
)

}
const PRODUCTOS_MIN_LIMITS = [5, 10, 15, 20, 30]
const PRODUCTOS_MIN_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
]
const TOP_PRODUCTOS_LIMITS = [5, 6, 7, 8, 9, 10]
const TOP_PRODUCTOS_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#22c55e',
  '#f97316',
  '#f43f5e',
  '#a855f7',
  '#14b8a6',
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
]
const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value
const WEEK_OPTIONS = [
  { value: 0, label: '1ra semana' },
  { value: 1, label: '2da semana' },
  { value: 2, label: '3ra semana' },
  { value: 3, label: '4ta semana' },
]
const toInputDate = (date: Date) => {
 const reference = new Date(date)
  reference.setHours(0, 0, 0, 0)
  const year = reference.getFullYear()
  const month = String(reference.getMonth() + 1).padStart(2, '0')
  const day = String(reference.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const getMonthRange = (year: number, monthIndex: number) => {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return { start, end }
}

const getWeekRangeForMonth = (year: number, monthIndex: number, weekIndex: number) => {
  if (weekIndex < 0) {
    return null
  }

  const firstDayOfMonth = new Date(year, monthIndex, 1)
  firstDayOfMonth.setHours(0, 0, 0, 0)
  const firstDay = firstDayOfMonth.getDay()
  const diffToMonday =
    firstDay === 1 ? 0 : firstDay === 0 ? 1 : 8 - firstDay

  const monday = new Date(firstDayOfMonth)
  monday.setDate(firstDayOfMonth.getDate() + diffToMonday + weekIndex * 7)
  monday.setHours(0, 0, 0, 0)

  if (monday.getMonth() !== monthIndex && monday.getDate() > 7) {
    return null
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(0, 0, 0, 0)

  return { start: monday, end: sunday }
}
const parseDateInput = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number)

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null
  }

  const parsed = new Date(year, month - 1, day)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  result.setHours(0, 0, 0, 0)
  return result
}
const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  result.setHours(0, 0, 0, 0)
  return result
}


const getDefaultDateRange = () => {
  const today = new Date()
  const currentWeekStart = startOfWeek(today)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const currentWeekEnd = endOfWeek(today)

  return {
    start: toInputDate(previousWeekStart),
    end: toInputDate(currentWeekEnd),
  }
}
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
  const [activeTab, setActiveTab] = useState('resumen'); // Necesario para controlar las pestañas

  // --- FUNCIONES DE LA GUÍA ---
  const startGuide = (mode: 'GENERAL' | 'RESUMEN' | 'RENDIMIENTO' | 'ANALISIS' | 'INVENTARIO' | 'KPIS' | 'ALERTAS'|'GERENTE') => {
    let steps = GUIDE_FLOW_RESUMEN;
    let targetTab = 'resumen';

    // --- NUEVO CASO GENERAL ---
    if (mode === 'GENERAL') { 
        steps = GUIDE_FLOW_GENERAL; 
        // No cambiamos de pestaña forzosamente, o podemos ir a la primera ('resumen')
        targetTab = 'resumen'; 
    }
    
    if (mode === 'RENDIMIENTO') { steps = GUIDE_FLOW_RENDIMIENTO; targetTab = 'rendimiento'; }
    if (mode === 'ANALISIS') { steps = GUIDE_FLOW_ANALISIS; targetTab = 'analisis'; }
    if (mode === 'INVENTARIO') { steps = GUIDE_FLOW_INVENTARIO; targetTab = 'inventario'; }
    if (mode === 'KPIS') { steps = GUIDE_FLOW_KPIS; targetTab = 'kpis'; }
    if (mode === 'ALERTAS') { steps = GUIDE_FLOW_ALERTAS; targetTab = 'alertas'; }
    if (mode === 'GERENTE') { steps = GUIDE_FLOW_GERENTE; }

    setTimeout(() => {
        setCurrentSteps(steps);
        setCurrentStepIndex(0);
        setGuideActive(true);
        window.dispatchEvent(new Event('resize'));
    }, 500);
  };

  const closeGuide = () => setGuideActive(false);
const handleNextStep = () => {
  if (currentStepIndex < currentSteps.length - 1) {
    setCurrentStepIndex(p => p + 1)
  } else {
    if (currentSteps === GUIDE_FLOW_GENERAL) {
      startGuide('RESUMEN')
    } else if (currentSteps === GUIDE_FLOW_RESUMEN) {
      startGuide('RENDIMIENTO')
    } else if (currentSteps === GUIDE_FLOW_RENDIMIENTO) {
      startGuide('ANALISIS')
    } else if (currentSteps === GUIDE_FLOW_ANALISIS) {
      startGuide('INVENTARIO')
    } else if (currentSteps === GUIDE_FLOW_INVENTARIO) {
      startGuide('KPIS')
    } else if (currentSteps === GUIDE_FLOW_KPIS) {
      startGuide('ALERTAS')
    } else if (currentSteps === GUIDE_FLOW_ALERTAS) {
      startGuide('GERENTE')
    } else {
      closeGuide()
      toast.success("¡Guía completada!")
    }
  }
}
  const handlePrevStep = () => { if (currentStepIndex > 0) setCurrentStepIndex(p => p - 1); };
  const defaultDateRange = useMemo(() => getDefaultDateRange(), [])

  
  
  const [productosMin, setProductosMin] = useState<Producto[]>([])
  const [productosMinLimit, setProductosMinLimit] = useState<number>(10)
  const [predicciones, setPredicciones] = useState<Prediccion[]>([])
  const [predVentas, setPredVentas] = useState<PrediccionMonto | null>(null)
  const [predCompras, setPredCompras] = useState<PrediccionMonto | null>(null)
  const [predGastos, setPredGastos] = useState<PrediccionMonto | null>(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [kpisDia, setKpisDia] = useState<KpisDia | null>(null)
  const [kpisSemana, setKpisSemana] = useState<KpisSemana | null>(null)
  const [kpisMes, setKpisMes] = useState<KpisMes | null>(null)
  const [topProductos, setTopProductos] = useState<TopProducto[]>([])
  const [topProductosLimit, setTopProductosLimit] = useState<number>(5)
  const [topClientes, setTopClientes] = useState<TopCliente[]>([])
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison | null>(null)
  const [loadingMonthlyGrowth, setLoadingMonthlyGrowth] = useState(false)
  const [monthlyGrowthError, setMonthlyGrowthError] = useState<string | null>(null)
  const [showAllQuiebres, setShowAllQuiebres] = useState(false)
  
  const [fechaInicio, setFechaInicio] = useState(defaultDateRange.start)
  const [fechaFin, setFechaFin] = useState(defaultDateRange.end)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  
  const [comparativaPeriodo, setComparativaPeriodo] = useState<
     PeriodoComparativoItem[]
  >([])
  const [gastosSemanalPeriodo, setGastosSemanalPeriodo] = useState<
    {
      label: string
      total: number
      detail?: string
      monthKey: string
      weekIndex: number
      rangeStartTime: number
      rangeEndTime: number
    }[]
  >([])
  const [devolucionesSemanalPeriodo, setDevolucionesSemanalPeriodo] = useState<
    {
      label: string
      total: number
      detail?: string
      monthKey: string
      weekIndex: number
      rangeStartTime: number
      rangeEndTime: number
    }[]
  >([])
  const financialTableDia = useMemo(
    () => (kpisDia ? buildFinancialTableData(kpisDia, 'día') : null),
    [kpisDia]
  )
  const financialTableSemana = useMemo(
    () => (kpisSemana ? buildFinancialTableData(kpisSemana, 'semana') : null),
    [kpisSemana]
  )
  const financialTableMes = useMemo(
    () => (kpisMes ? buildFinancialTableData(kpisMes, 'mes') : null),
    [kpisMes]
  )

  
  const triggeredQuickAlertsRef = useRef<Set<string>>(new Set())

  const dailyNetProfit = useMemo(() => computeDailyNetProfit(kpisDia), [kpisDia])

  const evaluatedQuickAlerts = useMemo<QuickAlertInstance[]>(() => {
    const context: QuickAlertContext = { kpisDia, dailyNetProfit }

    const alerts = quickAlertDefinitions.map((definition) => {
      const isActive = definition.evaluate(context)
      const detailText = isActive ? definition.detail?.(context) ?? null : null

      return {
        ...definition,
        isActive,
        detailText,
      }
    })

    return alerts.sort((a, b) => Number(b.isActive) - Number(a.isActive))
  }, [kpisDia, dailyNetProfit])

useEffect(() => {
    if (guideActive && currentSteps === GUIDE_FLOW_GERENTE) {
      
      // Paso 0: "1. Gerente Virtual" (Apuntando al botón externo)
      if (currentStepIndex === 0) {
        setChatOpen(false);     // Aseguramos que esté cerrado
        setChatHelpOpen(false); 
      }
      
      // Paso 1: "2. Menú de Comandos" (Abrir Chat, apuntar al ?)
      else if (currentStepIndex === 1) {
        setChatOpen(true);      // Abrimos el modal del chat
        setChatHelpOpen(false); // Aseguramos que la ayuda esté cerrada para que vea el botón ?
      }

      // Paso 2 en adelante: "3. Créditos..." (Abrir Menú de Ayuda)
      else if (currentStepIndex >= 2) {
        setChatOpen(true);      // Mantenemos el chat abierto
        // Pequeño delay para dar tiempo a que renderice el modal antes de abrir el sidebar
        setTimeout(() => setChatHelpOpen(true), 150); 
      }
    }
  }, [currentStepIndex, currentSteps, guideActive]);

  const currentWeekRange = useMemo(() => {
    const today = new Date()
    const start = startOfWeek(today)
    const end = endOfWeek(today)
    const formatter = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
    })

    return {
      label: `${formatter.format(start)} - ${formatter.format(end)}`,
    }
  }, [])
  const [ventasDescuentoSemanal, setVentasDescuentoSemanal] = useState<
    {
      label: string
      total: number
      detail?: string
      monthKey: string
      weekIndex: number
      rangeStartTime: number
      rangeEndTime: number
    }[]
  >([])
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null)
  const [loadingDevolucionesPeriodo, setLoadingDevolucionesPeriodo] = useState(false)
  const [errorDevolucionesPeriodo, setErrorDevolucionesPeriodo] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalId = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const diasPrediccion = 7

  const productosMinFiltrados = useMemo(
    () => productosMin.slice(0, productosMinLimit),
    [productosMin, productosMinLimit]
  )

  const productosMinPieData = useMemo(
    () =>
      productosMinFiltrados.map((producto, index) => ({
        label: producto.nombre,
        value: Number(producto.cantidad_existencia ?? 0),
        color: PRODUCTOS_MIN_COLORS[index % PRODUCTOS_MIN_COLORS.length],
      })),
    [productosMinFiltrados]
  )
  const topProductosFiltrados = useMemo(
    () => topProductos.slice(0, topProductosLimit),
    [topProductos, topProductosLimit]
  )
  const topProductosPieData = useMemo(
    () =>
      topProductosFiltrados.map((producto, index) => ({
        label: producto.nombre,
        value: Number(producto.cantidadVendida ?? 0),
        color: TOP_PRODUCTOS_COLORS[index % TOP_PRODUCTOS_COLORS.length],
      })),
    [topProductosFiltrados]
  )
  const monthOptions = useMemo(() => {
    const now = new Date()
    const options: { value: string; label: string }[] = []

    for (let i = 0; i < 12; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = `${capitalize(
        date.toLocaleDateString('es-MX', { month: 'long' })
      )} ${date.getFullYear()}`
      options.push({ value: monthValue, label })
    }

    return options
  }, [])


  const handleFechaInicioChange = (value: string) => {
    setSelectedWeeks([])
    setSelectedMonth('')
    if (!value) {
      setFechaInicio(value)
      return
    }

     const parsed = parseDateInput(value)
    if (!parsed) {
      setFechaInicio(value)
      return
    }

    const normalizedValue = toInputDate(parsed)
    setFechaInicio(normalizedValue)

    if (fechaFin) {
      const currentEnd = parseDateInput(fechaFin)
      if (currentEnd && parsed > currentEnd) {
        setFechaFin(normalizedValue)
      }    
    }
  }

  const handleFechaFinChange = (value: string) => {
    setSelectedWeeks([])
    setSelectedMonth('')
    if (!value) {
      setFechaFin(value)
      return
    }

    const parsed = parseDateInput(value)
    if (!parsed) {
      setFechaFin(value)
      return
    }

    const normalizedValue = toInputDate(parsed)
    setFechaFin(normalizedValue)

    if (fechaInicio) {
      const currentStart = parseDateInput(fechaInicio)
      if (currentStart && parsed < currentStart) {
        setFechaInicio(normalizedValue)
      }
    }
  }

  const isDateWithinRange = (target: Date, start: Date, end: Date) =>
  target.getTime() >= start.getTime() && target.getTime() <= end.getTime()

const getWeekIndexForMonth = (weekStart: Date, year: number, month: number) => {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekStart = startOfWeek(firstOfMonth)
  const diffDays = Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / 86400000)
  return Math.floor(diffDays / 7) + 1
}

const getWeekInfo = (
  input: string | Date,
  options?: { rangeStart?: Date; rangeEnd?: Date }
) => {
  const reference = typeof input === 'string' ? new Date(input) : new Date(input)
  if (Number.isNaN(reference.getTime())) {
    return null
  }

  const monday = startOfWeek(reference)
  const friday = endOfWeek(reference)
  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
  })

  const { rangeStart, rangeEnd } = options ?? {}

  const displayStart = (() => {
    if (rangeStart && isDateWithinRange(rangeStart, monday, friday)) {
      return new Date(rangeStart)
    }
  return new Date(monday)
  })()
    const displayEnd = (() => {
    if (rangeEnd && isDateWithinRange(rangeEnd, monday, friday)) {
      return new Date(rangeEnd)
    }
     return new Date(friday)
  })()

  if (displayEnd.getTime() < displayStart.getTime()) {
    displayEnd.setTime(displayStart.getTime())
  }
  displayStart.setHours(0, 0, 0, 0)
  displayEnd.setHours(0, 0, 0, 0)
  const monthForLabel = displayEnd.getMonth()
  const yearForLabel = displayEnd.getFullYear()
  const weekIndex = getWeekIndexForMonth(monday, yearForLabel, monthForLabel)
  const monthKey = `${yearForLabel}-${String(monthForLabel + 1).padStart(2, '0')}`
  const monthLabel = capitalize(
    displayEnd.toLocaleDateString('es-MX', { month: 'short' })
  )

  return {
    key: `${monthKey}-W${weekIndex}`,
    label: `Semana ${weekIndex} ${monthLabel}`,
    order: monday.getTime(),
    detail: `${formatter.format(displayStart)} - ${formatter.format(displayEnd)}`,
    monthKey,
    weekIndex,
    rangeStartTime: displayStart.getTime(),
    rangeEndTime: displayEnd.getTime(),
  }
}
  const handleMonthSelect = (value: string) => {
    setSelectedMonth(value)
    setSelectedWeeks([])

    const [yearStr, monthStr] = value.split('-')
    const year = Number(yearStr)
    const monthIndex = Number(monthStr) - 1

    if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
      return
    }

    const range = getMonthRange(year, monthIndex)
    setFechaInicio(toInputDate(range.start))
    setFechaFin(toInputDate(range.end))
  }

  const handleWeekSelect = (weekIndex: number) => {
    if (!selectedMonth) {
      toast.warning('Selecciona un mes antes de elegir una semana.')
      return
    }

    const [yearStr, monthStr] = selectedMonth.split('-')
    const year = Number(yearStr)
    const monthIndex = Number(monthStr) - 1

    if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
      return
    }

    const isAlreadySelected = selectedWeeks.includes(weekIndex)
    const nextSelectedWeeks = isAlreadySelected
      ? selectedWeeks.filter((week) => week !== weekIndex)
      : [...selectedWeeks, weekIndex].sort((a, b) => a - b)

    if (!isAlreadySelected) {
      const range = getWeekRangeForMonth(year, monthIndex, weekIndex)

      if (!range) {
        toast.warning('No fue posible calcular el rango de la semana seleccionada.')
        return
      }
    }

    if (nextSelectedWeeks.length === 0) {
      const monthRange = getMonthRange(year, monthIndex)
      setSelectedWeeks([])
      setFechaInicio(toInputDate(monthRange.start))
      setFechaFin(toInputDate(monthRange.end))
      return
    }

    const ranges = nextSelectedWeeks.map((week) =>
      getWeekRangeForMonth(year, monthIndex, week)
    )

    if (ranges.some((range) => !range)) {
      toast.warning('No fue posible calcular el rango de las semanas seleccionadas.')
      return
    }

    const validRanges = ranges.filter(Boolean) as { start: Date; end: Date }[]

    const earliestStart = validRanges.reduce(
      (min, range) => (range.start < min ? range.start : min),
      validRanges[0].start
    )
    const latestEnd = validRanges.reduce(
      (max, range) => (range.end > max ? range.end : max),
      validRanges[0].end
    )

    setSelectedWeeks(nextSelectedWeeks)
    setFechaInicio(toInputDate(earliestStart))
    setFechaFin(toInputDate(latestEnd))
  }
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const [
          productosRes,
          predRes,
          predVentasRes,
          predComprasRes,
          predGastosRes,
          topProductosRes,
          topClientesRes,
        ] = await Promise.all([
          
          
          axios.get(`${apiUrl}/gerente/productosInventarioMinimo?sucursalId=${sucursalId}`, { headers }),
          axios.get(
            `${apiUrl}/gerente/prediccionInventario?sucursalId=${sucursalId}&dias=${diasPrediccion}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gerente/prediccionVentas?sucursalId=${sucursalId}&dias=${diasPrediccion}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gerente/prediccionCompras?sucursalId=${sucursalId}&dias=${diasPrediccion}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gerente/prediccionGastos?sucursalId=${sucursalId}&dias=${diasPrediccion}`,
            { headers }
          ),
          axios.get(`${apiUrl}/gerente/topProductosUltimoMes?sucursalId=${sucursalId}`, { headers }),
          axios.get(`${apiUrl}/gerente/topClientesUltimoMes?sucursalId=${sucursalId}`, { headers }),
        ])
        
        
        setProductosMin(productosRes.data)
        setPredicciones(predRes.data)
        const quiebres = predRes.data.filter((p: Prediccion) => p.stockEsperado < 0)
        if (quiebres.length > 0) {
          toast.warning(`Se proyecta desabasto de inventario en ${quiebres.length} producto(s)`)
        }
        setPredVentas(predVentasRes.data)
        setPredCompras(predComprasRes.data)
        setPredGastos(predGastosRes.data)
        setTopProductos(topProductosRes.data)
        setTopClientes(topClientesRes.data)

        

        const metaReferencia = Number(predVentasRes.data.promedioDiario) || 0

        const kpisDiaRes = await axios.get(
          `${apiUrl}/gerente/kpisDia?sucursalId=${sucursalId}&meta=${metaReferencia}`,
          { headers }
        )
        const metaDiariaDesdeDias = getMaxDailyRevenue(kpisDiaRes.data)
        const metaDiariaDesdeApi = Number(kpisDiaRes.data.metaDiaria)
        const metaDiariaBase = Number.isFinite(metaDiariaDesdeApi)
          ? metaDiariaDesdeApi
          : metaReferencia
        const metaDiaria =
          typeof metaDiariaDesdeDias === 'number' ? metaDiariaDesdeDias : metaDiariaBase

        const [kpisMesRes, kpisSemanaRes] = await Promise.all([
          axios.get(`${apiUrl}/gerente/kpisMes?sucursalId=${sucursalId}&meta=${metaDiaria}`, {
            headers,
          }),
          axios.get(`${apiUrl}/gerente/kpisSemana?sucursalId=${sucursalId}&meta=${metaDiaria}`, {
            headers,
          }),
        ])

        setKpisMes({ ...kpisMesRes.data, metaDiaria })
        setKpisSemana({ ...kpisSemanaRes.data, metaDiaria })
        setKpisDia({ ...kpisDiaRes.data, metaDiaria })
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const computeDefaultMonthRange = (value: string) => {
      const [yearStr, monthStr] = value.split('-')
      const year = Number(yearStr)
      const monthIndex = Number(monthStr) - 1

      if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
        return null
      }

      return { year, monthIndex }
    }

    const fetchMonthlyGrowth = async () => {
      if (!apiUrl) {
        return
      }

      if (!selectedMonth && monthOptions.length > 0) {
        const defaultOption = monthOptions[0]
        const parsed = computeDefaultMonthRange(defaultOption.value)
        if (parsed) {
          const monthRange = getMonthRange(parsed.year, parsed.monthIndex)
          setSelectedMonth(defaultOption.value)
          setFechaInicio(toInputDate(monthRange.start))
          setFechaFin(toInputDate(monthRange.end))
        }
        return
      }

      const effectiveMonth = selectedMonth || monthOptions[0]?.value

      if (!effectiveMonth) {
        return
      }

      const parsed = computeDefaultMonthRange(effectiveMonth)

      if (!parsed) {
        return
      }

      const { year, monthIndex } = parsed
      const currentRange = getMonthRange(year, monthIndex)
      const previousDate = new Date(year, monthIndex - 1, 1)
      const previousRange = getMonthRange(previousDate.getFullYear(), previousDate.getMonth())

      const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
      })
      const previousLabel = new Date(previousRange.start).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
      })

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const currentStartIso = `${toInputDate(currentRange.start)}T00:00:00.000Z`
      const currentEndIso = `${toInputDate(currentRange.end)}T23:59:59.999Z`
      const previousStartIso = `${toInputDate(previousRange.start)}T00:00:00.000Z`
      const previousEndIso = `${toInputDate(previousRange.end)}T23:59:59.999Z`

      setLoadingMonthlyGrowth(true)
      setMonthlyGrowthError(null)

      try {
        const [
          ventasActualRes,
          gastosActualRes,
          ventasPrevRes,
          gastosPrevRes,
        ] = await Promise.all([
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${currentStartIso}&fechaFin=${currentEndIso}&activo=1`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(
              currentRange.start
            )}&fechaFin=${toInputDate(addDays(currentRange.end, 1))}&activos=0`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${previousStartIso}&fechaFin=${previousEndIso}&activo=1`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(
              previousRange.start
            )}&fechaFin=${toInputDate(addDays(previousRange.end, 1))}&activos=0`,
            { headers }
          ),
        ])

        const ventasActuales: Venta[] = Array.isArray(ventasActualRes.data)
          ? ventasActualRes.data
          : []
        const ventasPrevias: Venta[] = Array.isArray(ventasPrevRes.data)
          ? ventasPrevRes.data
          : []
        const gastosActuales: GastoPeriodo[] = Array.isArray(gastosActualRes.data)
          ? gastosActualRes.data
          : []
        const gastosPrevios: GastoPeriodo[] = Array.isArray(gastosPrevRes.data)
          ? gastosPrevRes.data
          : []

        const totalVentasActual = ventasActuales.reduce(
          (sum, venta) => sum + (Number(venta.total) || 0),
          0
        )
        const totalVentasPrevio = ventasPrevias.reduce(
          (sum, venta) => sum + (Number(venta.total) || 0),
          0
        )

        const totalGastosActual = gastosActuales.reduce((sum, gasto) => {
          if (gasto.activo === 0) {
            return sum
          }
          return sum + (Number(gasto.monto) || 0)
        }, 0)

        const totalGastosPrevio = gastosPrevios.reduce((sum, gasto) => {
          if (gasto.activo === 0) {
            return sum
          }
          return sum + (Number(gasto.monto) || 0)
        }, 0)

        setMonthlyComparison({
          current: {
            ventas: totalVentasActual,
            gastos: totalGastosActual,
            utilidad: totalVentasActual - totalGastosActual,
            label: capitalize(monthLabel),
          },
          previous: {
            ventas: totalVentasPrevio,
            gastos: totalGastosPrevio,
            utilidad: totalVentasPrevio - totalGastosPrevio,
            label: capitalize(previousLabel),
          },
        })
      } catch (error) {
        console.error(error)
        setMonthlyComparison(null)
        setMonthlyGrowthError('No se pudo calcular el crecimiento mensual.')
      } finally {
        setLoadingMonthlyGrowth(false)
      }
    }

    fetchMonthlyGrowth()
  }, [selectedMonth, monthOptions, apiUrl, sucursalId, token])

  useEffect(() => {
    const fetchVentasUtilidadPeriodo = async () => {
      if (!fechaInicio || !fechaFin) {
        return
      }

      const inicioDate = parseDateInput(fechaInicio)
      const finDate = parseDateInput(fechaFin)

       if (!inicioDate || !finDate) {
        setErrorPeriodo('Selecciona un rango de fechas válido.')
       
        setComparativaPeriodo([])
        setVentasDescuentoSemanal([])
        return
      }

      if (inicioDate > finDate) {
        setErrorPeriodo('La fecha inicial no puede ser mayor que la final.')
        
        setComparativaPeriodo([])
        setVentasDescuentoSemanal([])
        return
      }

      const normalizedInicio = startOfWeek(inicioDate)
      const normalizedFin = endOfWeek(finDate)

      if (normalizedInicio > normalizedFin) {
        setErrorPeriodo('Selecciona un rango de fechas válido.')
        
        setComparativaPeriodo([])
        setVentasDescuentoSemanal([])
        return
      }

      setErrorPeriodo(null)
      setErrorDevolucionesPeriodo(null)
      setLoadingPeriodo(true)
      setLoadingDevolucionesPeriodo(true)

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
       const inicioISO = `${toInputDate(inicioDate)}T00:00:00.000Z`
        const finISO = `${toInputDate(finDate)}T23:59:59.999Z`
        const [ventasRes, devolucionesRes, gastosRes] = await Promise.all([
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicioISO}&fechaFin=${finISO}&activo=1`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicioISO}&fechaFin=${finISO}&activo=0`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${toInputDate(
              inicioDate
            )}&fechaFin=${toInputDate(addDays(finDate, 1))}&activos=0`,
            { headers }
          ),
        ])
        const ventasData: Venta[] = ventasRes.data || []
        const devolucionesData: Venta[] = Array.isArray(devolucionesRes.data)
          ? devolucionesRes.data
          : []
        const gastosData: GastoPeriodo[] = Array.isArray(gastosRes.data)
          ? gastosRes.data
          : []

        const detallesVentas = ventasData.length
          ? await Promise.all(
              ventasData.map(async (venta) => {
                try {
                  const res = await axios.get(`${apiUrl}/venta/${venta.id}`, { headers })
                  return (res.data.detalles || []) as Detalle[]
                } catch (error) {
                  console.error(error)
                  return []
                }
              })
            )
          : []        

        
        const totalesPorSemana = new Map<
          string,
         {
            ventas: number
            costo: number
            label: string
            order: number
            detail: string
            monthKey: string
            weekIndex: number
            rangeStartTime: number
            rangeEndTime: number
          }
        >()

        const gastosPorSemana = new Map<
          string,
          {
            total: number
            label: string
            order: number
            detail: string
            monthKey: string
            weekIndex: number
            rangeStartTime: number
            rangeEndTime: number
          }
        >()

        const devolucionesPorSemana = new Map<
          string,
          {
            total: number
            label: string
            order: number
            detail: string
            monthKey: string
            weekIndex: number
            rangeStartTime: number
            rangeEndTime: number
          }
        >()

        const ventasDescuentoPorSemana = new Map<
          string,
           {
            total: number
            label: string
            order: number
            detail: string
            monthKey: string
            weekIndex: number
            rangeStartTime: number
            rangeEndTime: number
          }
        >()
        const cursor = new Date(normalizedInicio)
        while (cursor <= normalizedFin) {
          const weekEnd = endOfWeek(cursor)
          let referenceForWeek = new Date(cursor)
          if (isDateWithinRange(inicioDate, cursor, weekEnd)) {
            referenceForWeek = new Date(inicioDate)
          } else if (isDateWithinRange(finDate, cursor, weekEnd)) {
            referenceForWeek = new Date(finDate)
          }

          const infoSemanaRango = getWeekInfo(referenceForWeek, {
            rangeStart: inicioDate,
            rangeEnd: finDate,
          })
          if (infoSemanaRango) {
            if (!totalesPorSemana.has(infoSemanaRango.key)) {
              totalesPorSemana.set(infoSemanaRango.key, {
                ventas: 0,
                costo: 0,
                label: infoSemanaRango.label,
                order: infoSemanaRango.order,
                detail: infoSemanaRango.detail,
                monthKey: infoSemanaRango.monthKey,
                weekIndex: infoSemanaRango.weekIndex,
                 rangeStartTime: infoSemanaRango.rangeStartTime,
                rangeEndTime: infoSemanaRango.rangeEndTime,
              })
            }

            if (!gastosPorSemana.has(infoSemanaRango.key)) {
              gastosPorSemana.set(infoSemanaRango.key, {
                total: 0,
                label: infoSemanaRango.label,
                order: infoSemanaRango.order,
                detail: infoSemanaRango.detail,
                monthKey: infoSemanaRango.monthKey,
                weekIndex: infoSemanaRango.weekIndex,
                 rangeStartTime: infoSemanaRango.rangeStartTime,
                rangeEndTime: infoSemanaRango.rangeEndTime,
              })
            }
            if (!devolucionesPorSemana.has(infoSemanaRango.key)) {
              devolucionesPorSemana.set(infoSemanaRango.key, {
                total: 0,
                label: infoSemanaRango.label,
                order: infoSemanaRango.order,
                detail: infoSemanaRango.detail,
                 monthKey: infoSemanaRango.monthKey,
                weekIndex: infoSemanaRango.weekIndex,
                rangeStartTime: infoSemanaRango.rangeStartTime,
                rangeEndTime: infoSemanaRango.rangeEndTime,
              })
            }
            if (!ventasDescuentoPorSemana.has(infoSemanaRango.key)) {
              ventasDescuentoPorSemana.set(infoSemanaRango.key, {
                total: 0,
                label: infoSemanaRango.label,
                order: infoSemanaRango.order,
                detail: infoSemanaRango.detail,
                 monthKey: infoSemanaRango.monthKey,
                weekIndex: infoSemanaRango.weekIndex,
                rangeStartTime: infoSemanaRango.rangeStartTime,
                rangeEndTime: infoSemanaRango.rangeEndTime,
              })
            }
          }

          cursor.setDate(cursor.getDate() + 7)
        }
const weekInfoOptions = { rangeStart: inicioDate, rangeEnd: finDate }
        ventasData.forEach((venta, index) => {
          const infoSemana = venta.fecha ? getWeekInfo(venta.fecha, weekInfoOptions) : null
          if (!infoSemana) {
            return
          }

          if (!totalesPorSemana.has(infoSemana.key)) {
            totalesPorSemana.set(infoSemana.key, {
              ventas: 0,
              costo: 0,
              label: infoSemana.label,
              order: infoSemana.order,
              detail: infoSemana.detail,
              monthKey: infoSemana.monthKey,
              weekIndex: infoSemana.weekIndex,
               rangeStartTime: infoSemana.rangeStartTime,
              rangeEndTime: infoSemana.rangeEndTime,
            })
          }

          const detalles = detallesVentas[index] || []
          let ventaTotal = 0
          let detallesConDescuento = false
          detalles.forEach((detalle) => {
            if (detalle.activo === 0) {
              return
            }

            const ventaDetalle = Number(detalle.total)
            const costoDetalle = (detalle.costo || 0) * detalle.cantidad
           

             ventaTotal += ventaDetalle
            if (!detallesConDescuento && Number(detalle.descuento) > 0) {
              detallesConDescuento = true
            }

            const bucket = totalesPorSemana.get(infoSemana.key)
            if (bucket) {
              bucket.ventas += ventaDetalle
              bucket.costo += costoDetalle
              bucket.label = infoSemana.label
              bucket.detail = infoSemana.detail
              bucket.monthKey = infoSemana.monthKey
              bucket.weekIndex = infoSemana.weekIndex
              bucket.rangeStartTime = infoSemana.rangeStartTime
              bucket.rangeEndTime = infoSemana.rangeEndTime
            }
          })
          const descuentoGeneral = Number(venta.descuento) > 0
          const tieneDescuento = descuentoGeneral || detallesConDescuento

          if (tieneDescuento && ventaTotal > 0) {
            const bucketDescuento = ventasDescuentoPorSemana.get(infoSemana.key)
            if (bucketDescuento) {
              bucketDescuento.total += ventaTotal
               bucketDescuento.label = infoSemana.label
              bucketDescuento.detail = infoSemana.detail
              bucketDescuento.monthKey = infoSemana.monthKey
              bucketDescuento.weekIndex = infoSemana.weekIndex
              bucketDescuento.rangeStartTime = infoSemana.rangeStartTime
              bucketDescuento.rangeEndTime = infoSemana.rangeEndTime
            }
          }
        })

        gastosData.forEach((gasto) => {
          const infoSemana = gasto.fecha ? getWeekInfo(gasto.fecha, weekInfoOptions) : null
          if (!infoSemana) {
            return
          }

          if (!gastosPorSemana.has(infoSemana.key)) {
            gastosPorSemana.set(infoSemana.key, {
              total: 0,
              label: infoSemana.label,
              order: infoSemana.order,
              detail: infoSemana.detail,
              monthKey: infoSemana.monthKey,
              weekIndex: infoSemana.weekIndex,
              rangeStartTime: infoSemana.rangeStartTime,
              rangeEndTime: infoSemana.rangeEndTime,
            })
          }

          if (gasto.activo === 0) {
            return
          }

          const bucket = gastosPorSemana.get(infoSemana.key)
          if (bucket) {
            bucket.total += Number(gasto.monto) || 0
            bucket.label = infoSemana.label
            bucket.detail = infoSemana.detail
            bucket.monthKey = infoSemana.monthKey
            bucket.weekIndex = infoSemana.weekIndex
            bucket.rangeStartTime = infoSemana.rangeStartTime
            bucket.rangeEndTime = infoSemana.rangeEndTime
          }
        })

        devolucionesData.forEach((venta) => {
          const referencia = venta.fecha_devolucion || venta.fecha
          if (!referencia) {
            return
          }

          const infoSemana = getWeekInfo(referencia, weekInfoOptions)
          if (!infoSemana) {
            return
          }

          if (!devolucionesPorSemana.has(infoSemana.key)) {
            devolucionesPorSemana.set(infoSemana.key, {
              total: 0,
              label: infoSemana.label,
              order: infoSemana.order,
              detail: infoSemana.detail,
              monthKey: infoSemana.monthKey,
              weekIndex: infoSemana.weekIndex,
              rangeStartTime: infoSemana.rangeStartTime,
              rangeEndTime: infoSemana.rangeEndTime,
            })
          }

          const bucket = devolucionesPorSemana.get(infoSemana.key)
          if (bucket) {
            bucket.total += Number(venta.total) || 0
            bucket.label = infoSemana.label
            bucket.detail = infoSemana.detail
            bucket.monthKey = infoSemana.monthKey
            bucket.weekIndex = infoSemana.weekIndex
            bucket.rangeStartTime = infoSemana.rangeStartTime
            bucket.rangeEndTime = infoSemana.rangeEndTime
          }
        })

        const comparativa = Array.from(totalesPorSemana.entries())
          .sort((a, b) => a[1].order - b[1].order)
          .map(([key, item]) => {
            const gastosSemana = gastosPorSemana.get(key)?.total ?? 0
            const costoSemana = item.costo ?? 0
            const utilidadSemana = item.ventas - gastosSemana

            return {
              label: item.label,
              ventas: item.ventas,
              costo: costoSemana,
              utilidad: utilidadSemana,
              gastos: gastosSemana,
              detail: item.detail,
              monthKey: item.monthKey,
              weekIndex: item.weekIndex,
              rangeStartTime: item.rangeStartTime,
              rangeEndTime: item.rangeEndTime,
            }
          })
        setComparativaPeriodo(comparativa)
        const gastosComparativa = Array.from(gastosPorSemana.values())
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            label: item.label,
            total: item.total,
            detail: item.detail,
             monthKey: item.monthKey,
            weekIndex: item.weekIndex,
            rangeStartTime: item.rangeStartTime,
            rangeEndTime: item.rangeEndTime,
          }))

        setGastosSemanalPeriodo(gastosComparativa)
        const devolucionesComparativa = Array.from(devolucionesPorSemana.values())
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            label: item.label,
            total: item.total,
            detail: item.detail,
            monthKey: item.monthKey,
            weekIndex: item.weekIndex,
            rangeStartTime: item.rangeStartTime,
            rangeEndTime: item.rangeEndTime,
          }))

          const ventasDescuentoComparativa = Array.from(
          ventasDescuentoPorSemana.values()
        )
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            label: item.label,
            total: item.total,
            detail: item.detail,
            monthKey: item.monthKey,
            weekIndex: item.weekIndex,
            rangeStartTime: item.rangeStartTime,
            rangeEndTime: item.rangeEndTime,
          }))

        
        setDevolucionesSemanalPeriodo(devolucionesComparativa)
        setVentasDescuentoSemanal(ventasDescuentoComparativa)
      } catch (error) {
        console.error(error)
        setErrorPeriodo('No se pudo cargar la información del periodo seleccionado.')
        
        setComparativaPeriodo([])
        setGastosSemanalPeriodo([])
        setErrorDevolucionesPeriodo('No se pudo cargar la información de las devoluciones.')
        setDevolucionesSemanalPeriodo([])
        setVentasDescuentoSemanal([])
      } finally {
        setLoadingPeriodo(false)
        setLoadingDevolucionesPeriodo(false)
      }
    }

    fetchVentasUtilidadPeriodo()
  }, [fechaInicio, fechaFin, apiUrl, sucursalId, token])
  const prediccionesFiltradas = predicciones.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
  )

  const quiebres = useMemo(
    () => predicciones.filter((p) => p.stockEsperado < 0),
    [predicciones]
  )

  useEffect(() => {
    setShowAllQuiebres(false)
  }, [quiebres.length])

  const quiebresToShow = useMemo(
    () => (showAllQuiebres ? quiebres : quiebres.slice(0, 10)),
    [showAllQuiebres, quiebres]
  )

  
  const periodoStartTime = useMemo(() => {
    if (!fechaInicio) {
      return null
    }

    const parsed = parseDateInput(fechaInicio)
    return parsed ? parsed.getTime() : null
  }, [fechaInicio])

  const periodoEndTime = useMemo(() => {
    if (!fechaFin) {
      return null
    }

    const parsed = parseDateInput(fechaFin)
    return parsed ? parsed.getTime() + 86399999 : null
  }, [fechaFin])

  const selectedWeeksSet = useMemo(
    () => new Set(selectedWeeks),
    [selectedWeeks]
  )

  const shouldFilterByWeeks = selectedMonth !== '' && selectedWeeks.length > 0
  const comparativaPeriodoFiltrada = useMemo(
    () =>
      comparativaPeriodo.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime &&
              item.rangeEndTime >= periodoStartTime
          const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth &&
            selectedWeeksSet.has(item.weekIndex - 1)
          : true

        return matchesDateRange && matchesSelectedWeeks
      }),
    [
      comparativaPeriodo,
      periodoEndTime,
      periodoStartTime,
      selectedMonth,
      selectedWeeksSet,
      shouldFilterByWeeks,
    ]
  )

  const gastosSemanalPeriodoFiltrado = useMemo(
    () =>
       gastosSemanalPeriodo.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime &&
              item.rangeEndTime >= periodoStartTime
          const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth &&
            selectedWeeksSet.has(item.weekIndex - 1)
          : true

        return matchesDateRange && matchesSelectedWeeks
      }),
    [
      gastosSemanalPeriodo,
      periodoEndTime,
      periodoStartTime,
      selectedMonth,
      selectedWeeksSet,
      shouldFilterByWeeks,
    ]
  )

  const devolucionesSemanalPeriodoFiltrado = useMemo(
    () =>
       devolucionesSemanalPeriodo.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime &&
              item.rangeEndTime >= periodoStartTime
          const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth &&
            selectedWeeksSet.has(item.weekIndex - 1)
          : true

        return matchesDateRange && matchesSelectedWeeks
      }),
    [
      devolucionesSemanalPeriodo,
      periodoEndTime,
      periodoStartTime,
      selectedMonth,
      selectedWeeksSet,
      shouldFilterByWeeks,
    ]
  )

  const ventasDescuentoSemanalFiltrado = useMemo(
    () =>
      ventasDescuentoSemanal.filter((item) => {
        const matchesDateRange =
          periodoStartTime === null || periodoEndTime === null
            ? true
            : item.rangeStartTime <= periodoEndTime &&
              item.rangeEndTime >= periodoStartTime
          const matchesSelectedWeeks = shouldFilterByWeeks
          ? item.monthKey === selectedMonth &&
            selectedWeeksSet.has(item.weekIndex - 1)
          : true

        return matchesDateRange && matchesSelectedWeeks
      }),
    [
      periodoEndTime,
      periodoStartTime,
      selectedMonth,
      selectedWeeksSet,
      shouldFilterByWeeks,
      ventasDescuentoSemanal,
    ]
  )

  const resumenSemanal = useMemo(
    () =>
      comparativaPeriodoFiltrada.reduce(
        (acc, item) => ({
          totalVentas: acc.totalVentas + item.ventas,
          totalUtilidad: acc.totalUtilidad + item.utilidad,
          totalGastos: acc.totalGastos + (item.gastos ?? 0),
          totalCostos: acc.totalCostos + (item.costo ?? 0),
        }),
        { totalVentas: 0, totalUtilidad: 0, totalGastos: 0, totalCostos: 0 }
      ),
    [comparativaPeriodoFiltrada]
  )

  const resumenGastosSemanal = useMemo(
    () =>
      gastosSemanalPeriodoFiltrado.reduce(
        (acc, item) => acc + item.total,
        0
      ),
    [gastosSemanalPeriodoFiltrado]
  )

  const ingresosBarChartData = useMemo(
    () =>
      comparativaPeriodoFiltrada.map((item) => ({
        label: item.label,
        value: item.ventas,
        detail: item.detail,
      })),
    [comparativaPeriodoFiltrada]
  )

  const gastosBarChartData = useMemo(
    () =>
      gastosSemanalPeriodoFiltrado.map((item) => ({
        label: item.label,
        value: item.total,
        detail: item.detail,
      })),
    [gastosSemanalPeriodoFiltrado]
  )
   const devolucionesBarChartData = useMemo(
    () =>
      devolucionesSemanalPeriodoFiltrado.map((item) => ({
        label: item.label,
        value: item.total,
        detail: item.detail,
      })),
    [devolucionesSemanalPeriodoFiltrado]
  )

  const totalIngresosPeriodo = resumenSemanal.totalVentas
  const totalCostosPeriodo = resumenSemanal.totalCostos
  const totalGastosOperativosPeriodo = resumenGastosSemanal
  const totalEgresosPeriodo = totalCostosPeriodo + totalGastosOperativosPeriodo
  const utilidadNetaPeriodo = useMemo(
    () => totalIngresosPeriodo - totalGastosOperativosPeriodo,
    [totalIngresosPeriodo, totalEgresosPeriodo]
  )

  const utilidadPieChartData = useMemo(() => {
    if (utilidadNetaPeriodo >= 0) {
      return [
        {
          label: 'Costo de ventas',
          value: Math.max(totalCostosPeriodo, 0),
          color: '#94a3b8',
        },
        {
          label: 'Gastos operativos',
          value: Math.max(totalGastosOperativosPeriodo, 0),
          color: '#f97316',
        },
        {
          label: 'Utilidad neta',
          value: Math.max(utilidadNetaPeriodo, 0),
          color: '#0ea5e9',
        },
      ]
    }

    const totalCostosYGastos = Math.max(totalEgresosPeriodo, 0)

    return [
      {
        label: 'Ingresos',
        value: Math.max(totalIngresosPeriodo, 0),
        color: '#22c55e',
      },
      {
        label: 'Costos y gastos',
        value: totalCostosYGastos,
        color: '#f97316',
      },
    ]
  }, [
    totalCostosPeriodo,
    totalEgresosPeriodo,
    totalGastosOperativosPeriodo,
    totalIngresosPeriodo,
    utilidadNetaPeriodo,
  ])

  const resumenDevolucionesSemanal = useMemo(
    () =>
     devolucionesSemanalPeriodoFiltrado.reduce(
        (acc, item) => acc + item.total,
        0
      ),
    [devolucionesSemanalPeriodoFiltrado]
  )
  const totalVentasDescuentoPeriodo = useMemo(
     () =>
      ventasDescuentoSemanalFiltrado.reduce(
        (acc, item) => acc + item.total,
        0
      ),
    [ventasDescuentoSemanalFiltrado]
  )

  const ventasDescuentoBarChartData = useMemo(
    () =>
      ventasDescuentoSemanalFiltrado.map((item) => ({
        label: item.label,
        value: item.total,
        detail: item.detail,
      })),
    [ventasDescuentoSemanalFiltrado]
  )

  const hayVentasDescuento = useMemo(
    () => ventasDescuentoSemanalFiltrado.some((item) => item.total > 0),
    [ventasDescuentoSemanalFiltrado]
  )
 const evaluatedManagerialAlerts = useMemo(
    () => {
      const comparativaFuente =
        comparativaPeriodoFiltrada.length > 0
          ? comparativaPeriodoFiltrada
          : comparativaPeriodo

      const context: ManagerialAlertContext = {
        kpisDia,
        kpisSemana,
        kpisMes,
        monthlyComparison,
        comparativaPeriodo: comparativaFuente,
        dailyNetProfit,
      }

      return managerialAlertDefinitions.map((definition) => {
        const evaluation = definition.evaluate(context)

        return {
          ...definition,
          ...evaluation,
          severity: evaluation.severity,
        }
      })
    },
    [
      comparativaPeriodo,
      comparativaPeriodoFiltrada,
      dailyNetProfit,
      kpisDia,
      kpisMes,
      kpisSemana,
      monthlyComparison,
    ]
  )

  const monthlyGrowthEntries = useMemo(
    () =>
      monthlyComparison
        ? (
            [
              {
                key: 'ventas' as const,
                label: 'Ingresos',
                current: monthlyComparison.current.ventas,
                previous: monthlyComparison.previous.ventas,
              },
              {
                key: 'gastos' as const,
                label: 'Gastos',
                current: monthlyComparison.current.gastos,
                previous: monthlyComparison.previous.gastos,
              },
              {
                key: 'utilidad' as const,
                label: 'Utilidad',
                current: monthlyComparison.current.utilidad,
                previous: monthlyComparison.previous.utilidad,
              },
            ] satisfies {
              key: 'ventas' | 'gastos' | 'utilidad'
              label: string
              current: number
              previous: number
            }[]
          ).map((entry) => ({
            ...entry,
            growth:
              entry.previous === 0
                ? entry.current === 0
                  ? 0
                  : null
                : (entry.current - entry.previous) / entry.previous,
          }))
        : [],
    [monthlyComparison]
  )

  const monthlyGrowthMaxValue = useMemo(() => {
    if (!monthlyGrowthEntries.length) {
      return 0
    }

    const max = Math.max(
      ...monthlyGrowthEntries.map((entry) => Math.abs(entry.growth ?? 0))
    )

    return Number.isFinite(max) ? max : 0
  }, [monthlyGrowthEntries])

  const monthlyGrowthRadarData = useMemo<SimpleRadarDatum[]>(
    () =>
      monthlyGrowthEntries.map((entry) => {
        const growthPercent = entry.growth === null ? null : entry.growth * 100
        const trend: SimpleRadarDatum['trend'] =
          growthPercent === null
            ? 'na'
            : growthPercent > 0
            ? 'positive'
            : growthPercent < 0
            ? 'negative'
            : 'neutral'

        return {
          label: entry.label,
          value: Math.abs(growthPercent ?? 0),
          display:
            growthPercent === null
              ? 'Sin referencia'
              : `${growthPercent.toFixed(1)}%`,
          trend,
        }
      }),
    [monthlyGrowthEntries]
  )

  const topClientesTop10 = useMemo(
    () => topClientes.slice(0, 10),
    [topClientes]
  )

  const performanceSummaryRows = useMemo(
    () => {
      const rows: {
        periodo: string
        ingresos: number
        compras: number
        gastos: number
        utilidad: number | null
      }[] = []

      if (kpisDia) {
        rows.push({
          periodo: 'Diario',
          ingresos: kpisDia.ventasTotales,
          compras: kpisDia.totalCompras,
          gastos: kpisDia.totalGastos,
          utilidad: computeDailyNetProfit(kpisDia),
        })
      }

      if (kpisSemana) {
        rows.push({
          periodo: 'Semanal',
          ingresos: kpisSemana.ventasTotales,
          compras: kpisSemana.totalCompras,
          gastos: kpisSemana.totalGastos,
          utilidad:
            kpisSemana.ventasTotales -
            kpisSemana.totalCompras -
            kpisSemana.totalGastos,
        })
      }

      if (kpisMes) {
        rows.push({
          periodo: 'Mensual',
          ingresos: kpisMes.ventasTotales,
          compras: kpisMes.totalCompras,
          gastos: kpisMes.totalGastos,
          utilidad:
            kpisMes.ventasTotales - kpisMes.totalCompras - kpisMes.totalGastos,
        })
      }

      return rows
    },
    [kpisDia, kpisMes, kpisSemana]
  )

  const currentMonthLabel = monthlyComparison?.current.label ?? 'Mes actual'
  const previousMonthLabel = monthlyComparison?.previous.label ?? 'Mes anterior'
//
// --- EFECTO: INICIAR GUÍA AUTOMÁTICAMENTE LA PRIMERA VEZ ---
  useEffect(() => {
    // 1. Verificar si ya vio la guía anteriormente
    const hasSeenGuide = localStorage.getItem('gerente_guide_seen');
    
    if (!hasSeenGuide) {
      // 2. Si no la ha visto, esperamos un momento a que cargue la página
      const timer = setTimeout(() => {
        startGuide('GENERAL'); // Inicia el tour principal
        localStorage.setItem('gerente_guide_seen', 'true'); // Marca como visto para el futuro
      }, 1500); // 1.5 segundos de espera

      return () => clearTimeout(timer);
    }
  }, []);
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
          <h1 className="text-2xl font-bold text-orange-600">Panel del Gerente</h1>
          
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
                          
                          <button onClick={() => startGuide('RESUMEN')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">📊 Resumen Mensual</button>
                          <button onClick={() => startGuide('RENDIMIENTO')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">📈 Rendimiento</button>
                          <button onClick={() => startGuide('ANALISIS')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">👥 Análisis Clientes</button>
                          <button onClick={() => startGuide('INVENTARIO')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">📦 Inventario</button>
                          <button onClick={() => startGuide('KPIS')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">💰 Datos Financieros</button>
                          <button onClick={() => startGuide('ALERTAS')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border-t mt-1">🚨 Alertas y Sugerencias</button>
                          <button onClick={() => startGuide('GERENTE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border-t mt-1">🧑‍💼 Gerente Crov</button>

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
                                onClick={() => window.open('https://www.youtube.com/watch?v=RlstVZSiRM4&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=12', '_blank')} 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                            >
                               <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Ver Video Tutorial
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
        </div>
      </div>

      {/* 3. TABS PRINCIPALES */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="resumen" data-guide="tab-resumen">Resumen Financiero Mensual</TabsTrigger>
          <TabsTrigger value="rendimiento" data-guide="tab-rendimiento">Rendimiento Comercial y Proyecciones</TabsTrigger>
          <TabsTrigger value="analisis" data-guide="tab-analisis">Análisis de Clientes y Productos</TabsTrigger>
          <TabsTrigger value="inventario" data-guide="tab-inventario">Inventario e Indicadores Operativos</TabsTrigger>
          <TabsTrigger value="kpis" data-guide="tab-kpis">Datos financieros</TabsTrigger>
          <TabsTrigger value="alertas" data-guide="tab-alertas">Alertas y sugerencias</TabsTrigger>
        </TabsList>

        {/* --- CONTENIDO: RESUMEN --- */}
        <TabsContent value="resumen" className="space-y-8">
          <Card className="border border-orange-200/60 bg-orange-50/50 shadow-sm" data-guide="config-periodo">
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
                    Ajusta el mes y las semanas para actualizar el resumen financiero.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                <div className="flex flex-col gap-1 md:w-48" data-guide="input-fecha-inicio">
                  <span className="text-sm font-medium text-muted-foreground">
                    Fecha inicio
                  </span>
                  <Input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin}
                    onChange={(event) => handleFechaInicioChange(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 md:w-48" data-guide="input-fecha-fin">
                  <span className="text-sm font-medium text-muted-foreground">
                    Fecha fin
                  </span>
                  <Input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio}
                    onChange={(event) => handleFechaFinChange(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 md:w-60" data-guide="select-mes">
                  <span className="text-sm font-medium text-muted-foreground">
                    Seleccionar mes
                  </span>
                  <Select value={selectedMonth} onValueChange={handleMonthSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Mes" />
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
                <div className="flex flex-col gap-1" data-guide="select-semanas">
                  <span className="text-sm font-medium text-muted-foreground">
                    Semanas del mes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_OPTIONS.map((week) => (
                      <Button
                        key={week.value}
                        type="button"
                        variant={selectedWeeks.includes(week.value) ? 'default' : 'outline'}
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
            <Card className="border border-emerald-100 bg-white shadow-sm" data-guide="card-ingresos">
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-50 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Ingresos totales del mes
                    </CardTitle>
                    <CardDescription>Ventas acumuladas por semana.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total del periodo</span>
                  <span className="text-xl font-semibold text-emerald-600">
                    {formatCurrency(totalIngresosPeriodo)}
                  </span>
                </div>
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : ingresosBarChartData.length > 0 ? (
                  <SimpleBarChart
                    data={ingresosBarChartData}
                    gradient="from-emerald-400 to-emerald-600"
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay ingresos registrados en el periodo seleccionado.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border border-rose-100 bg-white shadow-sm" data-guide="card-gastos">
              <CardHeader className="flex flex-col space-y-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-rose-50 p-2">
                    <ArrowDownCircle className="h-5 w-5 text-rose-500" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Gastos totales del mes
                    </CardTitle>
                    <CardDescription>Desembolsos clasificados por semana.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total del periodo</span>
                  <span className="text-xl font-semibold text-rose-500">
                    {formatCurrency(totalCostosPeriodo)}
                  </span>
                </div>
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : gastosBarChartData.length > 0 ? (
                  <SimpleBarChart
                    data={gastosBarChartData}
                    gradient="from-rose-400 to-purple-500"
                    valueFormatter={(value) => formatCurrency(value)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay gastos registrados en el periodo seleccionado.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border border-sky-100 bg-white shadow-sm" data-guide="card-utilidad">
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
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Resultado acumulado</p>
                          <p
                            className={`text-2xl font-semibold ${
                              utilidadNetaPeriodo > 0
                                ? 'text-emerald-600'
                                : utilidadNetaPeriodo < 0
                                ? 'text-rose-500'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatCurrency(utilidadNetaPeriodo)}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`border ${
                            utilidadNetaPeriodo > 0
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : utilidadNetaPeriodo < 0
                              ? 'border-rose-200 bg-rose-50 text-rose-600'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {utilidadNetaPeriodo > 0
                            ? 'Utilidad positiva'
                            : utilidadNetaPeriodo < 0
                            ? 'En negativo'
                            : 'Equilibrado'}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span>
                          Total ventas: {formatCurrency(resumenSemanal.totalVentas)}
                        </span>
                        <span>
                          Total gastos operativos: {formatCurrency(resumenSemanal.totalGastos)}
                        </span>
                        <span>
                          Costo de ventas: {formatCurrency(resumenSemanal.totalCostos)}
                        </span>
                        <span
                          className={
                            resumenSemanal.totalUtilidad < 0 ? 'text-red-500 font-semibold' : 'text-slate-700'
                          }
                        >
                          Total utilidad: {formatCurrency(resumenSemanal.totalUtilidad)}
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

          <Card className="border border-slate-200 bg-white shadow-sm" data-guide="card-crecimiento">
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
                    Comparativa entre {currentMonthLabel} y {previousMonthLabel}.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingMonthlyGrowth ? (
                <p className="text-sm text-muted-foreground">Calculando crecimiento mensual...</p>
              ) : monthlyGrowthError ? (
                <p className="text-sm text-red-500">{monthlyGrowthError}</p>
              ) : monthlyComparison ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
                  <div className="order-2 space-y-4 lg:order-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Métrica</TableHead>
                          <TableHead>{currentMonthLabel}</TableHead>
                          <TableHead>{previousMonthLabel}</TableHead>
                          <TableHead>Variación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyGrowthEntries.map((entry) => (
                          <TableRow key={entry.key}>
                            <TableCell>{entry.label}</TableCell>
                            <TableCell>{formatCurrency(entry.current)}</TableCell>
                            <TableCell>{formatCurrency(entry.previous)}</TableCell>
                            <TableCell>
                              {entry.growth === null
                                ? 'Sin referencia'
                                : `${(entry.growth * 100).toFixed(1)}%`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground">
                      Fórmula utilizada: (Ventas mes actual – Ventas mes anterior) ÷ Ventas mes anterior.
                    </p>
                  </div>
                  <div className="order-1 flex justify-center lg:order-2">
                    <SimpleRadarChart
                      data={monthlyGrowthRadarData}
                      maxValue={monthlyGrowthMaxValue * 100}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona un mes para calcular el crecimiento mensual.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- CONTENIDO: RENDIMIENTO --- */}
        <TabsContent value="rendimiento" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-3" data-guide="grid-proyecciones">
            <Card data-guide="card-pred-ventas">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Proyección de ventas (próximos {diasPrediccion} días)
                </CardTitle>
                <TrendingUp className="text-green-500" />
              </CardHeader>
              <CardContent>
                {predVentas ? (
                  <div className="space-y-2 text-sm">
                    <p>Total de ventas últimos 30 días: {formatCurrency(predVentas.totalUltimos30Dias)}</p>
                    <p>Promedio de ventas diario: {formatCurrency(predVentas.promedioDiario)}</p>
                    <p>Proyección de ventas: {formatCurrency(predVentas.prediccion)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                )}
              </CardContent>
            </Card>
            <Card data-guide="card-pred-compras">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Proyección de compras (próximos {diasPrediccion} días)
                </CardTitle>
                <ShoppingCart className="text-yellow-500" />
              </CardHeader>
              <CardContent>
                {predCompras ? (
                  <div className="space-y-2 text-sm">
                    <p>Total de compras últimos 30 días: {formatCurrency(predCompras.totalUltimos30Dias)}</p>
                    <p>Promedio de compras diario: {formatCurrency(predCompras.promedioDiario)}</p>
                    <p>Proyección de compras: {formatCurrency(predCompras.prediccion)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                )}
              </CardContent>
            </Card>
            <Card data-guide="card-pred-gastos">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Proyección de gastos (próximos {diasPrediccion} días)
                </CardTitle>
                <Wallet className="text-red-500" />
              </CardHeader>
              <CardContent>
                {predGastos ? (
                  <div className="space-y-2 text-sm">
                    <p>Total de gastos últimos 30 días: {formatCurrency(predGastos.totalUltimos30Dias)}</p>
                    <p>Promedio de gastos diario: {formatCurrency(predGastos.promedioDiario)}</p>
                    <p>Proyección de gastos: {formatCurrency(predGastos.prediccion)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-orange-200 bg-orange-50" data-guide="card-alerta-inventario">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Alerta de inventario proyectado</CardTitle>
              </div>
              {quiebres.length > 0 && (
                <Badge variant="secondary" className="border border-orange-300 bg-white text-orange-600">
                  {quiebres.length} producto{quiebres.length === 1 ? '' : 's'} en riesgo
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {quiebres.length > 0 ? (
                <>
                  <p>
                    Se proyecta inventario negativo en {quiebres.length}{' '}
                    producto{quiebres.length === 1 ? '' : 's'} durante los próximos {diasPrediccion} días.
                  </p>
                  <p className="text-muted-foreground">
                    Revisa el detalle en la pestaña «Inventario e Indicadores Operativos» para priorizar el
                    reabastecimiento.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No se proyectan quiebres de inventario en el periodo analizado.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm" data-guide="tabla-rendimiento">
            <CardHeader className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-500" />
              <CardTitle>Rendimiento comercial por periodo</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceSummaryRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Ingresos</TableHead>
                      <TableHead>Compras</TableHead>
                      <TableHead>Gastos</TableHead>
                      <TableHead>Utilidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceSummaryRows.map((row) => (
                      <TableRow key={row.periodo}>
                        <TableCell>{row.periodo}</TableCell>
                        <TableCell>{formatCurrency(row.ingresos)}</TableCell>
                        <TableCell>{formatCurrency(row.compras)}</TableCell>
                        <TableCell>{formatCurrency(row.gastos)}</TableCell>
                        <TableCell>
                          {typeof row.utilidad === 'number'
                            ? formatCurrency(row.utilidad)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay datos suficientes para mostrar el rendimiento comercial.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm" data-guide="chart-comparativa">
            <CardHeader className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-cyan-500" />
              <CardTitle>Comparativa semanal de ventas y utilidad</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPeriodo ? (
                <p className="text-sm text-muted-foreground">Procesando datos...</p>
              ) : errorPeriodo ? (
                <p className="text-sm text-red-500">{errorPeriodo}</p>
              ) : (
                <WeeklyComparisonChart data={comparativaPeriodoFiltrada} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- CONTENIDO: ANALISIS --- */}
        <TabsContent value="analisis" className="space-y-8">
          <Card className="border border-indigo-100 bg-indigo-50/40" data-guide="segmentacion-temporal">
            <CardHeader>
              <CardTitle>Segmentación temporal</CardTitle>
              <CardDescription>
                Ajusta el mes y las semanas para que los listados reflejen la información deseada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                <div className="flex flex-col gap-1 md:w-56" data-guide="select-mes-analisis">
                  <span className="text-sm font-medium text-muted-foreground">Mes de análisis</span>
                  <Select value={selectedMonth} onValueChange={handleMonthSelect}>
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
                <div className="flex flex-col gap-1" data-guide="select-semanas-analisis">
                  <span className="text-sm font-medium text-muted-foreground">Semanas</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_OPTIONS.map((week) => (
                      <Button
                        key={`analisis-week-${week.value}`}
                        type="button"
                        size="sm"
                        variant={selectedWeeks.includes(week.value) ? 'default' : 'outline'}
                        onClick={() => handleWeekSelect(week.value)}
                      >
                        {week.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estos filtros afectan tanto las tablas como las gráficas de este apartado.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-guide="card-mejores-clientes">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <CardTitle>Mejores clientes</CardTitle>
                </div>
                <CardDescription>Top 10 clientes del periodo seleccionado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total vendido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topClientesTop10.length > 0 ? (
                        topClientesTop10.map((cliente) => (
                          <TableRow key={cliente.clienteId}>
                            <TableCell>{cliente.nombre}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(Number(cliente.totalVendido))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                            No hay clientes destacados para el periodo seleccionado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div data-guide="chart-ventas-semanales">
                  <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                    Ventas semanales del periodo
                  </h4>
                  {comparativaPeriodoFiltrada.length > 0 ? (
                    <SimpleBarChart
                      data={ingresosBarChartData}
                      gradient="from-indigo-400 to-blue-500"
                      valueFormatter={(value) => formatCurrency(value)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      No hay ventas registradas en las semanas seleccionadas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-guide="card-productos-vendidos">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Productos más vendidos</CardTitle>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-muted-foreground">Mostrar</span>
                  <Select
                    value={String(topProductosLimit)}
                    onValueChange={(value) => setTopProductosLimit(Number(value))}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="5 productos" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black border border-gray-300 shadow-md">
                      {TOP_PRODUCTOS_LIMITS.map((limit) => (
                        <SelectItem key={limit} value={String(limit)}>
                          {limit} producto{limit === 1 ? '' : 's'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProductosFiltrados.length > 0 ? (
                          topProductosFiltrados.map((producto) => (
                            <TableRow key={producto.productoId}>
                              <TableCell>{producto.nombre}</TableCell>
                              <TableCell className="text-right">{producto.cantidadVendida}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                              No hay ventas registradas durante el periodo seleccionado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-center">
                    {topProductosPieData.length > 0 ? (
                      <SimplePieChart
                        data={topProductosPieData}
                        valueFormatter={(value) =>
                          `${value.toLocaleString('es-MX')} unidad${value === 1 ? '' : 'es'}`
                        }
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">
                        No hay datos suficientes para generar la gráfica.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card data-guide="card-devoluciones">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-sky-500" />
                <CardTitle>Devoluciones por mes (detalle semanal)</CardTitle>
              </div>
              <CardDescription>
                Seguimiento de devoluciones dentro del periodo analizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="overflow-x-auto">
                {loadingDevolucionesPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorDevolucionesPeriodo ? (
                  <p className="text-sm text-red-500 text-center">{errorDevolucionesPeriodo}</p>
                ) : devolucionesSemanalPeriodoFiltrado.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Semana</TableHead>
                          <TableHead>Rango</TableHead>
                          <TableHead className="text-right">Total devuelto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devolucionesSemanalPeriodoFiltrado.map((item) => (
                          <TableRow key={`${item.label}-${item.detail ?? 'sin-detalle'}`}>
                            <TableCell>{item.label}</TableCell>
                            <TableCell>{item.detail ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 text-right text-sm font-semibold">
                      Total devuelto: {formatCurrency(resumenDevolucionesSemanal)}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay devoluciones registradas en el periodo seleccionado.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center">
                {loadingDevolucionesPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorDevolucionesPeriodo ? (
                  <p className="text-sm text-red-500 text-center">{errorDevolucionesPeriodo}</p>
                ) : devolucionesSemanalPeriodoFiltrado.length > 0 ? (
                  <SimpleBarChart
                    data={devolucionesBarChartData}
                    gradient="from-sky-400 to-emerald-500"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay devoluciones registradas en el periodo seleccionado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-guide="card-descuentos">
            <CardHeader className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-500" />
              <CardTitle>Ventas con descuento</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="overflow-x-auto">
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : ventasDescuentoSemanalFiltrado.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Semana</TableHead>
                          <TableHead>Rango</TableHead>
                          <TableHead className="text-right">Ventas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventasDescuentoSemanalFiltrado.map((item) => (
                          <TableRow key={`${item.label}-${item.detail ?? 'sin-detalle'}`}>
                            <TableCell>{item.label}</TableCell>
                            <TableCell>{item.detail ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 text-right text-sm font-semibold">
                      Total acumulado: {formatCurrency(totalVentasDescuentoPeriodo)}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay información disponible para el periodo seleccionado.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {loadingPeriodo ? (
                  <p className="text-sm text-muted-foreground">Procesando datos...</p>
                ) : errorPeriodo ? (
                  <p className="text-sm text-red-500">{errorPeriodo}</p>
                ) : ventasDescuentoSemanalFiltrado.length > 0 ? (
                  <>
                    <SimpleBarChart
                      data={ventasDescuentoBarChartData}
                      gradient="from-purple-400 to-indigo-500"
                    />
                    {hayVentasDescuento ? (
                      <p className="text-sm font-semibold text-muted-foreground text-right">
                        Total acumulado: {formatCurrency(totalVentasDescuentoPeriodo)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">
                        No se registraron ventas con descuento en el periodo seleccionado.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay ventas con descuento en el periodo seleccionado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inventario" className="space-y-8">
          <Card data-guide="card-stock-minimo">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle>Productos con inventario mínimo</CardTitle>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground">Mostrar</span>
                <Select
                  value={String(productosMinLimit)}
                  onValueChange={(value) => setProductosMinLimit(Number(value))}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="10 registros" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTOS_MIN_LIMITS.map((limit) => (
                      <SelectItem key={limit} value={String(limit)}>
                        {limit} registro{limit === 1 ? '' : 's'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Existencia</TableHead>
                        <TableHead>Stock mín.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosMinFiltrados.length > 0 ? (
                        productosMinFiltrados.map((producto) => (
                          <TableRow key={producto.id}>
                            <TableCell>{producto.nombre}</TableCell>
                            <TableCell>{producto.cantidad_existencia}</TableCell>
                            <TableCell>{producto.stock_min}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            No hay productos con inventario mínimo.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-center">
                  {productosMinPieData.length > 0 ? (
                    <SimplePieChart
                      data={productosMinPieData}
                      valueFormatter={(value) => {
                        const unidades = value === 1 ? 'existencia' : 'existencias'
                        return `${value.toLocaleString('es-MX')} ${unidades}`
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      No hay datos suficientes para generar la gráfica.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
                  value={busquedaProducto}
                  onChange={(event) => setBusquedaProducto(event.target.value)}
                  className="md:w-72"
                />
                {quiebres.length > 0 && (
                  <Badge variant="outline" className="border-red-300 text-red-600">
                    {quiebres.length} producto{quiebres.length === 1 ? '' : 's'} con riesgo
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
                        className={prediccion.stockEsperado < 0 ? 'bg-red-50/80' : ''}
                      >
                        <TableCell>{prediccion.nombre}</TableCell>
                        <TableCell>{prediccion.promedioDiario.toFixed(2)}</TableCell>
                        <TableCell>{prediccion.prediccion.toFixed(2)}</TableCell>
                        <TableCell>{prediccion.stockActual}</TableCell>
                        <TableCell
                          className={
                            prediccion.stockEsperado < 0 ? 'text-red-600 font-semibold' : 'text-slate-700'
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
        </TabsContent>
        <TabsContent value="kpis" className="space-y-8">
          <p>
            Principales indicadores financieros (KPIs) que el Gerente CROV te
            reportará de manera diaria, semanal y mensual en tu negocio.
            El objetivo es garantizar un control financiero adecuado, optimizar
            la rentabilidad y apoyar la toma de decisiones estratégicas.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <Card data-guide="card-kpi-diario">
              <CardHeader>
                <CardTitle>Ingresos/egresos diarios</CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialTable data={financialTableDia} />
              </CardContent>
            </Card>
            <Card data-guide="card-kpi-semanal">
              <CardHeader>
                <CardTitle>Ingresos/egresos semanales</CardTitle>
              </CardHeader>
              <CardContent>
                {financialTableSemana && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    Semana actual: {currentWeekRange.label}
                  </p>
                )}
                <FinancialTable data={financialTableSemana} />
              </CardContent>
            </Card>
            <Card data-guide="card-kpi-mensual">
              <CardHeader>
                <CardTitle>Ingresos/egresos mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialTable data={financialTableMes} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="alertas" className="space-y-8">
          <p>
            Alertas estratégicas y sugerencias basadas en tus proyecciones
            financieras y de inventario.
          </p>
          <Card data-guide="tabla-alertas-gerenciales">
            <CardHeader>
              <CardTitle>Panel del gerente: alertas gerenciales automáticas</CardTitle>
              <CardDescription>
                Señales clave monitoreadas de forma continua para anticipar riesgos
                financieros y operativos.
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
                  {evaluatedManagerialAlerts.map((alertItem) => {
                    const styles = managerialAlertStyles[alertItem.severity]
                    const shouldHighlightRow =
                      alertItem.isTriggered ||
                      (alertItem.severity !== 'stable' && alertItem.severity !== 'info')
                    return (
                      <TableRow
                        key={alertItem.alert}
                        className={shouldHighlightRow ? styles.row : ''}
                      >
                        <TableCell className="align-top">
                          <Badge className={`text-base ${styles.badge}`}>
                            <span aria-hidden="true" className="mr-2 text-xl">
                              {alertItem.icon}
                            </span>
                            <span className="sr-only">{alertItem.icon} </span>
                            {styles.label}
                          </Badge>
                          {alertItem.statusNote && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {alertItem.statusNote}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top font-medium">
                          {alertItem.alert}
                        </TableCell>
                        <TableCell className="align-top">
                          {alertItem.condition}
                          {alertItem.detail && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {alertItem.detail}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {alertItem.action}
                          {alertItem.actionDetail && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {alertItem.actionDetail}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                  {evaluatedQuickAlerts.map((alert) => (
                    <TableRow
                      key={alert.title}
                      className={alert.isActive ? 'bg-red-50/80 transition-colors' : ''}
                    >
                      <TableCell className="align-top">
                        <Badge
                          className={
                            alert.isActive
                              ? 'border border-red-200 bg-red-100 text-red-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          }
                        >
                          {alert.isActive ? 'Activa' : 'Estable'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="mr-2 text-xl" aria-hidden="true">
                          {alert.icon}
                        </span>
                        <span className="sr-only">{alert.icon} </span>
                        {alert.title}
                      </TableCell>
                      <TableCell>{alert.condition}</TableCell>
                      <TableCell>
                        <div>
                          <p>{alert.action}</p>
                          {alert.detailText && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {alert.detailText}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {kpisDia && (
            <Card
              data-guide="card-meta-diaria"
              className={
                kpisDia.ventasTotales < kpisDia.metaDiaria
                  ? 'border-yellow-500'
                  : 'border-green-500'
              }
            >
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Meta diaria de ventas</CardTitle>
                <AlertTriangle
                  className={
                    kpisDia.ventasTotales < kpisDia.metaDiaria
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }
                />
              </CardHeader>
              <CardContent>
                <p>Ventas del día: {formatCurrency(kpisDia.ventasTotales)}</p>
                <p>Meta diaria: {formatCurrency(kpisDia.metaDiaria)}</p>
                {kpisDia.ventasTotales < kpisDia.metaDiaria ? (
                  <div className="mt-2 flex items-start text-sm text-yellow-600">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>
                      Sugerencia: implementa promociones o revisa tu estrategia de
                      ventas para alcanzar la meta.
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start text-sm text-green-600">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>¡Buen trabajo! Has alcanzado la meta diaria.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {kpisSemana && (
            <Card
              data-guide="card-devoluciones-semanales"
              className={
                kpisSemana.porcentajeDevoluciones > 5
                  ? 'border-red-500'
                  : 'border-green-500'
              }
            >
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Devoluciones semanales</CardTitle>
                <AlertTriangle
                  className={
                    kpisSemana.porcentajeDevoluciones > 5
                      ? 'text-red-500'
                      : 'text-green-500'
                  }
                />
              </CardHeader>
              <CardContent>
                <p>
                  Porcentaje de devoluciones{' '}
                  {kpisSemana.porcentajeDevoluciones.toFixed(2)}%
                </p>
                {kpisSemana.porcentajeDevoluciones > 5 ? (
                  <div className="mt-2 flex items-start text-sm text-red-600">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>
                      Sugerencia: revisa la calidad de los productos o capacita al
                      personal para reducir devoluciones.
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-start text-sm text-green-600">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>Las devoluciones se mantienen en niveles aceptables.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
