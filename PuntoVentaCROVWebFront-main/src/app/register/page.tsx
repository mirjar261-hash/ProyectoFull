'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Package, Store, BrainCircuit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL
const PLAN_NEGOCIOS = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS || '';
const PLAN_INTELIGENTE = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE || '';
const PLAN_NEGOCIOS_ANUAL = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS_ANUAL || '';
const PLAN_INTELIGENTE_ANUAL = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE_ANUAL || '';

const GIROS_COMERCIALES = [
  'Abarrotes',
  'Papelería',
  'Farmacia',
  'Ferretería',
  'Estética / Barbería',
  'Tienda de ropa',
  'Miscelánea',
  'Restaurante',
  'Cafetería',
  'Taquería',
  'Panadería',
  'Carnicería',
  'Tienda de electrónicos',
  'Refaccionaria',
  'Tienda naturista',
  'Tlapalería',
  'Oficina / Servicios profesionales',
]

const initialForm = {
  nombre: '',
  apellidos: '',
  telefono: '',
  password: '',
  contacto: '',
  direccion: '',
  colonia: '',
  estado: '',
  municipio: '',
  cp: '',
  tel: '',
  cel: '',
  giro_comercial: '',
  nombre_comercial: '',
  activo: 1,
  priceId: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [codeSent, setCodeSent] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    password: '',
    contacto: '',
    direccion: '',
    colonia: '',
    estado: '',
    municipio: '',
    cp: '',
    tel: '',
    cel: '',
    giro_comercial: '',
    nombre_comercial: '',
    activo: 1,
    priceId: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem('registrationData')
    const fromPayment =
      sessionStorage.getItem('fromPayment') === '1' ||
      new URLSearchParams(window.location.search).get('from') === 'payment'

    if (fromPayment && saved) {
      // Solo restaurar si venimos desde Payment
      try {
        const data = JSON.parse(saved)
        setEmail(data.correo || '')
        setPlan(data.plan || '')
        setForm((prev) => ({
          ...prev,
          nombre: data.nombre ?? prev.nombre,
          apellidos: data.apellidos ?? prev.apellidos,
          telefono: data.telefono ?? prev.telefono,
          password: data.password ?? prev.password,
          contacto: data.contacto ?? prev.contacto,
          direccion: data.direccion ?? prev.direccion,
          colonia: data.colonia ?? prev.colonia,
          estado: data.estado ?? prev.estado,
          municipio: data.municipio ?? prev.municipio,
          cp: data.cp ?? prev.cp,
          tel: data.tel ?? prev.tel,
          cel: data.cel ?? prev.cel,
          giro_comercial: data.giro_comercial ?? prev.giro_comercial,
          nombre_comercial: data.nombre_comercial ?? prev.nombre_comercial,
          activo: data.activo ?? prev.activo,
        }))
        setStep(4) // ir directo a paquetes si regresa por plan
      } catch (e) {
        console.error('No se pudo parsear registrationData', e)
      } finally {
        // Consumir el flag para que no siga saltando
        sessionStorage.removeItem('fromPayment')
      }
    } else {
      // Caso registro nuevo o navegación directa: limpiar todo
      localStorage.removeItem('registrationData')
      sessionStorage.removeItem('fromPayment')
      setEmail('')
      setPlan('')
      setForm(initialForm)
      setStep(1)
    }
  }, [])

  const [plan, setPlan] = useState('')
  const [error, setError] = useState('')

  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 1 && emailRef.current) {
      emailRef.current.focus()
    }
    if (step === 2 && codeRef.current) {
      codeRef.current.focus()
    }
  }, [step])

  const checkEmail = async () => {
    setError('')
    try {
      const res = await axios.get(`${apiUrl}/users/check-email?correo=${encodeURIComponent(email)}&activo=1`)
      if (res.data.exists) {
        setError('El correo que acabas de ingresar ya se encuentra registrado a una cuenta o usuario existente')
        return
      }
      const send = await axios.post(`${apiUrl}/auth/send-code`, { email })
      setCodeSent(send.data.code)
      setStep(2)
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al enviar el código')
    }
  }
  const verifyCode = () => {
    if (codeInput.trim() === codeSent.trim()) {
      setStep(3)
    } else {
      setError('Código incorrecto')
    }
  }

  const continueWithForm = () => {
    if (form.nombre_comercial && form.cel) {
      setError('')
      setStep(4)
    } else {
      setError('Nombre comercial y celular son obligatorios')
    }
  }

  const sendWelcomeEmail = async () => {
    try {
      await axios.post(`${apiUrl}/auth/send-welcome`, {
        email,
        password: '123456',
      })
    } catch (err) {
      console.error(err)
    }
  }

  const registerCompanyDirect = async () => {
    try {
      const expiration = new Date()
      expiration.setMonth(expiration.getMonth() + 1)

      const payload = {
        empresa: {
          nombre: form.nombre_comercial,
          fecha_vencimiento: expiration.toISOString(),
          activo: 1,
          token: plan || '',
        },
        sucursal: {
          razon_social: form.nombre_comercial,
          contacto: form.contacto,
          direccion: form.direccion,
          colonia: form.colonia,
          estado: form.estado,
          municipio: form.municipio,
          cp: form.cp,
          correo: email,
          tel: form.tel,
          cel: form.cel,
          giro_comercial: form.giro_comercial,
          nombre_comercial: form.nombre_comercial,
          activo: 1,
        },
        usuario: {
          nombre: form.contacto,
          apellidos: '',
          telefono: form.tel,
          correo: email,
          password: '123456',
          perfil: 'Administrador',
          activo: 1,
          validado: 1,
        },
      }

      const res = await axios.post(`${apiUrl}/auth/setup`, payload)
      await sendWelcomeEmail()
    } catch (err) {
      console.error(err)
      setError('Error al registrar')
    }
  }

  const register = async () => {
    setError('')
    try {
      const planPriceMap: Record<string, string> = {
        Demo: '0',
        Negocios: PLAN_NEGOCIOS,
        Inteligente: PLAN_INTELIGENTE,
        Negocios_anual: PLAN_NEGOCIOS_ANUAL,
        Inteligente_anual: PLAN_INTELIGENTE_ANUAL,
      }

      if (form.priceId !== planPriceMap[plan]) {
        setError('El plan seleccionado no coincide con su identificador.')
        return
      }

      if (plan === 'Demo') {
        await registerCompanyDirect()
        setStep(5)
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'registrationData',
          JSON.stringify({ ...form, correo: email, plan })
        )
      }
      router.push(`/payment?plan=${encodeURIComponent(plan)}`)
    } catch (err) {
      console.error(err)
      setError('Error al registrar')
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' })
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-[80%] md:max-w-[900px] border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          {step === 1 && (
            <>
              <h1 className="text-xl font-semibold text-orange-600 text-center">Registro - Paso 1</h1>
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium">Correo</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  ref={emailRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      checkEmail()
                    }
                  }}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button onClick={checkEmail} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Continuar</Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-semibold text-orange-600 text-center">Ingresa el código enviado</h1>
              <div className="space-y-1">
                <label htmlFor="codigo" className="text-sm font-medium">Código</label>
                <Input
                  id="codigo"
                  placeholder="Código"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  ref={codeRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      verifyCode()
                    }
                  }}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button onClick={verifyCode} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Verificar</Button>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-xl font-semibold text-orange-600 text-center">Completa tu registro</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="contacto" className="text-sm font-medium">Nombre contacto</label>
                  <Input
                    id="contacto"
                    placeholder="Nombre contacto"
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="direccion" className="text-sm font-medium">Dirección</label>
                  <Input
                    id="direccion"
                    placeholder="Dirección"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="colonia" className="text-sm font-medium">Colonia</label>
                  <Input
                    id="colonia"
                    placeholder="Colonia"
                    value={form.colonia}
                    onChange={(e) => setForm({ ...form, colonia: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="estado" className="text-sm font-medium">Estado</label>
                  <Input
                    id="estado"
                    placeholder="Estado"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="municipio" className="text-sm font-medium">Municipio</label>
                  <Input
                    id="municipio"
                    placeholder="Municipio"
                    value={form.municipio}
                    onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cp" className="text-sm font-medium">CP</label>
                  <Input
                    id="cp"
                    placeholder="CP"
                    value={form.cp}
                    onChange={(e) => setForm({ ...form, cp: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="tel" className="text-sm font-medium">Teléfono</label>
                  <Input
                    id="tel"
                    placeholder="Teléfono"
                    value={form.tel}
                    onChange={(e) => setForm({ ...form, tel: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cel" className="text-sm font-medium">Celular*</label>
                  <Input
                    id="cel"
                    placeholder="Celular*"
                    value={form.cel}
                    onChange={(e) => setForm({ ...form, cel: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombre_comercial" className="text-sm font-medium">Nombre comercial*</label>
                  <Input
                    id="nombre_comercial"
                    placeholder="Nombre comercial*"
                    value={form.nombre_comercial}
                    onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label htmlFor="giro_comercial" className="text-sm font-medium">Giro comercial</label>
                  <select
                    id="giro_comercial"
                    className="border px-3 py-2 rounded"
                    value={form.giro_comercial}
                    onChange={(e) => setForm({ ...form, giro_comercial: e.target.value })}
                  >
                    <option value="">Selecciona un giro comercial</option>
                    {GIROS_COMERCIALES.map((giro, i) => (
                      <option key={i} value={giro}>{giro}</option>
                    ))}
                  </select>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button onClick={continueWithForm} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Continuar</Button>
            </>
          )}

          {step === 4 && (
            <>
              {/* Botón para volver al formulario conservando la información del usuario xd*/}
              <div className="mb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Regresar al registro
                </Button>
              </div>

              <h1 className="text-xl font-bold text-orange-600 text-center mb-4">Selecciona un paquete</h1>
              <div className="relative w-full">
                {/* Botón Izquierdo */}
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-orange-100"
                >
                  <span className="text-2xl font-bold text-orange-500">&lt;</span>
                </button>

                {/* Contenedor Scrolleable */}
                <div
                  ref={scrollRef}
                  className="flex gap-6 overflow-x-auto scroll-smooth pb-4 px-8 no-scrollbar"
                >
                  {[
                    {
                      priceId: '0',
                      nombre: 'Demo',
                      precio: '$0',
                      descripcion: '30 días gratis',
                      icono: <Package className="w-10 h-10 text-orange-500" />,
                      beneficios: [
                        'Acceso al punto de venta sin inteligencia artificial',
                        'Inventario, ventas, compras, clientes, proveedores',
                        'Recargas, cortes y reportes',
                      ],
                    },
                    {
                      priceId: PLAN_NEGOCIOS,
                      nombre: 'Negocios',
                      precio: '$299',
                      descripcion: 'Ideal para negocios',
                      icono: <Store className="w-10 h-10 text-orange-500" />,
                      beneficios: [
                        'Inventario, ventas, compras, clientes y proveedores',
                        'Recargas y pagos de servicios',
                        'Cortes del día y reportes',
                        'Soporte 24/7 con nuestro asistente CROV',
                      ],
                    },
                    {
                      priceId: PLAN_NEGOCIOS_ANUAL,
                      nombre: 'Negocios anual',
                      precio: '$3,289',
                      descripcion: 'Ideal para negocios',
                      icono: <Store className="w-10 h-10 text-orange-500" />,
                      beneficios: [
                        'Inventario, ventas, compras, clientes y proveedores',
                        'Recargas y pagos de servicios',
                        'Cortes del día y reportes',
                        'Soporte 24/7 con nuestro asistente CROV',
                      ],
                    },
                    {
                      priceId: PLAN_INTELIGENTE,
                      nombre: 'Inteligente',
                      precio: '$499',
                      descripcion: 'Con inteligencia artificial',
                      icono: <BrainCircuit className="w-10 h-10 text-orange-500" />,
                      beneficios: [
                        'Todo el paquete Negocios',
                        'Gerente CROV que analiza tus ventas',
                        'Sugiere promociones con IA',
                      ],
                    },
                    {
                      priceId: PLAN_INTELIGENTE_ANUAL,
                      nombre: 'Inteligente anual',
                      precio: '$5,489',
                      descripcion: 'Con inteligencia artificial',
                      icono: <BrainCircuit className="w-10 h-10 text-orange-500" />,
                      beneficios: [
                        'Todo el paquete Negocios',
                        'Gerente CROV que analiza tus ventas',
                        'Sugiere promociones con IA',
                      ],
                    },
                  ].map((p) => (
                    <label
                      key={p.nombre}
                      className="cursor-pointer min-w-[320px] max-w-[360px] flex-shrink-0"
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={p.priceId}
                        checked={plan === p.nombre}
                        onChange={() => {
                          setPlan(p.nombre)
                          setForm((prev) => ({ ...prev, priceId: p.priceId }))
                        }}
                        className="peer sr-only"
                      />
                      <div className="h-full rounded-2xl border border-gray-200 p-6 shadow-md transition-all duration-300 peer-checked:ring-2 peer-checked:ring-orange-500 peer-checked:border-orange-500 bg-white hover:shadow-lg flex flex-col justify-between">
                        <div className="flex flex-col items-center space-y-2 text-center">
                          {p.icono}
                          <h2 className="text-xl font-bold text-gray-800">{p.nombre}</h2>
                          <p className="text-3xl font-bold text-orange-500">{p.precio}</p>
                          <p className="text-sm text-gray-500">{p.descripcion}</p>
                        </div>
                        <ul className="mt-4 space-y-3 text-sm text-gray-700">
                          {p.beneficios.map((b, i) => (
                            <li key={i} className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Botón Derecho */}
                <button
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-orange-100"
                >
                  <span className="text-2xl font-bold text-orange-500">&gt;</span>
                </button>
              </div>

              {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
              <Button onClick={register} className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-6">
                Registrarme
              </Button>
            </>
          )}

          {step === 5 && (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-semibold text-orange-600">Registro completado</h1>
              <p className="text-sm">Se envió un correo de bienvenida con tu usuario y contraseña <strong>123456</strong>.</p>
              <Link href="/" className="text-orange-600 underline">Ir a iniciar sesión</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
