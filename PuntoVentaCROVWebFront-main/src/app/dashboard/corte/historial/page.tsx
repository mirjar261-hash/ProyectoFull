'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { formatFecha } from '@/lib/date';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Usuario {
  nombre: string;
  apellidos?: string;
}

interface Corte {
  id: number;
  fecha: string;
  monto_esperado: number;
  monto_reportado: number;
  usuarioEntrega?: Usuario;
  usuarioRecibe?: Usuario;
}

interface Detalle {
  tipo: string;
  monto: number;
  comentarios?: string | null;
  fecha: string;
}

// === DEFINICIÓN DE LOS PASOS DE LA GUÍA ===

const GUIDE_STEPS_NORMAL: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Historial de Cortes",
    content: "Bienvenido al historial. Aquí puedes consultar, auditar y gestionar todos los cortes de caja realizados.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "date-filters",
    title: "2. Filtrar por Fecha",
    content: "Utiliza estos selectores para definir el rango de fechas que deseas consultar. Por defecto muestra la semana actual.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "table-header-users",
    title: "3. Responsables",
    content: "Identifica rápidamente quién entregó el dinero (cajero) y quién recibió/validó el corte (supervisor/gerente).",
    placement: "bottom",
    modalPosition: "center"
  },
  {
    targetKey: "table-header-amounts",
    title: "4. Auditoría de Montos",
    content: "Compara lo que el sistema esperaba contra lo que realmente se reportó. La columna 'Diferencia' te alertará de faltantes o sobrantes.",
    placement: "bottom",
    modalPosition: "center"
  },
  {
    targetKey: "action-view",
    title: "5. Ver Detalles",
    content: "Haz clic en el 'Ojo' para ver el desglose detallado: cuánto fue en efectivo, tarjeta, transferencias y comentarios específicos.",
    placement: "left",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "action-delete",
    title: "6. Eliminar Corte",
    content: "Si hubo un error administrativo grave, puedes eliminar el registro del corte aquí (requiere permisos).",
    placement: "left",
    modalPosition: "bottom-right"
  }
];

const GUIDE_STEPS_EMPTY: GuideStep[] = [
  {
    targetKey: "page-title",
    title: "1. Sin Registros Recientes",
    content: "No se encontraron cortes de caja en las fechas seleccionadas.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "date-filters",
    title: "2. Ajustar Búsqueda",
    content: "Intenta cambiar las fechas de 'Inicio' y 'Fin' para buscar registros más antiguos.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "page-title", 
    title: "3. Realizar Corte",
    content: "Si es una sucursal nueva, asegúrate de realizar el primer corte desde el módulo de 'Caja' o 'Punto de Venta'.",
    placement: "bottom",
    modalPosition: "center"
  }
];

const formatCurrency = (value: number) =>
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function HistorialCortesPage() {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para la guía
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fechaInicio, setFechaInicio] = useState(
    monday.toISOString().substring(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(
    sunday.toISOString().substring(0, 10)
  );

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalId = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;

  const cargarCortes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${apiUrl}/corte-dia/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&sucursalId=${sucursalId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCortes(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar cortes');
      setCortes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCortes();
  }, [fechaInicio, fechaFin]);

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = () => {
    if (cortes.length > 0) {
      setCurrentSteps(GUIDE_STEPS_NORMAL);
    } else {
      setCurrentSteps(GUIDE_STEPS_EMPTY);
    }
    setGuideActive(true);
    setCurrentStepIndex(0);
  };

  const closeGuide = () => setGuideActive(false);

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeGuide();
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Auto-inicio de la guía la primera vez
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenHistorialCortesGuide');
    if (!hasSeenGuide && !loading) {
      // Esperamos un momento para asegurar que la UI esté lista
      const timer = setTimeout(() => {
        startGuide();
        localStorage.setItem('hasSeenHistorialCortesGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading]); // Se ejecuta cuando termina de cargar

  const verDetalles = async (id: number) => {
    try {
      const res = await axios.get(
        `${apiUrl}/corte-dia-detalle?id_corte=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetalles(res.data);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalles');
    }
  };

  const eliminarCorte = async (id: number) => {
    if (!confirm('¿Deseas eliminar este corte?')) return;
    try {
      await axios.delete(`${apiUrl}/corte-dia/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Corte eliminado');
      cargarCortes();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar corte');
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* --- GUÍA INTERACTIVA --- */}
      {guideActive && currentSteps.length > 0 && (
        <>
          <GuideArrowOverlay 
            activeKey={currentSteps[currentStepIndex].targetKey}
            placement={currentSteps[currentStepIndex].placement} 
          />
          <GuideModal 
            isOpen={guideActive}
            step={currentSteps[currentStepIndex]}
            currentStepIndex={currentStepIndex}
            totalSteps={currentSteps.length}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={closeGuide}
          />
        </>
      )}

      {/* TITULO */}
      <h1 className="text-2xl font-bold text-orange-600" data-guide="page-title">Historial de cortes</h1>
      
      {/* BOTÓN GUÍA (Debajo del título) */}
      <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startGuide}>
              <BookOpen className="w-4 h-4 mr-2" /> Guía Interactiva
          </Button>
      </div>

      <div className="flex gap-4" data-guide="date-filters">
        <div>
          <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Fecha fin</label>
          <Input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead data-guide="table-header-users">Usuario recibe</TableHead>
            <TableHead>Usuario entrega</TableHead>
            <TableHead data-guide="table-header-amounts">Monto esperado</TableHead>
            <TableHead>Monto reportado</TableHead>
            <TableHead>Diferencia</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cortes.map((c, index) => (
            <TableRow key={c.id}>
              <TableCell>{formatFecha(c.fecha)}</TableCell>
              <TableCell>
                {c.usuarioRecibe
                  ? `${c.usuarioRecibe.nombre} ${c.usuarioRecibe.apellidos || ''}`
                  : ''}
              </TableCell>
              <TableCell>
                {c.usuarioEntrega
                  ? `${c.usuarioEntrega.nombre} ${c.usuarioEntrega.apellidos || ''}`
                  : ''}
              </TableCell>
              <TableCell>{formatCurrency(Number(c.monto_esperado))}</TableCell>
              <TableCell>{formatCurrency(Number(c.monto_reportado))}</TableCell>
              <TableCell>
                {formatCurrency(
                  Number(c.monto_esperado) - Number(c.monto_reportado)
                )}
              </TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => verDetalles(c.id)}
                  // Solo asignamos el data-guide al primer elemento para que la flecha apunte allí
                  data-guide={index === 0 ? "action-view" : undefined}
                >
                  <Eye size={16} />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => eliminarCorte(c.id)}
                  // Solo asignamos el data-guide al primer elemento
                  data-guide={index === 0 ? "action-delete" : undefined}
                >
                  <Trash2 size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {cortes.length === 0 && !loading && (
             <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron cortes en este rango de fechas.
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del corte</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalles.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.tipo}</TableCell>
                  <TableCell>{formatCurrency(Number(d.monto))}</TableCell>
                  <TableCell>{d.comentarios || ''}</TableCell>
                  <TableCell>{formatFecha(d.fecha)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}