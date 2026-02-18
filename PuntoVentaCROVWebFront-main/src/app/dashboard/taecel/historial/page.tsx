'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { formatFecha } from '@/lib/date';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Recarga {
  id: number;
  fecha: string;
  numero_telefonico: string;
  operadorSku?: {
    operador_movil?: {
      nombre?: string;
    }
  };
  monto_pagado: number;
  status_taecel: string;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const GUIDE_STEPS: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Historial de Recargas",
    content: "Aquí puedes consultar el registro detallado de todas las recargas electrónicas realizadas por tu usuario.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "date-filters",
    title: "2. Filtrar por Fecha",
    content: "Utiliza estos selectores para definir un rango de fechas específico. El sistema buscará todas las transacciones dentro de ese periodo.",
    placement: "right",
    modalPosition: "bottom-left" 
  },
  {
    targetKey: "table-headers",
    title: "3. Detalles de la Operación",
    content: "En la tabla verás la fecha exacta, la compañía telefónica, el número celular recargado y el monto.",
    placement: "bottom",
    modalPosition: "bottom-center"
  },
  {
    targetKey: "col-status",
    title: "4. Estatus de la Recarga",
    content: "Esta columna es muy importante. Te indicará si la recarga fue 'EXITOSA' o si hubo algún error en el proceso.",
    placement: "left", 
    modalPosition: "bottom-center"
  }
];

export default function HistorialRecargasPage() {
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const toISODate = (d: Date) => d.toISOString().substring(0, 10);

  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const hoy = new Date();
  const mesPasado = new Date(hoy);
  mesPasado.setMonth(mesPasado.getMonth() - 1);
  const [fechaInicio, setFechaInicio] = useState(toISODate(mesPasado));
  const [fechaFin, setFechaFin] = useState(toISODate(hoy));

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userIdSession =
    typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;

  const firstLoad = useRef(true);

  const startGuide = () => {
    setGuideActive(true);
    setCurrentStepIndex(0);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenHistorialTaecelGuide';
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

  const cargarHistorial = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/recarga/historial/${userIdSession}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { fechaInicio, fechaFin },
        }
      );
      setRecargas(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar historial de recargas');
    }
  };

  useEffect(() => {
    if (!token) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      cargarHistorial();
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setFechaInicio(fechaFin);
      setFechaFin(fechaFin); 
      return;
    }

    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, token]);

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

      <h1 className="text-2xl font-bold text-orange-600 mb-2" data-guide="page-title">Historial de recargas</h1>
      
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={startGuide}>
            <BookOpen className="w-4 h-4 mr-2" /> Guía Interactiva
        </Button>
      </div>

      <div className="flex items-end gap-4" data-guide="date-filters">
        <div>
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <Input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow data-guide="table-headers">
            <TableHead>Fecha</TableHead>
            <TableHead>Compañía</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead data-guide="col-status">Estatus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recargas.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatFecha(r.fecha)}</TableCell>
              <TableCell>{r.operadorSku?.operador_movil?.nombre || ''}</TableCell>
              <TableCell>{r.numero_telefonico}</TableCell>
              <TableCell>{formatCurrency(Number(r.monto_pagado))}</TableCell>
              <TableCell>{r.status_taecel}</TableCell>
            </TableRow>
          ))}
          {recargas.length === 0 && (
             <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No hay recargas en este rango de fechas.
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}