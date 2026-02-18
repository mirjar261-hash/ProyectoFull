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
  nombre: string
  costo: number
  precio1: number
  precio2: number
  precio3: number
  precio4: number
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
      const data = (res.data?.productos as Producto[]) || []
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
        Nombre: p.nombre,
        Costo: p.costo,
        'Precio público': p.precio1,
        'Precio con descuento': p.precio2,
        'Precio semimayoreo': p.precio3,
        'Precio mayoreo': p.precio4,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario costos')
    XLSX.writeFile(workbook, 'reporte_inventario_costos.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Nombre', 'Costo', 'Precio público', 'Precio con descuento', 'Precio semimayoreo', 'Precio mayoreo']],
      body: productos.map(p => [
        p.nombre,
        p.costo.toString(),
        p.precio1.toString(),
        p.precio2.toString(),
        p.precio3.toString(),
        p.precio4.toString(),
      ])
    })
    doc.save('reporte_inventario_costos.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Inventario con Costos</h1>
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
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Costo</TableHead>
              <TableHead className="text-center">Precio público</TableHead>
              <TableHead className="text-center">Precio con descuento</TableHead>
              <TableHead className="text-center">Precio semimayoreo</TableHead>
              <TableHead className="text-center">Precio mayoreo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map(p => (
              <TableRow key={p.id} className="hover:bg-orange-50">
                <TableCell>{p.nombre}</TableCell>
                <TableCell className="text-center">{p.costo}</TableCell>
                <TableCell className="text-center">{p.precio1}</TableCell>
                <TableCell className="text-center">{p.precio2}</TableCell>
                <TableCell className="text-center">{p.precio3}</TableCell>
                <TableCell className="text-center">{p.precio4}</TableCell>
              </TableRow>
            ))}
            {productos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
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
