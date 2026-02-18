'use client';

import { useEffect, useState, useRef } from 'react';
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
import TicketGasto from '@/components/TicketGasto';
import { formatFecha } from '@/lib/date';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string;
  sucursalId: number;
  activo?: number;
  usuarioGasto?: {
    nombre: string;
    apellidos?: string;
  };
}

// 1. FLUJO CREAR
const GUIDE_FLOW_CREATE: GuideStep[] = [
  {
    targetKey: "filtros-fechas",
    title: "1. Preparación",
    content: "Selecciona el rango de fechas para verificar gastos anteriores.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-nuevo-gasto",
    title: "2. Nuevo Gasto",
    content: "Haz clic en 'Agregar gasto' para abrir el formulario.",
    placement: "left",
    modalPosition: "bottom-right",
    disableNext: true
  },
  {
    targetKey: "input-descripcion",
    title: "3. Concepto",
    content: "Describe detalladamente en qué se gastó el dinero.",
    placement: "bottom", 
    modalPosition: "bottom-left"
  },
  {
    targetKey: "input-monto",
    title: "4. Costo",
    content: "Ingresa el monto total del gasto realizado.",
    placement: "bottom",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "btn-guardar-modal",
    title: "5. Guardar",
    content: "Haz clic en 'Guardar'.",
    placement: "top",
    modalPosition: "bottom-right"
  }
];

// 2. FLUJO EDITAR
const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "tabla-gastos",
    title: "1. Historial",
    content: "Ubica el gasto que necesitas corregir.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-editar-gasto",
    title: "2. Editar",
    content: "Usa el botón del lápiz para modificar.",
    placement: "left",
    modalPosition: "left",
    disableNext: true
  },
  {
    targetKey: "input-monto", 
    title: "3. Corregir Datos",
    content: "Modifica el monto o la descripción.",
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
    targetKey: "tabla-gastos",
    title: "1. Historial",
    content: "Encuentra el gasto incorrecto.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-eliminar-gasto",
    title: "2. Eliminar",
    content: "Presiona el botón de basura para desactivar este gasto.",
    placement: "left",
    modalPosition: "left"
  }
];

// ... helpers ...
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

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const defaultFecha = toISODate(new Date());
  const [form, setForm] = useState<Partial<Gasto>>({ fecha: defaultFecha });
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [sucursal, setSucursal] = useState<any>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

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
        if (step?.targetKey === "btn-nuevo-gasto") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
        if (step?.targetKey === "btn-editar-gasto") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
    }
  }, [modalOpen, guideActive, currentStepIndex, currentSteps]);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenGastoGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('CREATE'); 
        localStorage.setItem('hasSeenGastoGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const cargarSucursal = async () => {
    try {
      const res = await axios.get(`${apiUrl}/sucursales/${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSucursal(res.data);
    } catch (err) { console.error('Error al cargar sucursal', err); }
  };

 const cargarGastos = async () => {
  try {
    const finExclusivo = addDaysISO(fechaFin, 1);
    const res = await axios.get(`${apiUrl}/gasto?sucursalId=${sucursalIdSession}&fechaInicio=${fechaInicio}&fechaFin=${finExclusivo}&activos=0`, { headers: { Authorization: `Bearer ${token}` } });
    setGastos(res.data);
  } catch (error) {
    console.error(error);
    toast.error('Error al cargar gastos');
  }
};

  const guardarGasto = async () => {
    if (!form.descripcion || form.monto === undefined || form.monto === null || isNaN(Number(form.monto))) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if ((form.monto as number) < 0) {
      toast.error('El monto no puede ser negativo');
      return;
    }
    const payload = { ...form, sucursalId: sucursalIdSession, id_usuario: userIdSession, activo: 1, fecha: new Date().toISOString() };
    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/gasto/${editando.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Gasto actualizado');
      } else {
        await axios.post(`${apiUrl}/gasto`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Gasto registrado');
        setTicketData({ ...payload, fecha: new Date().toISOString() });
        setTicketOpen(true);
      }
      setForm({ fecha: defaultFecha });
      setEditando(null);
      setModalOpen(false);
      cargarGastos();
      if(guideActive && currentSteps[currentStepIndex]?.targetKey === 'btn-guardar-modal') {
        handleNextStep();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar gasto');
    } finally {
      setLoading(false);
    }
  };

  const desactivarGasto = async (id: number) => {
    if (!confirm('¿Deseas eliminar este gasto?')) return;
    await axios.delete(`${apiUrl}/gasto/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    toast.success('Gasto eliminado');
    cargarGastos();
  };

  const editarGasto = (g: Gasto) => {
    setEditando(g);
    setForm({ descripcion: g.descripcion, monto: g.monto, fecha: g.fecha });
    setModalOpen(true);
  };

const imprimirTicket = () => {
  if (!ticketRef.current) {
    toast.error("No hay datos de gasto para imprimir");
    return;
  }
  const printWindow = window.open("", "_blank", "width=300,height=600");
  if (!printWindow) {
    toast.error("No se pudo abrir la ventana de impresión");
    return;
  }
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']")).map((el) => el.outerHTML).join("\n");
  printWindow.document.write(`<!DOCTYPE html><html><head>${styles}</head><body>${ticketRef.current.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
  useEffect(() => { cargarSucursal(); }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const ini = startOfDayLocal(fechaInicio).getTime();
      const fin = startOfDayLocal(fechaFin).getTime();
      if (ini > fin) {
        setFechaInicio(fechaFin);
        setFechaFin(fechaInicio);
        return;
      }
    }
    cargarGastos();
  }, [fechaInicio, fechaFin]);

  const gastosFiltrados = gastos.filter((g) => {
    const fecha = new Date(g.fecha); 
    const inicio = startOfDayLocal(fechaInicio);
    const finExclusivo = startOfDayLocal(addDaysISO(fechaFin, 1));
    const q = norm(busqueda.trim());
    const usuario = g.usuarioGasto ? `${g.usuarioGasto.nombre} ${g.usuarioGasto.apellidos || ''}` : '';
    const coincideTexto = q === '' || norm(g.descripcion || '').includes(q) || norm(usuario).includes(q);
    return coincideTexto && fecha >= inicio && fecha < finExclusivo;
  });

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
            <h1 className="text-2xl font-bold text-orange-600">Gastos</h1>
            <Button
                data-guide="btn-nuevo-gasto"
                onClick={() => {
                    setForm({ fecha: defaultFecha });
                    setEditando(null);
                    setModalOpen(true);
                }}
            >
                <Plus className="mr-2" size={16} /> Agregar gasto
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
                          <button onClick={() => startGuide('CREATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">➕ Crear Gasto</button>
                          <button onClick={() => startGuide('EDIT')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border-t">✏️ Editar Gasto</button>
                          <button onClick={() => startGuide('DELETE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">🗑️ Eliminar Gasto</button>
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
                          <button onClick={() => window.open('https://www.youtube.com/watch?v=GKSSemnOeHE&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=6', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Control de Gastos
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

      <div className="overflow-auto rounded border bg-white shadow" data-guide="tabla-gastos">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Monto</TableHead><TableHead>Usuario</TableHead><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastosFiltrados.map((g, index) => (
                <TableRow key={g.id} className={g.activo === 0 ? 'bg-red-100 text-red-600' : 'hover:bg-orange-50'}>
                <TableCell>${g.monto.toFixed(2)}</TableCell>
                <TableCell>{g.usuarioGasto ? `${g.usuarioGasto.nombre} ${g.usuarioGasto.apellidos || ''}` : 'Sin usuario'}</TableCell>
                <TableCell>{g.descripcion}</TableCell>
                <TableCell>{formatFecha(g.fecha)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => editarGasto(g)} disabled={g.activo === 0} className={g.activo === 0 ? "opacity-50 cursor-not-allowed" : ""} data-guide={index === 0 ? "btn-editar-gasto" : undefined}><Pencil size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => desactivarGasto(g.id)} disabled={g.activo === 0} className={g.activo === 0 ? "opacity-50 cursor-not-allowed" : ""} data-guide={index === 0 ? "btn-eliminar-gasto" : undefined}><Trash2 size={14} /></Button>
                </TableCell>
              </TableRow>
            ))}
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
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">{editando ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2" data-guide="input-descripcion">
              <Input placeholder="Descripción" value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="col-span-2" data-guide="input-monto">
                <Input className="col-span-2" type="number" placeholder="Monto" value={form.monto ?? ''} onChange={(e) => setForm({ ...form, monto: e.target.value === '' ? undefined : parseFloat(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button data-guide="btn-guardar-modal" onClick={guardarGasto} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}