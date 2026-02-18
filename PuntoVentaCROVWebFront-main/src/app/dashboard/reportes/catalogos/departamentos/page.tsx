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

interface Departamento {
  id: number
  nombre: string
}

export default function ReporteDepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [busqueda, setBusqueda] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const cargarDepartamentos = async () => {
    try {
      const res = await axios.get(`${apiUrl}/departamento?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (res.data || []) as Departamento[]
      data.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setDepartamentos(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar departamentos')
    }
  }

  useEffect(() => {
    cargarDepartamentos()
  }, [])

  const departamentosFiltrados = departamentos.filter(d =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      departamentosFiltrados.map(d => ({ Nombre: d.nombre }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Departamentos')
    XLSX.writeFile(workbook, 'reporte_departamentos.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Nombre']],
      body: departamentosFiltrados.map(d => [d.nombre])
    })
    doc.save('reporte_departamentos.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Departamentos</h1>
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
        placeholder="Buscar departamento"
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
            {departamentosFiltrados.map(d => (
              <TableRow key={d.id} className="hover:bg-orange-50">
                <TableCell>{d.nombre}</TableCell>
              </TableRow>
            ))}
            {departamentosFiltrados.length === 0 && (
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

