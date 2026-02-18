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
import { Pencil, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Medico {
  id: number;
  cedula: string;
  nombre_completo: string;
  direccion: string;
  sucursalId: number;
  activo: number;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Medico | null>(null);
  const [form, setForm] = useState({ cedula: '', nombre_completo: '', direccion: '', sucursalId: 0 });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<{ [key: string]: boolean }>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const sucursalIdSession =
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('sucursalId') || '0', 10) : 0;

  const cargarMedicos = async () => {
    try {
      const res = await axios.get(`${apiUrl}/medico?sucursalId=${sucursalIdSession}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedicos(res.data);
    } catch (error) {
      toast.error('Error al cargar los médicos');
    }
  };

  useEffect(() => {
    cargarMedicos();
  }, []);

  const abrirModal = (medico?: Medico) => {
    setEditando(medico || null);
    setForm(
      medico ? { ...medico } : { cedula: '', nombre_completo: '', direccion: '', sucursalId: sucursalIdSession }
    );
    setErrores({});
    setModalOpen(true);
  };

  const guardar = async () => {
    const nuevosErrores: any = {};
    if (!form.cedula) nuevosErrores.cedula = true;
    if (!form.nombre_completo) nuevosErrores.nombre_completo = true;
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return toast.error('Completa los campos obligatorios');

    setLoading(true);
    try {
      if (editando) {
        await axios.put(`${apiUrl}/medico/${editando.id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Médico actualizado');
      } else {
        await axios.post(`${apiUrl}/medico`, { ...form, sucursalId: sucursalIdSession }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Médico registrado');
      }
      setModalOpen(false);
      cargarMedicos();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el médico');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (id: number) => {
    if (!confirm('¿Deseas desactivar este médico?')) return;
    try {
      await axios.delete(`${apiUrl}/medico/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Médico desactivado');
      cargarMedicos();
    } catch (error) {
      console.error(error);
      toast.error('Error al desactivar el médico');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-orange-600">Médicos</h1>
        <Button onClick={() => abrirModal()}><UserPlus className="mr-2" size={16} />Agregar Médico</Button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th className="p-2 text-left">Cédula</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Dirección</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {medicos.map((m) => (
              <tr key={m.id} className="border-t hover:bg-orange-50">
                <td className="p-2">{m.cedula}</td>
                <td className="p-2">{m.nombre_completo}</td>
                <td className="p-2">{m.direccion}</td>
                <td className="p-2 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => abrirModal(m)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="destructive" onClick={() => desactivar(m.id)}><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-xl mx-auto shadow-xl border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">
              {editando ? 'Editar Médico' : 'Nuevo Médico'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <Input
              placeholder="Cédula"
              value={form.cedula}
              className={errores.cedula ? 'border-red-500' : ''}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
            <Input
              placeholder="Nombre completo"
              value={form.nombre_completo}
              className={errores.nombre_completo ? 'border-red-500' : ''}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            />
            <Input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button disabled={loading} onClick={guardar} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} /> Guardando...
                </>
              ) : editando ? (
                'Actualizar'
              ) : (
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

