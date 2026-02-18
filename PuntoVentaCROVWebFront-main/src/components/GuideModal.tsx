"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GuidePlacement = "above" | "below" | "left" | "right" | "top" | "bottom";

export interface GuideStep {
  targetKey: string;
  title: string;
  content: string;
  placement?: GuidePlacement;
  // Se agregó "center" a las opciones
  modalPosition?: "bottom-right" | "top-right" | "bottom-left" | "top-left" | "left" | "right" | "top-center" | "bottom-center" | "center";
  disableNext?: boolean;
}

interface GuideModalProps {
  step: GuideStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isOpen: boolean;
  nextGuideLabel?: string | null;
  onStartNextGuide?: () => void;
  nextBtnClassName?: string;
}

export default function GuideModal({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  isOpen,
  nextGuideLabel,
  onStartNextGuide,
  nextBtnClassName,
}: GuideModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !step || !mounted) return null;

  // Definición de posiciones base
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-24 right-6",
    "top-left": "top-24 left-6",
    "right": "top-1/2 right-6 -translate-y-1/2", // Centrado vertical lateral
    "left": "top-1/2 left-6 -translate-y-1/2",   // Centrado vertical lateral
    "top-center": "top-24 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
    // Centrado total (solo horizontal aquí, el vertical se maneja en la animación)
    "center": "top-1/2 left-1/2 -translate-x-1/2", 
  };

  const currentPos = step.modalPosition || "bottom-right";
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isNextDisabled = step.disableNext === true;
  const isCenterMode = currentPos === "center";

  // Lógica de animación para soportar "center" vs las otras posiciones
  const getAnimationClass = () => {
    if (isOpen) {
      // Si está abierto y es modo centro, necesitamos -translate-y-1/2 para centrarlo perfectamente
      if (isCenterMode) return "opacity-100 -translate-y-1/2";
      // Si es una esquina normal, translate-y-0 es su posición natural
      return "opacity-100 translate-y-0";
    } else {
      // Estado cerrado/invisible
      if (isCenterMode) return "opacity-0 -translate-y-[45%] pointer-events-none"; // Un poco más abajo del centro
      return "opacity-0 translate-y-4 pointer-events-none";
    }
  };

  return createPortal(
    <div 
      className={cn(
        "fixed z-[10000] w-[380px] shadow-2xl transition-all duration-500 ease-in-out pointer-events-auto",
        positionClasses[currentPos] || "bottom-6 right-6",
        getAnimationClass() // Aplicamos la animación dinámica
      )}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm bg-white/95">
        
        {/* Barra de progreso */}
        <div className="h-1.5 w-full bg-orange-100 dark:bg-slate-800">
          <div 
            className="h-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                {currentStepIndex + 1}
              </span>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                {step.title}
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="min-h-[60px]">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {step.content}
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {currentStepIndex + 1} de {totalSteps}
              </span>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onPrev} 
                  disabled={currentStepIndex === 0}
                  className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {!isNextDisabled && (
                  <Button 
                    size="sm" 
                    onClick={onNext}
                    className={cn(
                      "h-8 px-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm",
                      nextBtnClassName
                    )}
                  >
                    {isLastStep ? "Finalizar" : "Siguiente"}
                    {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                  </Button>
                )}
              </div>
            </div>

            {isLastStep && nextGuideLabel && onStartNextGuide && (
              <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-between border border-orange-100 dark:border-orange-800/30">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  ¿Quieres ver la guía de {nextGuideLabel}?
                </span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onStartNextGuide}
                  className="h-7 text-xs border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
                >
                  Ver Guía <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body 
  );
}