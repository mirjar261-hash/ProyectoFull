"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type GuidePlacement = "above" | "below" | "left" | "right" | "top" | "bottom";

interface ArrowProps {
  activeKey?: string | null;
  placement?: GuidePlacement;
  offset?: number;
  size?: number;
}

export default function GuideArrowOverlay({
  activeKey = null,
  placement = "above",
  offset = 20,
  size = 40,
}: ArrowProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);
  
  const rafRef = useRef<number | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);

  const target = useMemo(() => {
    if (typeof document === "undefined" || !activeKey) return null;
    return document.querySelector(`[data-guide="${activeKey}"]`) as HTMLElement | null;
  }, [activeKey]);

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const updatePosition = () => {
    if (!target) {
      setVisible(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    
    let tipTop = 0;
    let tipLeft = 0;
    
    // CORRECCIÓN: Se agregan los casos faltantes 'top' y 'bottom'
    switch (placement) {
      case "above":
      case "top":
        tipTop = rect.top - offset;
        tipLeft = rect.left + rect.width / 2;
        break;
      case "below":
      case "bottom":
        tipTop = rect.bottom + offset;
        tipLeft = rect.left + rect.width / 2;
        break;
      case "left":
        tipTop = rect.top + rect.height / 2;
        tipLeft = rect.left - offset;
        break;
      case "right":
        tipTop = rect.top + rect.height / 2;
        tipLeft = rect.right + offset;
        break;
    }

    setPos({ top: tipTop, left: tipLeft });
    setVisible(true);

    // Efecto de resaltado (Naranja Brillante)
    if (target !== lastTargetRef.current) {
        if (lastTargetRef.current) {
            lastTargetRef.current.style.boxShadow = "";
            lastTargetRef.current.style.transition = "";
        }
        lastTargetRef.current = target;
    }
    target.style.transition = "box-shadow 0.4s ease";
    target.style.boxShadow = "0 0 0 4px rgba(249, 115, 22, 0.6), 0 0 20px rgba(249, 115, 22, 0.4)";
  };

  useEffect(() => {
    if (!target) {
      setVisible(false);
      if (lastTargetRef.current) {
        lastTargetRef.current.style.boxShadow = "";
      }
      return; 
    }

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const onFrame = () => {
      updatePosition();
      rafRef.current = requestAnimationFrame(onFrame);
    };
    rafRef.current = requestAnimationFrame(onFrame);

    return () => {
      stopRaf();
      if (target) {
          target.style.boxShadow = "";
          target.style.transition = "";
      }
    };
  }, [target, placement, offset]);

  if (typeof document === "undefined" || !visible || !pos) return null;

  // CORRECCIÓN: Mapeo correcto de rotación para todos los casos
  let rotation = 0;
  if (placement === "above" || placement === "top") rotation = 180;
  else if (placement === "below" || placement === "bottom") rotation = 0;
  else if (placement === "left") rotation = 90;
  else if (placement === "right") rotation = 270;

  // CORRECCIÓN: Ajuste de márgenes para centrar la punta
  const marginTop = (placement === "below" || placement === "bottom") ? 0 : (placement === "above" || placement === "top") ? -size : -size/2;
  const marginLeft = (placement === "right") ? 0 : (placement === "left") ? -size : -size/2;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute motion-safe:animate-bounce transition-all duration-300 ease-out will-change-transform"
        style={{ 
            top: pos.top, 
            left: pos.left,
            marginTop,
            marginLeft,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.3))" 
          }}
        >
          <defs>
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path
            d="M32 4 L56 36 H40 V60 H24 V36 H8 Z"
            fill="url(#arrowGradient)"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>,
    document.body
  );
}