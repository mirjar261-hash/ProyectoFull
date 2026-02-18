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

interface Cliente {
  id: number
  razon_social: string
  telefono: string
  email: string
}

export default function ReporteClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const cargarClientes = async () => {
    try {
      const res = await axios.get(`${apiUrl}/cliente?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (res.data || []) as Cliente[]
      data.sort((a, b) => a.razon_social.localeCompare(b.razon_social))
      setClientes(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar clientes')
    }
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const clientesFiltrados = clientes.filter(c =>
    c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      clientesFiltrados.map(c => ({
        Nombre: c.razon_social,
        Teléfono: c.telefono,
        Email: c.email || ''
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')
    XLSX.writeFile(workbook, 'reporte_clientes.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Nombre', 'Teléfono', 'Email']],
      body: clientesFiltrados.map(c => [c.razon_social, c.telefono, c.email || ''])
    })
    doc.save('reporte_clientes.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Clientes</h1>
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
        placeholder="Buscar por nombre, teléfono o email"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientesFiltrados.map(c => (
              <TableRow key={c.id} className="hover:bg-orange-50">
                <TableCell>{c.razon_social}</TableCell>
                <TableCell>{c.telefono}</TableCell>
                <TableCell>{c.email}</TableCell>
              </TableRow>
            ))}
            {clientesFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
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

