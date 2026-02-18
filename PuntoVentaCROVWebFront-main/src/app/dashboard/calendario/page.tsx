'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Actividad {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_calendario: string; 
  usuarioActividad?: { nombre: string; apellidos?: string };
  usuario_id: number;
}

// ==========================================
// DEFINICIÓN DE LOS FLUJOS DE GUÍA (AGENDA)
// ==========================================

const GUIDE_FLOW_CREATE: GuideStep[] = [
  {
    targetKey: "grid-calendario",
    title: "1. Seleccionar Día",
    content: "Haz clic en cualquier día del calendario para agregar una nueva actividad.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "input-titulo",
    title: "2. Detalles",
    content: "Escribe un título y descripción para la actividad.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-fecha",
    title: "3. Fecha y Hora",
    content: "Ajusta la hora exacta del evento.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "select-usuario",
    title: "4. Asignar",
    content: "Selecciona el usuario responsable de esta actividad.",
    placement: "top",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "check-repetir",
    title: "5. Repetición (Opcional)",
    content: "Marca esta casilla si deseas que la actividad se repita en los próximos meses.",
    placement: "top",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "btn-guardar",
    title: "6. Guardar",
    content: "Haz clic en 'Registrar' para agendar el evento.",
    placement: "top",
    modalPosition: "bottom-right"
  }
];

const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "item-actividad", 
    title: "1. Modificar Evento",
    content: "Haz clic sobre cualquier actividad existente (barra naranja) para ver detalles, editarla o eliminarla.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-eliminar",
    title: "2. Eliminar",
    content: "Usa este botón si deseas borrar la actividad de la agenda.",
    placement: "top",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-actualizar",
    title: "3. Actualizar",
    content: "Guarda los cambios realizados en el formulario.",
    placement: "top",
    modalPosition: "bottom-right"
  }
];

const GUIDE_FLOW_NAV: GuideStep[] = [
  {
    targetKey: "nav-controles",
    title: "1. Navegación",
    content: "Usa estas flechas para cambiar de mes y planificar a futuro.",
    placement: "bottom",
    modalPosition: "bottom-left"
  }
];

// --- Helpers: hora de pared (sin zona) ---
const RX_WALL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const pad = (n: number) => String(n).padStart(2, '0');

function toLocalInputValue(dateLike: string | number | Date) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function parseWallTimeString(s: string): Date {
  const m = s.match(RX_WALL);
  if (!m) return new Date(s);
  const [, y, mo, d, hh, mi, ss] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mi),
    ss ? Number(ss) : 0
  );
}

function toInputFromAny(s: string): string {
  const m = s.match(RX_WALL);
  if (m) {
    const [, y, mo, d, hh, mi] = m;
    return `${y}-${mo}-${d}T${hh}:${mi}`;
  }
  return toLocalInputValue(new Date(s));
}

export default function CalendarioPage() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Actividad | null>(null);
  const [form, setForm] = useState<Partial<Actividad>>({});
  const [loading, setLoading] = useState(false);
  const [repetir, setRepetir] = useState(false);
  const [numMeses, setNumMeses] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // === ESTADO DE LA GUÍA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const startGuide = (mode: 'CREATE' | 'EDIT' | 'NAV') => {
    let steps = GUIDE_FLOW_CREATE;
    if (mode === 'EDIT') steps = GUIDE_FLOW_EDIT;
    if (mode === 'NAV') steps = GUIDE_FLOW_NAV;

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

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

  // === NUEVO: ESCUCHAR EVENTOS DEL CHATBOT ===
  useEffect(() => {
    const handleGuideTrigger = (event: Event) => {
      const customEvent = event as CustomEvent;
      const guideCode = customEvent.detail.guide;

      if (guideCode === 'AGENDA_CREATE') {
         startGuide('CREATE');
         toast.info("Iniciando guía de creación...");
      } 
      else if (guideCode === 'AGENDA_EDIT') {
         startGuide('EDIT');
         toast.info("Iniciando guía de edición...");
      }
      else if (guideCode === 'AGENDA_NAV') {
         startGuide('NAV');
         toast.info("Iniciando guía de navegación...");
      }
    };

    window.addEventListener('trigger-guide', handleGuideTrigger);
    
    // Limpieza
    return () => {
      window.removeEventListener('trigger-guide', handleGuideTrigger);
    };
  }, []);

  // --- Efectos de la guía (Pasos automáticos) ---
  useEffect(() => {
    if (guideActive && modalOpen) {
        const step = currentSteps[currentStepIndex];
        if (step?.targetKey === "grid-calendario") setTimeout(() => { handleNextStep(); }, 300);
        if (step?.targetKey === "item-actividad") setTimeout(() => { handleNextStep(); }, 300);
    }
  }, [modalOpen, guideActive, currentStepIndex, currentSteps]);

  useEffect(() => {
    if (guideActive && !modalOpen && currentStepIndex > 0) {
        const step = currentSteps[currentStepIndex];
        if (step?.targetKey === "btn-guardar" || step?.targetKey === "btn-actualizar" || step?.targetKey === "btn-eliminar") {
             closeGuide();
             toast.success("¡Acción completada!");
        }
    }
  }, [modalOpen, guideActive, currentStepIndex, currentSteps]);

  // --- Auto-start primera vez ---
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenAgendaGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('CREATE'); 
        localStorage.setItem('hasSeenAgendaGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users/activos?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cargarActividades = async () => {
    const mes = fechaActual.getMonth() + 1;
    const anio = fechaActual.getFullYear();
    const url = `${apiUrl}/actividad/mes?mes=${mes}&anio=${anio}&sucursalId=${sucursalIdSession}`;
    try {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setActividades(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    cargarActividades();
  }, [fechaActual]);

  const abrirModalNueva = (fecha: Date, actividad?: Actividad) => {
    setEditando(actividad || null);
    setForm({
      titulo: actividad?.titulo || '',
      descripcion: actividad?.descripcion || '',
      usuario_id: actividad?.usuario_id,
      fecha_calendario: actividad
        ? toInputFromAny(actividad.fecha_calendario)
        : toLocalInputValue(fecha),
    });
    setRepetir(false);
    setNumMeses(1);
    setModalOpen(true);
  };

  const guardarActividad = async () => {
    if (!form.titulo || !form.fecha_calendario || !form.usuario_id) {
      toast.error('Completa los campos requeridos');
      return;
    }
    const base = form.fecha_calendario as string;
    const fechaPlano = RX_WALL.test(base) && base.length === 16 ? `${base}:00` : base;

    const payload = {
      ...form,
      fecha_calendario: fechaPlano, 
      sucursalId: sucursalIdSession,
      activo: 1,
    };

    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/actividad/${editando.id}`, payload, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        toast.success('Actividad actualizada');
      } else {
        await axios.post(`${apiUrl}/actividad`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (repetir && numMeses > 1) {
          const baseLocal = parseWallTimeString(base);
          for (let i = 1; i < numMeses; i++) {
            const clone = new Date(baseLocal);
            clone.setMonth(clone.getMonth() + i);
            const nextLocalStr = toLocalInputValue(clone);
            const nextPlano = `${nextLocalStr}:00`;
            const nuevoPayload = { ...payload, fecha_calendario: nextPlano };
            await axios.post(`${apiUrl}/actividad`, nuevoPayload, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
        toast.success('Actividad registrada');
      }
      setModalOpen(false);
      cargarActividades();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // --- RENDERIZADO DEL MES (ALTO CONTRASTE LIMPIO) ---
  const renderMes = () => {
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cells: (Date | null)[] = [];

    const today = new Date();

    for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    while (cells.length < totalCells) cells.push(null);

    return (
      <div className="grid grid-cols-7 text-sm border-t border-l" data-guide="grid-calendario">
        {diasSemana.map((d) => (
          <div key={d} className="p-2 text-center font-medium bg-gray-50 border-r border-b text-gray-700">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          // Lógica para detectar si es HOY
          const isToday = day && 
             day.getDate() === today.getDate() &&
             day.getMonth() === today.getMonth() &&
             day.getFullYear() === today.getFullYear();

          return (
            <div
              key={i}
              // ESTILO DEL CONTENEDOR DEL DÍA
              className={`h-28 p-1 border-r border-b cursor-pointer transition-colors
                ${isToday 
                  ? 'bg-orange-50 ring-2 ring-inset ring-orange-600 z-10' 
                  : 'hover:bg-orange-50 bg-white'
                }
              `}
              onClick={() => day && abrirModalNueva(day)}
            >
              {day && (
                <div 
                  // ESTILO DEL NÚMERO DEL DÍA
                  className={`text-xs px-2 py-1 rounded-full w-fit mb-1
                    ${isToday 
                        ? 'bg-orange-600 text-white font-bold shadow-sm' 
                        : 'font-semibold text-gray-700'
                    }
                  `}
                >
                  {day.getDate()}
                </div>
              )}
              {day &&
                actividades
                  .filter((a) => {
                    const f = parseWallTimeString(a.fecha_calendario);
                    return (
                      f.getDate() === day.getDate() &&
                      f.getMonth() === day.getMonth() &&
                      f.getFullYear() === day.getFullYear()
                    );
                  })
                  .map((a, idx) => (
                    <div
                      key={a.id}
                      data-guide={idx === 0 ? "item-actividad" : undefined}
                      className="mt-1 truncate rounded bg-orange-200 border border-orange-300 p-1 text-xs cursor-pointer hover:bg-orange-300 text-orange-900 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalNueva(day, a);
                      }}
                    >
                      {a.titulo}
                    </div>
                  ))}
            </div>
          );
        })}
      </div>
    );
  };

  const cambiarFecha = (dir: number) => {
    const f = new Date(fechaActual);
    f.setMonth(fechaActual.getMonth() + dir);
    setFechaActual(f);
  };

  const eliminarActividad = async () => {
    if (!editando) return;
    setLoadingDelete(true);
    try {
      await axios.delete(`${apiUrl}/actividad/${editando.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Actividad eliminada');
      setConfirmDelete(false);
      setModalOpen(false);
      setEditando(null);
      setForm({});
      cargarActividades();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      
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

      {/* TÍTULO */}
      <h1 className="flex items-center gap-2 text-2xl font-bold text-orange-600 mb-2">
        <CalendarDays size={28} /> Calendario
      </h1>

      {/* BOTÓN DE GUÍA */}
      <div className="relative inline-block text-left mb-4">
          <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowGuideMenu(!showGuideMenu)}
              className="flex items-center gap-2"
          >
              <BookOpen className="w-4 h-4" />
              Guía Interactiva
              <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
          </Button>
          
          {showGuideMenu && (
              <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="py-1">
                    <button onClick={() => startGuide('CREATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">➕ Agendar Actividad</button>
                    <button onClick={() => startGuide('EDIT')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">✏️ Editar / Eliminar</button>
                    <button onClick={() => startGuide('NAV')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border-t">📅 Navegación</button>
                </div>
              </div>
          )}
      </div>

      {/* CONTROLES DE NAVEGACIÓN (MES) */}
      <div className="flex items-center justify-between gap-4" data-guide="nav-controles">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => cambiarFecha(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold w-40 text-center">
            {fechaActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </span>
          <Button size="icon" variant="outline" onClick={() => cambiarFecha(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-visible p-1">{renderMes()}</div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setConfirmDelete(false);
        }}
      >
        <DialogOverlay className="bg-transparent fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-lg mx-auto shadow-xl border p-6"
            onInteractOutside={(e) => { if(guideActive) e.preventDefault(); }}
        >
          {confirmDelete ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-orange-600">
                  Eliminar actividad
                </DialogTitle>
              </DialogHeader>
              <p className="py-4">¿Deseas eliminar esta actividad?</p>
              <DialogFooter className="flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={loadingDelete}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={eliminarActividad} disabled={loadingDelete}>
                  {loadingDelete ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Eliminar...
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-orange-600">
                  {editando ? 'Editar actividad' : 'Nueva actividad'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div data-guide="input-titulo">
                    <Input
                    placeholder="Título"
                    value={form.titulo || ''}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    />
                    <textarea
                    className="border rounded p-2 w-full mt-2"
                    placeholder="Descripción"
                    value={form.descripcion || ''}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />
                </div>
                
                <div data-guide="input-fecha">
                    <input
                    type="datetime-local"
                    value={form.fecha_calendario || ''}
                    onChange={(e) => setForm({ ...form, fecha_calendario: e.target.value })}
                    className="border rounded p-2 w-full"
                    />
                </div>

                <div data-guide="select-usuario">
                    <select
                    className="border rounded p-2 w-full"
                    value={form.usuario_id || ''}
                    onChange={(e) => setForm({ ...form, usuario_id: parseInt(e.target.value) })}
                    >
                    <option value="">Seleccione usuario</option>
                    {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                        {u.nombre} {u.apellidos || ''}
                        </option>
                    ))}
                    </select>
                </div>

                {!editando && (
                  <div data-guide="check-repetir">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={repetir}
                        onChange={(e) => setRepetir(e.target.checked)}
                      />
                      Repetir en meses siguientes
                    </label>
                    {repetir && (
                      <Input
                        type="number"
                        min={1}
                        value={numMeses}
                        onChange={(e) => setNumMeses(parseInt(e.target.value) || 1)}
                        className="mt-2"
                      />
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                {editando ? (
                  <div className="flex w-full gap-2 justify-between">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setConfirmDelete(true)}
                      disabled={loading || loadingDelete}
                      data-guide="btn-eliminar"
                    >
                      Eliminar
                    </Button>
                    <Button
                      onClick={guardarActividad}
                      disabled={loading || loadingDelete}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                      data-guide="btn-actualizar"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={16} />
                          Guardando...
                        </>
                      ) : (
                        'Actualizar'
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={guardarActividad} 
                    disabled={loading} 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    data-guide="btn-guardar"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Guardando...
                      </>
                    ) : (
                      'Registrar'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}