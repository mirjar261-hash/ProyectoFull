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

interface Retiro {
  id: number
  descripcion: string
  monto: number
  fecha: string
  usuarioRetiro?: { nombre: string; apellidos?: string }
}

export default function ReporteRetirosPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([])

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

  const cargarRetiros = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/retiro?sucursalId=${sucursalIdSession}&fechaInicio=${fechaInicio+"T00:00:00.000Z"}&fechaFin=${fechaFin+"T23:59:59.999"}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data as Retiro[]
      data.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setRetiros(data)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar retiros')
    }
  }

  useEffect(() => {
    cargarRetiros()
  }, [fechaInicio, fechaFin])

  const total = retiros.reduce((sum, g) => sum + g.monto, 0)

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      retiros.map(g => ({
        Monto: g.monto,
        Descripción: g.descripcion,
        Usuario: g.usuarioRetiro ? `${g.usuarioRetiro.nombre} ${g.usuarioRetiro.apellidos || ''}` : 'Sin usuario',
        Fecha: formatFecha(g.fecha)

      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Retiros')
    XLSX.writeFile(workbook, 'reporte_retiros.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Descripción', 'Monto', 'Fecha', 'Usuario']],
      body: retiros.map(g => [
        g.descripcion,
        g.monto.toFixed(2),
        formatFecha(g.fecha),
        g.usuarioRetiro ? `${g.usuarioRetiro.nombre} ${g.usuarioRetiro.apellidos || ''}` : 'Sin usuario'
      ])
    })
    const finalY = (doc as any).lastAutoTable?.finalY || 10;
    doc.text(`Total: $${total.toFixed(2)}`, 14, finalY + 10);
    doc.save('reporte_retiros.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Retiros</h1>
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
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retiros.map(g => (
              <TableRow key={g.id} className="hover:bg-orange-50">
                <TableCell className="text-right">${g.monto.toFixed(2)}</TableCell>
                <TableCell>{g.descripcion}</TableCell>
                <TableCell>{formatFecha(g.fecha)}</TableCell>
                <TableCell>
                  {g.usuarioRetiro ? `${g.usuarioRetiro.nombre} ${g.usuarioRetiro.apellidos || ''}` : 'Sin usuario'}
                </TableCell>
              </TableRow>
            ))}
            {retiros.length === 0 && (
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
