'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { getInternalAuthHeaders } from '@/lib/internalAuth';

interface Mensaje {
  id: number;
  remitente: 'usuario' | 'soporte';
  texto: string;
}

interface Ticket {
  id: number;
  asunto: string;
  estado: string;
  prioridad: string;
  fecha_creacion: string;
  mensajes: Mensaje[];
}

export default function TicketsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);
   const adminId =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('internalUserId')) || 1
      : 1;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chatAbierto, setChatAbierto] = useState<Ticket | null>(null);
  const [mensaje, setMensaje] = useState('');

const fetchTickets = async () => {
    if (!apiUrl || !token) return;
    try {
      const res = await axios.get(`${apiUrl}/tickets`, {
        headers: authHeaders,
      });
      const data = (res.data || []).map((t: any) => ({ ...t, mensajes: [] }));
      setTickets(data);
    } catch (err) {
      console.error('Error al cargar tickets', err);
    }
  };

   
useEffect(() => {
    fetchTickets();
  }, [apiUrl, token]);

  const updateTicket = async (
    id: number,
    data: { estado?: string; prioridad?: string }
  ) => {
    if (!apiUrl || !token) return;
    try {
      await axios.put(`${apiUrl}/tickets/${id}`, data, {
        headers: authHeaders,
      });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    } catch (err) {
      console.error('Error al actualizar ticket', err);
    }
  };

  const abrirChat = async (ticket: Ticket) => {
    setChatAbierto({ ...ticket, mensajes: [] });
    if (!apiUrl || !token) return;
    try {
      const res = await axios.get(`${apiUrl}/tickets/${ticket.id}/respuestas`, {
        headers: authHeaders,
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

  const enviarMensaje = async () => {
    if (!chatAbierto || !mensaje || !apiUrl || !token) return;
    try {
      await axios.post(
        `${apiUrl}/tickets/${chatAbierto.id}/respuestas`,
        { user_id: adminId, mensaje, es_admin: true },
        { headers: authHeaders }
      );
      setMensaje('');
      abrirChat(chatAbierto);
    } catch (err) {
      console.error('Error al enviar mensaje', err);
    }
  };

  const estadoClase = (estado: string) => {
    switch (estado) {
      case 'ABIERTO':
        return 'bg-green-100 text-green-800';
      case 'EN_PROGRESO':
        return 'bg-blue-100 text-blue-800';
      case 'CERRADO':
        return 'bg-gray-200 text-gray-700 line-through';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">TI - Tickets</h1>
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
              <TableRow key={t.id} className="border-t">
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.asunto}</TableCell>
                 <TableCell>
                  <select
                    value={t.estado}
                    onChange={(e) =>
                      updateTicket(t.id, { estado: e.target.value })
                    }
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${estadoClase(
                      t.estado
                    )}`}
                  >
                    <option value="ABIERTO">Abierto</option>
                    <option value="EN_PROGRESO">En progreso</option>
                    <option value="CERRADO">Cerrado</option>
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={t.prioridad}
                    onChange={(e) =>
                      updateTicket(t.id, { prioridad: e.target.value })
                    }
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${prioridadClase(
                      t.prioridad
                    )}`}
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </TableCell>
                <TableCell>
                  {new Date(t.fecha_creacion).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirChat(t)}
                    className="gap-1"
                  >
                    Comentarios
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-4">
                  Sin tickets
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {chatAbierto && (
        <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white border-l shadow-lg z-50 flex flex-col rounded-l-2xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Ticket #{chatAbierto.id}</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChatAbierto(null)}
            >
              Cerrar
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatAbierto.mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.remitente === 'usuario' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`inline-block rounded-2xl px-3 py-2 max-w-[80%] ${
                    m.remitente === 'usuario'
                      ? 'bg-orange-100 text-gray-800'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {m.texto}
                </div>
              </div>
            ))}
            {chatAbierto.mensajes.length === 0 && (
              <p className="text-sm text-gray-500">Aún no hay mensajes</p>
            )}
          </div>
          <div className="p-4 border-t flex gap-2 mb-3">
            <Input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe un mensaje"
            />
            <Button onClick={enviarMensaje} className="bg-orange-500 text-white">
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
