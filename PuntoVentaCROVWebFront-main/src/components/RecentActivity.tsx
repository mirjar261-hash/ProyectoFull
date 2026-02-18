'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table'
import { formatFecha } from '@/lib/date'

interface ActivityItem {
  id: number
  tipo: 'Venta' | 'Compra'
  folio: string
  total: number
  fecha: string
}

export default function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalId = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        // VENTAS (excluir devoluciones) :v 
        const ventasRes = await axios.get(
          `${apiUrl}/venta?sucursalId=${sucursalId}&fechaInicio=${startOfDay}&fechaFin=${endOfDay}`,
          { headers }
        )
        const ventas = (ventasRes.data || [])
          .filter((v: any) =>
            // Excluir si es devolución por cualquier indicador común xd
            !v?.fecha_devolucion && !v?.devolucion && v?.tipo !== 'Devolución'
          )
          .map((v: any) => ({
            id: v.id,
            tipo: 'Venta' as const,
            folio: v.numdoc,
            total: Number(v.total || 0),
            fecha: v.fecha,
          }))

        // COMPRAS 
        const comprasRes = await axios.get(
          `${apiUrl}/compra?sucursalId=${sucursalId}&fechaInicio=${startOfDay}&fechaFin=${endOfDay}`,
          { headers }
        )
        const compras = (comprasRes.data || [])
          .filter((c: any) => !c?.fecha_devolucion && !c?.devolucion && c?.tipo !== 'Devolución')
          .map((c: any) => ({
            id: c.id,
            tipo: 'Compra' as const,
            folio: c.numdoc,
            total: Number(c.total || 0),
            fecha: c.fecha,
          }))

        const all = [...ventas, ...compras].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
        setItems(all.slice(0, 5))
      } catch (err) {
        console.error(err)
      }
    }

    fetchData()
  }, [])

  if (!items.length) return null

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-lg">Actividad reciente</h2>
      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Folio</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={`${it.tipo}-${it.id}`} className="hover:bg-orange-50">
                <TableCell>{it.tipo}</TableCell>
                <TableCell>{it.folio}</TableCell>
                <TableCell className="text-right">${it.total.toFixed(2)}</TableCell>
                <TableCell>{formatFecha(it.fecha)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
