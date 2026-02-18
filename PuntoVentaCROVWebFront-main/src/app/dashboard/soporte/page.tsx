'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { MessageCircle, PlusCircle, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Console } from 'console';

interface Mensaje {
  id: number;
  remitente: 'usuario' | 'soporte';
  texto: string;
}

interface Ticket {
  id: number;
  asunto: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  fecha_creacion: string;
  mensajes: Mensaje[];
}

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [formAsunto, setFormAsunto] = useState('Problema con ventas');
  const [otroAsunto, setOtroAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const prioridad = 'BAJA';
  const [chatAbierto, setChatAbierto] = useState<Ticket | null>(null);
  const [mensaje, setMensaje] = useState('');
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const tiempoDesde = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return `hace ${dias} d`;
  };
  
  
  const estadoClase = (estado: string) => {
    switch (estado) {
      case 'ABIERTO':
        return 'bg-green-100 text-green-800';
      case 'EN_PROGRESO' :
        return 'bg-blue-100 text-blue-800';
      case 'CERRADO':
        return 'bg-gray-200 text-gray-700 line-through';
      default:
        return 'bg-gray-100 text-gray-700 ';
    }
  };

  const estadoTexto = (estado: string) => {
    if (estado === 'EN_PROGRESO') return 'Progreso';
    return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
  };

  const prioridadClase = (p: string) => {
    switch (p) {
      case 'ALTA':
        return 'bg-red-100 text-red-800';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800';
      case 'BAJA':
        return 'bg-gray-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const estadoTexto2 = (estado: string) => {
    if (estado === 'BAJA') return 'Baja';
    return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
  };


  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${apiUrl}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (res.data || []).map((t: any) => ({ ...t, mensajes: [] }));
      setTickets(data);
    } catch (err) {
      console.error('Error al cargar tickets', err);
    }
  };
  
  
   useEffect(() => {
    fetchTickets();
  }, []);

   const abrirChat = async (ticket: Ticket) => {
    setChatAbierto({ ...ticket, mensajes: [] });
    setMensaje('');
    try {
      const res = await axios.get(`${apiUrl}/tickets/${ticket.id}/respuestas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mensajesApi = (res.data || []).map((m: any) => ({
        id: m.id,
        remitente: m.es_admin ? 'soporte' : 'usuario',
        texto: m.mensaje,
      }));
      setChatAbierto({ ...ticket, mensajes: mensajesApi });
    } catch (err) {
      console.error('Error al cargar respuestas', err);
    }
  };

  const crearTicket = async () => {
    const asuntoFinal = formAsunto === 'Otro' ? otroAsunto : formAsunto;
      const payload = {
      user_id: userIdSession,
      asunto: asuntoFinal,
      mensaje_inicial: descripcion,
      prioridad,
      estado: 'Abierto',
      mensajes: [],
    };
    console.log(payload);
    try {
      await axios.post(`${apiUrl}/tickets`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Ticket creado');
      setNuevoOpen(false);
      setFormAsunto('Problema con ventas');
      setOtroAsunto('');
      setDescripcion('');
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear ticket');
    }
  };

  const enviarMensaje = async () => {
    if (!chatAbierto || !mensaje) return;
    try {
      await axios.post(
        `${apiUrl}/tickets/${chatAbierto.id}/respuestas`,
        { user_id: userIdSession, mensaje, es_admin: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensaje('');
      abrirChat(chatAbierto);
    } catch (err) {
      console.error('Error al enviar mensaje', err);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-orange-600">Soporte Técnico</h1>
        <Button onClick={() => setNuevoOpen(true)} className="gap-2"><PlusCircle size={16}/>Nuevo Reporte</Button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-orange-100">
              <TableHead>ID</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
               <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
           <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id} className="border-t hover:bg-orange-50">
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.asunto}</TableCell>
                 <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoClase(
                      t.estado,
                    )}`}
                  >
                    {estadoTexto(t.estado)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${prioridadClase(
                      t.prioridad,
                    )}`}
                  >
                    {estadoTexto2(t.prioridad)}
                  </span>
                </TableCell>
                <TableCell>{tiempoDesde(t.fecha_creacion)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => abrirChat(t)} className="gap-1"><MessageCircle size={14}/>Hilo</Button>
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-4">Sin tickets</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogOverlay className="bg-black/50 fixed inset-0 z-40" />
        <DialogContent className="bg-white z-50 rounded-2xl max-w-lg mx-auto shadow-xl border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-600">Nuevo Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">Asunto</label>
              <select value={formAsunto} onChange={(e) => setFormAsunto(e.target.value)} className="w-full border px-2 py-2 rounded">
                <option>Problema con ventas</option>
                <option>Problema con inventario</option>
                <option>Problema con usuarios</option>
                <option>Otro</option>
              </select>
              {formAsunto === 'Otro' && (
                <Input className="mt-2" placeholder="Asunto personalizado" value={otroAsunto} onChange={(e) => setOtroAsunto(e.target.value)} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <label className="block text-sm font-medium mb-1">Nota</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="agregue una nota.."
                className="w-full border px-2 py-2 rounded h-24"
              />
              </div>
            </div>

          <DialogFooter>
            <Button onClick={crearTicket} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Crear Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chatAbierto && (
         <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l shadow-lg z-50 flex flex-col rounded-l-2xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Ticket #{chatAbierto.id}</h2>
            <Button size="sm" variant="outline" onClick={() => setChatAbierto(null)}>Cerrar</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatAbierto.mensajes.map((m) => (
                <div key={m.id} className={`flex ${m.remitente === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`inline-block rounded-2xl px-3 py-2 max-w-[80%]
                  ${m.remitente === 'usuario' ? 'bg-orange-100 text-gray-800' : 'bg-gray-200 text-gray-800'}`}>
                  {m.texto}
                </div>
              </div>
            ))}

            {chatAbierto.mensajes.length === 0 && (
              <p className="text-sm text-gray-500">Aún no hay mensajes</p>
            )}
          </div>
          <div className="p-4 border-t flex gap-2 mb-3">
            <Input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe un mensaje" />
            <Button onClick={enviarMensaje} className="bg-orange-500 text-white"><Send size={16}/></Button>
          </div>
        </div>
      )}
    </div>
  );
}