'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogFooter,
} from '@/components/ui/dialog';
import { Banknote, CreditCard, CheckSquare, Ticket, ArrowLeftRight, BookOpen, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Operador {
  id: number
  nombre: string
}

interface Producto {
  id: number
  codigo: string
  descripcion?: string
  vigencia?: string
  comments?: string
}

const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "select-operador",
    title: "1. Seleccionar Compañía",
    content: "Elige el operador telefónico (Telcel, Movistar, AT&T, etc.) para iniciar el proceso.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "select-producto",
    title: "2. Seleccionar Paquete",
    content: "Escoge el monto o paquete de recarga deseado. Se mostrarán solo los disponibles para la compañía seleccionada.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-numeros",
    title: "3. Ingresar Teléfono",
    content: "Escribe el número celular del cliente y confírmalo en el segundo campo para evitar errores.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "info-montos",
    title: "4. Verificar Totales",
    content: "Revisa el costo de la recarga, la comisión (si aplica) y el total a cobrar al cliente antes de continuar.",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "btn-cobrar",
    title: "5. Realizar Cobro",
    content: "Haz clic en 'Cobrar' para abrir la ventana de pago y procesar la transacción.",
    placement: "left",
    modalPosition: "bottom-right"
  }
];

export default function RecargaPage() {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [operadorId, setOperadorId] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [numero, setNumero] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [monto, setMonto] = useState(0)
  const [costo, setCosto] = useState(0)
  const [comision, setComision] = useState(0)
  const [vigencia, setVigencia] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [modalPagoOpen, setModalPagoOpen] = useState(false)
  const [efectivo, setEfectivo] = useState(0)
  const [tarjeta, setTarjeta] = useState(0)
  const [cheque, setCheque] = useState(0)
  const [vale, setVale] = useState(0)
  const [transferencia, setTransferencia] = useState(0)
  const [tarjetaTipo, setTarjetaTipo] = useState<'DEBITO' | 'CREDITO'>('DEBITO')
  const [referencia, setReferencia] = useState('')

  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;

  useEffect(() => {
    const cargarOperadores = async () => {
      try {
        const res = await axios.get(`${apiUrl}/recarga/operadores`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setOperadores(res.data)
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar compañías')
      }
    }
    cargarOperadores()
  }, [])

  useEffect(() => {
    limpiarProducto()
    const cargarProductos = async () => {
      if (!operadorId) return
      try {
        const res = await axios.get(`${apiUrl}/recarga/operadores/${operadorId}/productos`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setProductos(res.data)
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar productos')
      }
    }
    cargarProductos()
  }, [operadorId])

  const startGuide = () => {
    setGuideActive(true);
    setCurrentStepIndex(0);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenRecargasTaecelGuide';
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => {
        startGuide();
        localStorage.setItem(key, 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeGuide = () => setGuideActive(false);

  const handleNextStep = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  const seleccionarProducto = async (id: string) => {
    const prod = productos.find((p) => p.id.toString() === id)
    setProductoId(id)
    if (prod) {
      const costoProd = isNaN(Number(prod.descripcion)) ? 0 : Number(prod.descripcion)
      setCosto(costoProd)
      setVigencia(prod.vigencia || '')
      setDescripcion(prod.comments || '')
      try {
        const res = await axios.get(`${apiUrl}/recarga/comision/${sucursalIdSession}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const com = Number(res.data) || 0
        setComision(com)
        setMonto(costoProd + com)
      } catch (err: any) {
        console.error(err)
        const msg = err.response?.data?.error || 'Error al obtener la comisión'
        toast.error(msg)
        setComision(0)
        setMonto(costoProd)
      }
    }
  }

  const abrirModalPago = () => {
    if (!productoId) {
      toast.error('Debe seleccionar el monto de la recarga a realizar ')
      return
    }
    if (!numero || !confirmacion) {
      toast.error('Debe ingresar el número de teléfono 2 veces para la confirmación  ')
      return
    }
    if (numero !== confirmacion) {
      toast.error('Los números de teléfono no coinciden ')
      return
    }
    setModalPagoOpen(true)
    limpiarMotosPago()
    setEfectivo(monto)
  }

  const totalPagos = efectivo + tarjeta + cheque + vale + transferencia

  const confirmarPago = async () => {
    if (totalPagos < monto) {
      toast.error('El pago no cubre el monto')
      return
    }
    try {

      const pago = {
        efectivo: Number(efectivo ?? 0),
        tarjeta: Number(tarjeta ?? 0),
        cheque: Number(cheque ?? 0),
        vale: Number(vale ?? 0),
        transferencia: Number(transferencia ?? 0),
        tarjetaTipo: tarjetaTipo ?? null,
        referenciaPago: referencia ?? null,
      };
      const res = await axios.post(
        `${apiUrl}/recarga`,
        {
          usuarioId: userIdSession,
          sucursalId: sucursalIdSession,
          operadorId,
          skuId: productoId,
          numero,
          monto,
          pago,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (res.data?.status) {
        toast.success(res.data.respuesta)
      } else {
        toast.error(res.data.respuesta)
      }

      limpiar()
      setModalPagoOpen(false)
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.error || 'Error al realizar recarga'
      toast.error(msg)
    }
  }

  const limpiar = () => {
    setOperadorId('')
    setProductoId('')
    setProductos([])
    setNumero('')
    setConfirmacion('')
    setMonto(0)
    setCosto(0)
    setComision(0)
    setVigencia('')
    setDescripcion('')
    setEfectivo(0)
    setTarjeta(0)
    setCheque(0)
    setVale(0)
    setTransferencia(0)
    setReferencia('')
  }

  const limpiarProducto = () => {
    setProductoId('')
    setMonto(0)
    setCosto(0)
    setComision(0)
    setVigencia('')
    setDescripcion('')
  }

  const limpiarMotosPago = () => {
    setEfectivo(0)
    setTarjeta(0)
    setCheque(0)
    setVale(0)
    setTransferencia(0)
    setReferencia('')
  }

  return (
    <div className="p-6 space-y-4 relative">
      {guideActive && (
        <>
          <GuideArrowOverlay 
            activeKey={GUIDE_STEPS[currentStepIndex].targetKey} 
            placement={GUIDE_STEPS[currentStepIndex].placement}
          />
          <GuideModal 
            isOpen={guideActive}
            step={GUIDE_STEPS[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={GUIDE_STEPS.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      <h1 className="text-2xl font-bold text-orange-600 mb-2">Recargar saldo</h1>
      
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={startGuide}>
            <BookOpen className="w-4 h-4 mr-2" /> Guía
        </Button>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://www.youtube.com/watch?v=q_H2G5PGoKk&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=9', '_blank')}
        >
            <PlayCircle className="w-4 h-4 mr-2" /> Tutorial Rápido
        </Button>
      </div>

      <div className="grid md:grid-cols-1 gap-12">
        <div className="space-y-4">
          <div data-guide="select-operador">
            <label className="block text-sm font-medium mb-1">Compañía</label>
            <select
              className="border rounded px-2 py-2 w-full"
              value={operadorId}
              onChange={(e) => {
                setOperadorId(e.target.value)
                setProductoId('')
              }}
            >
              <option value="">Seleccione</option>
              {operadores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
          <div data-guide="select-producto">
            <label className="block text-sm font-medium mb-1">Recarga</label>
            <select
              className="border rounded px-2 py-2 w-full"
              value={productoId}
              onChange={(e) => seleccionarProducto(e.target.value)}
              disabled={!operadorId}
            >
              <option value="">Seleccione</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-4" data-guide="input-numeros">
            <div>
                <label className="block text-sm font-medium mb-1">Número</label>
                <Input maxLength={10} value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Confirma num.</label>
                <Input maxLength={10} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
            </div>
          </div>

          <div data-guide="info-montos">
            <div>
                <label className="block text-sm font-medium mb-1">Monto a pagar</label>
                <Input type="number" value={monto} readOnly />
            </div>
            <div className="flex gap-2 text-sm mt-2">
                <span className="font-semibold">Costo del Producto:</span>
                <span className="text-green-700">${costo.toFixed(2)} MXN</span>
            </div>
            <div className="flex gap-2 text-sm">
                <span className="font-semibold">Comisión por Servicio:</span>
                <span className="text-green-700">${comision.toFixed(2)} MXN</span>
            </div>
            <div className="flex gap-2 text-sm">
                <span className="font-semibold">Vigencia:</span>
                <span className="text-red-600">{vigencia || '0 DÍAS'}</span>
            </div>
          </div>

          <div className="text-sm text-gray-600 whitespace-pre-wrap">{descripcion}</div>
        </div>
        <div className="flex items-end" data-guide="btn-cobrar">
          <Button onClick={abrirModalPago} className="w-full bg-orange-500 text-white">
            Cobrar
          </Button>
        </div>
      </div>

      <Dialog open={modalPagoOpen} onOpenChange={setModalPagoOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-md mx-auto shadow-xl border p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Total a paga ${monto}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Banknote size={18} /> Efectivo
              </label>
              <Input
                type="number"
                className="mt-1 text-right"
                value={efectivo}
                onChange={(e) => setEfectivo(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <CreditCard size={18} /> Tarjeta
              </label>
              <Input
                type="number"
                className="mt-1 text-right"
                value={tarjeta}
                onChange={(e) => setTarjeta(parseFloat(e.target.value) || 0)}
              />
            </div>
            {tarjeta > 0 && (
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <select
                  className="border rounded px-2 py-2"
                  value={tarjetaTipo}
                  onChange={(e) => setTarjetaTipo(e.target.value as any)}
                >
                  <option value="DEBITO">DEBITO</option>
                  <option value="CREDITO">CREDITO</option>
                </select>
                <Input
                  placeholder="Referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <CheckSquare size={18} /> Cheque
              </label>
              <Input
                type="number"
                className="mt-1 text-right"
                value={cheque}
                onChange={(e) => setCheque(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Ticket size={18} /> Vale
              </label>
              <Input
                type="number"
                className="mt-1 text-right"
                value={vale}
                onChange={(e) => setVale(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <ArrowLeftRight size={18} /> Transferencia
              </label>
              <Input
                type="number"
                className="mt-1 text-right"
                value={transferencia}
                onChange={(e) => setTransferencia(parseFloat(e.target.value) || 0)}
              />
            </div>
            {transferencia > 0 && tarjeta === 0 && (
              <div className="col-span-2">
                <Input
                  placeholder="Referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="border-t pt-4 mt-4 text-right font-semibold">
            Total pago: ${totalPagos.toFixed(2)}
          </div>
          <DialogFooter>
            <Button
              onClick={confirmarPago}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Cobrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}