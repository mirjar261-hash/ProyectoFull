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

interface Modelo {
  id: number
  nombre: string
}

export default function ReporteModelosPage() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [busqueda, setBusqueda] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const cargarModelos = async () => {
    try {
      const res = await axios.get(`${apiUrl}/modelo?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (res.data || []) as Modelo[]
      data.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setModelos(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar modelos')
    }
  }

  useEffect(() => {
    cargarModelos()
  }, [])

  const modelosFiltrados = modelos.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      modelosFiltrados.map(m => ({ Nombre: m.nombre }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelos')
    XLSX.writeFile(workbook, 'reporte_modelos.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Nombre']],
      body: modelosFiltrados.map(m => [m.nombre])
    })
    doc.save('reporte_modelos.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Modelos</h1>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} className="flex items-center gap-2">
            <Download size={16} /> Excel
          </Button>
          <Button onClick={exportarPDF} className="flex items-center gap-2">
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      <Input
        placeholder="Buscar modelo"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Nombre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelosFiltrados.map(m => (
              <TableRow key={m.id} className="hover:bg-orange-50">
                <TableCell>{m.nombre}</TableCell>
              </TableRow>
            ))}
            {modelosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={1} className="text-center py-4">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

