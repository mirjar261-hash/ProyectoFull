'use client'

import { useEffect, useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Item {
  label: string
  value: number
  detail?: string
}

// Interfaz para recibir los datos crudos desde la BD
interface RawItem {
  fecha?: string
  fecha_devolucion?: string
  [key: string]: any
}

type ValueFormatter = (value: number, item: Item) => string

const defaultValueFormatter: ValueFormatter = (value) => `$${value.toFixed(2)}`

// Constante para evitar re-renderizados infinitos
const EMPTY_ARRAY: Item[] = []

export default function SimpleBarChart({
  data = EMPTY_ARRAY, 
  rawData,               
  dataKey = 'total',     
  gradient = 'from-orange-500 to-pink-500',
  valueFormatter = defaultValueFormatter,
}: {
  data?: Item[]
  rawData?: RawItem[]
  dataKey?: string
  gradient?: string
  valueFormatter?: ValueFormatter
}) {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [animatedHeights, setAnimatedHeights] = useState<number[]>([])

  // --- 1. LÓGICA DE AGRUPACIÓN (CORREGIDA) ---
  const chartData = useMemo(() => {
    // Si no hay data cruda, usamos la legacy
    if (!rawData || rawData.length === 0) return data

    const dataMap = new Map<string, { label: string; value: number; sortDate: number; detail: string }>()

    const getGroupKey = (dateStr: string | Date) => {
      // Forzamos la interpretación de la fecha para evitar desfases horarios
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null

      // Ajuste para obtener el día local correctamente si viene con hora 00:00 UTC
      // O usamos getUTCDate() si tu backend manda UTC puro. 
      // Asumiremos input local o string 'YYYY-MM-DD'.
      const year = d.getUTCFullYear()
      const month = d.getUTCMonth() // 0-11
      const day = d.getUTCDate() // 1-31

      // Nombre del mes corto (Ene, Feb...)
      const monthName = new Date(Date.UTC(year, month, day)).toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' })
      // Nombre del mes largo (Noviembre) para el detalle
      const monthFull = new Date(Date.UTC(year, month, day)).toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' })

      if (viewMode === 'monthly') {
        // VISTA MENSUAL: Agrupa todo el mes
        const key = `${year}-${month}`
        // Etiqueta: "Nov 25"
        const label = `${monthName} ${year.toString().slice(-2)}`
        // Detalle: "2025"
        const detail = year.toString()
        // Orden: Primer día del mes
        const sort = new Date(year, month, 1).getTime()
        
        return { key, label, detail, sort }
      } else {
        // VISTA SEMANAL (SEMANA 1, 2, 3, 4)
        // Calculamos el índice de la semana matemáticamente (1-7 = Sem1, 8-14 = Sem2...)
        const weekIndex = Math.ceil(day / 7) // 1, 2, 3, 4, 5

        // Clave única: Año-Mes-Semana
        const key = `${year}-${month}-W${weekIndex}`
        
        // Etiqueta: "Sem 1 Ene"
        const label = `Sem ${weekIndex} ${monthName}`
        
        // Detalle: "Semana 1 de Noviembre"
        const detail = `Semana ${weekIndex} de ${monthFull}`

        // Orden: Usamos la fecha exacta para que salga cronológico
        // (Ponemos el día de referencia según la semana para ordenar: día 1, 8, 15, etc)
        const sortDay = (weekIndex - 1) * 7 + 1
        const sort = new Date(year, month, sortDay).getTime()

        return { key, label, detail, sort }
      }
    }

    rawData.forEach((item) => {
      const dateVal = item.fecha || item.fecha_devolucion
      if (!dateVal) return

      const group = getGroupKey(dateVal)
      if (!group) return

      const val = Number(item[dataKey] || 0)
      
      if (!dataMap.has(group.key)) {
        dataMap.set(group.key, {
          label: group.label,
          value: 0,
          detail: group.detail,
          sortDate: group.sort
        })
      }
      
      const current = dataMap.get(group.key)!
      current.value += val
    })

    // Ordenar por fecha
    return Array.from(dataMap.values())
      .sort((a, b) => a.sortDate - b.sortDate)
      .map(d => ({ label: d.label, value: d.value, detail: d.detail }))

  }, [rawData, data, viewMode, dataKey])

  const max = Math.max(...chartData.map((d) => d.value), 1)

  useEffect(() => {
    const newHeights = chartData.map(({ value }) =>
      max ? (value / max) * 100 : 0
    )
    setAnimatedHeights(newHeights)
  }, [chartData, max])

  return (
    <div className="space-y-4">
      
      {/* SWITCH DE VISTA (Solo si hay datos crudos) */}
      {rawData && rawData.length > 0 && (
        <div className="flex justify-end px-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 h-7 bg-slate-100">
              <TabsTrigger value="weekly" className="text-[10px] px-2 h-5">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-[10px] px-2 h-5">Mensual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* RENDERIZADO DE BARRAS */}
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        {chartData.length > 0 ? (
          <div className="flex gap-6 px-4 min-w-max items-end h-56">
            {chartData.map((item, idx) => {
              const { label, value, detail } = item
              const formattedValue = valueFormatter(value, item)

              return (
                <div
                  key={`${label}-${idx}`}
                  className="flex flex-col items-center flex-none min-w-[96px] group"
                >
                  {/* Área de la barra */}
                  <div className="h-40 flex items-end w-full justify-center relative">
                    <div
                      className={`w-12 rounded-t-md bg-gradient-to-t ${gradient} transition-all duration-700 opacity-90 group-hover:opacity-100 shadow-sm`}
                      style={{
                        height: `${animatedHeights[idx]}%`,
                        minHeight: '4px',
                      }}
                      title={`${detail}\nTotal: ${formattedValue}`}
                    >
                        {/* Brillo superior estético */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40 rounded-t-md"></div>
                    </div>
                  </div>
                  
                  {/* Texto Valor */}
                  <span className="mt-2 text-xs font-bold text-slate-700">
                    {formattedValue}
                  </span>
                  
                  {/* Etiqueta Principal (Sem 1 Nov) */}
                  <span className="text-[10px] font-medium text-slate-500 text-center uppercase tracking-wide mt-1">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400 w-full">
            Sin datos para mostrar en este periodo.
          </div>
        )}
      </div>
    </div>
  )
}