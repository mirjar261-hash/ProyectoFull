'use client'

import { useEffect, useState } from 'react'

interface Item {
  label: string
  value: number
  detail?: string
}

type ValueFormatter = (value: number, item: Item) => string

const defaultValueFormatter: ValueFormatter = (value) => `$${value.toFixed(2)}`

export default function SimpleBarChart({
  data,
  gradient = 'from-orange-500 to-pink-500',
  valueFormatter = defaultValueFormatter,
}: {
  data: Item[]
  gradient?: string
  valueFormatter?: ValueFormatter
}) {
  const [animatedHeights, setAnimatedHeights] = useState<number[]>([])

  const max = Math.max(...data.map((d) => d.value), 1) // evitar división por 0

  useEffect(() => {
    const newHeights = data.map(({ value }) =>
      max ? (value / max) * 100 : 0
    )
    setAnimatedHeights(newHeights)
  }, [data, max])

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-6 px-4 min-w-max">
        {data.map((item, idx) => {
          const { label, value, detail } = item
          const formattedValue = valueFormatter(value, item)

          return (
            <div
              key={`${label}-${detail ?? 'sin-detalle'}`}
              className="flex flex-col items-center flex-none min-w-[96px]"
            >
              {/* Contenedor fijo que define la altura relativa */}
              <div className="h-48 flex items-end">
                <div
                  className={`w-6 rounded-md bg-gradient-to-t ${gradient} transition-all duration-700`}
                  style={{
                    height: `${animatedHeights[idx]}%`,
                    minHeight: '4px',
                  }}
                  title={`${label}: ${formattedValue}${detail ? ` (${detail})` : ''}`}
                />
              </div>
              {/* Texto arriba */}
              <span className="mt-2 text-xs font-semibold text-slate-800">
                {formattedValue}
              </span>
              {/* Etiqueta */}
              <span className="text-[11px] font-medium text-slate-600 text-center">
                {label}
              </span>
              {detail && (
                <span className="text-[10px] text-slate-500 text-center leading-tight">
                  {detail}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
