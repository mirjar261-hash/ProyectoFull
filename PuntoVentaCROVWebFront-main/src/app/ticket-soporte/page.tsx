'use client'

import { useState, useMemo } from 'react'
import DialogPolicySupport from "@/components/DialogPolicySupport";
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ClienteCrov {
  id: number | null
  nombre: string
  correo: string
  nombreNegocio: string
  telefono: string
}

const normalizeCliente = (raw: any, telefonoIngresado: string): ClienteCrov => {
  const idCandidates = [
    raw?.id,
    raw?.id_cliente,
    raw?.cliente_id,
    raw?.id_cliente_crov,
    raw?.clienteCrovId,
  ]
    .map((value: any) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    })
    .filter((value: number | null): value is number => value !== null)

  const nombre = [raw?.nombre, raw?.apellido, raw?.apellidos]
    .filter((value: any) => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim()

  const nombreCliente =
    nombre ||
    (typeof raw?.nombre_cliente === 'string' && raw?.nombre_cliente.trim().length > 0
      ? raw.nombre_cliente.trim()
      : '')

  const correo =
    (typeof raw?.correo === 'string' && raw.correo) ||
    (typeof raw?.email === 'string' && raw.email) ||
    (typeof raw?.correo_electronico === 'string' && raw.correo_electronico) ||
    ''

  const nombreNegocio =
    (typeof raw?.nombre_negocio === 'string' && raw.nombre_negocio) ||
    (typeof raw?.negocio === 'string' && raw.negocio) ||
    (typeof raw?.nombreComercial === 'string' && raw.nombreComercial) ||
    (typeof raw?.nombre_comercial === 'string' && raw.nombre_comercial) ||
    ''

  const telefono =
    (typeof raw?.telefono === 'string' && raw.telefono) ||
    (typeof raw?.telefono_contacto === 'string' && raw.telefono_contacto) ||
    (typeof raw?.tel === 'string' && raw.tel) ||
    (typeof raw?.cel === 'string' && raw.cel) ||
    telefonoIngresado

  return {
    id: idCandidates.length > 0 ? idCandidates[0] : null,
    nombre: nombreCliente,
    correo,
    nombreNegocio,
    telefono,
  }
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result
        resolve(base64)
      } else {
        reject(new Error('No se pudo leer el archivo.'))
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })

export default function TicketSoportePublicPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const [telefono, setTelefono] = useState('')
  const [cliente, setCliente] = useState<ClienteCrov | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [openPolicy, setOpenPolicy] = useState(false);


  const canSubmit = useMemo(
    () => !!cliente && descripcion.trim().length > 0,
    [cliente, descripcion]
  )

  const handleBuscarCliente = async () => {
    const telefonoIngresado = telefono.trim()
    setCliente(null)
    setSubmitMessage(null)
    setSubmitError(null)

    if (!telefonoIngresado) {
      setSearchError('Ingresa un número de teléfono para realizar la búsqueda.')
      return
    }

    const telefonoLimpio = telefonoIngresado.replace(/\D+/g, '')

    const telefonoBusqueda =
      telefonoLimpio.length > 10
        ? telefonoLimpio.slice(-10)
        : telefonoLimpio

    if (!telefonoBusqueda) {
      setSearchError(
        'Ingresa un número de teléfono válido para realizar la búsqueda.'
      )
      return
    }

    if (!apiUrl) {
      setSearchError('El servicio no está disponible. Intenta más tarde.')
      return
    }

    setSearching(true)
    setSearchError(null)

    try {
      const response = await axios.post(
        `${apiUrl}/public/clientes-crov/buscar-telefono`,
        { telefono: telefonoBusqueda }
      )

      const data = response.data
      const clienteRaw = data?.cliente || data?.data || data

      if (!clienteRaw) {
        setSearchError('No se encontró un cliente con el teléfono proporcionado.')
        return
      }

      const clienteNormalizado = normalizeCliente(
        clienteRaw,
        telefonoBusqueda
      )

      if (!clienteNormalizado.id) {
        setSearchError(
          'No se pudo obtener la información completa del cliente. Comunícate con soporte.'
        )
        return
      }

      setCliente(clienteNormalizado)
    } catch (error: any) {
      console.error('Error al buscar cliente CROV:', error)

      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setSearchError(
          'No se encontró un cliente con el teléfono proporcionado. Verifica el número e intenta nuevamente.'
        )
        return
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'No se pudo buscar el cliente. Verifica el número e intenta nuevamente.'
      setSearchError(message)
    } finally {
      setSearching(false)
    }
  }

  const handleAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])

    setAttachments((prev) => [...prev, ...files])
    event.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const next = [...prev]
      next.splice(index, 1)
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitMessage(null)
    setSubmitError(null)

    if (!apiUrl) {
      setSubmitError('El servicio no está disponible en este momento.')
      return
    }

    if (!cliente) {
      setSubmitError('Primero busca y selecciona un cliente válido.')
      return
    }

    if (descripcion.trim().length === 0) {
      setSubmitError('Describe el problema para enviar el ticket.')
      return
    }

    setSubmitting(true)

    try {
      const imagenes = await Promise.all(
        attachments.map(async (file) => ({
          nombre: file.name,
          tipo: file.type,
          contenido: await fileToBase64(file),
        }))
      )

      await axios.post(`${apiUrl}/public/tickets-soporte-crov`, {
        id_cliente_crov: cliente.id,
        telefono: cliente.telefono || telefono.trim(),
        nombre_cliente: cliente.nombre,
        correo: cliente.correo,
        nombre_negocio: cliente.nombreNegocio,
        descripcion: descripcion.trim(),
        imagenes,
        origen: 'PUBLICO',
      })

      setSubmitMessage('Tu ticket se envió correctamente. En breve nos pondremos en contacto contigo.')
      setDescripcion('')
      setAttachments([])
    } catch (error: any) {
      console.error('Error al crear ticket de soporte:', error)
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Ocurrió un error al enviar tu ticket. Inténtalo de nuevo más tarde.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-3xl px-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-orange-600">
              Ticket de soporte CROV
            </CardTitle>
            <CardDescription className="text-gray-600">
              Ingresa tu número telefónico para localizar tu negocio y describe el problema que estás experimentando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Teléfono del negocio
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="Ej. 5512345678"
                  type="tel"
                  className="flex-1"
                  disabled={searching}
                />
                <Button
                  type="button"
                  onClick={handleBuscarCliente}
                  disabled={searching || telefono.trim().length === 0}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  {searching ? 'Buscando…' : 'Buscar'}
                </Button>
              </div>
              {searchError && (
                <p className="text-sm text-red-500">{searchError}</p>
              )}
            </div>

            {cliente && (
              <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                  Información del cliente
                </h2>
                <dl className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-gray-600">Nombre</dt>
                    <dd>{cliente.nombre || 'Sin datos'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Correo</dt>
                    <dd>{cliente.correo || 'Sin datos'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Nombre del negocio</dt>
                    <dd>{cliente.nombreNegocio || 'Sin datos'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">Teléfono</dt>
                    <dd>{cliente.telefono || telefono}</dd>
                  </div>
                </dl>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Describe tu problema
                </label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Cuéntanos qué sucede en tu sistema CROV y cómo podemos ayudarte."
                />
              </div>
              {/*
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Imágenes o capturas de pantalla (opcional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAttachments}
                />
                {attachments.length > 0 && (
                  <ul className="space-y-2 text-sm text-gray-600">
                    {attachments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                      >
                        <span className="truncate pr-3">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-xs font-semibold uppercase tracking-wide text-orange-600 hover:text-orange-700"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              */ }
              {submitError && (
                <p className="text-sm text-red-500">{submitError}</p>
              )}

              {submitMessage && (
                <p className="text-sm text-green-600">{submitMessage}</p>
              )}
             <p className="block text-sm font-medium text-gray-700">
              Al aceptar el envío, declaras haber leído y aceptado nuestras{" "}
              <button
                type="button"
                onClick={() => setOpenPolicy(true)}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                políticas de soporte
              </button>
              .
            </p>

            <DialogPolicySupport open={openPolicy} onOpenChange={setOpenPolicy} />

              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Enviando…' : 'Enviar ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
