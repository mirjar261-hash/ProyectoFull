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

import GuideArrowOverlay from '@/components/GuideArrows'; 
import GuideModal, { GuideStep } from '@/components/GuideModal';

interface Marca {
  id: number;
  nombre: string;
  sucursalId: number;
  activo: number;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const GUIDE_FLOW_ADD: GuideStep[] = [
  {
    targetKey: "btn-add-marca",
    title: "1. Agregar Marca",
    content: "Haz clic aquí para registrar una nueva marca en el sistema.",
    placement: "left",
    modalPosition: "bottom-left", 
    disableNext: true 
  },
  {
    targetKey: "input-nombre",
    title: "2. Nombre de la Marca",
    content: "Escribe el nombre de la marca (ej. 'Nike', 'Samsung', 'Bimbo').",
    placement: "right",
    modalPosition: "right"
  },
  {
    targetKey: "btn-save",
    title: "3. Guardar",
    content: "Presiona 'Registrar' para guardar los cambios.",
    placement: "right",
    modalPosition: "right"
  }
];

const GUIDE_FLOW_EDIT: GuideStep[] = [
  {
    targetKey: "btn-edit-first",
    title: "1. Modificar Marca",
    content: "Selecciona la marca que deseas editar y pulsa el botón del lápiz.",
    placement: "left",
    modalPosition: "bottom-right",
    disableNext: true
  },
  {
    targetKey: "input-nombre",
    title: "2. Editar Nombre",
    content: "Modifica el nombre actual de la marca.",
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
    title: "1. Eliminar Marca",
    content: "Para desactivar una marca, presiona el botón rojo. El sistema pedirá confirmación.",
    placement: "left",
    modalPosition: "bottom-right"
  }
];

export default function MarcasPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Marca | null>(null);
  const [form, setForm] = useState({ nombre: '', sucursalId: 0 });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({});

  const [guideActive, setGuideActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<GuideStep[]>([]);
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const [isListEmpty, setIsListEmpty] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('sucursalId') || '0', 10)
      : 0;

  const cargarMarcas = async () => {
    try {
      const res = await axios.get(`${apiUrl}/marca?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMarcas(res.data);
      setIsListEmpty(res.data.length === 0);
    } catch (error) {
      toast.error('Error al cargar marcas');
    }
  };

  useEffect(() => {
    cargarMarcas();
  }, []);

  const startGuide = (flow: 'ADD' | 'EDIT' | 'DELETE') => {
    if ((flow === 'EDIT' || flow === 'DELETE') && isListEmpty) {
      toast.warning("No hay marcas para modificar o eliminar.");
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
    const key = 'hasSeenMarcasGuide';
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => {
        startGuide('ADD');
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

  useEffect(() => {
    if (guideActive && modalOpen) {
      if (currentStepIndex === 0 && (currentSteps === GUIDE_FLOW_ADD || currentSteps === GUIDE_FLOW_EDIT)) {
        setTimeout(() => handleNextStep(), 300);
      }
    }
  }, [modalOpen, guideActive, currentSteps]);

  const abrirModal = (marca?: Marca) => {
    setEditando(marca || null);
    setForm(marca ? { ...marca } : { nombre: '', sucursalId: sucursalIdSession });
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
        await axios.put(`${apiUrl}/marca/${editando.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Marca actualizada');
      } else {
        await axios.post(`${apiUrl}/marca`, { ...form, activo: 1 }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Marca registrada');
      }
      setModalOpen(false);
      cargarMarcas();
      if(guideActive) handleNextStep();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la marca');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (id: number) => {
    if (!confirm('¿Deseas desactivar esta marca?')) return;
    await axios.delete(`${apiUrl}/marca/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast.success('Marca desactivada');
    cargarMarcas();
    if(guideActive && currentSteps === GUIDE_FLOW_DELETE) closeGuide();
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

      <h1 className="text-xl font-bold text-orange-600">Marcas</h1>

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
                            <span>Agregar Marca</span>
                        </button>
                        <button
                            onClick={() => startGuide('EDIT')}
                            disabled={isListEmpty}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${
                                isListEmpty ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {isListEmpty ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4 text-amber-500" />}
                            <span>Modificar Marca</span>
                        </button>
                        <button
                            onClick={() => startGuide('DELETE')}
                            disabled={isListEmpty}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 ${
                                isListEmpty ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {isListEmpty ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                            <span>Eliminar Marca</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => abrirModal()} data-guide="btn-add-marca">
            <Tag className="mr-2" size={16} />Agregar Marca
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
            {marcas.map((m, index) => (
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
            {marcas.length === 0 && (
                <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-500">
                        No hay marcas registradas.
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
            <DialogTitle className="text-xl font-semibold text-orange-600">{editando ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Input
              placeholder="Nombre de la marca"
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