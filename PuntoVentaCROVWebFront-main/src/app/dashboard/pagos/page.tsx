'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table'
import { formatFecha } from '@/lib/date'

const esRespuestaHistorialPlan = (valor: unknown): valor is { historialPlan?: unknown } => {
  return typeof valor === 'object' && valor !== null && 'historialPlan' in valor
}

const obtenerHistorialPlanDesdeRespuesta = (valor: unknown) => {
  if (esRespuestaHistorialPlan(valor) && valor.historialPlan !== undefined) {
    return valor.historialPlan
  }
  return valor
}

const obtenerMensajeDeError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (data && typeof data === 'object') {
      const posibleData = data as Record<string, unknown>
      const mensaje = posibleData.mensaje
      const errorMensaje = posibleData.error

      if (typeof mensaje === 'string' && mensaje.trim()) {
        return mensaje
      }
      if (typeof errorMensaje === 'string' && errorMensaje.trim()) {
        return errorMensaje
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message
    }
  }

  return fallback
}

interface Pago {
  amount: number
  currency: string
  created: string
  status: string
}

interface Plan {
  token: string
  precio: string
  precioNumero: number
  descripcion: string
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [vencimientoStr, setVencimientoStr] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [empresaToken, setEmpresaToken] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [desactivandoPlan, setDesactivandoPlan] = useState(false)
  const [mostrarConfirmacionCancelacion, setMostrarConfirmacionCancelacion] = useState(false)
  const [estatusEmpresa, setEstatusEmpresa] = useState<string | null>(null)
  const [planPendiente, setPlanPendiente] = useState<string | null>(null)
  const [planEnProceso, setPlanEnProceso] = useState<string | null>(null)
  const [mostrarConfirmacionCambio, setMostrarConfirmacionCambio] = useState(false)
  const [cambiandoPlan, setCambiandoPlan] = useState(false)
  const [validandoCambioPlan, setValidandoCambioPlan] = useState(false)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const planes: Plan[] = [
    { token: 'Demo', precio: '$0', precioNumero: 0, descripcion: '30 días gratis' },
    { token: 'Negocios', precio: '$299', precioNumero: 299, descripcion: 'Ideal para negocios' },
    {
      token: 'Inteligente',
      precio: '$499',
      precioNumero: 499,
      descripcion: 'Con inteligencia artificial'
    }
  ]

  const obtenerDatosPlan = (tokenPlan: string | null | undefined) => {
    if (!tokenPlan) return null
    return planes.find(plan => plan.token === tokenPlan) ?? null
  }

  const existeCambioEnMesActual = (registro: unknown, referencia: Date): boolean => {
    if (!registro) {
      return false
    }
    if (Array.isArray(registro)) {
      return registro.some(item => existeCambioEnMesActual(item, referencia))
    }
    if (typeof registro !== 'object') {
      return false
    }

    const posibleRegistro = registro as Record<string, unknown>
    const clavesFecha = ['fecha', 'fecha_cambio', 'fechaCambio', 'createdAt', 'created_at']
    const claveConFecha = clavesFecha.find(
      key => typeof posibleRegistro[key] === 'string' && posibleRegistro[key]
    )

    if (!claveConFecha) {
      return Object.keys(posibleRegistro).length > 0
    }

    const valorFecha = posibleRegistro[claveConFecha] as string
    const fechaRegistro = new Date(valorFecha)
    if (Number.isNaN(fechaRegistro.getTime())) {
      return true
    }

    return (
      fechaRegistro.getFullYear() === referencia.getFullYear() &&
      fechaRegistro.getMonth() === referencia.getMonth()
    )
  }

  const seleccionarPlan = async (plan: string) => {
    if (cambiandoPlan || validandoCambioPlan) return
    if (!empresaId) return
    if (plan === 'Demo' && empresaToken !== 'Demo') return
    const planSeleccionado = obtenerDatosPlan(plan)
    if (!planSeleccionado) {
      toast.error('No se encontró la información del plan seleccionado. Intenta nuevamente.')
      return
    }
    const empresaActiva = obtenerEstatusEmpresa()

    if (plan === empresaToken) {
      if (!empresaActiva) {
        void reactivarPlan(plan)
      }
      return
    }

    if (!token) {
      toast.error('No se encontró el token de autenticación. Inicia sesión nuevamente para continuar.')
      return
    }

    const fechaConsulta = new Date()
    let permitirCambio = true

    try {
      setValidandoCambioPlan(true)
      setPlanEnProceso(plan)
      const { data } = await axios.get(`${apiUrl}/historial-planes/ultimo`, {
        params: {
          empresaId,
          fecha: fechaConsulta.toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      })

      const historialPlan = obtenerHistorialPlanDesdeRespuesta(data)

      if (existeCambioEnMesActual(historialPlan, fechaConsulta)) {
        const planActual = obtenerDatosPlan(empresaToken)

        if (!planActual) {
          permitirCambio = false
          toast.error(
            'No se pudo determinar el costo del plan actual. Intenta nuevamente más tarde.'
          )
        } else if (planSeleccionado.precioNumero > planActual.precioNumero) {
          permitirCambio = true
        } else {
          permitirCambio = false
          toast.error(
            'Ya realizaste un cambio de plan este mes. Solo puedes solicitar otro cambio a un plan superior al actual .'
          )
        }
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // No hay registro en el mes actual, se permite el cambio
      } else {
        permitirCambio = false
        const message = obtenerMensajeDeError(
          error,
          'Error al validar el historial de cambios de plan'
        )
        toast.error(message)
      }
    } finally {
      setValidandoCambioPlan(false)
      setPlanEnProceso(null)
    }

    if (!permitirCambio) return

    setPlanPendiente(plan)
    setMostrarConfirmacionCambio(true)
  }

  const cargarPagos = async (t: string, empId: number) => {
    try {

      const res = await axios.get(`${apiUrl}/payments?empresaId=${empId}`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      setPagos(res.data)
    } catch (err) {
      const message = (err as any)?.response?.data?.error || 'Error al obtener pagos'
      toast.error(message)
    }
  }

  const cancelarSuscripcion = async () => {
    if (!empresaId || !token) {
      toast.error('No se encontró la información de la empresa')
      return
    }
    try {
      setDesactivandoPlan(true)
      await axios.put(
        `${apiUrl}/empresa/${empresaId}/desactivar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Empresa desactivada correctamente')
      localStorage.setItem('estatusEmpresa', 'INACTIVA')
      setEstatusEmpresa('INACTIVA')
      window.location.reload()
    } catch (error) {
      const message = (error as any)?.response?.data?.error || 'Error al desactivar la empresa'
      toast.error(message)
    } finally {
      setDesactivandoPlan(false)
    }
  }

  const confirmarCancelacion = async () => {
    setMostrarConfirmacionCancelacion(false)
    await cancelarSuscripcion()
  }

  const obtenerEstatusEmpresa = () => {
    const normalized = (estatusEmpresa ?? '').toString().trim().toLowerCase()
    if (!normalized) return true
    if ([
      'inactiva',
      'inactivo',
      'inactive',
      'desactivada',
      'desactivado',
      '0',
      'false'
    ].includes(normalized)) {
      return false
    }
    return true
  }

  const reactivarPlan = async (plan: string) => {
    if (!empresaId || !token) {
      toast.error('No se encontró la información de la empresa')
      return
    }
    try {
      setCambiandoPlan(true)
      setPlanEnProceso(plan)
      await axios.put(
        `${apiUrl}/empresa/${empresaId}/activar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Plan reactivado correctamente')
      localStorage.setItem('estatusEmpresa', 'ACTIVA')
      setEstatusEmpresa('ACTIVA')
    } catch (error) {
      const message = (error as any)?.response?.data?.error || 'Error al reactivar el plan'
      toast.error(message)
    } finally {
      setCambiandoPlan(false)
      setPlanEnProceso(null)
    }
  }

  const confirmarCambioPlan = async () => {
    if (!planPendiente) return
    if (!empresaId || !token) {
      toast.error('No se encontró la información de la empresa')
      return
    }
    try {
      setCambiandoPlan(true)
      setPlanEnProceso(planPendiente)
      await axios.post(
        `${apiUrl}/historial-planes`,
        {
          empresaId,
          id_empresa: empresaId,
          tokenPlan: planPendiente,
          fecha: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await axios.put(
        `${apiUrl}/empresa/${empresaId}/plan`,
        { token: planPendiente },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await axios.put(
        `${apiUrl}/empresa/${empresaId}/activar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      localStorage.setItem('empresaToken', planPendiente)
      localStorage.setItem('estatusEmpresa', 'ACTIVA')
      setEmpresaToken(planPendiente)
      setEstatusEmpresa('ACTIVA')
      toast.success('Plan actualizado correctamente')
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error || 'Error al cambiar el plan de la empresa'
      toast.error(message)
    } finally {
      setCambiandoPlan(false)
      setPlanEnProceso(null)
      setMostrarConfirmacionCambio(false)
      setPlanPendiente(null)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    setToken(localStorage.getItem('token'))
    setEmpresaToken(localStorage.getItem('empresaToken'))
    const id = localStorage.getItem('empresaId')
    setEmpresaId(id ? Number(id) : null)
    const estatus = localStorage.getItem('estatusEmpresa')
    setEstatusEmpresa(estatus)
    const vencimiento = localStorage.getItem('fechaVencimientoEmpresa')
    if (vencimiento) {
      const fecha = new Date(vencimiento)
      setVencimientoStr(fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
    }
  }, [])

  useEffect(() => {
    if (token && empresaId) {
      cargarPagos(token, empresaId)
    }
  }, [token, empresaId])

  const empresaActiva = obtenerEstatusEmpresa()

  const pagosFiltrados = pagos.filter(p =>
    (p.status || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-orange-600">Membresía y pagos</h1>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-orange-600">Fecha de fin de la suscripción: {vencimientoStr}</h1>
        <Button
          onClick={() => setMostrarConfirmacionCancelacion(true)}
          className="bg-red-500 hover:bg-red-600 text-white"
          disabled={desactivandoPlan || !empresaActiva}
        >
          {empresaActiva
            ? desactivandoPlan
              ? 'Cancelando...'
              : 'Cancelar plan'
            : 'Plan actual desactivado'}
        </Button>
      </div>
      {!empresaActiva && (
        <p className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
          El plan actual está desactivado, seleccione el plan actual para habilitarlo de nuevo o alguno de los
          demás disponibles
        </p>
      )}
      <Dialog
        open={mostrarConfirmacionCancelacion}
        onOpenChange={setMostrarConfirmacionCancelacion}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar plan</DialogTitle>
            <DialogDescription>
              Al continuar se cancelará tu plan actual y se detendrá el cobro automático de renovación. ¿Deseas
              continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">Mantener plan</Button>
            </DialogClose>
            <Button
              onClick={confirmarCancelacion}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={desactivandoPlan}
            >
              {desactivandoPlan ? 'Cancelando...' : 'Sí, cancelar plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={mostrarConfirmacionCambio}
        onOpenChange={open => {
          if (!open && !cambiandoPlan) {
            setPlanPendiente(null)
          }
          setMostrarConfirmacionCambio(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
            <DialogDescription>
              Solo puedes hacer un cambio de plan por mes, a menos que el nuevo plan tenga un costo mayor.
              Confirma que deseas continuar con el cambio seleccionado.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Se actualizará el plan de la empresa al plan{' '}
            <span className="font-semibold text-orange-600">{planPendiente}</span>.
          </p>
          <DialogFooter className="sm:justify-end">
            <DialogClose
              asChild
              onClick={() => {
                if (!cambiandoPlan) {
                  setPlanPendiente(null)
                }
              }}
            >
              <Button variant="outline" disabled={cambiandoPlan}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={() => void confirmarCambioPlan()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={cambiandoPlan}
            >
              {cambiandoPlan ? 'Procesando...' : 'Cambiar plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planes.map(p => {
              const actual = p.token === empresaToken
              const disable = p.token === 'Demo' && empresaToken !== 'Demo'
              const isPlanEnProceso = planEnProceso === p.token
              const buttonDisabled =
                disable || cambiandoPlan || validandoCambioPlan || (actual && empresaActiva)
              let buttonLabel = actual
                ? empresaActiva
                  ? 'Actual'
                  : 'Reactivar plan'
                : 'Seleccionar'

              if (isPlanEnProceso) {
                if (cambiandoPlan) {
                  buttonLabel = 'Procesando...'
                } else if (validandoCambioPlan) {
                  buttonLabel = 'Validando...'
                }
              }
              return (
                <TableRow key={p.token} className={actual ? 'bg-orange-50' : ''}>
                  <TableCell className={actual ? 'text-orange-600 font-bold' : ''}>{p.token}</TableCell>
                  <TableCell>{p.precio}</TableCell>
                  <TableCell>{p.descripcion}</TableCell>
                  <TableCell>
                    <Button
                      disabled={buttonDisabled}
                      onClick={() => void seleccionarPlan(p.token)}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {buttonLabel}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Input
        placeholder="Buscar..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-auto rounded border bg-white shadow">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Monto pagado</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagosFiltrados.map((p, i) => (
              <TableRow key={`${p.created}-${i}`} className="hover:bg-orange-50">
                <TableCell>${(p.amount).toFixed(2)}</TableCell>
                <TableCell>{p.currency.toUpperCase()}</TableCell>
                <TableCell>{formatFecha(p.created)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
