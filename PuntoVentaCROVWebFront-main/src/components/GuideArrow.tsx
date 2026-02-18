"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type GuidePlacement = "above" | "below" | "left" | "right";

export interface GuideTargetConfig {
  key?: string;
  placement?: GuidePlacement;
  offset?: number;
  label?: string;
  end?: boolean;
}

interface ArrowProps {
  activeKey?: string | null;
  defaultPlacement?: GuidePlacement;
  defaultOffset?: number;
  size?: number;
  showConnector?: boolean;
}

export default function GuideArrowOverlay({
  activeKey = null,
  defaultPlacement = "above",
  defaultOffset = 12,
  size = 34,
  showConnector = true,
}: ArrowProps) {
  const [key, setKey] = useState<string | null>(activeKey);
  const [placement, setPlacement] = useState<GuidePlacement>(defaultPlacement);
  const [offset, setOffset] = useState<number>(defaultOffset);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);

  const target = useMemo(() => {
    if (!key) return null;
    return document.querySelector(`[data-guide="${key}"]`) as HTMLElement | null;
  }, [key]);

  const clearHighlight = (el?: HTMLElement | null) => {
    const node = el ?? lastTargetRef.current;
    if (!node) return;
    node.style.boxShadow = "";
    node.style.transform = "";
  };

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const hideArrow = () => {
    stopRaf();
    setVisible(false);
    setPos(null);
    setTargetRect(null);
    clearHighlight();
  };

  const update = () => {
    if (!target) {
      hideArrow();
      return;
    }
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let tipTop = 0;
    let tipLeft = 0;
    switch (placement) {
      case "above":
        tipTop = rect.top + scrollY - offset;
        tipLeft = rect.left + scrollX + rect.width / 2;
        break;
      case "below":
        tipTop = rect.bottom + scrollY + offset;
        tipLeft = rect.left + scrollX + rect.width / 2;
        break;
      case "left":
        tipTop = rect.top + scrollY + rect.height / 2;
        tipLeft = rect.left + scrollX - offset;
        break;
      case "right":
        tipTop = rect.top + scrollY + rect.height / 2;
        tipLeft = rect.right + scrollX + offset;
        break;
    }

    setPos({ top: tipTop, left: tipLeft });
    setTargetRect(rect);
    setVisible(true);

    if (lastTargetRef.current !== target) {
      clearHighlight(lastTargetRef.current);
    }
    lastTargetRef.current = target;
    target.style.transition = "box-shadow 0.3s ease, transform 0.3s ease";
    target.style.boxShadow = "0 0 18px rgba(255,163,90,0.9)";
    target.style.transform = "scale(1.05)";
  };

  useEffect(() => {
    const handle = (ev: Event) => {
      const ce = ev as CustomEvent<GuideTargetConfig>;
      if (ce.detail?.end || ce.detail?.key === "" || ce.detail?.key == null) {
        setKey(null);
        hideArrow();
        return;
      }
      if (ce.detail?.key !== undefined) setKey(ce.detail.key);
      if (ce.detail?.placement) setPlacement(ce.detail.placement);
      if (typeof ce.detail?.offset === "number") setOffset(ce.detail.offset);
      setLabel(ce.detail?.label);
    };
    window.addEventListener("guide:step", handle as EventListener);
    return () => window.removeEventListener("guide:step", handle as EventListener);
  }, []);

  useEffect(() => {
    if (!key) hideArrow();
  }, [key]);

  useEffect(() => {
    if (!target) return;
    try {
      target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    } catch {}

    const onFrame = () => {
      update();
      rafRef.current = requestAnimationFrame(onFrame);
    };
    rafRef.current = requestAnimationFrame(onFrame);

    const onScrollOrResize = () => update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      stopRaf();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      clearHighlight(target);
    };
  }, [target, placement, offset, size]);

  if (typeof document === "undefined") return null;
  if (!visible || !pos || !targetRect) return null;

  const rotation = placement === "above" ? 180 : placement === "below" ? 0 : placement === "left" ? 90 : 270;

  const scale = size / 64;
  const tipOffset = (() => {
    switch (placement) {
      case "below":
        return { dx: 32 * scale, dy: 6 * scale };
      case "above":
        return { dx: 32 * scale, dy: 58 * scale };
      case "left":
        return { dx: 58 * scale, dy: 32 * scale };
      case "right":
      default:
        return { dx: 6 * scale, dy: 32 * scale };
    }
  })();

  const targetCenter = {
    x: targetRect.left + (window.scrollX || window.pageXOffset) + targetRect.width / 2,
    y: targetRect.top + (window.scrollY || window.pageYOffset) + targetRect.height / 2,
  };

  const arrowPoint = { x: pos.left, y: pos.top };
  const dx = targetCenter.x - arrowPoint.x;
  const dy = targetCenter.y - arrowPoint.y;
  const ctrl1 = { x: arrowPoint.x + dx * 0.3, y: arrowPoint.y + dy * 0.1 };
  const ctrl2 = { x: arrowPoint.x + dx * 0.7, y: arrowPoint.y + dy * 0.9 };

  const node = (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {showConnector && (
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <linearGradient id="connGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffd6a9" />
              <stop offset="100%" stopColor="#ff9c6a" />
            </linearGradient>
          </defs>
          <path
            d={`M ${arrowPoint.x},${arrowPoint.y} C ${ctrl1.x},${ctrl1.y} ${ctrl2.x},${ctrl2.y} ${targetCenter.x},${targetCenter.y}`}
            stroke="url(#connGrad)"
            strokeWidth={2}
            fill="none"
            className="opacity-70 [stroke-dasharray:6_8] motion-safe:[animation:dash 1.4s linear infinite]"
          />
          <style>{`@keyframes dash { to { stroke-dashoffset: -60; } }`}</style>
        </svg>
      )}

      <div
        className="absolute motion-safe:animate-bounce"
        style={{ top: pos.top - tipOffset.dy, left: pos.left - tipOffset.dx }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          style={{ transform: `rotate(${rotation}deg)` }}
          className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
        >
          <defs>
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffe1b8" />
              <stop offset="55%" stopColor="#ffb176" />
              <stop offset="100%" stopColor="#ff7b5a" />
            </linearGradient>
          </defs>
          <path
            d="M32 6 L58 34 H42 V58 H22 V34 H6 Z"
            fill="url(#arrowGradient)"
            stroke="#ffffff"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </svg>
        {label && (
          <div className="mt-2 px-3 py-1.5 text-[12px] font-medium text-amber-900 bg-amber-100/95 rounded-full shadow-lg border border-amber-200/70 mx-auto w-max">
            {label}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
