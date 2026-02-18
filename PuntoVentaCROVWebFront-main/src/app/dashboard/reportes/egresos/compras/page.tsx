'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from '@/components/ui/dialog'
import { Download, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { formatFecha } from '@/lib/date'

interface Compra {
  id: number
  numdoc: string
  proveedor?: { razon_social: string } | null
  numitems: number
  estado: string
  fecha: string
  subtotal: number
  iva: number
  total: number
}

interface DetalleCompra {
  producto?: { nombre: string }
  cantidad: number
  importe: number
}

export default function ReporteComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [detalles, setDetalles] = useState<DetalleCompra[]>([])
  const [modalDetallesOpen, setModalDetallesOpen] = useState(false)

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

  const cargarCompras = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/compra?sucursalId=${sucursalIdSession}&fechaInicio=${fechaInicio+"T00:00:00.000Z"}&fechaFin=${fechaFin+"T23:59:59.999"}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data as Compra[]
      data.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setCompras(data)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar compras')
    }
  }

  const cargarDetalles = async (id: number) => {
    try {
      const res = await axios.get(`${apiUrl}/compra/${id}`,
        { headers: { Authorization: `Bearer ${token}` } })
      setDetalles(res.data.detalles || [])
      setModalDetallesOpen(true)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar detalles')
    }
  }

  useEffect(() => {
    cargarCompras()
  }, [fechaInicio, fechaFin])

  const total = compras.reduce((sum, v) => sum + Number(v.total), 0)

  const exportarExcel = async () => {
    const workbook = XLSX.utils.book_new()

    const worksheetCompras = XLSX.utils.json_to_sheet(
      compras.map(v => ({
        Folio: v.numdoc,
        Proveedor: v.proveedor?.razon_social || 'Sin proveedor',
        Items: v.numitems,
        Estado: v.estado,
        Subtotal: v.subtotal,
        IVA: v.iva,
        Total: v.total,
        Fecha: formatFecha(v.fecha)
      }))
    )
    XLSX.utils.book_append_sheet(workbook, worksheetCompras, 'Compras')

    const detalleRows: any[] = []
    for (const v of compras) {
      try {
        const res = await axios.get(`${apiUrl}/compra/${v.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const dets: DetalleCompra[] = res.data.detalles || []
        dets.forEach(d => {
          detalleRows.push({
            Folio: v.numdoc,
            Producto: d.producto?.nombre,
            Cantidad: d.cantidad,
            Total: d.importe
          })
        })
      } catch (err) {
        console.error(err)
      }
    }

    if (detalleRows.length) {
      const worksheetDetalles = XLSX.utils.json_to_sheet(detalleRows)
      XLSX.utils.book_append_sheet(workbook, worksheetDetalles, 'Detalles')
    }

    XLSX.writeFile(workbook, 'reporte_compras.xlsx')
  }

  const exportarPDF = async () => {
    const doc = new jsPDF()
    let currentY = 10

    for (const v of compras) {
      autoTable(doc, {
        startY: currentY,
        head: [['Folio', 'Proveedor', 'Items', 'Estado', 'Subtotal', 'IVA', 'Total', 'Fecha']],
        body: [[
          v.numdoc,
          v.proveedor?.razon_social || 'Sin proveedor',
          v.numitems.toString(),
          v.estado,
          v.subtotal.toFixed(2),
          v.iva.toFixed(2),
          v.total.toFixed(2),
          formatFecha(v.fecha)
        ]]
      })

      currentY = (doc as any).lastAutoTable?.finalY || currentY

      try {
        const res = await axios.get(`${apiUrl}/compra/${v.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const dets: DetalleCompra[] = res.data.detalles || []
        if (dets.length) {
          currentY += 4
          autoTable(doc, {
            startY: currentY + 4,
            head: [['Producto', 'Cantidad', 'Total']],
            body: dets.map(d => [
              d.producto?.nombre || '',
              d.cantidad.toString(),
              d.importe.toFixed(2)
            ]),
              headStyles: {
                fillColor: [255, 255, 255], // azul super claro (RGB)
                textColor: 0,               // texto negro
                halign: 'center'
              },
              styles: {
                halign: 'left'
              }
          })
          currentY = (doc as any).lastAutoTable.finalY || currentY
        }
      } catch (err) {
        console.error(err)
      }

      currentY += 10
    }

    doc.text(`Total: $${total.toFixed(2)}`, 14, currentY)
    doc.save('reporte_compras.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Reporte de Compras</h1>
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
              <TableHead>Folio</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map(v => (
              <TableRow key={v.id} className="hover:bg-orange-50">
                <TableCell>{v.numdoc}</TableCell>
                <TableCell>{v.proveedor?.razon_social || 'Sin proveedor'}</TableCell>
                <TableCell className="text-center">{v.numitems}</TableCell>
                <TableCell>{v.estado}</TableCell>
                <TableCell>{formatFecha(v.fecha)}</TableCell>
                <TableCell className="text-right">${Number(v.subtotal).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.iva).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.total).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => cargarDetalles(v.id)}>
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {compras.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-right font-semibold">Total: ${total.toFixed(2)}</div>

      <Dialog open={modalDetallesOpen} onOpenChange={setModalDetallesOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Detalles de compra</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-80 rounded border bg-white">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{d.producto?.nombre}</TableCell>
                    <TableCell className="text-center">{d.cantidad}</TableCell>
                    <TableCell className="text-right">${Number(d.importe).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
