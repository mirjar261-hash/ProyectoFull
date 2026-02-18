'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import axios from 'axios'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const apiUrl = process.env.NEXT_PUBLIC_API_URL

interface RetrySubscriptionResponse {
  renewed?: boolean
  payment_status?: string
  new_fecha_vencimiento?: string
  requires_action?: boolean
}

function UpdateCardForm() {
  const searchParams = useSearchParams()
  const empresaId = searchParams.get('empresaId') || ''
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verifyPayment = async () => {
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) throw new Error('Token inválido')
      const res = await axios.post(
        `${apiUrl}/payments/verify-subscription`,
        { empresaId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data?.active) {
        setMessage('Tu suscripción ya está renovada. Redirigiendo...')
        setTimeout(() => router.push('/'), 3000)
      } else {
        setError('El pago no se pudo realizar.')
      }
    } catch (err) {
      console.error(err)
      setError('Error al verificar el pago.')
    }
  }

  const retrySubscription = async () => {
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) throw new Error('Token inválido')
      const res = await axios.post<RetrySubscriptionResponse>(
        `${apiUrl}/payments/retry-subscription`,
        { empresaId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.renewed || res.data.payment_status === 'succeeded') {
        const nuevaFecha = res.data.new_fecha_vencimiento
          ? new Date(res.data.new_fecha_vencimiento).toLocaleDateString()
          : ''
        setMessage(
          `Tu suscripción se renovó correctamente. Nueva fecha de vencimiento: ${nuevaFecha}. Redirigiendo...`
        )
        setTimeout(() => router.push('/'), 3000)
      } else if (
        res.data.payment_status === 'requires_action' ||
        res.data.requires_action
      ) {
        setError(
          'El pago requiere acción adicional. Por favor completa la autenticación en tu banco.'
        )
      } else {
        setError('El pago no se pudo realizar.')
      }
    } catch (err) {
      console.error(err)
      setError('Error al reactivar la suscripción.')
    }
  }

  const handleUpdateCard = async () => {
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    setMessage(null)
    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('No card element')
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })
      if (pmError || !paymentMethod) {
        setError(pmError?.message || 'Tarjeta declinada.')
        setProcessing(false)
        return
      }
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (!token) throw new Error('Token inválido')
      await axios.post(
        `${apiUrl}/payments/update-card`,
        {
          empresaId,
          paymentMethodId: paymentMethod.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await retrySubscription()
    } catch (err: any) {
      console.error(err)
      setError(err.response.data?.error|| 'Ocurrió un error al actualizar la tarjeta.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-center">
        No se renovó el pago de tu suscripción. Actualiza tu tarjeta para continuar.
      </p>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      {message && <p className="text-center text-sm text-green-600">{message}</p>}
      <div className="space-y-2">
        <label className="text-sm font-medium">Datos de la tarjeta</label>
        <div className="border rounded-md p-2">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </div>
      <Button
        onClick={handleUpdateCard}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        disabled={processing}
      >
        {processing ? 'Procesando...' : 'Actualizar tarjeta'}
      </Button>
      <Button
        onClick={verifyPayment}
        variant="outline"
        className="w-full"
        disabled={processing}
      >
        Verificación manual
      </Button>
    </div>
  )
}

export default function UpdateCardPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          <Elements stripe={stripePromise}>
            <Suspense fallback={<div>Cargando...</div>}>
              <UpdateCardForm />
            </Suspense>
          </Elements>
        </CardContent>
      </Card>
    </main>
  )
}

