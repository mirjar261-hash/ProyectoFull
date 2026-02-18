'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table'

interface Actividad {
  id: number
  titulo: string
  descripcion: string
  fecha_calendario: string
}

// --- Helpers: preservar hora de pared ---
const RX_WALL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/

// Convierte cualquier string tipo "YYYY-MM-DDTHH:mm[:ss][...]" a Date local sin aplicar zona.
function parseWallTimeString(s: string): Date {
  const m = s.match(RX_WALL)
  if (!m) return new Date(s) // fallback
  const [, y, mo, d, hh, mi, ss] = m
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mi),
    ss ? Number(ss) : 0
  )
}

// Formato MX, pero usando el Date construido con hora de pared (sin desplazamientos)
function formatFechaHoraMX(d: Date) {
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function UpcomingAgenda() {
  const [items, setItems] = useState<Actividad[]>([])
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const res = await axios.get(`${apiUrl}/actividad/usuario/proximas`, { headers })

        const hoy: Actividad[] = res.data?.hoy || []
        const semana: Actividad[] = res.data?.semanaProxima || []

        // Ordena por la "hora de pared" sin aplicar zonas
        const all = [...hoy, ...semana].sort(
          (a, b) =>
            parseWallTimeString(a.fecha_calendario).getTime() -
            parseWallTimeString(b.fecha_calendario).getTime()
        )

        setItems(all)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) return null

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-lg">Agenda próxima</h2>
      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const wall = parseWallTimeString(it.fecha_calendario)
              return (
                <TableRow key={it.id} className="hover:bg-orange-50">
                  <TableCell>{formatFechaHoraMX(wall)}</TableCell>
                  <TableCell>{it.titulo}</TableCell>
                  <TableCell>{it.descripcion}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
