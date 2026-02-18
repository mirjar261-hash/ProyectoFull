'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, Info, Sparkles } from 'lucide-react';

const FORCE_ALL_MODULE_GUIDES = false; // true para desarrollo/testing
const MODULE_GUIDE_VERSION = '1';

interface ModuleGuideProps {
  moduleKey: string;  
  title: string;
  description?: string;
  tips?: string[];
  icon?: React.ComponentType<any>;
  alwaysShow?: boolean;
  primaryCta?: { label: string; onClick: () => void };
  secondaryCta?: { label: string; onClick: () => void };

  forceOpenOnce?: boolean;             // default: false
  onForceOpenConsumed?: () => void;
}

export default function ModuleGuide({
  moduleKey,
  title,
  description,
  tips = [],
  icon: Icon = Info,
  alwaysShow = false,
  primaryCta,
  secondaryCta,
  forceOpenOnce = false,               // default false
  onForceOpenConsumed,
}: ModuleGuideProps) {

  const seenKey  = useMemo(() => `module-guide:seen:${moduleKey}:${MODULE_GUIDE_VERSION}`, [moduleKey]);
  const neverKey = useMemo(() => `module-guide:never:${moduleKey}`, [moduleKey]);

  const [open, setOpen] = useState(false);

  // inicializa el checkbox según lo guardado
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(neverKey) === '1';
  });

  useEffect(() => {
   if (!title) return;

    const walkthroughDone = localStorage.getItem('walkthrough-complete') === '1';
    if (!walkthroughDone && !alwaysShow) return; // evita encimar con el Walkthrough␊

    const never = localStorage.getItem(neverKey) === '1';
    if (!FORCE_ALL_MODULE_GUIDES && never) return;

    if (forceOpenOnce) {
      setOpen(true);
      onForceOpenConsumed?.();
      return;
    }

    const seen = localStorage.getItem(seenKey) === MODULE_GUIDE_VERSION;
    if (!FORCE_ALL_MODULE_GUIDES && seen && !alwaysShow) return;

    setOpen(true);
  }, [title, neverKey, seenKey, alwaysShow, forceOpenOnce, onForceOpenConsumed]);


  const handleClose = () => {
    setOpen(false);

    if (dontShowAgain) {
      localStorage.setItem(neverKey, '1');
    } else {
      localStorage.removeItem(neverKey);
      localStorage.setItem(seenKey, MODULE_GUIDE_VERSION);
      // localStorage.setItem(seenKey, '1');

    }
  };


  if (!title) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
        <div className="relative">
          <div className="h-24 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
          <div className="absolute -bottom-8 left-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white dark:bg-neutral-900 shadow-lg p-3">
              <Icon className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex flex-col">
              <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm">
                Guía del módulo
              </span>
              <h2 className="text-xl font-semibold leading-snug mt-1">{title}</h2>
            </div>
          </div>

          <button
            aria-label="Cerrar"
            onClick={handleClose}
            className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-white p-1 shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <X className="h-4 w-4 text-black" />
          </button>
        </div>

        <div className="px-6 pt-10 pb-5">
          {description && (
            <DialogHeader className="p-0">
              <DialogTitle className="sr-only">{title}</DialogTitle>
              <DialogDescription className="text-[0.95rem] text-muted-foreground">
                {description}
              </DialogDescription>
            </DialogHeader>
          )}

          {tips.length > 0 && (
            <>
              <div className="my-4 h-px w-full bg-gray-200" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-medium">Sugerencias rápidas</p>
                </div>
                <ul className="space-y-2">
                  {tips.map((t, i) => (
                    <li
                      key={`${moduleKey}-tip-${i}`}
                      className="flex items-start gap-3 opacity-0 translate-y-1"
                      style={{ animation: 'mg-fade-in 260ms ease-out forwards', animationDelay: `${i * 60}ms` }}
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-sm text-muted-foreground">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                id="dont-show-again"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <label htmlFor="dont-show-again" className="text-sm text-muted-foreground select-none">
                No volver a mostrar para este módulo
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cerrar
              </Button>

              {secondaryCta && (
                <Button variant="outline" onClick={secondaryCta.onClick}>
                  {secondaryCta.label}
                </Button>
              )}

              {primaryCta && (
                <Button onClick={() => { primaryCta.onClick(); handleClose(); }}>
                  {primaryCta.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <style jsx>{`
        @keyframes mg-fade-in {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Dialog>
  );
}
