'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BookOpen, PlayCircle, RefreshCw, AlertTriangle, Wallet } from 'lucide-react'

import GuideArrowOverlay from '@/components/GuideArrows'
import GuideModal, { GuideStep } from '@/components/GuideModal'

const apiUrl = process.env.NEXT_PUBLIC_API_URL
const RECHARGE_TUTORIAL_URL = "https://www.youtube.com/watch?v=avk9R2pETdA&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=17"

const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "saldo-title",
    title: "1. Consulta de Saldo",
    content: "En esta pantalla puedes verificar en tiempo real tu saldo disponible en la plataforma Taecel.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "balance-display",
    title: "2. Tus Saldos",
    content: "Aquí verás desglosado tu saldo para 'Tiempo Aire' (recargas celulares) y 'Pago de Servicios'.",
    placement: "right", 
    modalPosition: "right"
  },
  {
    targetKey: "btn-verify",
    title: "3. Actualizar",
    content: "Haz clic en 'Verificar' para conectar con Taecel y obtener el saldo más reciente.",
    placement: "top",
    modalPosition: "top-center"
  },
  {
    targetKey: "btn-tutorial",
    title: "4. ¿Saldo Bajo?",
    content: "Si tienes menos de $50 o necesitas darte de alta, utiliza este botón para ver el tutorial de cómo abonar a tu cuenta.",
    placement: "right",
    modalPosition: "right"
  }
];

export default function SaldoTaecelPage() {
  const [tiempoAire, setTiempoAire] = useState(0)
  const [pagoServicios, setPagoServicios] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  const [guideActive, setGuideActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1

  const startGuide = () => {
    setGuideActive(true)
    setCurrentStepIndex(0)
  }

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenSaldoTaecelGuide';
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => {
        startGuide();
        localStorage.setItem(key, 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeGuide = () => setGuideActive(false)

  const handleNextStep = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      closeGuide()
      toast.success("¡Guía completada!")
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1)
  }

  const verificarSaldo = async () => {
    try {
      setLoading(true)
      const res = await axios.get(
        `${apiUrl}/recarga/saldo/${sucursalIdSession}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (Array.isArray(res.data) && res.data.length > 0) {
        const ta = parseFloat(res.data[0]?.Saldo ?? 0)
        const ps = parseFloat(res.data[1]?.Saldo ?? 0)
        
        setTiempoAire(ta)
        setPagoServicios(ps)
        setHasChecked(true)

        if (ta < 50) {
            toast.warning("Tu saldo de Tiempo Aire es bajo.", {
                description: "Te recomendamos realizar una recarga.",
                action: {
                    label: "Ver Tutorial",
                    onClick: () => window.open(RECHARGE_TUTORIAL_URL, '_blank')
                }
            })
        }
      }

    } catch (err) {
      console.error(err)
      toast.error('Error al verificar saldo')
    } finally {
      setLoading(false)
    }
  }

  const isLowBalance = hasChecked && (tiempoAire < 50);

  return (
    <div className="p-6 relative space-y-4">
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

      <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2" data-guide="saldo-title">
        <Wallet className="w-8 h-8" /> 
        Saldo Taecel
      </h1>

      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={startGuide}>
            <BookOpen className="w-4 h-4 mr-2" /> Guía
        </Button>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(RECHARGE_TUTORIAL_URL, '_blank')}
            data-guide="btn-tutorial"
        >
            <PlayCircle className="w-4 h-4 mr-2" /> Tutorial Recargas
        </Button>
      </div>

      <div className="max-w-md mx-auto bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 text-center space-y-8">
            
            <div className="space-y-6" data-guide="balance-display">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm font-medium text-orange-800 uppercase tracking-wide">Tiempo Aire</p>
                    <p className="text-4xl font-extrabold text-orange-600 mt-1">
                        ${tiempoAire.toFixed(2)}
                    </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pago de Servicios</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                        ${pagoServicios.toFixed(2)}
                    </p>
                </div>
            </div>

            {isLowBalance && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex flex-col gap-2 items-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-red-700 font-semibold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Saldo Insuficiente</span>
                    </div>
                    <p className="text-sm text-red-600">
                        Tu saldo es menor a $50.00. Para seguir vendiendo, necesitas recargar tu cuenta.
                    </p>
                    <Button 
                        variant="link" 
                        className="text-red-700 underline h-auto p-0"
                        onClick={() => window.open(RECHARGE_TUTORIAL_URL, '_blank')}
                    >
                        Ver tutorial de cómo recargar
                    </Button>
                </div>
            )}

            <Button
                className="w-full bg-orange-500 text-white hover:bg-orange-600 py-6 text-lg shadow-md transition-all active:scale-95"
                onClick={verificarSaldo}
                disabled={loading}
                data-guide="btn-verify"
            >
                {loading ? (
                    <>Verificando...</>
                ) : (
                    <><RefreshCw className="w-5 h-5 mr-2" /> Verificar Saldo Actual</>
                )}
            </Button>
        </div>
      </div>
    </div>
  )
}