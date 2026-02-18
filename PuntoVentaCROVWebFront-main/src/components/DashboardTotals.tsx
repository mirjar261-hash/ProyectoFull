'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Totals {
  ventas: number
  compras: number
  gastos: number
  retiros: number
  ventaNeta: number
  agotados: number
  utilidadNeta: number
  flujoCaja: number
  totalEfectivo: number
  totalBancos: number
  cumplimiento: number
  metaDiaria: number
}

export default function DashboardTotals() {
  const [totals, setTotals] = useState<Totals>({
    ventas: 0,
    compras: 0,
    gastos: 0,
    retiros: 0,
    ventaNeta: 0,
    agotados: 0,
    utilidadNeta: 0,
    flujoCaja: 0,
    totalEfectivo: 0,
    totalBancos: 0,
    cumplimiento: 0,
    metaDiaria: 0,
  })
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalId = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1

  useEffect(() => {
    const fetchData = async () => {
      if (!apiUrl) {
        return
      }
      try {
        const now = new Date()

        // INICIO de hoy (LOCAL) -> a UTC ISO
        const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const endOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        const startOfRangeLocal = new Date(startOfTodayLocal)
        startOfRangeLocal.setDate(startOfRangeLocal.getDate() - 14)

        // INICIO de mañana (LOCAL) -> a UTC ISO (fin EXCLUSIVO)
        const toLocalISOString = (date: Date) => {
          const pad = (value: number, length = 2) => value.toString().padStart(length, '0')
          return (
            `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
            `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
          )
        }
        const startOfRangeLocalISO = toLocalISOString(startOfRangeLocal)
        const startOfTodayLocalISO = toLocalISOString(startOfTodayLocal)
        const endOfTodayLocalISO = toLocalISOString(endOfTodayLocal)

        const formatLocalDay = (date: Date) => {
          const time = date.getTime()
          if (!Number.isFinite(time)) return ''
          const local = new Date(time - date.getTimezoneOffset() * 60 * 1000)
          return local.toISOString().slice(0, 10)
        }

        const todayKey = formatLocalDay(now)

        const parseApiDate = (value: unknown) => {
          if (!value) return null
          if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value
          }
          if (typeof value === 'number') {
            const parsed = new Date(value)
            return Number.isNaN(parsed.getTime()) ? null : parsed
          }
          if (typeof value !== 'string') return null

          const trimmed = value.trim()
          if (!trimmed) return null

          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [year, month, day] = trimmed.split('-').map((part) => Number(part))
            const parsed = new Date(Date.UTC(year, month - 1, day))
            return Number.isNaN(parsed.getTime()) ? null : parsed
          }

          const isoLike = trimmed.replace(' ', 'T')
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?$/.test(isoLike)) {
            let parsed = new Date(isoLike)
            if (Number.isNaN(parsed.getTime()) && !/([+-]\d{2}:\d{2}|Z)$/.test(isoLike)) {
              parsed = new Date(`${isoLike}Z`)
            }
            return Number.isNaN(parsed.getTime()) ? null : parsed
          }

          const parsed = new Date(trimmed)
          if (!Number.isNaN(parsed.getTime())) {
            return parsed
          }

          const fallback = new Date(`${isoLike}Z`)
          return Number.isNaN(fallback.getTime()) ? null : fallback
        }

        const isToday = (value: unknown) => {
          const parsed = parseApiDate(value)
          if (!parsed) return false
          return formatLocalDay(parsed) === todayKey
        }

        const coerceArray = (data: any, nestedKeys: string[] = []) => {
          if (Array.isArray(data)) return data
          for (const key of nestedKeys) {
            const candidate = data?.[key]
            if (Array.isArray(candidate)) return candidate
          }
          return []
        }

        const pickDate = (record: any, keys: string[]) => {
          for (const key of keys) {
            const value = key.includes('.')
              ? key
                  .split('.')
                  .reduce(
                    (acc: any, part) => (acc !== null && acc !== undefined ? acc[part] : undefined),
                    record
                  )
              : record?.[key]
            if (value) return value
          }
          return null
        }

        const asNumber = (value: any) => {
          const num = Number(value)
          return Number.isFinite(num) ? num : 0
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        const startDateParam = formatLocalDay(startOfTodayLocal)
        const tomorrow = new Date(startOfTodayLocal.getTime() + 24 * 60 * 60 * 1000)
        const endDateParam = formatLocalDay(tomorrow)

         const [ventasRes, comprasRes, gastosRes, productosRes, retirosRes, kpisDiaRes] = await Promise.all([
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${encodeURIComponent(startOfRangeLocalISO)}&fechaFin=${encodeURIComponent(endOfTodayLocalISO)}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${encodeURIComponent(startOfTodayLocalISO)}&fechaFin=${encodeURIComponent(endOfTodayLocalISO)}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/gasto?sucursalId=${sucursalId}&fechaInicio=${encodeURIComponent(startOfTodayLocalISO)}&fechaFin=${encodeURIComponent(endOfTodayLocalISO)}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/producto/productosPaginacion?pagina=1&limite=1000&sucursalId=${sucursalId}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/retiro?sucursalId=${sucursalId}&fechaInicio=${startDateParam}&fechaFin=${endDateParam}&activos=0`,
            { headers }
          ),
          axios
            .get(`${apiUrl}/gerente/kpisDia?sucursalId=${sucursalId}&meta=0`, {
              headers,
            })
            .catch((err) => {
              console.error(err)
              return { data: null }
            }),
        ])
        const ventasData = coerceArray(ventasRes.data, ['ventas', 'data', 'items'])
        const ventasHoy = ventasData.filter((venta: any) =>
          isToday(pickDate(venta, ['fecha', 'fecha_venta', 'fechaVenta', 'created_at', 'createdAt']))
        )
        const ventasTotal = ventasHoy.reduce((sum: number, venta: any) => sum + asNumber(venta.total), 0)
        const devolucionesTotal = ventasData
           .filter((venta: any) =>
            isToday(
              pickDate(venta, [
                'fecha_devolucion',
                'fechaDevolucion',
                'devolucion_fecha',
                'devolucionFecha',
                'devolucion.fecha',
              ])
            )
          )
          .reduce((sum: number, venta: any) => sum + asNumber(venta.total), 0)

           const ventasPorDia = new Map<string, number>()
        const devolucionesPorDia = new Map<string, number>()

        ventasData.forEach((venta: any) => {
          const ventaFecha = pickDate(venta, ['fecha', 'fecha_venta', 'fechaVenta', 'created_at', 'createdAt'])
          const devolucionFecha = pickDate(venta, [
            'fecha_devolucion',
            'fechaDevolucion',
            'devolucion_fecha',
            'devolucionFecha',
            'devolucion.fecha',
          ])

          const ventaParsed = parseApiDate(ventaFecha)
          if (ventaParsed) {
            const key = formatLocalDay(ventaParsed)
            if (key) {
              ventasPorDia.set(key, (ventasPorDia.get(key) ?? 0) + asNumber(venta.total))
            }
          }

          const devolucionParsed = parseApiDate(devolucionFecha)
          if (devolucionParsed) {
            const key = formatLocalDay(devolucionParsed)
            if (key) {
              devolucionesPorDia.set(key, (devolucionesPorDia.get(key) ?? 0) + asNumber(venta.total))
            }
          }
        })

        const diasConsiderados = new Set([...ventasPorDia.keys(), ...devolucionesPorDia.keys()])
        let mayorVentaDiaria = 0
        diasConsiderados.forEach((key) => {
          const neto = (ventasPorDia.get(key) ?? 0) - (devolucionesPorDia.get(key) ?? 0)
          if (neto > mayorVentaDiaria) {
            mayorVentaDiaria = neto
          }
        })

        
        const comprasData = coerceArray(comprasRes.data, ['compras', 'data', 'items'])
        const comprasTotal = comprasData
          .filter((compra: any) =>
            isToday(pickDate(compra, ['fecha', 'fecha_emision', 'fechaEmision', 'created_at', 'createdAt']))
          )
          .reduce((sum: number, compra: any) => sum + asNumber(compra.total), 0)

        
       const gastosData = coerceArray(gastosRes.data, ['gastos', 'data', 'items'])
        const gastosTotal = gastosData
          .filter((gasto: any) =>
            isToday(pickDate(gasto, ['fecha', 'fecha_gasto', 'fechaGasto', 'created_at', 'createdAt']))
          )
          .reduce((sum: number, gasto: any) => sum + asNumber(gasto.monto), 0)
const retirosData = coerceArray(retirosRes.data, ['retiros', 'data', 'items'])
        const retirosTotal = retirosData
          .filter((retiro: any) =>
            isToday(pickDate(retiro, ['fecha', 'fecha_retiro', 'fechaRetiro', 'created_at', 'createdAt']))
          )
          .reduce((sum: number, retiro: any) => sum + asNumber(retiro.monto), 0)

        
         const agotadosTotal = (productosRes.data?.productos || []).filter((p: any) => {
          const isServicio = Number(p?.servicio ?? 0) === 1
          return !isServicio && p.cantidad_existencia <= 0
        }).length

        const ventasNetas = ventasTotal - devolucionesTotal
         const utilidadNeta = ventasNetas - gastosTotal

        const kpisDiaData = kpisDiaRes?.data || {}
        const totalEfectivo = asNumber(kpisDiaData.totalEfectivo)
        const totalTransferencia = asNumber(kpisDiaData.totalTransferencia)
        const totalTarjeta = asNumber(kpisDiaData.totalTarjeta)
        const totalCheque = asNumber(kpisDiaData.totalCheque)
        const totalBancos = totalTransferencia + totalTarjeta + totalCheque
        const flujoCaja = totalEfectivo + totalBancos

        // Usa el mejor día registrado como referencia y proyecta la meta
        const META_GROWTH_FACTOR = 1.1
        const metaDesdeApi = asNumber(kpisDiaData.metaDiaria)
        const metaCalculada = mayorVentaDiaria > 0 ? mayorVentaDiaria * META_GROWTH_FACTOR : ventasNetas
        const metaDiaria = metaDesdeApi > 0 ? metaDesdeApi : metaCalculada
        const cumplimiento = metaDiaria > 0 ? Math.max(0, Math.min((ventasNetas / metaDiaria) * 100, 999)) : 0

        setTotals({
          ventas: ventasNetas,
          compras: comprasTotal,
          gastos: gastosTotal,
          retiros: retirosTotal,
          ventaNeta: ventasNetas - (comprasTotal + gastosTotal + retirosTotal),
          agotados: agotadosTotal,
          utilidadNeta,
          flujoCaja,
          totalEfectivo,
          totalBancos,
          cumplimiento,
          metaDiaria,
        })
      } catch (err) {
        console.error(err)
      }
    }

    fetchData()
   }, [apiUrl, sucursalId, token])


  const formatCurrency = (value: number) =>
    value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  const cumplimientoClamped = Math.round(totals.cumplimiento)
  const cumplimientoColor =
    cumplimientoClamped >= 100 ? 'text-emerald-600' : cumplimientoClamped >= 75 ? 'text-amber-500' : 'text-red-500'
  const cumplimientoBackground = `conic-gradient(#f97316 ${Math.min(cumplimientoClamped, 100)}%, #e2e8f0 ${Math.min(
    cumplimientoClamped,
    100
  )}% 100%)`
  const totalMovimientos = totals.ventas + totals.gastos
  const ingresosPct = totalMovimientos > 0 ? Math.min(100, (totals.ventas / totalMovimientos) * 100) : 0
  const barraColor = totals.utilidadNeta >= 0 ? 'bg-emerald-500' : 'bg-red-500'


  return (
     <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Indicadores principales del día</h2>
        <p className="text-sm text-muted-foreground">
          Datos consolidados con corte al día de hoy para decisiones rápidas.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Ventas del día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(totals.ventas)}</p>
            <p className="text-xs text-muted-foreground mt-2">Incluye devoluciones descontadas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Gastos del día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(totals.gastos)}</p>
            <p className="text-xs text-muted-foreground mt-2">Pagos operativos registrados hoy.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Utilidad neta del día</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={`text-3xl font-semibold ${totals.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totals.utilidadNeta)}
            </p>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${barraColor}`}
                  style={{ width: `${ingresosPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Ingresos {formatCurrency(totals.ventas)}</span>
                <span>Gastos {formatCurrency(totals.gastos)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Flujo de caja disponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold text-slate-900">{formatCurrency(totals.flujoCaja)}</p>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Caja: {formatCurrency(totals.totalEfectivo)}</span>
              <span>Bancos: {formatCurrency(totals.totalBancos)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">% de cumplimiento diario</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="relative w-20 h-20">
              <div
                className="w-full h-full rounded-full transition-all duration-500"
                style={{ background: cumplimientoBackground }}
              />
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <span className={`text-lg font-semibold ${cumplimientoColor}`}>{Math.min(cumplimientoClamped, 999)}%</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Meta: <span className="font-semibold text-slate-900">{formatCurrency(totals.metaDiaria)}</span>
              </p>
              <p>
                Avance: <span className="font-semibold text-slate-900">{formatCurrency(totals.ventas)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm text-amber-600">Compras del día</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-700">
            {formatCurrency(totals.compras)}
          </CardContent>
        </Card>
        <Card className="bg-rose-50">
          <CardHeader>
            <CardTitle className="text-sm text-rose-600">Retiros del día</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-700">
            {formatCurrency(totals.retiros)}
          </CardContent>
        </Card>
        <Card className="bg-sky-50">
          <CardHeader>
            <CardTitle className="text-sm text-sky-600">Productos agotados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-sky-700">{totals.agotados}</CardContent>
        </Card>
      </div>
    </div>
  )
}
