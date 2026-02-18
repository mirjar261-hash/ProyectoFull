'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'

interface Producto {
  id: string
  cod_barras: string
  nombre: string
  stock_min: number
  cantidad_existencia: number
  clase?: { nombre: string } | null
}

export default function ReporteInventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const cargarProductos = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/producto/productosPaginacion?pagina=1&limite=1000&sucursalId=${sucursalIdSession}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data?.productos as Producto[] || []
      data.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setProductos(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar inventario')
    }
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      productos.map(p => ({
        'Código de barras': p.cod_barras,
        Nombre: p.nombre,
        Departamento: p.clase?.nombre || 'Sin departamento',
        'Inventario mínimo': p.stock_min,
        Cantidad: p.cantidad_existencia
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario')
    XLSX.writeFile(workbook, 'reporte_inventario.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Código de barras', 'Nombre', 'Departamento', 'Inventario mínimo', 'Cantidad']],
      body: productos.map(p => [
        p.cod_barras,
        p.nombre,
        p.clase?.nombre || 'Sin departamento',
        p.stock_min,
        p.cantidad_existencia.toString()
      ])
    })
    doc.save('reporte_inventario.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Inventario</h1>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} className="flex items-center gap-2">
            <Download size={16} /> Excel
          </Button>
          <Button onClick={exportarPDF} className="flex items-center gap-2">
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Código de barras</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-center">Inventario mínimo</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map(p => (
              <TableRow key={p.id} className="hover:bg-orange-50">
                <TableCell>{p.cod_barras}</TableCell>
                <TableCell>{p.nombre}</TableCell>
                <TableCell>{p.clase?.nombre || 'Sin departamento'}</TableCell>
                <TableCell className="text-center">{p.stock_min}</TableCell>
                <TableCell className="text-center">{p.cantidad_existencia}</TableCell>
              </TableRow>
            ))}
            {productos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
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
