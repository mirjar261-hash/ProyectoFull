'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bug, ClipboardList, BookOpen, LifeBuoy, Loader2, Plus, RotateCcw, Trash2, ChevronUp, Minus, ChevronDown,  } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip" 
import { toast } from 'sonner';
import SimplePieChart from '@/components/SimplePieChart';
import { getInternalAuthHeaders } from '@/lib/internalAuth';
import TaskDescTextEditor from '@/components/TaskDescTextEditor/TaskDescTextEditor';
import { catalogoColoresPerfil } from "@/lib/avatar";
import AvatarEmpleado from '@/components/crovinternal/AvatarEmpleado';
import ApartadoSistemas from '@/components/crovinternal/Jira/ApartadoSistemas';
import TareaFormModal from '@/components/crovinternal/Jira/TareaFormModal';


interface SprintCrov {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_final: string;
  activo: number;
  en_uso: number;
}

interface TareaCrov {
  id: number;
  titulo: string;
  descripcion: string;
  id_sistemas_crov: number;
  id_empleados_crov: number;
  prioridad: 'baja' | 'media' | 'alta';
  estatus: 'Por hacer' | 'En curso' | 'Implementacion lista' | 'Pruebas' | 'Listo';
  reabierto: number;
  activo: number;
  fecha_registro: string;
  fecha_vencimiento: string | null;
  tipo: 'Tarea' | 'Error' | 'Soporte' | 'Historia';
  complejidad: number;
  id_sprint: number | null;
  storyPoints: number;
  empleado: EmpleadoCrov
}

interface SistemaCrov {
  id: number;
  nombre: string;
}

interface EmpleadoCrov {
  id: number;
  nombre_completo: string;
  activo: number;
  color_perfil: string | null;
}

const defaultSprint: Omit<SprintCrov, 'id'> = {
  nombre: 'Sprint_',
  fecha_inicio: '',
  fecha_final: '',
  activo: 1,
  en_uso: 0,
};

const defaultTarea: Omit<TareaCrov, 'id' | 'fecha_registro'> = {
  titulo: '',
  descripcion: '',
  id_sistemas_crov: 0,
  id_empleados_crov: 0,
  prioridad: 'baja',
  estatus: 'Por hacer',
  reabierto: 0,
  activo: 1,
  fecha_vencimiento: '',
  tipo: 'Tarea',
  complejidad: 1,
  id_sprint: null,
};

const tareaTipoConfig: Record<
  TareaCrov['tipo'],
  { badgeClass: string; icon: typeof ClipboardList }
> = {
  Tarea: { badgeClass: 'border-blue-200 bg-blue-50 text-blue-700', icon: ClipboardList },
  Error: { badgeClass: 'border-red-200 bg-red-50 text-red-700', icon: Bug },
  Soporte: { badgeClass: 'border-purple-200 bg-purple-50 text-purple-700', icon: LifeBuoy },
  Historia: { badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', icon: BookOpen },
};

const defaultTareaTipoConfig = tareaTipoConfig.Tarea;

const normalizarTipoTarea = (tipo?: string): TareaCrov['tipo'] => {
  const normalizado = (tipo || '').toLowerCase();
  if (normalizado === 'error') return 'Error';
  if (normalizado === 'soporte') return 'Soporte';
  if (normalizado === 'historia') return 'Historia';
  if (normalizado === 'tarea') return 'Tarea';
  return defaultTarea.tipo;
};

const normalizarPrioridad = (prioridad?: string): TareaCrov['prioridad'] => {
  const normalizado = (prioridad || '').toLowerCase();
  if (normalizado === 'alta') return 'alta';
  if (normalizado === 'media') return 'media';
  if (normalizado === 'baja') return 'baja';
  return defaultTarea.prioridad;
};

const normalizarEstatus = (estatus?: string): TareaCrov['estatus'] => {
  const normalizado = (estatus || '').toLowerCase().replace(/_/g, ' ').trim();

  if (normalizado === 'por hacer') return 'Por hacer';
  if (normalizado === 'en curso') return 'En curso';
  if (normalizado === 'implementacion lista') return 'Implementacion lista';
  if (normalizado === 'pruebas') return 'Pruebas';
  if (normalizado === 'listo') return 'Listo';

  return defaultTarea.estatus;
};

const estatusOptions: TareaCrov['estatus'][] = [
  'Por hacer',
  'En curso',
  'Implementacion lista',
  'Pruebas',
  'Listo',
];

const estatusChartColors: Record<TareaCrov['estatus'], string> = {
  'Por hacer': '#f97316',
  'En curso': '#0ea5e9',
  'Implementacion lista': '#a855f7',
  Pruebas: '#22c55e',
  Listo: '#64748b',
};

function TareaTipoBadge({ tipo }: { tipo: TareaCrov['tipo'] }) {
  const config = tareaTipoConfig[tipo] ?? defaultTareaTipoConfig;
  const Icon = config.icon ?? defaultTareaTipoConfig.icon;

  return (
    <Badge className={`gap-1 ${config.badgeClass}`} variant="outline">
      <Icon className="h-4 w-4" />
      {tipo}
    </Badge>
  );
}

type JiraTab = 'dashboard' | 'backlog' | 'sprints' | 'tablero';

export default function JiraPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;

  const sprintsEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/sprints-crov` : null),
    [apiUrl],
  );
  const tareasEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/tareas-crov` : null),
    [apiUrl],
  );
  const sistemasEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/sistemas-crov` : null),
    [apiUrl],
  );
  const empleadosEndpoint = useMemo(
    () => (apiUrl ? `${apiUrl}/crovinternal/empleados-crov` : null),
    [apiUrl],
  );

  const [activeTab, setActiveTab] = useState<JiraTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const storedResidente = localStorage.getItem('internalResident');
    if (!storedResidente) return 'dashboard';
    const normalized = storedResidente.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' ? 'tablero' : 'dashboard';
  });
  const [loading, setLoading] = useState(false);

  const [sprints, setSprints] = useState<SprintCrov[]>([]);
  const [sprintForm, setSprintForm] = useState(defaultSprint);
  const [editingSprintId, setEditingSprintId] = useState<number | null>(null);
  const [sprintSaving, setSprintSaving] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<SprintCrov | null>(null);
  const [sprintTasksModalOpen, setSprintTasksModalOpen] = useState(false);
  const [sprintInUseUpdating, setSprintInUseUpdating] = useState<number | null>(null);
  const [sprintDeleting, setSprintDeleting] = useState<number | null>(null);

  const [tareas, setTareas] = useState<TareaCrov[]>([]);
  const [editingTareaId, setEditingTareaId] = useState<number | null>(null);
  const [tareaModalOpen, setTareaModalOpen] = useState(false);
  const [tareaDeleting, setTareaDeleting] = useState<number | null>(null);
  const [tareaStatusUpdating, setTareaStatusUpdating] = useState<number | null>(null);
  const [tableroEmpleadoFiltro, setTableroEmpleadoFiltro] = useState<'all' | string>('all');
  const [tareaTableroDetalle, setTareaTableroDetalle] = useState<TareaCrov | null>(null);
  const [draggingTareaId, setDraggingTareaId] = useState<number | null>(null);
  
 
  const [conteodetareassprintactualporempleado, setConteodetareassprintactualporempleado] = useState([])
  const [sistemas, setSistemas] = useState<SistemaCrov[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoCrov[]>([]);
  const [backlogFilters, setBacklogFilters] = useState({
    titulo: '',
    empleado: '',
    sistema: '',
  });

  // ================== Lógica para arrastrar tareas entre sprints en Jira CROV/Backlog ============================
  const [backlogTareaArrastradaId, setBacklogTareaArrastradaId] = useState<number | null>(null);
  const handleDropBacklogTareaArrastrada = async (e: React.DragEvent, idSprintDestino: number | null) => {
    e.preventDefault();
    if (!backlogTareaArrastradaId) return;

    const payload = {
      id_sprint: idSprintDestino,
    };

    try {
      await axios.put(`${tareasEndpoint}/${backlogTareaArrastradaId}`, payload, {headers: authHeaders,});
      await fetchTareas();
    } catch (error) {
      console.error('Error al mover tarea', error);
      toast.error("Error al mover tarea");
    } finally {
      setBacklogTareaArrastradaId(null);
    }
  }

  // HOOK DE AUTO-SCROLL, esta activo mientras se tenga una tarea arrastrada
  useEffect(() => {
    if (!backlogTareaArrastradaId) return;

    const handleDragAutoScroll = (e: DragEvent) => {
      const UMBRAL = 150;     // Píxeles desde el borde donde se activa el scroll
      const VELOCIDAD = 15;   // Cuántos píxeles se mueve por cada "frame" 

      const mouseY = e.clientY;           // Posición vertical del mouse
      const alturaVentana = window.innerHeight; // Altura visible del navegador

      // --- ZONA SUPERIOR (Scroll hacia arriba) ---
      if (mouseY < UMBRAL) {
        window.scrollBy({ 
            top: -VELOCIDAD, 
            behavior: "auto" 
        });
      } 
      
      // --- ZONA INFERIOR (Scroll hacia abajo) ---
      else if (mouseY > alturaVentana - UMBRAL) {
        window.scrollBy({ 
            top: VELOCIDAD, 
            behavior: "auto" 
        });
      }
    };

    window.addEventListener("dragover", handleDragAutoScroll);

    return () => {
      window.removeEventListener("dragover", handleDragAutoScroll);
    };
  }, [backlogTareaArrastradaId]); 
  
  // ================== Fin Lógica para arrastrar tareas entre sprints en Jira CROV/Backlog ========================

  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const getNextSprintName = useCallback(() => {
    if (!sprints.length) return 'Sprint_1';
    const maxId = sprints.reduce((max, sprint) => Math.max(max, sprint.id), 0);
    return `Sprint_${maxId + 1}`;
  }, [sprints]);

  const fetchSprints = useCallback(async () => {
    if (!sprintsEndpoint || !token) return;
    try {
      const res = await axios.get(sprintsEndpoint, { headers: authHeaders });
      const data: SprintCrov[] = Array.isArray(res.data) ? res.data : [];
      setSprints([...data].sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Error al cargar sprints', error);
    }
  }, [authHeaders, sprintsEndpoint, token]);

  const fetchTareas = useCallback(async () => {
    if (!tareasEndpoint || !token) return;
    try {
      const res = await axios.get(tareasEndpoint, { headers: authHeaders });
      const data: TareaCrov[] = Array.isArray(res.data) ? res.data : [];
      const normalizadas = data.map((tarea) => ({
        ...tarea,
        tipo: normalizarTipoTarea(tarea.tipo),
        prioridad: normalizarPrioridad(tarea.prioridad),
        estatus: normalizarEstatus(tarea.estatus),
      }));
      setTareas(normalizadas);
    } catch (error) {
      console.error('Error al cargar tareas', error);
    }
  }, [authHeaders, tareasEndpoint, token]);

  const fetchSistemas = useCallback(async () => {
    if (!sistemasEndpoint || !token) return;
    try {
      const res = await axios.get(sistemasEndpoint, { headers: authHeaders });
      setSistemas(res.data || []);
    } catch (error) {
      console.error('Error al cargar sistemas CROV', error);
    }
  }, [authHeaders, sistemasEndpoint, token]);

  const fetchEmpleados = useCallback(async () => {
    if (!empleadosEndpoint || !token) return;
    try {
      const res = await axios.get(empleadosEndpoint, { headers: authHeaders });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      setEmpleados(data);
    } catch (error) {
      console.error('Error al cargar empleados CROV', error);
    }
  }, [authHeaders, empleadosEndpoint, token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSprints(),
        fetchTareas(),
        fetchSistemas(),
        fetchEmpleados(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchSprints, fetchTareas, fetchSistemas, fetchEmpleados]);

  const resetSprintForm = useCallback(() => {
    setSprintForm({ ...defaultSprint, nombre: getNextSprintName() });
    setEditingSprintId(null);
  }, [getNextSprintName]);

  const fetchconteodetareassprintactualporempleado = async ()=>{
    try {
      const informacion = await axios.get(`${apiUrl}/crovinternal/tareas-crov-obtener-tareas-sprint-actual`, {headers:authHeaders})
      const data = informacion.data
      setConteodetareassprintactualporempleado(data)
    } catch (error) {
      console.log(error)
    }
  }
  const handleSprintSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sprintsEndpoint || !token) return;
    setSprintSaving(true);
    try {
      if (editingSprintId) {
        await axios.put(`${sprintsEndpoint}/${editingSprintId}`, sprintForm, {
          headers: authHeaders,
        });
      } else {
        await axios.post(sprintsEndpoint, sprintForm, { headers: authHeaders });
      }
      await fetchSprints();
      resetSprintForm();
      setSprintModalOpen(false);
    } catch (error) {
      console.error('Error al guardar sprint', error);
    } finally {
      setSprintSaving(false);
    }
  };

  const handleDeleteSprint = async (id: number) => {
    if (!sprintsEndpoint || !token) return;
    setSprintDeleting(id);
    try {
      await axios.delete(`${sprintsEndpoint}/${id}`, { headers: authHeaders });
      setSprints((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error al eliminar sprint', error);
    } finally {
      setSprintDeleting(null);
    }
  };

  const handleDeleteTarea = async (id: number) => {
    if (!tareasEndpoint || !token) return;
    setTareaDeleting(id);
    try {
      await axios.delete(`${tareasEndpoint}/${id}`, { headers: authHeaders });
      setTareas((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error al eliminar tarea', error);
    } finally {
      setTareaDeleting(null);
    }
  };

  const handleSetSprintEnUso = async (sprintId: number) => {
    if (!sprintsEndpoint || !token) return;
    const sprint = sprints.find((s) => s.id === sprintId);
    if (!sprint) return;
    setSprintInUseUpdating(sprintId);
    try {
      await axios.post(`${sprintsEndpoint}/${sprintId}/activar`, null, {
        headers: authHeaders,
      });
      setSprints((prev) => prev.map((s) => ({ ...s, en_uso: s.id === sprintId ? 1 : 0 })));
    } catch (error) {
      console.error('Error al marcar sprint en uso', error);
    } finally {
      setSprintInUseUpdating(null);
    }
  };

  const handleUpdateTareaEstatus = async (tareaId: number, nuevoEstatus: TareaCrov['estatus']) => {
    if (!tareasEndpoint || !token) return;

    const tarea = tareas.find((t) => t.id === tareaId);
    if (!tarea) return;

    setTareaStatusUpdating(tareaId);

    const payload = {
      ...tarea,
      estatus: nuevoEstatus,
      id_sistemas_crov: Number(tarea.id_sistemas_crov),
      id_empleados_crov: Number(tarea.id_empleados_crov),
      complejidad: Number(tarea.complejidad),
      fecha_vencimiento: tarea.fecha_vencimiento || null,
    };

    try {
      await axios.put(`${tareasEndpoint}/${tareaId}`, payload, { headers: authHeaders });
      setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, estatus: nuevoEstatus } : t)));
    } catch (error) {
      console.error('Error al actualizar estatus de la tarea', error);
    } finally {
      setTareaStatusUpdating(null);
    }
  };

  const handleCardDragStart = (tareaId: number) => {
    setDraggingTareaId(tareaId);
  };

  const handleCardDragEnd = () => {
    setDraggingTareaId(null);
  };

  const handleDropOnColumn = (estatus: TareaCrov['estatus']) => {
    if (!draggingTareaId) return;

    handleUpdateTareaEstatus(draggingTareaId, estatus);
    setDraggingTareaId(null);
  };

  const handleOpenTareaDetalle = (tarea: TareaCrov) => {
    setTareaTableroDetalle(tarea);
  };

  const handleCloseTareaDetalle = () => {
    setTareaTableroDetalle(null);
  };

  const selectedSprintTareas = useMemo(() => {
    if (!selectedSprint) return [] as TareaCrov[];
    return tareas.filter((tarea) => tarea.id_sprint === selectedSprint.id);
  }, [selectedSprint, tareas]);

  const sprintOptions = sprints.map((sprint) => ({
    value: String(sprint.id),
    label: sprint.nombre || `Sprint_${sprint.id}`,
  }));

  const sprintNameById = useMemo(() => {
    const sprintNames = new Map<number, string>();

    sprints.forEach((sprint) => {
      sprintNames.set(sprint.id, sprint.nombre || `Sprint_${sprint.id}`);
    });

    return sprintNames;
  }, [sprints]);

  const sprintEnUso = useMemo(() => sprints.find((sprint) => sprint.en_uso === 1) || null, [sprints]);

  const sprintEnUsoTareas = useMemo(
    () => (sprintEnUso ? tareas.filter((tarea) => tarea.id_sprint === sprintEnUso.id) : []),
    [sprintEnUso, tareas],
  );

  const sprintDashboardStats = useMemo(() => {
    if (!sprintEnUso) {
      return {
        totalTareas: 0,
        tareasListas: 0,
        complejidadTotal: 0,
        complejidadListo: 0,
        complejidadPromedio: 0,
      };
    }

    const totalTareas = sprintEnUsoTareas.length;
    const tareasListas = sprintEnUsoTareas.filter((tarea) => tarea.estatus === 'Listo').length;
    const complejidadTotal = sprintEnUsoTareas.reduce((acc, tarea) => acc + Number(tarea.complejidad || 0), 0);
    const complejidadListo = sprintEnUsoTareas
      .filter((tarea) => tarea.estatus === 'Listo')
      .reduce((acc, tarea) => acc + Number(tarea.complejidad || 0), 0);

    const complejidadPromedio = totalTareas ? Number((complejidadTotal / totalTareas).toFixed(2)) : 0;

    return {
      totalTareas,
      tareasListas,
      complejidadTotal,
      complejidadListo,
      complejidadPromedio,
    };
  }, [sprintEnUso, sprintEnUsoTareas]);

  const sprintComplejidadPorEstatus = useMemo(() => {
    if (!sprintEnUso) return [] as { estatus: TareaCrov['estatus']; total: number; cantidad: number }[];

    return estatusOptions.map((estatus) => {
      const tareasPorEstatus = sprintEnUsoTareas.filter((tarea) => tarea.estatus === estatus);
      const total = tareasPorEstatus.reduce((acc, tarea) => acc + Number(tarea.complejidad || 0), 0);

      return {
        estatus,
        total,
        cantidad: tareasPorEstatus.length,
      };
    });
  }, [estatusOptions, sprintEnUso, sprintEnUsoTareas]);

  const sprintTareasPorEstatusPieData = useMemo(() => {
    if (!sprintEnUso) return [] as { label: string; value: number; color: string }[];

    return estatusOptions
      .map((estatus) => {
        const cantidad = sprintEnUsoTareas.filter((tarea) => tarea.estatus === estatus).length;

        return {
          label: estatus,
          value: cantidad,
          color: estatusChartColors[estatus],
        };
      })
      .filter((item) => item.value > 0);
  }, [estatusOptions, sprintEnUso, sprintEnUsoTareas]);

  const comparativaComplejidadSprints = useMemo(() => {
    const resumen = sprints.map((sprint) => {
      const tareasSprint = tareas.filter((tarea) => tarea.id_sprint === sprint.id);
      const complejidadTotal = tareasSprint.reduce((acc, tarea) => acc + Number(tarea.complejidad || 0), 0);
      const complejidadListo = tareasSprint
        .filter((tarea) => tarea.estatus === 'Listo')
        .reduce((acc, tarea) => acc + Number(tarea.complejidad || 0), 0);

      return {
        id: sprint.id,
        nombre: sprint.nombre || `Sprint_${sprint.id}`,
        complejidadTotal,
        complejidadListo,
        tareas: tareasSprint.length,
      };
    });

    const maxComplejidadListo = Math.max(...resumen.map((item) => item.complejidadListo), 0, 1);

    return resumen
      .sort((a, b) => b.id - a.id)
      .map((item) => ({
        ...item,
        avance: item.tareas ? Math.round((item.complejidadListo / (item.complejidadTotal || 1)) * 100) : 0,
        anchoBarra: Math.min(100, Math.round((item.complejidadListo / maxComplejidadListo) * 100)),
      }));
  }, [sprints, tareas]);

  const tableroTareas = useMemo(() => {
    if (!sprintEnUso) return [] as TareaCrov[];

    return tareas.filter((tarea) => {
      const perteneceAlSprint = tarea.id_sprint === sprintEnUso.id;
      const coincideEmpleado =
        tableroEmpleadoFiltro === 'all' || String(tarea.id_empleados_crov) === tableroEmpleadoFiltro;

      return perteneceAlSprint && coincideEmpleado;
    });
  }, [sprintEnUso, tableroEmpleadoFiltro, tareas]);

  const matchesBacklogFilters = useCallback(
    (tarea: TareaCrov) => {
      const matchesTitulo = backlogFilters.titulo
        ? tarea.titulo.toLowerCase().includes(backlogFilters.titulo.toLowerCase())
        : true;
      const matchesSistema = backlogFilters.sistema
        ? String(tarea.id_sistemas_crov) === backlogFilters.sistema
        : true;
      const matchesEmpleado = backlogFilters.empleado
        ? String(tarea.id_empleados_crov) === backlogFilters.empleado
        : true;

      return matchesTitulo && matchesSistema && matchesEmpleado;
    },
    [backlogFilters.empleado, backlogFilters.sistema, backlogFilters.titulo],
  );

  const filteredBacklogTareas = useMemo(
    () => tareas.filter((tarea) => matchesBacklogFilters(tarea)),
    [matchesBacklogFilters, tareas],
  );

  const backlogSprintGroups = useMemo(() => {
    const sprintsConTareas = sprints
      .map((sprint) => ({
        id: sprint.id,
        nombre: sprintNameById.get(sprint.id) || `Sprint_${sprint.id}`,
        tareas: filteredBacklogTareas.filter((tarea) => tarea.id_sprint === sprint.id),
      }))
      .filter((group) => group.tareas.length > 0);

    const sprintsDesconocidos = filteredBacklogTareas
      .filter((tarea) => tarea.id_sprint && !sprintNameById.has(tarea.id_sprint))
      .reduce(
        (acc, tarea) => {
          const sprintId = tarea.id_sprint as number;
          const existing = acc.get(sprintId) || [];
          acc.set(sprintId, [...existing, tarea]);
          return acc;
        },
        new Map<number, TareaCrov[]>(),
      );

    const sprintsDesconocidosOrdenados = Array.from(sprintsDesconocidos.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([id, tareasGrupo]) => ({
        id,
        nombre: `Sprint_${id}`,
        tareas: tareasGrupo,
      }));

    return [...sprintsConTareas, ...sprintsDesconocidosOrdenados];
  }, [filteredBacklogTareas, sprintNameById, sprints]);

  const backlogTareas = useMemo(
    () => filteredBacklogTareas.filter((tarea) => !tarea.id_sprint),
    [filteredBacklogTareas],
  );

  const sistemasStats = useMemo(() => {
    const counts = new Map<number, number>();

    filteredBacklogTareas.forEach((tarea) => {
      counts.set(tarea.id_sistemas_crov, (counts.get(tarea.id_sistemas_crov) || 0) + 1);
    });

    return sistemas.map((sistema) => ({
      id: sistema.id,
      nombre: sistema.nombre,
      total: counts.get(sistema.id) || 0,
    }));
  }, [filteredBacklogTareas, sistemas]);

  const empleadosStats = useMemo(() => {
    const counts = new Map<number, number>();

    filteredBacklogTareas.forEach((tarea) => {
      counts.set(tarea.id_empleados_crov, (counts.get(tarea.id_empleados_crov) || 0) + 1);
    });

    return empleados.map((empleado) => ({
      id: empleado.id,
      nombre: empleado.nombre_completo,
      total: counts.get(empleado.id) || 0,
    }));
  }, [empleados, filteredBacklogTareas]);

  const getEmpleadoNombre = useCallback(
    (id: number) => empleados.find((empleado) => empleado.id === id)?.nombre_completo || 'Sin responsable',
    [empleados],
  );

  const getSistemaNombre = useCallback(
    (id: number) => sistemas.find((sistema) => sistema.id === id)?.nombre || 'Sin sistema',
    [sistemas],
  );

  useEffect(() => {
    fetchconteodetareassprintactualporempleado()
  }, [])
  useEffect(() => {
    if (!editingSprintId) {
      setSprintForm((prev) => ({ ...prev, nombre: getNextSprintName() }));
    }
  }, [editingSprintId, getNextSprintName]);

  const handleEditarEnLineaTareaBacklog = async (
    idTarea: number,
    field: keyof TareaCrov,
    value: any,
  ) => {
    try {

      const payload = {
        [field]: value
      };

      await axios.put(`${tareasEndpoint}/${idTarea}`, payload, {
        headers: authHeaders
      });

      await fetchTareas();

    } catch (error) {
      console.error("Error al actualizar tarea inline:", error);
      toast.error("Error al actualizar tarea");
    }
  };

  const renderTareasTable = (tareasLista: TareaCrov[]) => {
    if (tareasLista.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No hay tareas para mostrar
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Story points</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Sprint</TableHead>
            <TableHead></TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tareasLista.map((tarea) => {
            return (
              <TableRow
              key={tarea.id}
              className="hover:bg-muted/50"
              draggable
              onDragStart={() => setBacklogTareaArrastradaId(tarea.id)}
              onDragEnd={() => setBacklogTareaArrastradaId(null)}
            >
              <TableCell>{tarea.id}</TableCell>

              <TableCell className="min-w-[200px]">
                <textarea
                  key={`titulo-${tarea.id}-${tarea.titulo}`}
                  defaultValue={tarea.titulo}
                  rows={1} 
                  className="w-full min-h-[32px] px-2 py-1.5 font-medium text-sm leading-tight bg-transparent border border-transparent rounded-md resize-none overflow-hidden hover:border-gray-300 hover:bg-white focus-visible:outline-none focus-visible:border-black focus-visible:bg-white transition-all"
                  ref={(ref) => {
                      if (ref) {
                          ref.style.height = 'auto';
                          ref.style.height = ref.scrollHeight + 'px';
                      }
                  }}
                  onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                  }}

                  // CLIC FUERA (BLUR) SOLO RESTAURA
                  onBlur={(e) => {
                    if (e.target.dataset.saved === "true") {
                      e.target.dataset.saved = "false";
                      return;
                    }
                    e.target.value = tarea.titulo;
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}

                  // TECLA ENTER GUARDA
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); 
                      const val = e.currentTarget.value.trim();
                      if (val !== tarea.titulo && val.length > 0) {
                        e.currentTarget.dataset.saved = "true";
                        handleEditarEnLineaTareaBacklog(tarea.id, "titulo", val);
                        e.currentTarget.blur();
                      } else {
                        e.currentTarget.value = tarea.titulo;
                        e.currentTarget.blur();
                      }
                    }
                    // TECLA ESC DEJA EL TITULO POR DEFECTO
                    if (e.key === "Escape") {
                      e.currentTarget.value = tarea.titulo;
                      e.currentTarget.blur();
                    }
                  }}
                />
              </TableCell>

              <TableCell>
                <Input
                  type="number"
                  min={1}
                  defaultValue={tarea.complejidad}
                  className="h-8 w-16 text-center px-1 bg-transparent border border-transparent hover:border-gray-300 hover:bg-white focus-visible:ring-0 focus-visible:border-black focus-visible:bg-white transition-all"
                  // CLIC FUERA (BLUR) SOLO RESTAURA (CANCELAR)
                  onBlur={(e) => {
                    if (e.target.dataset.saved === "true") {
                      e.target.dataset.saved = "false";
                      return;
                    }
                    e.target.value = String(tarea.complejidad);
                  }}
                  // TECLA ENTER GUARDA, ESCAPE CANCELA
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = Number(e.currentTarget.value);
                      if (val !== tarea.complejidad && val > 0) {
                        e.currentTarget.dataset.saved = "true"; 
                        handleEditarEnLineaTareaBacklog(tarea.id, "complejidad", val);
                        e.currentTarget.blur();
                      } else {
                        e.currentTarget.value = String(tarea.complejidad);
                        e.currentTarget.blur();
                      }
                    }
                    if (e.key === "Escape") {
                      e.currentTarget.value = String(tarea.complejidad); 
                      e.currentTarget.blur();
                    }
                  }}
                />
              </TableCell>
              <TableCell className="capitalize">
                <Select
                  value={tarea.prioridad}
                  onValueChange={(val) =>
                    handleEditarEnLineaTareaBacklog(tarea.id, "prioridad", val)
                  }
                >
                  <SelectTrigger 
                    className="group h-8 w-full px-2 border border-transparent shadow-none bg-transparent hover:border-gray-300 hover:bg-white focus:ring-0 data-[state=open]:bg-white transition-all [&>svg]:opacity-0 group-hover:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100"
                  >
                    <span
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium w-fit ${
                        tarea.prioridad === "baja"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : tarea.prioridad === "media"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {tarea.prioridad === "baja" && (
                        <>
                          Baja <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                      {tarea.prioridad === "media" && (
                        <>
                          Media <Minus className="w-3 h-3" />
                        </>
                      )}
                      {tarea.prioridad === "alta" && (
                        <>
                          Alta <ChevronUp className="w-3 h-3" />
                        </>
                      )}
                    </span>
                  </SelectTrigger>

                  <SelectContent className="bg-white p-1">
                    <SelectItem value="baja" className="my-1 cursor-pointer">
                      <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium">
                        Baja <ChevronDown className="w-3 h-3" />
                      </div>
                    </SelectItem>

                    <SelectItem value="media" className="my-1 cursor-pointer">
                      <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
                        Media <Minus className="w-3 h-3" />
                      </div>
                    </SelectItem>

                    <SelectItem value="alta" className="my-1 cursor-pointer">
                      <div className="flex items-center gap-2 justify-between w-full px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-medium">
                        Alta <ChevronUp className="w-3 h-3" />
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={tarea.estatus}
                  onValueChange={(val) =>
                    handleEditarEnLineaTareaBacklog(tarea.id, "estatus", val)
                  }
                >
                  <SelectTrigger 
                    className="group h-8 w-full px-2 border border-transparent shadow-none bg-transparent hover:border-gray-300 hover:bg-white focus:ring-0 data-[state=open]:bg-white transition-all [&>svg]:opacity-0 group-hover:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Por hacer">Por hacer</SelectItem>
                    <SelectItem value="En curso">En curso</SelectItem>
                    <SelectItem value="Implementacion lista">
                      Implementacion lista
                    </SelectItem>
                    <SelectItem value="Pruebas">Pruebas</SelectItem>
                    <SelectItem value="Listo">Listo</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <TableCell>
                <Select
                  value={tarea.tipo}
                  onValueChange={(val) =>
                    handleEditarEnLineaTareaBacklog(tarea.id, "tipo", val)
                  }
                >
                  <SelectTrigger 
                    className="group h-8 w-full px-2 border border-transparent shadow-none bg-transparent hover:border-gray-300 hover:bg-white focus:ring-0 data-[state=open]:bg-white transition-all [&>svg]:opacity-0 group-hover:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.keys(tareaTipoConfig).map((value) => (
                      <SelectItem key={value} value={value}>
                        <TareaTipoBadge tipo={value as TareaCrov["tipo"]} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={tarea.id_sprint ? String(tarea.id_sprint) : "none"}
                  onValueChange={(val) =>
                    handleEditarEnLineaTareaBacklog(
                      tarea.id, 
                      "id_sprint", 
                      val === "none" ? null : Number(val) 
                    )
                  }
                >
                  <SelectTrigger 
                    className="group h-8 w-full px-2 border border-transparent shadow-none bg-transparent hover:border-gray-300 hover:bg-white focus:ring-0 data-[state=open]:bg-white transition-all [&>svg]:opacity-0 group-hover:[&>svg]:opacity-100 data-[state=open]:[&>svg]:opacity-100"
                  >
                    <SelectValue placeholder="Sin sprint" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">Sin sprint</SelectItem>
                    {sprintOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={String(tarea.id_empleados_crov)}
                  onValueChange={(val) =>
                    handleEditarEnLineaTareaBacklog(tarea.id, "id_empleados_crov", Number(val))
                  }
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger className="h-fit w-fit p-0 border-none shadow-none bg-transparent hover:bg-muted/50 rounded-full focus:ring-0 focus:ring-offset-0">
                        <AvatarEmpleado
                          empleado={tarea.empleado}
                          className="h-8 w-8 border-2 border-white shadow-sm cursor-pointer"
                          initialsSize="text-xs"
                        />
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="center"
                      sideOffset={6}
                      className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-white shadow-lg"
                    >
                      Persona asignada: {tarea.empleado?.nombre_completo ?? "Sin asignar"}
                    </TooltipContent>
                  </Tooltip>
                  <SelectContent className="max-h-[300px] min-w-[200px] bg-white">
                    {empleados.map((empleado) => (
                      <SelectItem 
                          key={empleado.id} 
                          value={String(empleado.id)} 
                          className="cursor-pointer py-2"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarEmpleado
                            empleado={{nombre_completo: empleado.nombre_completo, color_perfil: empleado.color_perfil}}
                            className="h-8 w-8 border-2 border-white shadow-sm cursor-pointer"
                            initialsSize="text-xs"
                          />
                          <span className="text-sm truncate">
                              {empleado.nombre_completo}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTareaId(tarea.id);
                      setTareaModalOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTarea(tarea.id)}
                    disabled={tareaDeleting === tarea.id}
                  >
                    {tareaDeleting === tarea.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            );
          }
          )}
        </TableBody>
      </Table>
    );
  };
  

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-600">Jira CROV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as JiraTab)}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sistemas">Sistemas</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="sprints">Sprint</TabsTrigger>
            <TabsTrigger value="tablero">Tablero</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {!sprintEnUso ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No hay un sprint marcado como "en uso". Activa un sprint para visualizar el tablero ejecutivo.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border border-orange-100 bg-orange-50/60">
                    <CardHeader>
                      <CardTitle className="text-sm text-orange-700">Sprint en uso</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-lg font-semibold text-orange-900">{sprintEnUso.nombre}</p>
                      <p className="text-xs text-orange-700/80">
                        {sprintEnUso.fecha_inicio || 'Sin fecha de inicio'} → {sprintEnUso.fecha_final || 'Sin fecha fin'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tareas del sprint</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{sprintDashboardStats.totalTareas}</p>
                      <p className="text-xs text-muted-foreground">{sprintDashboardStats.tareasListas} completadas</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Complejidad total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{sprintDashboardStats.complejidadTotal}</p>
                      <p className="text-xs text-muted-foreground">Promedio {sprintDashboardStats.complejidadPromedio}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Velocidad (Listo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{sprintDashboardStats.complejidadListo}</p>
                      <p className="text-xs text-muted-foreground">Complejidad sumada en "Listo"</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Distribución por estatus</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sprintComplejidadPorEstatus.map((item) => {
                        const progreso = sprintDashboardStats.complejidadTotal
                          ? Math.round((item.total / sprintDashboardStats.complejidadTotal) * 100)
                          : 0;

                        return (
                          <div key={item.estatus} className="space-y-1 rounded-lg border p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{item.estatus}</span>
                              <span className="text-muted-foreground">{item.cantidad} tareas</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-orange-500"
                                style={{ width: `${progreso}%` }}
                                aria-label={`Complejidad ${item.total}`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Complejidad {item.total} ({progreso}%)
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tareas del sprint</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sprintTareasPorEstatusPieData.length > 0 ? (
                        <SimplePieChart
                          data={sprintTareasPorEstatusPieData}
                          valueFormatter={(value) => `${value} ${value === 1 ? 'tarea' : 'tareas'}`}
                        />
                      ) : (
                        <p className="text-sm text-center text-muted-foreground">Sin tareas asignadas aún.</p>
                      )}
                      <p className="text-center text-sm text-muted-foreground">
                        {sprintDashboardStats.tareasListas} / {sprintDashboardStats.totalTareas} tareas listas
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparativa de sprints (complejidad en "Listo")</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {comparativaComplejidadSprints.map((item) => (
                      <div key={item.id} className="space-y-1 rounded-lg border p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.tareas} tareas · Complejidad total {item.complejidadTotal}
                            </p>
                          </div>
                          <Badge variant="outline" className="justify-start text-sm font-semibold">
                            Listo: {item.complejidadListo}
                          </Badge>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${item.anchoBarra}%` }}
                            aria-label={`Complejidad listo ${item.complejidadListo}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Avance por complejidad: {item.avance}%</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="sistemas" className="space-y-6">
            
              <ApartadoSistemas/>
          </TabsContent>

          <TabsContent value="sprints" className="space-y-4">
            <div className="flex justify-end">
              <Dialog
                open={sprintModalOpen}
                onOpenChange={(open) => {
                  setSprintModalOpen(open);
                  if (!open) {
                    resetSprintForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setEditingSprintId(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingSprintId ? 'Editar sprint' : 'Nuevo sprint'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingSprintId ? 'Editar sprint' : 'Crear sprint'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSprintSubmit} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Nombre del sprint</label>
                      <Input
                        required
                        value={sprintForm.nombre}
                        onChange={(e) => setSprintForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fecha de inicio</label>
                      <Input
                        type="date"
                        value={sprintForm.fecha_inicio}
                        onChange={(e) => setSprintForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fecha de fin</label>
                      <Input
                        type="date"
                        value={sprintForm.fecha_final}
                        onChange={(e) => setSprintForm((prev) => ({ ...prev, fecha_final: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Switch
                          checked={Boolean(sprintForm.activo)}
                          onCheckedChange={(checked) =>
                            setSprintForm((prev) => ({ ...prev, activo: checked ? 1 : 0 }))
                          }
                        />
                        Activo
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Switch
                          checked={Boolean(sprintForm.en_uso)}
                          onCheckedChange={(checked) =>
                            setSprintForm((prev) => ({ ...prev, en_uso: checked ? 1 : 0 }))
                          }
                        />
                        En uso
                      </label>
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                      <Button type="submit" disabled={sprintSaving} className="bg-orange-500 hover:bg-orange-600">
                        {sprintSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span className="ml-2">{editingSprintId ? 'Actualizar' : 'Crear'} sprint</span>
                      </Button>
                      <Button type="button" variant="outline" onClick={resetSprintForm} disabled={sprintSaving}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>En uso</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sprints.map((sprint) => (
                  <TableRow key={sprint.id} className="hover:bg-muted/50">
                    <TableCell>{sprint.id}</TableCell>
                    <TableCell>{sprint.nombre}</TableCell>
                    <TableCell>{sprint.fecha_inicio}</TableCell>
                    <TableCell>{sprint.fecha_final}</TableCell>
                    <TableCell>{sprint.activo ? 'Sí' : 'No'}</TableCell>
                    <TableCell>{sprint.en_uso ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedSprint(sprint);
                          setSprintTasksModalOpen(true);
                        }}
                      >
                        Ver tareas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSprintId(sprint.id);
                          setSprintForm({
                            nombre: sprint.nombre,
                            fecha_inicio: sprint.fecha_inicio || '',
                            fecha_final: sprint.fecha_final || '',
                            activo: sprint.activo,
                            en_uso: sprint.en_uso,
                          });
                          setSprintModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => handleSetSprintEnUso(sprint.id)}
                        disabled={sprintInUseUpdating === sprint.id}
                      >
                        {sprintInUseUpdating === sprint.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Marcar en uso'
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSprint(sprint.id)}
                        disabled={sprintDeleting === sprint.id}
                      >
                        {sprintDeleting === sprint.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sprints.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No hay sprints registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Dialog open={sprintTasksModalOpen} onOpenChange={setSprintTasksModalOpen}>
              <DialogContent className="max-w-7xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedSprint ? `Tareas de ${selectedSprint.nombre}` : 'Tareas del sprint'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2">
                  {selectedSprintTareas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este sprint no tiene tareas asignadas.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Sistema</TableHead>
                          <TableHead>Estatus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSprintTareas.map((tarea) => (
                          <TableRow key={tarea.id}>
                            <TableCell className="font-semibold">{tarea.titulo}</TableCell>
                            <TableCell className="max-w-xs text-sm text-muted-foreground">
                              {tarea.descripcion}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <AvatarEmpleado
                                      empleado={tarea.empleado}
                                      className="h-8 w-8 border-2 border-white shadow-sm"
                                      initialsSize="text-xs"
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  align="center"
                                  sideOffset={6}
                                  className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-white shadow-lg"
                                >
                                  {tarea.empleado.nombre_completo}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <TareaTipoBadge tipo={tarea.tipo} />
                            </TableCell>
                            <TableCell>{getSistemaNombre(tarea.id_sistemas_crov)}</TableCell>
                            <TableCell>
                              <Select
                                value={tarea.estatus}
                                onValueChange={(value) =>
                                  handleUpdateTareaEstatus(
                                    tarea.id,
                                    value as TareaCrov['estatus'],
                                  )
                                }
                                disabled={tareaStatusUpdating === tarea.id}
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {estatusOptions.map((estatus) => (
                                    <SelectItem key={estatus} value={estatus}>
                                      {estatus}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="tablero" className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold">Tablero de tareas</p>
                <p className="text-sm text-muted-foreground">
                  {sprintEnUso
                    ? `Mostrando únicamente las tareas del ${sprintEnUso.nombre}.`
                    : 'No hay un sprint en uso. Marca un sprint como en uso para visualizar su tablero.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Responsable</span>
                <Select
                  value={tableroEmpleadoFiltro}
                  onValueChange={(value) => setTableroEmpleadoFiltro(value as typeof tableroEmpleadoFiltro)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Todos los responsables" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-48 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    {empleados
                    .filter(empleado => empleado.activo)
                    .map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {empleado.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!sprintEnUso ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No hay sprint activo para mostrar el tablero.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {estatusOptions.map((estatus) => {
                  const tareasColumna = tableroTareas.filter((tarea) => tarea.estatus === estatus);
                  const totalComplejidad = tareasColumna.reduce((total, tarea) => total + (tarea.complejidad ?? 0),0);

                  return (
                    <div
                      key={estatus}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDropOnColumn(estatus)}
                      className="rounded-lg border bg-muted/40 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold">{estatus}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary">{totalComplejidad}</Badge>
                          <Badge variant="outline">{tareasColumna.length}</Badge>
                        </div>
                      </div>
                      <ScrollArea className="h-[520px] pr-2">
                        <div className="space-y-3">
                          {tareasColumna.map((tarea) => (
                            <div
  key={tarea.id}
  draggable
  onDragStart={() => handleCardDragStart(tarea.id)}
  onDragEnd={handleCardDragEnd}
  onClick={() => handleOpenTareaDetalle(tarea)}
  className={`cursor-pointer rounded-lg border bg-slate-100 p-4 shadow-sm transition hover:shadow-md ${
    draggingTareaId === tarea.id ? 'opacity-50' : ''
  }`}
>
  {/* Título */}
  <p className="text-sm font-semibold text-slate-800 leading-tight">
    {tarea.titulo}
  </p>

  {/* Badge superior SOLO sistema */}
  <div className="mt-2">
  {(() => {
    const sistema = getSistemaNombre(tarea?.id_sistemas_crov)?.toLowerCase();

    let colorClase = "bg-slate-200 text-slate-700";

    if (sistema?.includes("punto de venta")) {
      colorClase = "bg-blue-100 text-blue-700";
    } else if (sistema?.includes("inmobiliaria")) {
      colorClase = "bg-green-100 text-green-700";
    }

    return (
      <span
        className={`inline-block text-[10px] font-semibold uppercase px-2 py-1 rounded ${colorClase}`}
      >
        {getSistemaNombre(tarea?.id_sistemas_crov) ?? "Sin sistema"}
      </span>
    );
  })()}
</div>

  {/* Footer */}
  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
    
    <div className="flex items-center gap-2">
      <span className="text-red-500">🏷</span>
      <span>CS-{tarea.id}</span>
    </div>

    <div className="flex items-center gap-3">

      <span className="text-slate-700 font-semibold">
        Complejidad:
      </span>

      {editingTareaId === tarea.id ? (
  <input
    type="number"
    min={1}
    defaultValue={tarea.complejidad ?? 0}
    autoFocus
    onClick={(e) => e.stopPropagation()}
    className="w-12 text-xs border rounded px-1 py-0.5 bg-white text-center"

    onBlur={(e) => {
      if (e.target.dataset.saved === "true") {
        e.target.dataset.saved = "false";
        setEditingTareaId(null);
        return;
      }

      e.target.value = String(tarea.complejidad ?? 0);
      setEditingTareaId(null);
    }}

    onKeyDown={(e) => {
      if (e.key === "Enter") {
        const val = Number(e.currentTarget.value);

        if (val !== tarea.complejidad && val > 0) {
          e.currentTarget.dataset.saved = "true";
          handleEditarEnLineaTareaBacklog(
            tarea.id,
            "complejidad",
            val
          );
        } else {
          e.currentTarget.value = String(tarea.complejidad ?? 0);
        }

        e.currentTarget.blur();
      }

      if (e.key === "Escape") {
        e.currentTarget.value = String(tarea.complejidad ?? 0);
        e.currentTarget.blur();
      }
    }}
  />
) : (
  <div
    onClick={(e) => {
      e.stopPropagation();
      setEditingTareaId(tarea.id);
    }}
    className="bg-slate-200 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer hover:bg-orange-200 transition"
  >
    {tarea.complejidad ?? 0}
  </div>
)}


      <AvatarEmpleado
        empleado={{
          nombre_completo: tarea.empleado.nombre_completo,
          color_perfil: tarea.empleado.color_perfil,
        }}
      />
    </div>
  </div>
</div>

                          ))}
                          {tareasColumna.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground">Sin tareas en este estatus.</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODAL DE EDICION DE TAREAS AL VER DETALLE DE TAREA EN TABLERO */}
            {tareaTableroDetalle && (
              <TareaFormModal
                open={Boolean(tareaTableroDetalle)}
                onOpenChange={(open) => {
                  if (!open) handleCloseTareaDetalle();
                }}
                tareaToEdit={tareaTableroDetalle}
                onSuccess={() => {
                  fetchTareas();
                  handleCloseTareaDetalle();
                }}
                sistemas={sistemas}
                empleados={empleados}
                sprintOptions={sprintOptions}
                apiUrl={apiUrl!}
                authHeaders={authHeaders}
                customTitle='Detalle de tarea'
                showResetButton = {false}
              />
            )}
            
          </TabsContent>

          <TabsContent value="backlog" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  setEditingTareaId(null);
                  setTareaModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva tarea
              </Button>
            </div>
            
            {/* COMPONENTE AISLADO DEL MODAL PARA CREAR/EDITAR TAREAS */}
            {tareaModalOpen && (
              <TareaFormModal
                open={tareaModalOpen}
                onOpenChange={setTareaModalOpen}
                tareaToEdit={editingTareaId ? tareas.find(t => t.id === editingTareaId) : null}
                onSuccess={() => {
                  fetchTareas();
                  setEditingTareaId(null);
                }}
                sistemas={sistemas}
                empleados={empleados}
                sprintOptions={sprintOptions}
                apiUrl={apiUrl!}
                authHeaders={authHeaders}
              />
            )}

            <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Buscar por título"
                  value={backlogFilters.titulo}
                  onChange={(e) =>
                    setBacklogFilters((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sistema</label>
                <Select
                  value={backlogFilters.sistema}
                  onValueChange={(value) =>
                    setBacklogFilters((prev) => ({ ...prev, sistema: value === 'all' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los sistemas" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos</SelectItem>
                    {sistemas.map((sistema) => (
                      <SelectItem key={sistema.id} value={String(sistema.id)}>
                        {sistema.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado</label>
                <Select
                  value={backlogFilters.empleado}
                  onValueChange={(value) =>
                    setBacklogFilters((prev) => ({ ...prev, empleado: value === 'all' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-80 overflow-y-auto">
                    <SelectItem value="all">Todos</SelectItem>
                    {empleados.filter(empleado => empleado.activo)
                    .map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {empleado.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tareas por sistema CROV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sistemasStats.map((stat) => (
                    <div key={stat.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <span>{stat.nombre}</span>
                      <span className="font-semibold">{stat.total}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tareas por empleado CROV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conteodetareassprintactualporempleado.map((stat) => (
                    <div key={stat.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarEmpleado
                          empleado={{nombre_completo: stat.nombre_completo, color_perfil: stat.color_perfil}}
                          className="h-8 w-8 border-2 border-white shadow-sm"
                          initialsSize="text-xs"
                        />
                        <span className="truncate text-sm font-medium">
                          {stat.nombre_completo}
                        </span>
                      </div>
                      <span className="ml-3 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-background text-xs font-semibold">
                        {stat._count.tareas}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {backlogSprintGroups.map((group) => (
                <details
                  key={`sprint-${group.id}`}
                  className="overflow-hidden rounded-lg border bg-white shadow-sm"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropBacklogTareaArrastrada(e, group.id)}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-semibold">
                    <span>{group.nombre}</span>
                    <span className="text-sm text-muted-foreground">{group.tareas.length} tareas</span>
                  </summary>
                  <div className="border-t">{renderTareasTable(group.tareas)}</div>
                </details>
              ))}

              <details 
                className="overflow-hidden rounded-lg border bg-white shadow-sm"
                onDragOver={(e) => {
                  e.preventDefault(); 
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => handleDropBacklogTareaArrastrada(e, null)}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 font-semibold">
                  <span>Backlog</span>
                  <span className="text-sm text-muted-foreground">{backlogTareas.length} tareas</span>
                </summary>
                <div className="border-t">{renderTareasTable(backlogTareas)}</div>
              </details>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
