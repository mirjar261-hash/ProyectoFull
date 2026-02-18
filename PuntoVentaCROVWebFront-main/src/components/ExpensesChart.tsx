'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

interface Totals {
  compras: number
  gastos: number
  retiros: number
}

interface BarData {
  label: string
  totals: Totals
}

export default function ExpensesChart() {
  const [data, setData] = useState<BarData[]>([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalId = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchTotals = async (start: string, end: string): Promise<Totals> => {
    const headers = { Authorization: `Bearer ${token}` }
    const comprasRes = await axios.get(
      `${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${start}&fechaFin=${end}`,
      { headers }
    )
    const comprasTotal = (comprasRes.data || []).reduce(
      (sum: number, c: any) => sum + (c.total || 0),
      0
    )

    const gastosRes = await axios.get(
      `${apiUrl}/gasto/rango?sucursalId=${sucursalId}&fechaInicio=${start}&fechaFin=${end}`,
      { headers }
    )
    const gastosTotal = (gastosRes.data || []).reduce(
      (sum: number, g: any) => sum + (g.monto || 0),
      0
    )

    const retirosRes = await axios.get(
      `${apiUrl}/retiro?sucursalId=${sucursalId}&fechaInicio=${start}&fechaFin=${end}`,
      { headers }
    )
    const retirosTotal = (retirosRes.data || []).reduce(
      (sum: number, r: any) => sum + (r.monto || 0),
      0
    )

    return { compras: comprasTotal, gastos: gastosTotal, retiros: retirosTotal }
  }

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date()
      const dia = today.toISOString().substring(0, 10)
      const dayTotals = await fetchTotals(dia, dia)

      const monday = new Date(today)
      const day = monday.getDay()
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
      monday.setDate(diff)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekTotals = await fetchTotals(
        monday.toISOString().substring(0, 10),
        sunday.toISOString().substring(0, 10)
      )

      const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const monthTotals = await fetchTotals(
        firstMonth.toISOString().substring(0, 10),
        lastMonth.toISOString().substring(0, 10)
      )

      setData([
        { label: 'Día', totals: dayTotals },
        { label: 'Semana', totals: weekTotals },
        { label: 'Mes', totals: monthTotals },
      ])
    }
    fetchAll()
  }, [])

  const max = Math.max(
    ...data.map((d) => d.totals.compras + d.totals.gastos + d.totals.retiros),
    0
  )

  if (data.length === 0) return <p>Cargando...</p>

  return (
    <div className="max-w-xl">
      <h2 className="font-semibold text-lg mb-2">Egresos</h2>
      <div className="flex items-end justify-around h-64">
        {data.map(({ label, totals }) => {
          const { compras, gastos, retiros } = totals
          const comprasH = max ? (compras / max) * 100 : 0
          const gastosH = max ? (gastos / max) * 100 : 0
          const retirosH = max ? (retiros / max) * 100 : 0
          const total = compras + gastos + retiros
          return (
            <div key={label} className="flex flex-col items-center w-16">
              <div className="w-full flex flex-col justify-end h-48 bg-gray-100 rounded">
                <div
                  className="bg-red-400"
                  style={{ height: `${retirosH}%` }}
                  title={`Retiros: $${retiros.toFixed(2)}`}
                />
                <div
                  className="bg-blue-400"
                  style={{ height: `${gastosH}%` }}
                  title={`Gastos: $${gastos.toFixed(2)}`}
                />
                <div
                  className="bg-green-400"
                  style={{ height: `${comprasH}%` }}
                  title={`Compras: $${compras.toFixed(2)}`}
                />
              </div>
              <span className="text-sm mt-1 font-medium">{label}</span>
              <span className="text-xs text-gray-700">${total.toFixed(2)}</span>
            </div>  
          )
        })}
      </div>
      <div className="flex justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-400 rounded-sm" />
          <span>Compras</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-400 rounded-sm" />
          <span>Gastos</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-400 rounded-sm" />
          <span>Retiros</span>
        </div>
      </div>
    </div>
  )
}

