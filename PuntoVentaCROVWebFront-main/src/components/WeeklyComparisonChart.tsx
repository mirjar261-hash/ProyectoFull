'use client'

interface WeeklyData {
  label: string
  ventas: number
  utilidad: number
  detail?: string
}

export default function WeeklyComparisonChart({
  data,
}: {
  data: WeeklyData[]
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        No hay información disponible para el periodo seleccionado.
      </p>
    )
  }

  const maxValue = Math.max(
    ...data.flatMap((item) => [item.ventas, Math.max(item.utilidad, 0)]),
    1
  )

  return (
     <div className="w-full rounded-lg bg-white p-6 shadow-sm border border-slate-200">
      <div className="w-full overflow-x-auto">
        <div className="flex gap-6 min-w-max pr-4">
        {data.map((item) => {
          const ventasHeight = (item.ventas / maxValue) * 100
          const utilidadHeight = (Math.max(item.utilidad, 0) / maxValue) * 100

          return (
            <div
              key={`${item.label}-${item.detail ?? ''}`}
               className="flex-none flex flex-col items-center gap-2 min-w-[110px]"
            >
              <div className="flex items-end gap-2 h-48">
                <div
                  className="w-6 rounded-md bg-gradient-to-t from-orange-500 to-amber-300 transition-all duration-700"
                  style={{ height: `${ventasHeight}%`, minHeight: '4px' }}
                  title={`${item.detail ?? item.label}: Ventas $${item.ventas.toFixed(2)}`}
                />
                <div
                  className="w-6 rounded-md bg-gradient-to-t from-emerald-500 to-teal-300 transition-all duration-700"
                  style={{ height: `${utilidadHeight}%`, minHeight: '4px' }}
                  title={`${item.detail ?? item.label}: Utilidad $${item.utilidad.toFixed(2)}`}
                />
              </div>
              <div className="flex flex-col items-center text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{item.label}</span>
                {item.detail && (
                  <span className="text-slate-500">{item.detail}</span>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
       <div className="flex justify-center gap-4 mt-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-orange-500 to-amber-300" />
          <span>Ventas</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-teal-300" />
          <span>Utilidad</span>
        </div>
      </div>
    </div>
  )
}