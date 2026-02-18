'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle, Store } from 'lucide-react';

type PackageIconKey = 'store' | 'brain';

export type PackageOption = {
  name: string;
  price: string;
  description: string;
  icon: PackageIconKey;
  benefits: string[];
};

const packageIcons: Record<PackageIconKey, LucideIcon> = {
  store: Store,
  brain: BrainCircuit,
};

function chunkPackages(packages: PackageOption[], size: number) {
  const chunks: PackageOption[][] = [];

  for (let i = 0; i < packages.length; i += size) {
    chunks.push(packages.slice(i, i + size));
  }

  return chunks;
}

export default function PackagesCarousel({ packages }: { packages: PackageOption[] }) {
  const slides = useMemo(() => chunkPackages(packages, 2), [packages]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < slides.length - 1;

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/30 p-2">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div key={index} className="grid w-full shrink-0 grid-cols-1 gap-6 px-4 md:grid-cols-2">
              {slide.map((pkg) => {
                const Icon = packageIcons[pkg.icon];

                return (
                  <div
                    key={pkg.name}
                    className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm transition hover:shadow-lg"
                  >
                    <div className="flex flex-col items-center space-y-3 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
                        {Icon && <Icon className="h-7 w-7 text-orange-500" />}
                      </span>
                      <h3 className="text-2xl font-semibold text-slate-900">{pkg.name}</h3>
                      <p className="text-4xl font-bold text-orange-500">{pkg.price}</p>
                      <p className="text-sm text-slate-500">{pkg.description}</p>
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-slate-600">
                      {pkg.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-3 text-left">
                          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 sm:justify-center sm:gap-6">
        <button
          type="button"
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={!canGoPrev}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-orange-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              aria-label={`Ir a la página ${idx + 1}`}
              onClick={() => goToSlide(idx)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                idx === currentSlide ? 'bg-orange-500' : 'bg-slate-200 hover:bg-orange-200'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={!canGoNext}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-orange-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
