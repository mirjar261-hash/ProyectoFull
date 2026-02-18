'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from '@/components/ui/dialog'
import { Download, Eye, ArrowLeftRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { formatFecha } from '@/lib/date'

interface Venta {
  id: number
  numdoc: string
  cliente?: { razon_social: string } | null
  numitems: number
  estado: string
  fecha: string
  subtotal: number
  iva: number
  total: number
  tarjeta?: number
  transferencia?: number
}

interface DetalleVenta {
  id: number
  producto?: { nombre: string }
  cantidad: number
  total: number
  fecha_devolucion?: string | null
}

export default function ReporteVentasBancosPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [detalles, setDetalles] = useState<DetalleVenta[]>([])
  const [modalDetallesOpen, setModalDetallesOpen] = useState(false)
  const [ventaDetalleId, setVentaDetalleId] = useState<number | null>(null)

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

  const cargarVentas = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/venta?sucursalId=${sucursalIdSession}&fechaInicio=${
          fechaInicio + "T00:00:00.000Z"
        }&fechaFin=${fechaFin + "T23:59:59.999"}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = res.data as Venta[]
      const filtradas = data.filter(
        v => Number(v.tarjeta) > 0 || Number(v.transferencia) > 0
      )
      filtradas.sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      )
      setVentas(filtradas)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar ventas')
    }
  }

  const cargarDetalles = async (id: number) => {
    try {
      const res = await axios.get(`${apiUrl}/venta/${id}`,
        { headers: { Authorization: `Bearer ${token}` } })
      const dets = (res.data.detalles || []) as DetalleVenta[]
      setDetalles(dets.filter(d => !d.fecha_devolucion))
      setVentaDetalleId(id)
      setModalDetallesOpen(true)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar detalles')
    }
  }

  const devolverDetalle = async (id: number) => {
    const confirmar = window.confirm('¿Está seguro de devolver este detalle?')
    if (!confirmar) return
    try {
      await axios.post(
        `${apiUrl}/detalle-venta/${id}/devolucion`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Detalle devuelto')
      if (ventaDetalleId) cargarDetalles(ventaDetalleId)
      cargarVentas()
    } catch (err) {
      console.error(err)
      toast.error('Error al devolver detalle')
    }
  }

  useEffect(() => {
    cargarVentas()
  }, [fechaInicio, fechaFin])

  const totalBancos = ventas.reduce(
    (sum, v) => sum + Number(v.tarjeta || 0) + Number(v.transferencia || 0),
    0
  )

  const exportarExcel = async () => {
    const workbook = XLSX.utils.book_new()

    const worksheetVentas = XLSX.utils.json_to_sheet(
      ventas.map(v => ({
        Folio: v.numdoc,
        Cliente: v.cliente?.razon_social || 'Sin cliente',
        Items: v.numitems,
        Estado: v.estado,
        Subtotal: v.subtotal,
        IVA: v.iva,
        Total: v.total,
        Tarjeta: v.tarjeta || 0,
        Transferencia: v.transferencia || 0,
        Fecha: formatFecha(v.fecha)
      }))
    )
    XLSX.utils.book_append_sheet(workbook, worksheetVentas, 'Ventas')

    const detalleRows: any[] = []
    for (const v of ventas) {
      try {
        const res = await axios.get(`${apiUrl}/venta/${v.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const dets: DetalleVenta[] = res.data.detalles || []
        dets.forEach(d => {
          detalleRows.push({
            Folio: v.numdoc,
            Producto: d.producto?.nombre,
            Cantidad: d.cantidad,
            Total: d.total
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

    XLSX.writeFile(workbook, 'reporte_ventas_bancos.xlsx')
  }

  const exportarPDF = async () => {
    const doc = new jsPDF()
    let currentY = 10

    for (const v of ventas) {
      autoTable(doc, {
        startY: currentY,
        head: [['Folio', 'Cliente', 'Items', 'Estado', 'Subtotal', 'IVA', 'Total', 'Tarjeta', 'Transferencia', 'Fecha']],
        body: [[
          v.numdoc,
          v.cliente?.razon_social || 'Sin cliente',
          v.numitems.toString(),
          v.estado,
          v.subtotal.toFixed(2),
          v.iva.toFixed(2),
          v.total.toFixed(2),
          (v.tarjeta || 0).toFixed(2),
          (v.transferencia || 0).toFixed(2),
          formatFecha(v.fecha)
        ]]
      })

      currentY = (doc as any).lastAutoTable?.finalY || currentY

      try {
        const res = await axios.get(`${apiUrl}/venta/${v.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const dets: DetalleVenta[] = res.data.detalles || []
        if (dets.length) {
          currentY += 4
          autoTable(doc, {
            startY: currentY + 4,
            head: [['Producto', 'Cantidad', 'Total']],
            body: dets.map(d => [
              d.producto?.nombre || '',
              d.cantidad.toString(),
              d.total.toFixed(2)
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

    doc.text(`Total bancos: $${totalBancos.toFixed(2)}`, 14, currentY)
    doc.save('reporte_ventas_bancos.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Ventas tarjeta/transferencia</h1>
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
              <TableHead>Cliente</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Tarjeta</TableHead>
              <TableHead className="text-right">Transferencia</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map(v => (
              <TableRow key={v.id} className="hover:bg-orange-50">
                <TableCell>{v.numdoc}</TableCell>
                <TableCell>{v.cliente?.razon_social || 'Sin cliente'}</TableCell>
                <TableCell className="text-center">{v.numitems}</TableCell>
                <TableCell>{v.estado}</TableCell>
                <TableCell>{formatFecha(v.fecha)}</TableCell>
                <TableCell className="text-right">${Number(v.subtotal).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.iva).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.total).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.tarjeta || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(v.transferencia || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => cargarDetalles(v.id)}>
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-right font-semibold">Total bancos: ${totalBancos.toFixed(2)}</div>

      <Dialog open={modalDetallesOpen} onOpenChange={setModalDetallesOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Detalles de venta</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-80 rounded border bg-white">
            <Table>
              <TableHeader className="bg-orange-100">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Dev.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.producto?.nombre}</TableCell>
                    <TableCell className="text-center">{d.cantidad}</TableCell>
                    <TableCell className="text-right">${Number(d.total).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => devolverDetalle(d.id)}>
                        <ArrowLeftRight size={14} />
                      </Button>
                    </TableCell>
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