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
import jsPDF from 'jspdf';

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Fondo {
  id: number;
  monto: number;
  fecha: string;
  sucursalId: number;
  usuarioentrega?: { nombre: string; apellidos?: string };
  usuariorecibe?: { nombre: string; apellidos?: string };
  activo: number;
}

// 1. FLUJO CREAR
const GUIDE_FLOW_CREATE: GuideStep[] = [
  {
    targetKey: "filtros-fechas",
    title: "1. Preparación",
    content: "Selecciona el rango de fechas para verificar fondos.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-nuevo-fondo",
    title: "2. Nuevo Fondo",
    content: "Haz clic en 'Agregar' para registrar el dinero inicial de la caja.",
    placement: "left",
    modalPosition: "bottom-right",
    disableNext: true 
  },
  {
    targetKey: "input-monto",
    title: "3. Cantidad",
    content: "Ingresa el monto exacto.",
    placement: "bottom", // CORREGIDO: De 'right' a 'bottom'
    modalPosition: "bottom-left"
  },
  {
    targetKey: "select-usuario-recibe",
    title: "4. Receptor",
    content: "Selecciona quién recibe el dinero.",
    placement: "top",
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

// 2. FLUJO EDITAR
const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "tabla-fondos",
    title: "1. Historial",
    content: "Localiza el registro de fondo que necesitas corregir.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-editar-fondo",
    title: "2. Modificar",
    content: "Usa el botón del lápiz para corregir el monto.",
    placement: "left",
    modalPosition: "left",
    disableNext: true
  },
  {
    targetKey: "input-monto", 
    title: "3. Corregir Datos",
    content: "Ajusta la cantidad.",
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
    targetKey: "tabla-fondos",
    title: "1. Historial",
    content: "Encuentra el registro erróneo en la lista.",
    placement: "top",
    modalPosition: "top-left"
  },
  {
    targetKey: "btn-eliminar-fondo",
    title: "2. Eliminar",
    content: "Presiona el botón de basura para desactivar este fondo.",
    placement: "left",
    modalPosition: "left"
  }
];

// ... helpers (norm, toISODate, etc.) igual que antes ...
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

export default function FondoCajaPage() {
  const [registros, setRegistros] = useState<Fondo[]>([]);
  const [form, setForm] = useState<{ monto?: number; idusuariorecibe?: number }>({});
  const [editando, setEditando] = useState<Fondo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);

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
        if (step?.targetKey === "btn-nuevo-fondo") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
        if (step?.targetKey === "btn-editar-fondo") {
             setTimeout(() => { handleNextStep(); }, 300);
        }
    }
  }, [modalOpen, guideActive, currentStepIndex, currentSteps]);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenFondoGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('CREATE'); 
        localStorage.setItem('hasSeenFondoGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const cargarRegistros = async () => {
    try {
      const finExclusivo = addDaysISO(fechaFin, 1);
      const params = new URLSearchParams({
        sucursalId: sucursalIdSession.toString(),
        fechaInicio: `${fechaInicio}T00:00:00.000Z`,
        fechaFin: `${finExclusivo}T00:00:00.000Z`, 
      });
      params.append('activos', '0');
      const res = await axios.get(`${apiUrl}/inicio?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setRegistros(res.data);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      toast.error('Error al cargar registros');
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users/activos?sucursalId=${sucursalIdSession}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsuarios(res.data);
    } catch (err) { console.error(err); }
  };

  const guardarRegistro = async () => {
    if (form.monto == null || Number.isNaN(form.monto) || !form.idusuariorecibe) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (typeof form.monto === 'number' && form.monto < 0) {
      toast.error('El monto no puede ser negativo');
      return;
    }
    const payload = { monto: form.monto, idusuariorecibe: form.idusuariorecibe, idusuarioentrega: userIdSession, sucursalId: sucursalIdSession, activo: 1, fecha: new Date().toISOString() };
    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/inicio/${editando.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Registro actualizado');
      } else {
        await axios.post(`${apiUrl}/inicio`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Registro agregado');
      }
      setForm({});
      setEditando(null);
      setModalOpen(false);
      cargarRegistros();
      if(guideActive && currentSteps[currentStepIndex]?.targetKey === 'btn-guardar-modal') {
        handleNextStep();
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const eliminarRegistro = async (id: number, desactivado: boolean) => {
    if (desactivado) return;
    if (!confirm('¿Deseas eliminar este registro?')) return;
    await axios.delete(`${apiUrl}/inicio/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    toast.success('Registro eliminado');
    cargarRegistros();
  };

  const editarRegistro = (r: Fondo) => {
    if (r.activo === 0) return; 
    setEditando(r);
    setForm({ monto: r.monto, idusuariorecibe: (r as any).idusuariorecibe });
    setModalOpen(true);
  };

  useEffect(() => { cargarUsuarios(); }, []);

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
    cargarRegistros();
  }, [fechaInicio, fechaFin]);

  const registrosFiltrados = registros.filter((g) => {
    const fecha = new Date(g.fecha);
    const inicio = startOfDayLocal(fechaInicio);
    const finExclusivo = startOfDayLocal(addDaysISO(fechaFin, 1));
    const q = norm(busqueda.trim());
    const nombreEntrega = g.usuarioentrega ? `${g.usuarioentrega.nombre} ${g.usuarioentrega.apellidos || ''}` : '';
    const nombreRecibe = g.usuariorecibe ? `${g.usuariorecibe.nombre} ${g.usuariorecibe.apellidos || ''}` : '';
    const descripcion = (g as any).descripcion ?? '';
    const coincideTexto = q === '' || norm(nombreEntrega).includes(q) || norm(nombreRecibe).includes(q) || norm(descripcion).includes(q);
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
 /*const imprimirTicketFondo = async (fondoArg?: {
  monto: number;
  fecha: string;     // ISO
  entrego?: string;  // nombre visible (opcional)
  recibio?: string;  // nombre visible (opcional)
}) => {
  const data = fondoArg ?? ticketData;
  if (!data) {
    toast.error("No hay datos de fondo para imprimir");
    return;
  }

  // --- Parámetros base ---
  const ANCHO = 80;   // usa 58 si tu impresora es de 58mm
  const MARGIN = 2;
  const LINE = 4;

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const formatFechaHora = (iso?: string) => {
    try {
      const d = iso ? new Date(iso) : new Date();
      return d.toLocaleString(undefined, {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return String(iso ?? ""); }
  };

  // ===== Datos de la sucursal =====
  let tienda = { nombre: "", direccion: "", cp: "", rfc: "", tel: "" };
  try {
    const res = await axios.get(`${apiUrl}/sucursales/${sucursalIdSession}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const s = res.data;
    tienda = {
      nombre: `${s.nombre_comercial || s.razon_social} - FONDO DE CAJA`,
      direccion: [s.direccion, s.colonia, s.municipio, s.estado].filter(Boolean).join(", "),
      cp: s.cp ? `C.P. ${s.cp}` : "",
      rfc: s.rfc || "",
      tel: s.tel || "",
    };
  } catch (err) { console.error("Error sucursal", err); }

  // ===== PASO 1: Medir alto =====
  const md = new jsPDF({ orientation: "portrait", unit: "mm", format: [ANCHO, 200] });
  md.setFont("courier", "normal");
  const contentW = ANCHO - MARGIN * 2;

  const measureWrap = (text = "", fontSize = 8, maxW = contentW) => {
    if (!text) return 0;
    md.setFontSize(fontSize);
    const lines = md.splitTextToSize(String(text), maxW) as string[];
    return lines.length * LINE;
  };

  let y = 4;
  // Encabezado
  y += measureWrap(tienda.nombre, 10) + 2;
  y += measureWrap(tienda.direccion, 8) + 1.5;
  y += measureWrap(tienda.cp, 8);
  y += measureWrap(`RFC: ${tienda.rfc}`, 8);
  y += measureWrap(`Teléfono: ${tienda.tel}`, 8) + 2;

  // Separador
  y += 4;

  // Contenido
  y += measureWrap(`Entregó: ${data.entrego || ''}`, 8);
  y += measureWrap(`Recibió: ${data.recibio || ''}`, 8) + 2;

  // Monto (línea única)
  y += 5;

  // Fecha
  y += measureWrap(`Fecha: ${formatFechaHora(data.fecha)}`, 8) + 2;

  // Separador
  y += 4;

  // Línea final
  y += 4;

  const usedHeight = y + MARGIN;

  // ===== PASO 2: Dibujar en doc con alto exacto =====
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [ANCHO, usedHeight] });
  doc.setFont("courier", "normal");

  const centerWrap = (text = "", fontSize = 8, maxW = contentW) => {
    if (!text) return;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(String(text), maxW) as string[];
    const cx = MARGIN + contentW / 2;
    lines.forEach((ln) => { doc.text(ln, cx, drawY, { align: "center" }); drawY += LINE; });
  };
  const leftWrap = (text = "", fontSize = 8, maxW = contentW, x = MARGIN) => {
    if (!text) return;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(String(text), maxW) as string[];
    lines.forEach((ln) => { doc.text(ln, x, drawY); drawY += LINE; });
  };
  const sep = (char = "=", count = 42) => {
    doc.setFontSize(8);
    doc.text(char.repeat(count), MARGIN, drawY);
    drawY += 4;
  };

  let drawY = 4;

  // Encabezado
  centerWrap(tienda.nombre, 10); drawY += 2;
  centerWrap(tienda.direccion, 8); drawY += 1.5;
  centerWrap(tienda.cp, 8);
  centerWrap(`RFC: ${tienda.rfc}`, 8);
  centerWrap(`Teléfono: ${tienda.tel}`, 8); drawY += 2;

  sep("=");

  // Contenido
  leftWrap(`Entregó: ${data.entrego || ''}`, 8);
  leftWrap(`Recibió: ${data.recibio || ''}`, 8); drawY += 2;

  // Monto (derecha)
  doc.setFontSize(9);
  doc.text("Monto:", MARGIN, drawY);
  const montoTxt = money(Number(data.monto));
  const wMonto = doc.getTextWidth(montoTxt);
  doc.text(montoTxt, MARGIN + contentW - wMonto, drawY);
  drawY += 5;

  // Fecha
  doc.setFontSize(8);
  leftWrap(`Fecha: ${formatFechaHora(data.fecha)}`, 8); drawY += 2;

  sep("=");



  // Imprimir
  doc.autoPrint();
  doc.output("dataurlnewwindow");
};

*/
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
            <h1 className="text-2xl font-bold text-orange-600">Fondo de caja</h1>
            <Button data-guide="btn-nuevo-fondo" onClick={() => { setForm({}); setEditando(null); setModalOpen(true); }}>
                <Plus className="mr-2" size={16} /> Agregar
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
                          <button onClick={() => startGuide('CREATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">➕ Crear Fondo</button>
                          <button onClick={() => startGuide('EDIT')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border-t">✏️ Editar Fondo</button>
                          <button onClick={() => startGuide('DELETE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">🗑️ Eliminar Fondo</button>
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
                          <button onClick={() => window.open('https://www.youtube.com/watch?v=zGrq20yMYMA&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=13', '_blank')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <PlayCircle className="w-3 h-3 inline mr-2 text-red-500" /> Control de Fondo
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
        <Input data-guide="input-busqueda" placeholder="Buscar por usuario (entregó/recibió) o descripción" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="ml-auto" />
      </div>

      <div className="overflow-auto rounded border bg-white shadow" data-guide="tabla-fondos">
        <Table>
          <TableHeader className="bg-orange-100">
            <TableRow>
              <TableHead>Monto</TableHead><TableHead>Entregó</TableHead><TableHead>Recibió</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.map((g, index) => {
              const desactivado = g.activo === 0;
              return (
                <TableRow key={g.id} className={`hover:bg-orange-50 ${desactivado ? 'bg-red-100' : ''}`}>
                  <TableCell>${Number(g.monto).toFixed(2)}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{g.usuarioentrega ? `${g.usuarioentrega.nombre} ${g.usuarioentrega.apellidos || ''}` : 'Sin usuario'}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{g.usuariorecibe ? `${g.usuariorecibe.nombre} ${g.usuariorecibe.apellidos || ''}` : 'Sin usuario'}</TableCell>
                  <TableCell className={desactivado ? 'text-gray-500' : ''}>{formatFecha(g.fecha)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => editarRegistro(g)} disabled={desactivado} className={desactivado ? 'pointer-events-none opacity-50' : ''} data-guide={index === 0 ? "btn-editar-fondo" : undefined}><Pencil size={14} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => eliminarRegistro(g.id, desactivado)} disabled={desactivado} className={desactivado ? 'pointer-events-none opacity-50' : ''} data-guide={index === 0 ? "btn-eliminar-fondo" : undefined}><Trash2 size={14} /></Button>
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
          <DialogHeader><DialogTitle className="text-xl font-semibold text-orange-600">{editando ? 'Editar' : 'Nuevo'} fondo de caja</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2" data-guide="input-monto">
                <Input type="number" inputMode="decimal" min={0} step="1" placeholder="Monto" value={form.monto ?? ''} onChange={handleMontoChange} onKeyDown={blockInvalidKeys} onWheel={preventWheel} onPaste={handleMontoPaste} />
            </div>
            <div className="col-span-2" data-guide="select-usuario-recibe">
                <select className="col-span-2 border rounded px-3 py-2" value={form.idusuariorecibe || ''} onChange={(e) => setForm({ ...form, idusuariorecibe: parseInt(e.target.value) })}>
                <option value="">Selecciona usuario receptor</option>
                {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>))}
                </select>
            </div>
          </div>
          <DialogFooter>
            <Button data-guide="btn-guardar-modal" onClick={guardarRegistro} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter> 
        </DialogContent>
      </Dialog>
    </div>
  );
}