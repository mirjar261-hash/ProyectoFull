'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'
import GuideModal, { GuideStep } from '@/components/GuideModal'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

// === DEFINICIÓN DE LOS PASOS DE LA GUÍA ===
const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Cambiar Contraseña",
    content: "Utiliza este formulario para actualizar tu clave de acceso al sistema por seguridad o mantenimiento.",
    placement: "bottom",
    modalPosition: "bottom-center"
  },
  {
    targetKey: "input-actual",
    title: "2. Contraseña Actual",
    content: "Ingresa tu contraseña vigente para validar que eres el propietario de la cuenta.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-nueva",
    title: "3. Nueva Contraseña",
    content: "Escribe la nueva clave que deseas utilizar a partir de ahora.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "input-confirmar",
    title: "4. Confirmación",
    content: "Vuelve a escribir la nueva contraseña para asegurar que no haya errores de escritura.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-actions",
    title: "5. Guardar Cambios",
    content: "Haz clic en 'Guardar cambios' para finalizar. Si decides no cambiarla, presiona 'Salir'.",
    placement: "top",
    modalPosition: "top-center"
  }
];

export default function CambiarContrasenaPage() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Estados de la Guía
  const [guideActive, setGuideActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = () => {
    setGuideActive(true)
    setCurrentStepIndex(0)
  }

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenChangePasswordGuide';
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

  const guardar = async () => {
    if (!actual || !nueva || !confirmar) {
      toast.error('Completa todos los campos')
      return
    }
    if (nueva !== confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    try {
      setLoading(true)
      await axios.put(
        `${apiUrl}/auth/changepassword`,
        { actual, nueva },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Contraseña actualizada correctamente')
      router.back()
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.error || 'Ocurrió un error'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 shadow rounded space-y-4 relative">
      
      {/* --- GUÍA INTERACTIVA --- */}
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

      {/* Título */}
      <h1 className="text-xl font-bold text-orange-600" data-guide="page-title">
        Cambiar contraseña
      </h1>

      {/* Botón de Guía (Debajo del título) */}
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={startGuide}>
            <BookOpen className="w-4 h-4 mr-2" /> Guía Interactiva
        </Button>
      </div>

      <div data-guide="input-actual">
        <Input
            type="password"
            placeholder="Contraseña actual"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
        />
      </div>

      <div data-guide="input-nueva">
        <Input
            type="password"
            placeholder="Nueva contraseña"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
        />
      </div>

      <div data-guide="input-confirmar">
        <Input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2" data-guide="btn-actions">
        <Button
          disabled={loading}
          className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
          onClick={guardar}
        >
          Guardar cambios
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => router.back()}>
          Salir
        </Button>
      </div>
    </div>
  )
}