'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, Loader2, BookOpen, PlayCircle, ChevronDown } from 'lucide-react';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

// === 1. GUÍA DE REGISTRO ===
const GUIDE_FLOW_REGISTER: GuideStep[] = [
  {
    targetKey: "razon-social-input",
    title: "1. Datos Obligatorios",
    content: "Ingresa aquí el nombre legal de la empresa o el nombre completo del proveedor. Este campo es indispensable.",
    placement: "right",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "rfc-input",
    title: "2. RFC",
    content: "Captura el Registro Federal de Contribuyentes para fines fiscales y de facturación.",
    placement: "left",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "telefono-input",
    title: "3. Teléfono (Obligatorio)",
    content: "Es necesario registrar un número de contacto principal a 10 dígitos.",
    placement: "right",
    modalPosition: "bottom-right"
  },
  {
    targetKey: "rubro-credito-section",
    title: "4. Rubro y Crédito",
    content: "Define el giro comercial del proveedor y, si aplica, las condiciones de crédito (monto límite y días de plazo).",
    placement: "top",
    modalPosition: "top-right"
  },
  {
    targetKey: "btn-guardar",
    title: "5. Guardar",
    content: "Haz clic en 'Registrar' para guardar al nuevo proveedor en el sistema.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// === 2. GUÍA DE ACTUALIZACIÓN ===
const GUIDE_FLOW_UPDATE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar Proveedor",
    content: "Usa el buscador para localizar rápidamente al proveedor que necesitas modificar.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-edit-item",
    title: "2. Editar (Acción Requerida)",
    content: "Haz clic en el botón del lápiz para cargar la información del proveedor en el formulario.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: true // Obliga a dar clic para avanzar
  },
  {
    targetKey: "razon-social-input",
    title: "3. Modificar Datos",
    content: "Realiza los cambios necesarios en los campos del formulario.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-guardar",
    title: "4. Actualizar",
    content: "Haz clic en el botón (ahora dirá 'Actualizar') para guardar los cambios.",
    placement: "top",
    modalPosition: "top-left"
  }
];

// === 3. GUÍA DE ELIMINACIÓN (MODIFICADA PARA NO BORRAR) ===
const GUIDE_FLOW_DELETE: GuideStep[] = [
  {
    targetKey: "search-input",
    title: "1. Buscar",
    content: "Encuentra al proveedor que deseas dar de baja utilizando el buscador.",
    placement: "bottom",
    modalPosition: "bottom-left"
  },
  {
    targetKey: "btn-delete-item", // Apunta al primer basurero
    title: "2. Desactivar",
    content: "Para eliminar un proveedor, se debe hacer clic en este icono de basura. Puedes presionar 'Finalizar' ahora para terminar el tutorial sin borrar nada.",
    placement: "left",
    modalPosition: "top-right",
    disableNext: false // IMPORTANTE: Ahora permite ver el botón "Finalizar" sin hacer la acción
  }
];

interface Proveedor {
  id: number;
  rfc: string;
  razon_social: string;
  telefono: string;
  movil: string;
  nom_contacto: string;
  email: string;
  rubro: string;
  limite_credito: string;
  dias_credito: string;
  sucursalId: number;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [form, setForm] = useState<Partial<Proveedor>>({});
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const proveedoresPorPagina = 10;

  // === ESTADO PARA LA GUÍA INTERACTIVA ===
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);

  // Iniciar guía específica
  const startGuide = (flow: 'REGISTER' | 'UPDATE' | 'DELETE') => {
    let steps = GUIDE_FLOW_REGISTER;
    if (flow === 'UPDATE') steps = GUIDE_FLOW_UPDATE;
    if (flow === 'DELETE') steps = GUIDE_FLOW_DELETE;

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
    
    // Forzar repintado para flechas
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  };

  const closeGuide = () => {
    setGuideActive(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      closeGuide();
      toast.success("¡Guía completada!");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Auto-inicio de la guía (Registro por defecto)
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenProveedoresGuide');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        startGuide('REGISTER');
        localStorage.setItem('hasSeenProveedoresGuide', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const cargarProveedores = async () => {
    try {
      const res = await axios.get(`${apiUrl}/proveedor?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar proveedores');
    }
  };

  const guardarProveedor = async () => {
    // ... Validaciones originales ...
    if (!form.razon_social || !form.telefono) {
      toast.error('Razón social y Teléfono son obligatorios');
      return;
    }
    if (form.limite_credito !== undefined && form.limite_credito !== '') {
      const n = Number(form.limite_credito);
      if (isNaN(n) || n < 0) {
        toast.error('El límite de crédito no puede ser negativo');
        return;
      }
    }
    // ... (resto de validaciones igual que antes) ...

    const payload = { ...form, sucursalId: sucursalIdSession, activo: 1 };
    setLoading(true);

    try {
      if (editando) {
        await axios.put(`${apiUrl}/proveedor/${editando.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Proveedor actualizado');
      } else {
        await axios.post(`${apiUrl}/proveedor`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Proveedor creado');
      }

      setForm({});
      setEditando(null);
      cargarProveedores();
    } catch (err) {
      console.error('Error al guardar proveedor:', err, payload);
      toast.error('Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const desactivarProveedor = async (id: number) => {
    // --- PROTECCIÓN PARA LA GUÍA ---
    // Si el usuario hace clic en el botón de borrar MIENTRAS está en la guía de eliminar
    if (guideActive && currentSteps === GUIDE_FLOW_DELETE) {
        toast.info('Modo Guía: Acción simulada. El proveedor no fue eliminado.');
        closeGuide(); // Cerramos la guía como si hubiera terminado exitosamente
        return;
    }

    // Lógica normal
    if (!confirm('¿Deseas desactivar este proveedor?')) return;
    await axios.delete(`${apiUrl}/proveedor/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success('Proveedor desactivado');
    cargarProveedores();
  };

  const iniciarEdicion = (prov: Proveedor) => {
    setEditando(prov);
    setForm(prov);
    
    // Auto-avance para la guía de ACTUALIZAR
    if (guideActive && currentSteps === GUIDE_FLOW_UPDATE && currentStepIndex === 1) {
        setTimeout(handleNextStep, 300);
    }
  };

  const limpiarFormulario = () => {
    setForm({});
    setEditando(null);
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const indexInicial = (paginaActual - 1) * proveedoresPorPagina;
  const indexFinal = paginaActual * proveedoresPorPagina;
  const proveedoresPaginados = proveedores.slice(indexInicial, indexFinal);
  const totalPaginas = Math.ceil(proveedores.length / proveedoresPorPagina);


  // Helpers de input
  const blockInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const invalid = ['-', '+', 'e', 'E'];
    if (invalid.includes(e.key)) e.preventDefault();
  };
  const blockInvalidKeysInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const invalid = ['-', '+', 'e', 'E', '.', ','];
    if (invalid.includes(e.key)) e.preventDefault();
  };
  const preventWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).blur();
  };
  const handlePasteDecimalPositive = (e: React.ClipboardEvent<HTMLInputElement>) => { /* ... */ };
  const handlePasteIntPositive = (e: React.ClipboardEvent<HTMLInputElement>) => { /* ... */ };


  return (
    <div className="space-y-6 relative">
      <h1 className="text-2xl font-bold text-orange-600">Proveedores</h1>
      
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

      {/* BARRA DE HERRAMIENTAS: GUÍAS Y TUTORIALES */}
      <div className="flex flex-wrap gap-2 mt-2 mb-4">
        
        {/* MENÚ DE GUÍAS (COMBO) */}
        <div className="relative inline-block text-left">
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
                    <button onClick={() => startGuide('REGISTER')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                     ➕ Registrar Proveedor
                    </button>
                    <button onClick={() => startGuide('UPDATE')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                     ✏️ Modificar Proveedor
                    </button>
                    <button onClick={() => startGuide('DELETE')} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t">
                     🗑️ Eliminar Proveedor
                    </button>
                </div>
                </div>
            )}
        </div>

        {/* BOTÓN TUTORIAL */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.open('https://www.youtube.com/watch?v=at4QvwYNtFo&list=PLQiB7q2hSscFQdcSdoDEs0xFSdPZjBIT-&index=7', '_blank')}
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Tutorial Rápido
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div data-guide="razon-social-input">
          <label className="text-sm font-medium text-gray-700">Razón social:*</label>
          <Input value={form.razon_social || ''} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
        </div>

        <div data-guide="rfc-input">
          <label className="text-sm font-medium text-gray-700">RFC</label>
          <Input value={form.rfc || ''} onChange={(e) => setForm({ ...form, rfc: e.target.value })} />
        </div>

        <div data-guide="telefono-input">
          <label className="text-sm font-medium text-gray-700">Teléfono:*</label>
          <Input
            value={form.telefono || ''}
            maxLength={10} 
            inputMode="numeric"
            onKeyDown={(e) => {
              const invalid = ['-', '+', 'e', 'E', '.', ','];
              if (invalid.includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm({ ...form, telefono: cleaned });
            }}
          />
        </div>

        <div data-guide="movil-input">
          <label className="text-sm font-medium text-gray-700">Móvil</label>
          <Input
            value={form.movil || ''}
            maxLength={10}
            inputMode="numeric"
            onKeyDown={(e) => {
              const invalid = ['-', '+', 'e', 'E', '.', ','];
              if (invalid.includes(e.key)) e.preventDefault();
            }}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm({ ...form, movil: cleaned });
            }}
          />
        </div>

        <div data-guide="contacto-input">
          <label className="text-sm font-medium text-gray-700">Nombre del contacto</label>
          <Input value={form.nom_contacto || ''} onChange={(e) => setForm({ ...form, nom_contacto: e.target.value })} />
        </div>

        <div data-guide="email-input">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        {/* SECCIÓN AGRUPADA RUBRO Y CRÉDITO */}
        <div className="col-span-2 grid grid-cols-2 gap-4" data-guide="rubro-credito-section">
            <div>
              <label className="text-sm font-medium text-gray-700">Rubro</label>
              <Input value={form.rubro || ''} onChange={(e) => setForm({ ...form, rubro: e.target.value })} />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Límite de crédito</label>
              <Input
                value={form.limite_credito ?? ''}
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                onKeyDown={blockInvalidKeys}
                onWheel={preventWheel}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(',', '.'));
                  const safe = Number.isFinite(v) ? Math.max(0, v) : '';
                  setForm({ ...form, limite_credito: safe === '' ? '' : String(safe) });
                }}
              />
            </div>

            {/* Ocupa espacio para mantener el grid */}
            <div>
              <label className="text-sm font-medium text-gray-700">Días de crédito</label>
              <Input
                value={form.dias_credito ?? ''}
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                onKeyDown={blockInvalidKeysInt}
                onWheel={preventWheel}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : '';
                  setForm({ ...form, dias_credito: safe === '' ? '' : String(safe) });
                }}
              />
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4" data-guide="action-buttons">
        <Button onClick={limpiarFormulario} variant="outline" className="text-orange-600 border-orange-500 hover:bg-orange-100 w-full">
          Limpiar formulario
        </Button>

        <Button 
            onClick={guardarProveedor} 
            disabled={loading} 
            className="bg-orange-500 text-white hover:bg-orange-600 w-full"
            data-guide="btn-guardar" 
        >
          {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Registrar'}
        </Button>
      </div>

      <hr className="my-6" />

      <div className="flex justify-end mb-4" data-guide="search-input">
        <Input
          placeholder="Buscar por razón social o teléfono..."
          onChange={(e) => {
            const q = e.target.value.toLowerCase();
            const resultados = proveedores.filter(p =>
              p.razon_social.toLowerCase().includes(q) ||
              p.telefono.toLowerCase().includes(q)
            );
            setProveedores(resultados.length > 0 || q ? resultados : [...proveedores]);
            if (!q) cargarProveedores();
          }}
          className="w-1/3"
        />
      </div>

      <h2 className="text-xl font-semibold">Lista de proveedores</h2>

      <div className="space-y-6">

        <table className="min-w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2 text-left">Razón social</th>
              <th className="p-2 text-left">RFC</th>
              <th className="p-2 text-left">Contacto</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresPaginados.map((prov, index) => (
              <tr key={prov.id} className="border-t hover:bg-orange-50">
                <td className="p-2">{prov.razon_social}</td>
                <td className="p-2">{prov.rfc}</td>
                <td className="p-2">{prov.nom_contacto}</td>
                <td className="p-2">{prov.telefono}</td>
                <td className="p-2">{prov.email}</td>
                <td 
                    className="p-2 text-right space-x-2"
                    data-guide={index === 0 ? "table-first-row" : undefined} 
                >
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => iniciarEdicion(prov)}
                    data-guide={index === 0 ? "btn-edit-item" : undefined} // Para la guía de actualizar
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => desactivarProveedor(prov.id)}
                    data-guide={index === 0 ? "btn-delete-item" : undefined} // Para la guía de eliminar
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginado */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaActual(paginaActual - 1)}
            disabled={paginaActual === 1}
          >
            Anterior
          </Button>
          <span className="text-sm">Página {paginaActual} de {totalPaginas}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaActual(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}