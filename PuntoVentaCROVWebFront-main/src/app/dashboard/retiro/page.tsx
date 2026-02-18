'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableCell, TableBody, TableHead } from '@/components/ui/table';
import { Pencil, Trash2, Loader2, Plus, BookOpen, Video, ChevronDown, PlayCircle } from 'lucide-react';
import { formatFecha } from '@/lib/date';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Retiro {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  sucursalId: number;
  usuarioRetiro?: { nombre: string; apellidos?: string };
  activo: number;
}

// 1. FLUJO CREAR
const GUIDE_FLOW_CREATE: GuideStep[] = [
  {
    targetKey: "filtros-fechas",
    title: "1. Preparación",
    content: "Antes de registrar una salida de dinero, verifica el rango de fechas.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-nuevo-retiro",
    title: "2. Iniciar Retiro",
    content: "Haz clic en 'Agregar retiro' para abrir el formulario.",
    placement: "left",
    modalPosition: "bottom-right",
    disableNext: true 
  },
  {
    targetKey: "input-descripcion",
    title: "3. Motivo",
    content: "Escribe la razón de la salida de dinero.",
    placement: "bottom", 
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-monto",
    title: "4. Importe",
    content: "Ingresa la cantidad exacta que se retirará.",
    placement: "bottom",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "btn-guardar-modal",
    title: "5. Guardar",
    content: "Finaliza haciendo clic en 'Guardar'.",
    placement: "top",
    modalPosition: "bottom-right"
  }
];

// 2. FLUJO EDITAR (Corregido)
const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "tabla-retiros",
    title: "1. Localizar Registro",
    content: "Identifica el retiro que deseas modificar en la lista.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-editar-retiro",
    title: "2. Modificar",
    content: "Haz clic en el lápiz para corregir.",
    placement: "left",
    modalPosition: "left",
    disableNext: true
  },
  {
    targetKey: "input-monto", 
    title: "3. Corregir Datos",
    content: "Ajusta el monto o el motivo.",
    placement: "bottom",
    modalPosition: "right"
  },
  {
    targetKey: "btn-guardar-modal",
    title: "4. Confirmar",
    content: "Guarda los cambios.",
    placement: "top",
    modalPosition: "right"
  }
];

// 3. FLUJO ELIMINAR
const GUIDE_FLOW_DELETE: GuideStep[] = [
  {
    targetKey: "tabla-retiros",
    title: "1. Localizar Registro",
    content: "Encuentra el retiro incorrecto.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-eliminar-retiro",
    title: "2. Desactivar",
    content: "Haz clic en el botón de basura para cancelar este retiro.",
    placement: "left",
    modalPosition: "left"
  }
];

const norm = (s: string = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const toISODate = (d: Date) => d.toISOString().substring(0, 10);
const startOfDayLocal = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
};
const addDaysISO = (isoDate: string, days: number) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return toISODate(base);
};

export default function RetirosPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const defaultFecha = toISODate(new Date());
  const [form, setForm] = useState<Partial<Retiro>>({ fecha: defaultFecha });
  const [editando, setEditando] = useState<Retiro | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fechaInicio, setFechaInicio] = useState(toISODate(monday));
  const [fechaFin, setFechaFin] = useState(toISODate(sunday));

  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const startGuide = (mode: 'CREATE' | 'EDIT' | 'DELETE') => {
    let steps = GUIDE_FLOW_CREATE;
    if (mode === 'EDIT') steps = GUIDE_FLOW_EDIT;
    if (mode === 'DELETE') steps = GUIDE_FLOW_DELETE;

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

  useEffect(() => {
    if (guideActive && modalOpen) {
        const step = currentSteps[currentStepIndex];
        if (step?.targetKey === "btn-nuevo-retiro") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
        if (step?.targetKey === "btn-editar-retiro") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
    }
  }, [modalOpen, guideActive, currentStepIndex, currentSteps]);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenRetiroGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('CREATE'); 
        localStorage.setItem('hasSeenRetiroGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const cargarRetiros = async () => {
    try {
      const finExclusivo = addDaysISO(fechaFin, 1);
      const url = `${apiUrl}/retiro?sucursalId=${sucursalIdSession}&fechaInicio=${fechaInicio}&fechaFin=${finExclusivo}&activos=0`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setRetiros(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar retiros');
    }
  };

  const guardarRetiro = async () => {
    if (!form.descripcion || form.monto == null || Number.isNaN(form.monto)) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (typeof form.monto === 'number' && form.monto < 0) {
      toast.error('El monto no puede ser negativo');
      return;
    }
    const payload = { ...form, sucursalId: sucursalIdSession, id_usuario: userIdSession, activo: 1, fecha: new Date().toISOString() };
    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/retiro/${editando.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Retiro actualizado');
      } else {
        await axios.post(`${apiUrl}/retiro`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Retiro registrado');
      }
      setForm({ fecha: defaultFecha });
      setEditando(null);
      setModalOpen(false);
      cargarRetiros();
      if(guideActive && currentSteps[currentStepIndex]?.targetKey === 'btn-guardar-modal') {
        handleNextStep();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar retiro');
    } finally {
      setLoading(false);
    }
  };

  const desactivarRetiro = async (id: number, desactivado: boolean) => {
    if (desactivado) return;
    if (!confirm('¿Deseas eliminar este retiro?')) return;
    await axios.delete(`${apiUrl}/retiro/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    toast.success('Retiro eliminado');
    cargarRetiros();
  };

  const editarRetiro = (g: Retiro) => {
    if (g.activo === 0) return;
    setEditando(g);
    setForm({ descripcion: g.descripcion, monto: g.monto, fecha: g.fecha });
    setModalOpen(true);
  };

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const ini = startOfDayLocal(fechaInicio).getTime();
      const fin = startOfDayLocal(fechaFin).getTime();
      if (ini > fin) {
        const a = fechaInicio;
        setFechaInicio(fechaFin);
        setFechaFin(a);
        return;
      }
    }
    cargarRetiros();
  }, [fechaInicio, fechaFin]);

  const retirosFiltrados = retiros.filter((g) => {
    const fecha = new Date(g.fecha);
    const inicio = startOfDayLocal(fechaInicio);
    const finExclusivo = startOfDayLocal(addDaysISO(fechaFin, 1));
    const q = norm(busqueda.trim());
    const usuario = g.usuarioRetiro ? `${g.usuarioRetiro.nombre} ${g.usuarioRetiro.apellidos || ''}` : '';
    const coincideTexto = q === '' || norm(g.descripcion || '').includes(q) || norm(usuario).includes(q);
    return coincideTexto && fecha >= inicio && fecha < finExclusivo;
  });

  const parseMonto = (v: string): number | undefined => {
    if (v == null || v.trim() === '') return undefined;
    const n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, n);
  };
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseMonto(e.target.value);
    setForm((prev) => ({ ...prev, monto: next }));
  };
  const blockInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const invalid = ['-', '+', 'e', 'E'];
    if (invalid.includes(e.key)) e.preventDefault();
  };
  const preventWheel = (e: React.WheelEvent<HTMLInputElement>) => { (e.target as HTMLInputElement).blur(); };
  const handleMontoPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData('text');
    const cleaned = raw.replace(/[+-]/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    if (cleaned !== raw) e.preventDefault();
    const next = parseMonto(cleaned);
    setForm((prev) => ({ ...prev, monto: next }));
  };

  return (
    <div className="space-y-6 relative">
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

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-600">Retiros</h1>
          <Button data-guide="btn-nuevo-retiro" onClick={() => { setForm({ fecha: defaultFecha }); setEditando(null); setModalOpen(true); }}>
            <Plus className="mr-2" size={16} /> Agregar retiro
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
            <div className="relative inline-block text-left">
                <Button variant="outline" size="sm" onClick={() => setShowGuideMenu(!showGuideMenu)} className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Guía Interactiva <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
                {showGuideMenu && (
                    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="py-1">
                          <button onClick={() => startGuide('CREATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">➕ Crear Retiro</button>
                          <button onClick={() => startGuide('EDIT')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border-t">✏️ Editar Retiro</button>
                          <button onClick={() => startGuide('DELETE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">🗑️ Eliminar Retiro</button>
                      </div>
                    </div>
                )}
            </div>
            <div className="relative inline-block text-left">
                <Button variant="outline" size="sm" onClick={() => setShowVideoMenu(!showVideoMenu)} className="flex items-center gap-2">
                    <Video className="w-4 h-4" /> Tutoriales en Video <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
                {showVideoMenu && (
                    <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="py-1">
                          <button onClick={() => window.open('https://www.youtube.com/watch?v=wUz4OtOcX4g&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=4', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Control de Retiros
                          </button>
                      </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="flex items-end gap-4" data-guide="filtros-fechas">
        <div><label className="text-sm font-medium text-gray-700">Desde</label><Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div>
        <div><label className="text-sm font-medium text-gray-700">Hasta</label><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div>
        <Input data-guide="input-busqueda" placeholder="Buscar por descripción o usuario..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="ml-auto" />
      </div>

      <div className="overflow-auto rounded border bg-white shadow" data-guide="tabla-retiros">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead className="text-right">Monto</TableHead><TableHead>Usuario</TableHead><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retirosFiltrados.map((g, index) => {
              const desactivado = g.activo === 0;
              return (
                <TableRow key={g.id} className={`hover:bg-orange-50 ${desactivado ? 'bg-red-100' : ''}`}>
                  <TableCell className={`text-right ${desactivado ? 'text-gray-500' : ''}`}>${g.monto.toFixed(2)}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{g.usuarioRetiro ? `${g.usuarioRetiro.nombre} ${g.usuarioRetiro.apellidos || ''}` : 'Sin usuario'}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{g.descripcion}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{formatFecha(g.fecha)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => editarRetiro(g)} disabled={desactivado} className={desactivado ? 'pointer-events-none opacity-50' : ''} data-guide={index === 0 ? "btn-editar-retiro" : undefined}><Pencil size={14} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => desactivarRetiro(g.id, desactivado)} disabled={desactivado} className={desactivado ? 'pointer-events-none opacity-50' : ''} data-guide={index === 0 ? "btn-eliminar-retiro" : undefined}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogOverlay className="bg-transparent fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-lg mx-auto shadow-xl border p-6"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">{editando ? 'Editar retiro' : 'Nuevo retiro'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2" data-guide="input-descripcion">
              <Input placeholder="Descripción" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="col-span-2" data-guide="input-monto">
                <Input type="number" inputMode="decimal" placeholder="Monto" min={0} step="1" value={form.monto ?? ''} onChange={handleMontoChange} onKeyDown={blockInvalidKeys} onWheel={preventWheel} onPaste={handleMontoPaste} />
            </div>
          </div>
          <DialogFooter>
            <Button data-guide="btn-guardar-modal" onClick={guardarRetiro} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}