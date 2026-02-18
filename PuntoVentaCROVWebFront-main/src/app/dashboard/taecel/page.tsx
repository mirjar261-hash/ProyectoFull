'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

export default function CrearCuentaTaecelPage() {
  const [form, setForm] = useState({
    nombres: '',
    paterno: '',
    materno: '',
    celular: '',
    correo: '',
    correoDestino: '',
  })
  const [habilitarCorreo, setHabilitarCorreo] = useState(false)
  const [loading, setLoading] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
  const [existeCuenta, setExisteCuenta] = useState(false)

  const cargarPerfil = async () => {
    try {
      const res = await axios.get(`${apiUrl}/auth/perfil`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setForm(f => ({ ...f, correo: res.data.correo }))
    } catch (err) {
      console.error(err)
    }
  }

  const verificarCuenta = async () => {
    try {
      const res = await axios.get(`${apiUrl}/datos-cliente-taecel`, {
        params: { sucursalId: sucursalIdSession },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data && res.data.length > 0) {
        const usuario = res.data[0];
        setForm({
          nombres: '',
          paterno: '',
          materno: '',
          celular: usuario.phone || '',
          correo: usuario.email || '',
          correoDestino: '',
        });
        setExisteCuenta(true)
        return true
      }

    } catch (err) {
      console.error(err)
    }
    return false
  }

  useEffect(() => {
    const init = async () => {
      const existe = await verificarCuenta()
      if (!existe) {
        cargarPerfil()
      }
    }
    init()
  }, [])

  const limpiar = () => {
    setForm({ ...form, nombres: '', paterno: '', materno: '', celular: '', correoDestino: '' })
  }

  const crearCuenta = async () => {
    if (!form.nombres || !form.paterno || !form.materno || !form.celular) {
      toast.error('Completa todos los campos')
      return
    }
    try {
      setLoading(true)
      await axios.post(
        `${apiUrl}/datos-cliente-taecel`,
        {
          nombres: form.nombres,
          apellidos: `${form.paterno} ${form.materno}`,
          telefono: form.celular,
          correo: form.correo,
          sucursalId: sucursalIdSession,
          userId: userIdSession,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      toast.success('Solicitud realizada correctamente. Se enviarán las llaves de acceso al correo electrónico que definió en el registro')
      limpiar()
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.error || 'Error al realizar la solicitud'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-600">Crear cuenta Taecel</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombres</label>
            <Input value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })} disabled={existeCuenta} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apellido Paterno</label>
            <Input value={form.paterno} onChange={e => setForm({ ...form, paterno: e.target.value })} disabled={existeCuenta} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Apellido Materno</label>
            <Input value={form.materno} onChange={e => setForm({ ...form, materno: e.target.value })} disabled={existeCuenta} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Celular</label>
            <Input
              value={form.celular}
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm({ ...form, celular: value });
              }}
              maxLength={10}
              type="tel"
              disabled={existeCuenta}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium mb-1">Correo</label>
            <Input
              value={form.correo}
              onChange={e => setForm({ ...form, correo: e.target.value })}
              disabled={existeCuenta || !habilitarCorreo}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="habilitar"
                checked={habilitarCorreo}
                onCheckedChange={v => setHabilitarCorreo(Boolean(v))}
                disabled={existeCuenta}
              />
              <label htmlFor="habilitar" className="text-sm">Habilitar edición</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={limpiar} disabled={existeCuenta}>Limpiar</Button>
            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={crearCuenta}
              disabled={loading || existeCuenta}
            >
              Crear cuenta
            </Button>
          </div>
          <p className="text-xs text-gray-600 pt-2">
            Verifique que tenga acceso al correo definido ya que a este se mandarán los datos de acceso a su cuenta Taelcel.
          </p>
        </div>
        <div className="text-sm bg-white p-4 rounded border">
          <h2 className="text-center font-semibold text-lg mb-2">
            Términos y condiciones del pago de servicios
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              El servicio de pago cobra una comisión de $5 pesos mexicanos,
              independientemente de la comisión que defina en el sistema punto
              de venta.
            </li>
            <li>
              El Cliente final
              <span className="font-semibold">
                {' '}
                SIEMPRE DEBE PRESENTAR EL RECIBO
              </span>{' '}
              para validar la referencia, monto y servicio que se debe cobrar.
            </li>
            <li>No se deberán realizar cobros de recibos o comprobantes vencidos:</li>
            <li className="list-[lower-alpha] ml-4">
              Los recibos solo podrán ser cobrados con mínimo 48 horas antes de
              su fecha de vencimiento. Si llegase a realizarse un cobro sobre un
              recibo ya vencido o en su fecha límite será bajo responsabilidad del
              Cliente.
            </li>
            <li className="list-[lower-alpha] ml-4">
              El sistema no detecta fechas de vencimiento, es por eso que se
              establece una fecha límite para hacer el cobro, ya que algunos
              servicios cobran tarifas de reconexión o multas por no hacer el
              pago a tiempo, y si el cliente hace su pago retrasado no
              necesariamente su servicio le será reactivado.
            </li>
            <li>No hay reversos ni cancelaciones en cobro de servicios.</li>
            <li>
              El monto máximo del recibo no debe exceder los $5,000 pesos ni ser
              menor a los $10 pesos.
            </li>
          </ul>
          <h2 className="text-center font-semibold text-lg mb-2">
            Términos y condiciones de recargas electrónicas
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Toda solicitud realizada que reciba una respuesta exitosa por parte del operador
              del producto generará un cargo en la cuenta del cliente solicitante.
            </li>
            <li>
              Bajo ninguna circunstancia se podrán realizar cancelaciones o reversos de
              solicitudes exitosas en el sistema.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
