'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import SimplePieChart from './SimplePieChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface VentaDetalle {
  total?: number
  activo?: number
}

interface Venta {
  id: number
}
interface VentaDetalleResponse {
  detalles?: VentaDetalle[]
  fecha?: string
}
interface DetalleDevolucion {
  total?: number
  fecha_devolucion?: string
  createdAt?: string
  updatedAt?: string
  venta?: {
    fecha?: string
  }
}

interface ChartItem {
  label: string
  value: number
  color: string
}

export default function DailyRevenueReturnsCard() {
  const [data, setData] = useState<ChartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        if (!apiUrl) {
          throw new Error('No se ha configurado la URL de la API.')
        }

        const token = localStorage.getItem('token') || undefined
        const sucursalId = Number(localStorage.getItem('sucursalId') || '1')
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        const hoy = new Date()
        const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
        const finDia = new Date(inicioDia)
        finDia.setDate(finDia.getDate() + 1)

        const formatISODate = (date: Date) => date.toISOString().substring(0, 10)
        const inicio = formatISODate(inicioDia)
        const fin = inicio

        const [detallesDevRes, ventasSemanaRes] = await Promise.all([
          axios.get(
            `${apiUrl}/gerente/detallesVentasDevueltas7dias?sucursalId=${sucursalId}`,
            { headers }
          ),
          axios.get(
            `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${inicio}T00:00:00.000Z&fechaFin=${fin}T23:59:59.999&activo=1`,
            { headers }
          ),
        ])

        const detallesDev: DetalleDevolucion[] = Array.isArray(detallesDevRes.data)
          ? detallesDevRes.data
          : []
        const ventasSemana: Venta[] = Array.isArray(ventasSemanaRes.data)
          ? ventasSemanaRes.data
          : []

        const detallesVentasRes = await Promise.all(
          ventasSemana.map((venta) =>
            axios.get(`${apiUrl}/venta/${venta.id}`, { headers })
          )
        )

        let totalIngresos = 0
        detallesVentasRes.forEach((res) => {
          const ventaData: VentaDetalleResponse = res.data || {}

          if (ventaData.fecha) {
            const fechaVenta = new Date(ventaData.fecha)
            if (
              Number.isNaN(fechaVenta.getTime()) ||
              fechaVenta < inicioDia ||
              fechaVenta >= finDia
            ) {
              return
            }
          }

          const dets: VentaDetalle[] = ventaData.detalles || []
          dets.forEach((detalle) => {
            if (detalle.activo !== 0) {
              totalIngresos += Number(detalle.total || 0)
            }
          })
        })

        const totalDevoluciones = detallesDev.reduce((sum, devolucion) => {
          const fechaReferencia =
            devolucion.fecha_devolucion ||
            devolucion.updatedAt ||
            devolucion.createdAt ||
            devolucion.venta?.fecha

          if (!fechaReferencia) {
            return sum
          }

          const fecha = new Date(fechaReferencia)
          if (Number.isNaN(fecha.getTime())) {
            return sum
          }

          if (fecha >= inicioDia && fecha < finDia) {
            return sum + Number(devolucion.total || 0)
          }

          return sum
        }, 0)

        if (!isMounted) return

        if (totalIngresos === 0 && totalDevoluciones === 0) {
          setData([])
        } else {
          setData([
            { label: 'Ingresos', value: totalIngresos, color: '#3b82f6' },
            { label: 'Devoluciones', value: totalDevoluciones, color: '#ef4444' },
          ])
        }
        setError(null)
      } catch (err) {
        console.error(err)
        if (!isMounted) return
        setError('No se pudo cargar la información de ingresos y devoluciones.')
        setData([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg text-orange-600">Ingresos vs. devoluciones</CardTitle>
        <CardDescription>Los datos mostrados corresponden al día en curso.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando información...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center">{error}</p>
        ) : data.length > 0 ? (
          <SimplePieChart data={data} />
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            No hay datos registrados para el día de hoy.
          </p>
        )}
      </CardContent>
    </Card>
  )
}