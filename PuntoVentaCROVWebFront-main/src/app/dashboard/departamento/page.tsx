'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Tag, Loader2, BookOpen, ChevronDown, Plus, Lock } from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTES DE LA GUÍA INTERACTIVA ---
import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Clase {
  id: number;
  nombre: string;
  sucursalId: number;
  activo: number;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// === FLUJOS DE LA GUÍA ===
const GUIDE_FLOW_ADD: GuideStep[] = [
  {
    targetKey: "btn-add-dept",
    title: "1. Agregar Departamento",
    content: "Haz clic aquí para registrar una nueva categoría o departamento en el sistema.",
    placement: "left",
    modalPosition: "bottom-left", 
    disableNext: true 
  },
  {
    targetKey: "input-nombre",
    title: "2. Nombre",
    content: "Escribe el nombre del departamento (ej. 'Abarrotes', 'Farmacia', 'Electrónica').",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-save",
    title: "3. Guardar",
    content: "Presiona 'Registrar' para guardar los cambios en la base de datos.",
    placement: "right",
    modalPosition: "right"
  }
];

const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "btn-edit-first",
    title: "1. Modificar Departamento",
    content: "Ubica el departamento en la lista y haz clic en el botón del lápiz para editarlo.",
    placement: "left",
    modalPosition: "bottom-right",
    disableNext: true
  },
  {
    targetKey: "input-nombre",
    title: "2. Editar Nombre",
    content: "Realiza las correcciones necesarias al nombre del departamento.",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-save",
    title: "3. Confirmar",
    content: "Haz clic en 'Actualizar' para guardar la edición.",
    placement: "right",
    modalPosition: "right"
  }
];

const GUIDE_FLOW_DELETE: GuideStep[] = [
  {
    targetKey: "btn-delete-first",
    title: "1. Eliminar Departamento",
    content: "Para desactivar un departamento, presiona el botón rojo de basura. Se solicitará confirmación.",
    placement: "left",
    modalPosition: "bottom-right"
  }
];

export default function ClasePage() {
  const [clase, setClases] = useState<Clase[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Clase | null>(null);
  const [form, setForm] = useState({ nombre: '', sucursalId: 0 });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({});

  // Estados de la Guía
  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [isListEmpty, setIsListEmpty] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('sucursalId') || '0', 10) : 0;

  const cargarClases = async () => {
    try {
      const res = await axios.get(`${apiUrl}/departamento?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClases(res.data);
      setIsListEmpty(res.data.length === 0);
    } catch (error) {
      toast.error('Error al cargar los departamentos');
    }
  };

  useEffect(() => {
    cargarClases();
  }, []);

  // --- LÓGICA DE LA GUÍA ---
  const startGuide = (flow: 'ADD' | 'EDIT' | 'DELETE') => {
    if ((flow === 'EDIT' || flow === 'DELETE') && isListEmpty) {
      toast.warning("No hay departamentos para modificar o eliminar.");
      return;
    }

    let steps = GUIDE_FLOW_ADD;
    if (flow === 'EDIT') steps = GUIDE_FLOW_EDIT;
    if (flow === 'DELETE') steps = GUIDE_FLOW_DELETE;

    setCurrentSteps(steps);
    setGuideActive(true);
    setCurrentStepIndex(0);
    setShowGuideMenu(false);
  };

  // --- AUTO INICIO GUÍA ---
  useEffect(() => {
    const key = 'hasSeenDepartamentosGuide';
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => {
        startGuide('ADD'); // Inicia flujo de agregar por defecto
        localStorage.setItem(key, 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

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
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  // Auto-avance cuando se abre el modal
  useEffect(() => {
    if (guideActive && modalOpen) {
      if (currentStepIndex === 0 && (currentSteps === GUIDE_FLOW_ADD || currentSteps === GUIDE_FLOW_EDIT)) {
        setTimeout(() => handleNextStep(), 300);
      }
    }
  }, [modalOpen, guideActive, currentSteps]);

  const abrirModal = (clase?: Clase) => {
    setEditando(clase || null);
    setForm(clase ? { ...clase } : { nombre: '', sucursalId: sucursalIdSession });
    setErrores({});
    setModalOpen(true);
  };

  const guardar = async () => {
    const nuevosErrores: any = {};
    if (!form.nombre) nuevosErrores.nombre = true;
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return toast.error('Completa los campos obligatorios');

    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/departamento/${editando.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Departamento actualizado');
      } else {
        await axios.post(`${apiUrl}/departamento`, { ...form, activo: 1 }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Departamento registrado');
      }
      setModalOpen(false);
      cargarClases();
      if(guideActive) handleNextStep(); // Avanzar guía al guardar

    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el departamento');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (id: number) => {
    if (!confirm('¿Deseas desactivar este departamento?')) return;
    await axios.delete(`${apiUrl}/departamento/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success('Departamento desactivado');
    cargarClases();
    if(guideActive && currentSteps === GUIDE_FLOW_DELETE) closeGuide();
  };

  return (
    <div className="space-y-4 relative">
      
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

      {/* Título */}
      <h1 className="text-xl font-bold text-orange-600">Departamentos</h1>
      
      {/* Botón Guía (Debajo del título) */}
      <div className="mb-4">
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
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95">
                    <div className="py-1">
                        <button
                            onClick={() => startGuide('ADD')}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4 text-blue-600" />
                            <span>Agregar Depto.</span>
                        </button>
                        <button
                            onClick={() => startGuide('EDIT')}
                            disabled={isListEmpty}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${
                                isListEmpty ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {isListEmpty ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4 text-amber-500" />}
                            <span>Modificar Depto.</span>
                        </button>
                        <button
                            onClick={() => startGuide('DELETE')}
                            disabled={isListEmpty}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${
                                isListEmpty ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {isListEmpty ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                            <span>Eliminar Depto.</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => abrirModal()} data-guide="btn-add-dept">
            <Tag className="mr-2" size={16} />Agregar Departamento
        </Button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clase.map((m, index) => (
              <tr key={m.id} className="border-t hover:bg-orange-50">
                <td className="p-2">{m.nombre}</td>
                <td className="p-2 text-right space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => abrirModal(m)}
                    data-guide={index === 0 ? "btn-edit-first" : undefined}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => desactivar(m.id)}
                    data-guide={index === 0 ? "btn-delete-first" : undefined}
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {clase.length === 0 && (
                <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">
                        No hay departamentos registrados.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent 
            className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6"
            onInteractOutside={(e) => {
                if (guideActive) e.preventDefault();
            }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">
                {editando ? 'Editar Departamento' : 'Nuevo Departamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <Input
              placeholder="Nombre del departamento"
              value={form.nombre}
              className={errores.nombre ? 'border-red-500' : ''}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              data-guide="input-nombre"
            />
          </div>

          <DialogFooter>
            <Button 
                disabled={loading} 
                onClick={guardar} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                data-guide="btn-save"
            >
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} /> Guardando...</> : editando ? 'Actualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}