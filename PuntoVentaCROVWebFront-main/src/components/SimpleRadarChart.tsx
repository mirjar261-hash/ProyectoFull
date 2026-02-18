'use client'

import { useMemo } from 'react'

export interface SimpleRadarDatum {
  label: string
  value: number
  display: string
  trend: 'positive' | 'negative' | 'neutral' | 'na'
}

interface SimpleRadarChartProps {
  data: SimpleRadarDatum[]
  maxValue?: number
}

const TREND_COLORS: Record<SimpleRadarDatum['trend'], string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#0ea5e9',
  na: '#9ca3af',
}

export default function SimpleRadarChart({ data, maxValue }: SimpleRadarChartProps) {
  const normalized = useMemo(() => {
    if (!data.length) {
      return []
    }

    const computedMax = maxValue && maxValue > 0 ? maxValue : Math.max(...data.map((d) => d.value), 1)
    const size = 220
    const center = size / 2
    const radius = center - 24
    const angleStep = (Math.PI * 2) / data.length

    const points = data.map((item, index) => {
      const angle = -Math.PI / 2 + angleStep * index
      const magnitude = Math.min(item.value, computedMax)
      const distance = computedMax === 0 ? 0 : (magnitude / computedMax) * radius
      const x = center + Math.cos(angle) * distance
      const y = center + Math.sin(angle) * distance

      return { ...item, x, y }
    })

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ')

    return { points, path: `${path} Z`, size, center, radius, angleStep, computedMax }
  }, [data, maxValue])

  if (!normalized || !normalized.points.length) {
    return (
      <div className="flex flex-col items-center justify-center text-sm text-muted-foreground py-8">
        No hay datos suficientes para generar la gráfica.
      </div>
    )
  }

  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={normalized.size} height={normalized.size} role="img" aria-label="Comparativa de crecimiento mensual">
        <g>
          {rings.map((ratio) => {
            const r = normalized.radius * ratio
            return (
              <circle
                key={`ring-${ratio}`}
                cx={normalized.center}
                cy={normalized.center}
                r={r}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            )
          })}
          {normalized.points.map((point, index) => (
            <g key={`axis-${point.label}`}>
              <line
                x1={normalized.center}
                y1={normalized.center}
                x2={point.x}
                y2={point.y}
                stroke="#cbd5f5"
                strokeWidth={1}
              />
              <text
                x={normalized.center + Math.cos(-Math.PI / 2 + normalized.angleStep * index) * (normalized.radius + 16)}
                y={normalized.center + Math.sin(-Math.PI / 2 + normalized.angleStep * index) * (normalized.radius + 16)}
                textAnchor="middle"
                alignmentBaseline="middle"
                className="text-xs fill-slate-600"
              >
                {point.label}
              </text>
            </g>
          ))}
          <path
            d={normalized.path}
            fill="rgba(14, 165, 233, 0.18)"
            stroke="#0ea5e9"
            strokeWidth={2}
          />
          {normalized.points.map((point) => (
            <circle
              key={`dot-${point.label}`}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={TREND_COLORS[point.trend]}
              stroke="#0f172a"
              strokeWidth={0.5}
            />
          ))}
        </g>
      </svg>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {normalized.points.map((point) => (
          <li key={`legend-${point.label}`} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TREND_COLORS[point.trend] }}
            />
            <span className="font-medium text-slate-700">{point.label}</span>
            <span className="text-muted-foreground">{point.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
