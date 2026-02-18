'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { formatFecha } from '@/lib/date'

interface Inversion {
  id: number
  descripcion: string
  monto: number
  fecha: string
  usuario?: { nombre: string; apellidos?: string }
}

export default function ReporteInversionesPage() {
  const [inversiones, setInversiones] = useState<Inversion[]>([])

  const today = new Date()
  const monday = new Date(today)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const [fechaInicio, setFechaInicio] = useState(monday.toISOString().substring(0, 10))
  const [fechaFin, setFechaFin] = useState(sunday.toISOString().substring(0, 10))

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const cargarInversiones = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/inversion?sucursalId=${sucursalIdSession}&fechaInicio=${fechaInicio+"T00:00:00.000Z"}&fechaFin=${fechaFin+"T23:59:59.999"}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data as Inversion[]
      data.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setInversiones(data)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar inversiones')
    }
  }

  useEffect(() => {
    cargarInversiones()
  }, [fechaInicio, fechaFin])

  const total = inversiones.reduce((sum, i) => sum + Number(i.monto), 0)

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      inversiones.map(i => ({
        Monto: i.monto,
        Usuario: i.usuario ? `${i.usuario.nombre} ${i.usuario.apellidos || ''}` : 'Sin usuario',
        Descripcion: i.descripcion,
        Fecha: formatFecha(i.fecha)
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inversiones')
    XLSX.writeFile(workbook, 'reporte_inversiones.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Monto', 'Usuario', 'Descripción', 'Fecha']],
      body: inversiones.map(i => [
        Number(i.monto).toFixed(2),
        i.usuario ? `${i.usuario.nombre} ${i.usuario.apellidos || ''}` : 'Sin usuario',
        i.descripcion,
        formatFecha(i.fecha)
      ])
    })
    const finalY = (doc as any).lastAutoTable?.finalY || 10
    doc.text(`Total: $${total.toFixed(2)}`, 14, finalY + 10)
    doc.save('reporte_inversiones.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Inversiones</h1>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} className="flex items-center gap-2">
            <Download size={16} /> Excel
          </Button>
          <Button onClick={exportarPDF} className="flex items-center gap-2">
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </div>
      </div>

      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inversiones.map(i => (
              <TableRow key={i.id} className="hover:bg-orange-50">
                <TableCell className="text-right">${Number(i.monto).toFixed(2)}</TableCell>
                <TableCell>
                  {i.usuario ? `${i.usuario.nombre} ${i.usuario.apellidos || ''}` : 'Sin usuario'}
                </TableCell>
                <TableCell>{i.descripcion}</TableCell>
                <TableCell>{formatFecha(i.fecha)}</TableCell>
              </TableRow>
            ))}
            {inversiones.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-right font-semibold">
        Total: ${total.toFixed(2)}
      </div>
    </div>
  )
}
