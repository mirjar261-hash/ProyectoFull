'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Store, BrainCircuit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PLAN_NEGOCIOS = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS || '';
const PLAN_INTELIGENTE = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE || '';
const PLAN_NEGOCIOS_ANUAL = process.env.NEXT_PUBLIC_PLAN_NEGOCIOS_ANUAL || '';
const PLAN_INTELIGENTE_ANUAL = process.env.NEXT_PUBLIC_PLAN_INTELIGENTE_ANUAL || '';

interface PlanOption {
  nombre: string;
  descripcion: string;
  precio: string;
  priceId: string;
  Icon: LucideIcon;
  beneficios: string[];
}

const PLANES: PlanOption[] = [
  {
    nombre: 'Negocios',
    descripcion: 'Ideal para negocios',
    precio: '$299',
    priceId: PLAN_NEGOCIOS,
    Icon: Store,
    beneficios: [
      'Inventario, ventas, compras, clientes y proveedores',
      'Recargas y pagos de servicios',
      'Cortes del día y reportes',
      'Soporte 24/7 con nuestro asistente CROV',
    ],
  },
  {
    nombre: 'Negocios anual',
    descripcion: 'Ideal para negocios',
    precio: '$3,289',
    priceId: PLAN_NEGOCIOS_ANUAL,
    Icon: Store,
    beneficios: [
      'Inventario, ventas, compras, clientes y proveedores',
      'Recargas y pagos de servicios',
      'Cortes del día y reportes',
      'Soporte 24/7 con nuestro asistente CROV',
    ],
  },
  {
    nombre: 'Inteligente',
    descripcion: 'Con inteligencia artificial',
    precio: '$499',
    priceId: PLAN_INTELIGENTE,
    Icon: BrainCircuit,
    beneficios: [
      'Todo el paquete Negocios',
      'Gerente CROV que analiza tus ventas',
      'Sugiere promociones con IA',
    ],
  },
  {
    nombre: 'Inteligente anual',
    descripcion: 'Con inteligencia artificial',
    precio: '$5,489',
    priceId: PLAN_INTELIGENTE_ANUAL,
    Icon: BrainCircuit,
    beneficios: [
      'Todo el paquete Negocios',
      'Gerente CROV que analiza tus ventas',
      'Sugiere promociones con IA',
    ],
  },
];

function RenewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [error, setError] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const queryEmpresa = searchParams?.get('empresaId') ?? null;
    const storedEmpresa = localStorage.getItem('empresaId');
    const token = localStorage.getItem('token');
    const fechaGuardada = localStorage.getItem('fechaVencimientoEmpresa');

    if (!token) {
      router.replace('/');
      return;
    }

    const finalEmpresa = queryEmpresa || storedEmpresa || '';
    if (queryEmpresa && queryEmpresa !== storedEmpresa) {
      localStorage.setItem('empresaId', queryEmpresa);
    }

    if (!finalEmpresa) {
      setError('No pudimos identificar tu empresa. Inicia sesión nuevamente.');
      return;
    }

    if (fechaGuardada) {
      try {
        const fecha = new Date(fechaGuardada);
        setFechaVencimiento(
          fecha.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        );
      } catch (err) {
        console.error('No se pudo formatear la fecha de vencimiento', err);
      }
    }

    setEmpresaId(finalEmpresa);
  }, [router, searchParams]);

  const planSeleccionado = useMemo(
    () => PLANES.find((plan) => plan.nombre === selectedPlan),
    [selectedPlan]
  );

  const handleContinuar = () => {
    if (!planSeleccionado) {
      setError('Selecciona un paquete para continuar.');
      return;
    }

    if (!empresaId) {
      setError('No pudimos identificar tu empresa. Inicia sesión nuevamente.');
      return;
    }

    setError('');
    router.push(
      `/payment?plan=${encodeURIComponent(planSeleccionado.nombre)}&renew=1&empresaId=${empresaId}`
    );
  };

  return (
    <main className="relative w-full min-h-screen flex items-center justify-center px-4">
      <Image src="/login-background.svg" alt="Fondo" fill className="object-cover -z-10" />
      <Card className="w-full max-w-4xl border border-orange-200 shadow-xl rounded-2xl bg-white/90 backdrop-blur">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-orange-600">Tu acceso ha expirado</h1>
            <p className="text-sm text-gray-600">
              Selecciona uno de nuestros paquetes para reactivar tu cuenta por un mes adicional.
            </p>
            {fechaVencimiento && (
              <p className="text-xs text-gray-500">
                Fecha de vencimiento anterior: <strong>{fechaVencimiento}</strong>
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PLANES.map((plan) => {
              const Icon = plan.Icon;
              const activo = selectedPlan === plan.nombre;
              return (
                <label key={plan.nombre} className="cursor-pointer">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.nombre}
                    checked={activo}
                    onChange={() => {
                      setSelectedPlan(plan.nombre);
                      setError('');
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`h-full rounded-2xl border p-6 shadow-md transition-all duration-300 bg-white hover:shadow-lg flex flex-col justify-between ${
                      activo
                        ? 'border-orange-500 ring-2 ring-orange-500'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2 text-center">
                      <Icon className="w-10 h-10 text-orange-500" />
                      <h2 className="text-xl font-bold text-gray-800">{plan.nombre}</h2>
                      <p className="text-3xl font-bold text-orange-500">{plan.precio}</p>
                      <p className="text-sm text-gray-500">{plan.descripcion}</p>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-gray-700">
                      {plan.beneficios.map((beneficio) => (
                        <li key={beneficio} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span>{beneficio}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button
            onClick={handleContinuar}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Continuar con el pago
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.replace('/')}
          >
            Regresar al inicio de sesión
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function RenewPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RenewPageContent />
    </Suspense>
  );
}
