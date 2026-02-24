'use client'

import { useMemo, useState } from 'react'
import { Maximize2, Calendar, TrendingUp, TrendingDown, Layers, Activity } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface DailyData {
  day: number
  current: number
  previous: number
  label: string
}

interface DailyComparisonChartProps {
  data: DailyData[]
  monthLabelActual?: string
  monthLabelAnterior?: string
}

export default function DailyComparisonChart({
  data,
  monthLabelActual = 'Periodo Actual',
  monthLabelAnterior = 'Periodo Anterior',
}: DailyComparisonChartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'breakdown'>('timeline')

  // Mostrar toggle si hay más de 35 días
  const showToggle = data && data.length > 35;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <p>Sin datos para mostrar</p>
      </div>
    )
  }

  return (
    <>
      {/* --- VISTA TARJETA --- */}
      <div className="relative w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <Header
          data={data}
          onExpand={() => setIsOpen(true)}
          monthLabelActual={monthLabelActual}
          monthLabelAnterior={monthLabelAnterior}
          showToggle={showToggle}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
        <div className="mt-4 h-56 sm:h-64 w-full">
          {viewMode === 'timeline' || !showToggle ? (
             <ArrowChartVisualizer 
                data={data} 
                monthLabelActual={monthLabelActual}
                monthLabelAnterior={monthLabelAnterior}
             />
          ) : (
             <MultiLineChartVisualizer data={data} />
          )}
        </div>
      </div>

      {/* --- VISTA MODAL (EXPANDIDA) --- */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex w-[95vw] max-w-6xl flex-col h-[90vh] p-0 overflow-hidden rounded-lg">
          
          <div className="flex items-center justify-between border-b px-6 py-4 bg-white z-10">
            <div className="flex flex-col gap-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <span>Análisis de Tendencia: {monthLabelActual}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                    {viewMode === 'timeline' 
                        ? "Comparativa cronológica continua." 
                        : "Desglose comparativo por meses y años."}
                </DialogDescription>
            </div>
            
            {showToggle && (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="timeline" className="flex gap-2">
                            <Activity className="w-4 h-4" /> Línea de Tiempo
                        </TabsTrigger>
                        <TabsTrigger value="breakdown" className="flex gap-2">
                            <Layers className="w-4 h-4" /> Desglose
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
          </div>
          
          <div className="flex-1 bg-slate-50/50 p-6 flex flex-col min-h-0 overflow-y-auto">
             <div className="mb-6 flex gap-8 px-2">
                 <StatSummary data={data} label="Ventas Totales del Periodo" isLarge />
             </div>
             
             <div className="flex-1 w-full min-h-[400px] rounded-xl bg-white border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                {viewMode === 'timeline' || !showToggle ? (
                    <ArrowChartVisualizer 
                        data={data} 
                        isExpanded 
                        monthLabelActual={monthLabelActual}
                        monthLabelAnterior={monthLabelAnterior}
                    />
                ) : (
                    <MultiLineChartVisualizer data={data} isExpanded />
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- HEADER ---
const Header = ({ data, onExpand, monthLabelActual, monthLabelAnterior, showToggle, viewMode, setViewMode }: any) => (
  <div className="flex items-start justify-between px-1 mb-2">
    <div>
      <StatSummary data={data} label="Acumulado" />
      {viewMode === 'timeline' ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-slate-500">
             <div className="flex items-center gap-1.5">
                <div className="h-1 w-3 sm:w-4 rounded-full bg-indigo-600"></div>
                <span className="truncate max-w-[120px]" title={monthLabelActual}>{monthLabelActual}</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="h-1 w-3 sm:w-4 rounded-full bg-slate-300"></div>
                <span className="truncate max-w-[120px]" title={monthLabelAnterior}>{monthLabelAnterior}</span>
             </div>
          </div>
      ) : (
          <p className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-1">
             <Layers className="w-3 h-3" /> Comparando periodos individuales
          </p>
      )}
    </div>

    <div className="flex gap-2">
        {showToggle && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8 items-center">
                <button 
                    onClick={() => setViewMode('timeline')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Histórico
                </button>
                <button 
                    onClick={() => setViewMode('breakdown')}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${viewMode === 'breakdown' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Desglose
                </button>
            </div>
        )}
        <Button variant="ghost" size="icon" onClick={onExpand} title="Ampliar">
            <Maximize2 className="h-4 w-4 text-slate-400" />
        </Button>
    </div>
  </div>
)

const StatSummary = ({ data, label, isLarge }: any) => {
    const current = data.reduce((acc: number, d: any) => acc + d.current, 0)
    const previous = data.reduce((acc: number, d: any) => acc + d.previous, 0)
    const diff = current - previous
    const pct = previous === 0 ? 100 : (diff / previous) * 100
    const isUp = diff >= 0
    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className={`font-black text-slate-800 ${isLarge ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'}`}>
                    {fmt(current)}
                </span>
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(pct).toFixed(0)}%
                </span>
            </div>
        </div>
    )
}

// =========================================================
// MODO 1: LÍNEA DE TIEMPO
// =========================================================
const ArrowChartVisualizer = ({ data, isExpanded = false, monthLabelActual, monthLabelAnterior }: any) => {
  const [hovered, setHovered] = useState<number | null>(null)

  const { pointsCurrent, pointsPrevious, maxVal, width, height, normalizedData, useLogScale } = useMemo(() => {
    let normalized = data && data.length > 0 ? data : [];
    if (normalized.length === 0) normalized = Array.from({ length: 31 }, (_, i) => ({ day: i + 1, current: 0, previous: 0, label: String(i + 1) }));

    const w = 1000
    const h = 400
    const mx = Math.max(...normalized.map((d: any) => Math.max(d.current, d.previous)))
    const max = mx === 0 ? 100 : mx
    const useLogScale = max > 10000;

    const getY = (val: number) => {
        if (val === 0) return h;
        if (useLogScale) return h - (Math.log10(val + 1) / Math.log10(max + 1)) * (h * 0.9);
        return h - (val / (max * 1.1)) * h;
    }

    const makePath = (key: 'current' | 'previous') => {
       return normalized.map((d: any, i: number) => {
          const x = (i / (normalized.length - 1)) * w
          const y = getY(d[key])
          return `${i === 0 ? 'M' : 'L'} ${x},${y}`
       }).join(' ')
    }

    return { normalizedData: normalized, pointsCurrent: makePath('current'), pointsPrevious: makePath('previous'), maxVal: max, width: w, height: h, useLogScale }
  }, [data])

  const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 })
  
  // Tooltip en Esquina Opuesta
  const isLeftSide = hovered !== null && hovered < (normalizedData.length / 2);

  return (
    <div className="relative h-full w-full select-none touch-none" onMouseLeave={() => setHovered(null)} onTouchEnd={() => setTimeout(() => setHovered(null), 2000)}>
      
      {/* Línea Guía */}
      {hovered !== null && (
          <div className="absolute top-0 bottom-0 pointer-events-none z-10 w-[1px] bg-indigo-500/50 border-l border-dashed border-indigo-400"
             style={{ left: `${(hovered / (normalizedData.length - 1)) * 100}%` }} />
      )}

      {/* Tooltip Fijo */}
      {hovered !== null && normalizedData[hovered] && (
         <div className={`absolute z-20 top-0 p-3 rounded-lg shadow-lg border border-slate-100 bg-white/95 backdrop-blur-sm min-w-[140px] transition-all duration-200 ${isLeftSide ? 'right-0' : 'left-0'}`}>
            <p className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 mb-1 capitalize text-center">
                {normalizedData[hovered].label}
            </p>
            <div className="flex flex-col gap-1 text-[10px] sm:text-xs">
                 <div className="flex items-center justify-between gap-3">
                     <span className="text-indigo-600 font-semibold truncate max-w-[80px]" title={monthLabelActual}>Actual:</span>
                     <span className="font-mono font-bold text-slate-900">{fmt(normalizedData[hovered].current)}</span>
                 </div>
                 <div className="flex items-center justify-between gap-3">
                     <span className="text-slate-400 font-medium truncate max-w-[80px]" title={monthLabelAnterior}>Previo:</span>
                     <span className="font-mono text-slate-500">{fmt(normalizedData[hovered].previous)}</span>
                 </div>
            </div>
         </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
         <defs>
            <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.3"/></filter>
            <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/><stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/></linearGradient>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 L1,3 Z" fill="#4f46e5" /></marker>
         </defs>
         {[0, 0.25, 0.5, 0.75, 1].map(r => (<line key={r} x1="0" y1={height * r} x2={width} y2={height * r} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />))}
         <path d={pointsPrevious} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" className="opacity-70" vectorEffect="non-scaling-stroke" />
         <path d={`${pointsCurrent} L ${width},${height} L 0,${height} Z`} fill="url(#fillGradient)" stroke="none" />
         <path d={pointsCurrent} fill="none" stroke="#4f46e5" strokeWidth={isExpanded ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow3d)" markerEnd="url(#arrowhead)" className="transition-all duration-500 ease-out" vectorEffect="non-scaling-stroke" />
         {normalizedData.map((d: any, i: number) => (
            <rect key={i} x={(i / (normalizedData.length - 1)) * width - (width / normalizedData.length / 2)} y="0" width={width / normalizedData.length} height={height} fill="transparent" onMouseEnter={() => setHovered(i)} onTouchStart={() => setHovered(i)} className="cursor-crosshair" />
         ))}
         {hovered !== null && normalizedData[hovered] && (
            <circle cx={(hovered / (normalizedData.length - 1)) * width} cy={useLogScale ? height - (Math.log10(normalizedData[hovered].current + 1) / Math.log10(maxVal + 1)) * (height * 0.9) : height - (normalizedData[hovered].current / (maxVal * 1.1)) * height} r={6} fill="#4f46e5" stroke="white" strokeWidth="2" className="animate-pulse" vectorEffect="non-scaling-stroke" />
         )}
      </svg>
    </div>
  )
}

// =========================================================
// MODO 2: DESGLOSE - SOPORTE DE AÑO, COLORES INFINITOS Y TOOLTIP ESPEJO
// =========================================================
const MultiLineChartVisualizer = ({ data, isExpanded = false }: any) => {
    const [hoveredDay, setHoveredDay] = useState<number | null>(null)

    // 1. Procesar datos (Agrupar por Etiqueta Mes/Año)
    const { monthSeries, maxVal, width, height, colors } = useMemo(() => {
        const series: Record<string, number[]> = {};
        let max = 100;

        data.forEach((d: DailyData) => {
            // El backend envía "10 dic/25"
            // Split por espacio: parts[0] = "10", parts[1] = "dic/25"
            const parts = d.label.split(' ');
            const monthYearName = parts.length > 1 ? parts[1] : 'General'; // "dic/25"
            const dayNum = parseInt(parts[0]) || d.day;

            if (!series[monthYearName]) series[monthYearName] = Array(32).fill(null);
            if (dayNum >= 1 && dayNum <= 31) {
                series[monthYearName][dayNum] = d.current;
                if (d.current > max) max = d.current;
            }
        });

        const sortedSeries = Object.entries(series);
        const width = 1000;
        const height = 400;

        // Generar Colores Infinitos (Golden Angle)
        const generatedColors = sortedSeries.map((_, index) => {
            const hue = (index * 137.508) % 360; 
            return `hsl(${hue}, 75%, 45%)`; 
        });

        return { monthSeries: sortedSeries, maxVal: max, width, height, colors: generatedColors };
    }, [data]);

    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact' });
    const useLogScale = maxVal > 10000;
    const getY = (val: number | null) => {
        if (val === null || val === 0) return height;
        if (useLogScale) return height - (Math.log10(val + 1) / Math.log10(maxVal + 1)) * (height * 0.9);
        return height - (val / (maxVal * 1.1)) * height;
    };

    // Tooltip en Esquina Opuesta
    const isLeftSide = hoveredDay !== null && hoveredDay <= 15;

    return (
        <div className="flex flex-col h-full w-full select-none" onMouseLeave={() => setHoveredDay(null)}>
            <div className="relative flex-1 w-full min-h-0">
                
                {/* Línea Guía */}
                {hoveredDay !== null && (
                    <div className="absolute top-0 bottom-0 pointer-events-none z-10 w-[1px] bg-slate-400/50 border-l border-dotted border-slate-500"
                        style={{ left: `${((hoveredDay - 1) / 30) * 100}%` }} />
                )}

                {/* Tooltip Fijo en Esquina Opuesta */}
                {hoveredDay !== null && (
                    <div className={`absolute z-20 top-0 p-3 rounded-lg shadow-xl border border-slate-700 bg-slate-900/95 backdrop-blur text-white min-w-[160px] transition-all duration-200 ${isLeftSide ? 'right-0' : 'left-0'}`}>
                        <p className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-2 text-xs">Día {hoveredDay}</p>
                        
                        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 text-[10px] sm:text-xs">
                            {monthSeries.map(([name, values], i) => {
                                const val = values[hoveredDay] || 0;
                                const color = colors[i];
                                if (val === 0) return null; // Ocultar ceros
                                return (
                                    <div key={name} className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color, color: color }}></div>
                                            <span className="capitalize text-slate-200">{name}</span>
                                        </div>
                                        <span className="font-mono font-bold">{fmt(val)}</span>
                                    </div>
                                )
                            })}
                            {monthSeries.every(([_, values]) => (values[hoveredDay] || 0) === 0) && (
                                <span className="text-slate-500 italic text-center py-1">Sin ventas este día</span>
                            )}
                            {monthSeries.some(([_, values]) => (values[hoveredDay] || 0) === 0) && !monthSeries.every(([_, values]) => (values[hoveredDay] || 0) === 0) && (
                                <div className="mt-2 pt-2 border-t border-slate-700/50 text-[9px] text-slate-400 italic text-center leading-tight">
                                    * Meses no listados: $0.00
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
                    {[0, 0.25, 0.5, 0.75, 1].map(r => (<line key={r} x1="0" y1={height * r} x2={width} y2={height * r} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />))}
                    {monthSeries.map(([name, values], i) => {
                        const color = colors[i];
                        let d = "";
                        let started = false;
                        for (let day = 1; day <= 31; day++) {
                            const val = values[day];
                            if (val !== null) {
                                const x = ((day - 1) / 30) * width;
                                const y = getY(val);
                                d += `${started ? 'L' : 'M'} ${x},${y} `;
                                started = true;
                            }
                        }
                        return (
                            <g key={name}>
                                 <path d={d} fill="none" stroke={color} strokeWidth={isExpanded ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="opacity-80 hover:opacity-100 transition-opacity" />
                                 {values.map((val, day) => {
                                     if (val === null || day === 0) return null;
                                     return (
                                         <circle key={day} cx={((day - 1) / 30) * width} cy={getY(val)} r={hoveredDay === day ? 5 : 0} fill={color} stroke="white" strokeWidth="1" />
                                     )
                                 })}
                            </g>
                        )
                    })}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <rect key={day} x={((day - 1) / 30) * width - (width / 30 / 2)} y="0" width={width / 30} height={height} fill="transparent" onMouseEnter={() => setHoveredDay(day)} className="cursor-crosshair" />
                    ))}
                </svg>
            </div>
            
            <div className="flex justify-center gap-3 flex-wrap mt-2 border-t border-slate-100 pt-3">
                 {monthSeries.map(([name], i) => (
                     <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 cursor-default">
                         <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i] }}></div>
                         <span className="text-[11px] font-medium text-slate-600 capitalize">{name}</span>
                     </div>
                 ))}
            </div>
        </div>
    )
}