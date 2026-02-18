'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `Eres un asistente de ventas CROV, asesor comercial senior de CROV Punto de Venta. Tu misión es ayudar a posibles clientes a
comprender el valor del sistema, sus beneficios y precios.

Guías:
- Habla SIEMPRE en español neutro, con tono cordial, consultivo y enfocado a cerrar la venta.
- Haz preguntas para entender el giro del negocio del cliente y su tamaño.
- Explica claramente cómo CROV ayuda a controlar inventarios, ventas, recargas electrónicas, métricas y alertas inteligentes del
Gerente CROV.
- Si preguntan por precios, describe los planes:
  • Plan Negocios: $299 MXN/mes. Incluye ventas, compras, clientes, 3 usuarios, recargas electrónicas y soporte por chat.
  • Plan Negocios: $499 MXN/mes. Incluye ventas, compras, clientes, usuarios ilimitados, panel del Gerente CROV y reportes avanzados.
- Resalta que todas las licencias incluyen capacitación inicial, migración básica de inventarios y acceso al asistente Gerente
  CROV para métricas en tiempo real.
- Invita a agendar una demostración personalizada o dejar datos de contacto cuando detectes interés.
- Si no tienes información exacta sobre algo, ofrece canalizarlo con el equipo comercial.`;

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    '¡Hola! Soy tu asistente de ventas CROV,¿Qué tipo de negocio administras y qué te gustaría mejorar con nuestro punto de venta?',
};

interface LandingSalesChatProps {
  triggerClassName?: string;
  triggerLabel?: string;
}

export default function LandingSalesChat({
  triggerClassName,
  triggerLabel = 'Contactar a ventas',
}: LandingSalesChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      if (!apiKey) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Por ahora no puedo conectarme al asistente de ventas CROV, pero con gusto te contacto personalmente si me compartes un correo o número telefónico.',
          },
        ]);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
            { role: 'user', content: text },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servicio.');
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content?.trim();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            answer ||
            'Gracias por tu interés en CROV. ¿Te gustaría que uno de nuestros asesores te contacte para compartirte una propuesta personalizada?',
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Parece que hubo un problema al responder en este momento. ¿Podrías intentar de nuevo o compartir tu correo para enviarte la información?',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        if (isOpen) {
          if (messages.length === 0) {
            setMessages([INITIAL_MESSAGE]);
          }
        } else {
          setMessages([INITIAL_MESSAGE]);
          setInput('');
          setLoading(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-600 transition hover:border-orange-400 hover:text-orange-700',
            triggerClassName,
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[600px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white p-0">
        <DialogHeader className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-4">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <MessageCircle className="h-5 w-5" />
            </span>
            Asistente de ventas CROV
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto bg-orange-50/40 px-6 py-4 text-sm">
          {messages.map((message, index) => (
            <div key={index} className={message.role === 'user' ? 'text-right' : 'text-left'}>
              <span
                className={cn(
                  'inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-orange-100 text-orange-900 shadow-sm',
                )}
              >
                {message.content}
              </span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              El asistente de ventas CROV está escribiendo...
            </div>
          )}
        </div>
        <div className="border-t border-orange-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Cuéntame qué necesitas saber sobre CROV"
              className="flex-1 rounded-full border-orange-200 focus-visible:ring-orange-500"
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              className="rounded-full bg-orange-500 px-4 hover:bg-orange-600"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
