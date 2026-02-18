'use client'

import { useEffect, useState } from 'react'

interface Item {
  label: string
  value: number
  color: string
}

type ValueFormatter = (value: number, item: Item) => string
interface SimplePieChartProps {
  data: Item[]
  valueFormatter?: ValueFormatter
}

const defaultValueFormatter: ValueFormatter = (value: number) =>
  `$${value.toFixed(2)}`

export default function SimplePieChart({ data, valueFormatter = defaultValueFormatter }: SimplePieChartProps) {
  const [segments, setSegments] = useState<string>('')
  const [labels, setLabels] = useState<
    { label: string; percent: string; x: number; y: number }[]
  >([])

  useEffect(() => {
    const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0)
    let current = 0
    const parts: string[] = []
    const lbls: { label: string; percent: string; x: number; y: number }[] = []

    data.forEach((d) => {
      const normalizedValue = Math.max(d.value, 0)
      const angle = total ? (normalizedValue / total) * 360 : 0
      const seg = `${d.color} ${current}deg ${current + angle}deg`
      parts.push(seg)

      const middle = current + angle / 2
      const rad = ((middle - 90) * Math.PI) / 180
      const x = 50 + Math.cos(rad) * 35
      const y = 50 + Math.sin(rad) * 35
      const percent = total ? ((normalizedValue / total) * 100).toFixed(1) : '0'
      lbls.push({ label: d.label, percent, x, y })

      current += angle
    })

    // trigger animation on next frame
    requestAnimationFrame(() => {
      setSegments(parts.join(', '))
      setLabels(lbls)
    })
  }, [data])

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <div
          className="w-48 h-48 rounded-full transition-[background] duration-700"
          style={{ background: `conic-gradient(${segments})` }}
        />
        {labels.map((l, i) => (
  <span
    key={`${l.label}-${i}`}
    className="absolute text-xs font-semibold text-white"
    style={{
      left: `${l.x}%`,
      top: `${l.y}%`,
      transform: 'translate(-50%, -50%)',
    }}
  >
    {l.percent}%
  </span>
))}
      </div>
      <div className="flex gap-4 mt-4 text-sm flex-wrap justify-center">
        {data.map((d, i) => (
  <div key={`${d.label}-${i}`} className="flex items-center gap-1">
    <span
      className="w-3 h-3 rounded-sm"
      style={{ backgroundColor: d.color }}
    />
    <span>
      {d.label}: {valueFormatter(d.value, d)}
    </span>
  </div>
))}
      </div>
    </div>
  )
}

