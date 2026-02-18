'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { PaymentMethod } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import axios from 'axios'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const PLAN_NEGOCIOS = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS || '';
const PLAN_INTELIGENTE = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE || '';
const PLAN_NEGOCIOS_ANUAL = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS_ANUAL || '';
const PLAN_INTELIGENTE_ANUAL = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE_ANUAL || '';

const PLAN_PRICE_MAP: Record<string, string> = {
  Negocios: PLAN_NEGOCIOS,
  Inteligente: PLAN_INTELIGENTE,
  Negocios_anual: PLAN_NEGOCIOS_ANUAL,
  Inteligente_anual: PLAN_INTELIGENTE_ANUAL,
}


function CheckoutForm() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || ''
  const renew = searchParams.get('renew') === '1'
  const empresaId = searchParams.get('empresaId') || ''
  const stripe = useStripe()
  const elements = useElements()
  const [name, setName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const router = useRouter()

  const sendWelcomeEmail = async (email: string) => {
    try {
      await axios.post(`${apiUrl}/auth/send-welcome`, {
        email,
        password: '123456',
      })
    } catch (err) {
      console.error(err)
    }
  }

  const createInitialCompany = async () => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('registrationData')
    const expiration = new Date()
    if (!saved) return
    try {
      const data = JSON.parse(saved)
      const payload = {
        empresa: {
          nombre: data.nombre_comercial,
          fecha_vencimiento: expiration.toISOString(),
          activo: 1,
          token: plan || '',
          priceId: data.priceId || ''
        },
        sucursal: {
          razon_social: data.nombre_comercial,
          contacto: data.contacto,
          direccion: data.direccion,
          colonia: data.colonia,
          estado: data.estado,
          municipio: data.municipio,
          cp: data.cp,
          correo: data.correo,
          tel: data.tel,
          cel: data.cel,
          giro_comercial: data.giro_comercial,
          nombre_comercial: data.nombre_comercial,
          activo: 1
        },
        usuario: {
          nombre: data.contacto,
          apellidos: '',
          telefono: data.tel,
          correo: data.correo,
          password: '123456',
          perfil: 'Administrador',
          activo: 1
        }
      }
      const res = await axios.post(`${apiUrl}/auth/setup`, payload)
      if (res.data?.empresa?.id) {
        localStorage.setItem('empresaId', String(res.data.empresa.id))
      }
      if (res.data?.user?.id) {
        localStorage.setItem('userId', String(res.data.user.id))
      }
      localStorage.setItem('planId', String(payload.empresa.priceId))

      let token = res.data?.token
      if (!token) {
        try {
          const loginRes = await axios.post(`${apiUrl}/auth/login`, {
            correo: payload.usuario.correo,
            password: payload.usuario.password,
          })
          token = loginRes.data?.token
        } catch (loginErr) {
          console.error(loginErr)
        }
      }
      if (token) {
        localStorage.setItem('token', token)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const activateCompany = async (
    expiration: string,
    stripeCustomerId?: string
  ) => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('registrationData') : null
      const empresaId = typeof window !== 'undefined' ? localStorage.getItem('empresaId') : null
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      if (!token) {
        throw new Error('No se encontró el token de autenticación. Inicia sesión nuevamente.')
      }
      if (!empresaId) return
      const payload: {
        fecha_vencimiento: string
        token: string
        stripeCustomerId?: string
      } = {
        fecha_vencimiento: expiration,
        token: plan,
      }

      if (stripeCustomerId) {
        payload.stripeCustomerId = stripeCustomerId
      }

      await axios.put(
        `${apiUrl}/empresa/${empresaId}/datos`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (saved) {
        const data = JSON.parse(saved)
        await sendWelcomeEmail(data.correo)
        localStorage.removeItem('registrationData')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const renewCompany = async (
    expiration: string,
    stripeCustomerId?: string | null
  ) => {
    if (!renew || !empresaId) return
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) {
        throw new Error('Token inválido')
      }

      const payload: {
        fecha_vencimiento: string
        token: string
        stripeCustomerId?: string
      } = {
        fecha_vencimiento: expiration,
        token: plan,
      }
      if (stripeCustomerId) {
        payload.stripeCustomerId = stripeCustomerId
      }

      await axios.put(
        `${apiUrl}/empresa/${empresaId}/datos`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (typeof window !== 'undefined') {
        localStorage.setItem('empresaToken', plan)
        localStorage.setItem('fechaVencimientoEmpresa', expiration)
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const saveTransaction = async (
    payment: {
      paymentIntentId: string
      customerId?: string | null
      status: string
      amount: number
      currency: string
      created?: number
      description?: string | null
      orderId?: string
      subscriptionId?: string
      invoiceId?: string
    },
    method: PaymentMethod
  ) => {
    try {
      const empresaId =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem('empresaId'))
          : undefined

      const payload = {
        paymentIntentId: payment.paymentIntentId,
        customerId: payment.customerId,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency,
        created: payment.created
          ? new Date(payment.created * 1000).toISOString()
          : new Date().toISOString(),
        description: payment.description ?? undefined,
        orderId: payment.orderId,
        empresaId,
        paymentMethod: 'card',
        card: {
          last4: method.card?.last4,
          brand: method.card?.brand,
          country: method.card?.country,
        },
        subscriptionId: payment.subscriptionId,
        invoiceId: payment.invoiceId,
      }

      await axios.post(`${apiUrl}/payments/record`, payload)
    } catch (err) {
      console.error(err)
    }
  }

  const processPayment = async () => {
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    try {
      const saved =
        typeof window !== 'undefined'
          ? localStorage.getItem('registrationData')
          : null
      const data = saved ? JSON.parse(saved) : null
      const priceId = PLAN_PRICE_MAP[plan]
      const storedEmail =
        typeof window !== 'undefined' ? localStorage.getItem('email') : null
      const customerInfo: { name: string; email?: string | null } = data
        ? { name: data.contacto, email: data.correo }
        : storedEmail
          ? { name, email: storedEmail }
          : { name }


      if (!priceId) {
        setError(
          renew
            ? 'El paquete seleccionado no es válido. Regresa y elige nuevamente.'
            : 'No se pudieron obtener los datos de registro. Intenta nuevamente.'
        )
        setProcessing(false)
        return
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
        billing_details: {
          name,
          ...(customerInfo.email ? { email: customerInfo.email } : {}),
        },
      })

      if (pmError || !paymentMethod) throw pmError

      const storedEmpresaId =
        typeof window !== 'undefined' ? localStorage.getItem('empresaId') : null

      const rawEmpresaId = renew
        ? empresaId || storedEmpresaId || ''
        : storedEmpresaId || ''

      const trimmedEmpresaId = rawEmpresaId.trim()
      const parsedEmpresaId =
        trimmedEmpresaId && !Number.isNaN(Number(trimmedEmpresaId))
          ? Number(trimmedEmpresaId)
          : undefined

      const paymentIntentPayload: {
        priceId: string
        paymentMethodId: string
        customer: { name: string; email?: string | null }
        empresaId?: number
      } = {
        priceId,
        paymentMethodId: paymentMethod.id,
        customer: customerInfo,
      }

      if (parsedEmpresaId !== undefined) {
        paymentIntentPayload.empresaId = parsedEmpresaId
      }

      const res = await axios.post(
        `${apiUrl}/payments/create-payment-intent`,
        paymentIntentPayload
      )

      if (res.data.payment) {
        const { stripeCustomerId, payment } = res.data
        const customerId =
          stripeCustomerId ||
          (typeof payment.customerId === 'string'
            ? payment.customerId
            : undefined)
        if (customerId && typeof window !== 'undefined') {
          localStorage.setItem('stripeCustomerId', customerId)

        }
        const expiration = new Date()
        expiration.setMonth(expiration.getMonth() + 1)

        if (renew) {
          await renewCompany(expiration.toISOString(), customerId)
        } else {
          await createInitialCompany()
          await activateCompany(expiration.toISOString(), customerId)
        }
        await saveTransaction(
          { ...payment, customerId: customerId ?? payment.customerId },
          paymentMethod
        )
        setSuccess(true)
      } else if (res.data.requiresAction) {
        const { clientSecret, stripeCustomerId } = res.data
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret
        )
        if (!error && paymentIntent) {
          const customerId =
            stripeCustomerId ||
            (typeof paymentIntent.customer === 'string'
              ? paymentIntent.customer
              : undefined)
          if (customerId && typeof window !== 'undefined') {
            localStorage.setItem('stripeCustomerId', customerId)
          }
          const expiration = new Date()
          expiration.setMonth(expiration.getMonth() + 1)

          if (renew) {
            await renewCompany(expiration.toISOString(), customerId)
          } else {
            await createInitialCompany()
            await activateCompany(expiration.toISOString(), customerId)
          }
          await saveTransaction(
            {
              paymentIntentId: paymentIntent.id,
              customerId: customerId ?? paymentIntent.customer,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              created: paymentIntent.created,
            },
            paymentMethod
          )
          setSuccess(true)
        } else if (error) {
          throw error
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response.data?.error || 'Ocurrió un error al procesar el pago. Intenta nuevamente.')
    }
    setProcessing(false)
  }

  const handlePayClick = () => {
    if (processing) return
    setShowConfirmation(true)
  }

  const handleConfirmPayment = async () => {
    setShowConfirmation(false)
    await processPayment()
  }

  const handleCancelConfirmation = () => {
    if (processing) return
    setShowConfirmation(false)
  }

  return (
    <>
      {success ? (
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-orange-600">
            {renew ? 'Pago completado' : plan === 'Demo' ? 'Registro completado' : 'Pago completado'}
          </h1>
          {!renew && (
            <p className="text-sm">Se envió un correo de bienvenida con tu usuario y contraseña <strong>123456</strong>.</p>
          )}
          <Link href="/" className="text-orange-600 underline">
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p className="text-center text-sm text-red-500 mb-4">{error}</p>
          )}
          {/* Botón de regreso a selección de paquetes */}
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (renew) {
                  router.push('/renew');
                } else {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('fromPayment', '1');
                  }
                  router.push('/register?from=payment');
                }
              }}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Regresar a selección de paquetes
            </Button>
          </div>

          <h1 className="text-xl font-semibold text-orange-600 text-center">
            Pago en línea
          </h1>
          {plan && (
            <p className="text-center text-sm">
              Plan seleccionado: <span className="font-medium">{plan}</span>
            </p>
          )}
          {plan !== 'Demo' && (
            <>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nombre en la tarjeta
                </label>
                <Input
                  id="name"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Datos de la tarjeta</label>
                <div className="border rounded-md p-2">
                  <CardElement options={{ hidePostalCode: true }} />
                </div>
              </div>
              <Button
                onClick={handlePayClick}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={processing}
              >
                {processing ? 'Procesando...' : 'Pagar'}
              </Button>
            </>
          )}
        </>
      )}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar renovación automática</DialogTitle>
            <DialogDescription>
              La tarjeta dada de alta se utilizará para la <b>renovación automática</b> del paquete seleccionado al alcanzar la <b>fecha de fin</b>.
              Puedes consultar la <b>fecha de fin</b> de tu paquete en el apartado de <b>&quot;Pagos y suscripciones&quot;</b>.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Para evitar el <b>cargo automático</b> del próximo pago a tu tarjeta, deberás <b>cancelar tu suscripción al menos 5 días
            antes</b> de la <b>fecha de fin</b> de tu paquete desde el apartado de <b>&quot;Pagos y suscripciones&quot;</b>.
          </p>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelConfirmation}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={processing}
            >
              {processing ? 'Procesando...' : 'Aceptar y continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function PaymentPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          <Elements stripe={stripePromise}>
            <Suspense fallback={<div>Cargando...</div>}>
              <CheckoutForm />
            </Suspense>
          </Elements>
        </CardContent>
      </Card>
    </main>
  )
}
