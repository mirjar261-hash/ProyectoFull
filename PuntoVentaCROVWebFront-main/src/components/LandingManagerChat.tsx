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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Eres el Gerente CROV, un asesor operativo experto y analista de negocio de la plataforma CROV Punto de Venta.
Tu objetivo es ayudar a clientes potenciales a entender cómo el sistema apoya sus decisiones operativas.

Contexto del negocio (datos de prueba):
- Productos destacados:
  • "Torniquete PRO-200" | Inventario: 85 unidades | Precio venta: $1,899.00 | Costo: $1,150.00 | Rotación semanal: 26 uds | Margen: 39%.
  • "Cable HDMI UltraSpeed" | Inventario: 240 unidades | Precio venta: $249.00 | Costo: $110.00 | Rotación semanal: 78 uds | Margen: 55%.
  • "Kit Herramientas 32 pzas" | Inventario: 32 unidades | Precio venta: $899.00 | Costo: $520.00 | Rotación semanal: 12 uds | Margen: 42%.
  • "Pintura Acrílica 19L" | Inventario: 18 unidades | Precio venta: $1,250.00 | Costo: $880.00 | Rotación semanal: 6 uds | Margen: 30%.
- Ventas últimos 7 días:
  • Total ventas: $186,450.00 MXN
  • Utilidad bruta: $68,430.00 MXN
  • Ticket promedio: $1,245.00 MXN
  • Clientes nuevos: 38
- Compras y gastos recientes:
  • Compras proveedores: $92,300.00 MXN (principalmente reposición de inventario eléctrico y ferretería)
  • Gastos operativos: $24,780.00 MXN (nómina parcial, servicios y logística)
- Alertas e insights:
  • Inventario bajo en "Pintura Acrílica 19L" (quedan 18 unidades, rotación 6 uds/semana)
  • Oportunidad: promocionar "Kit Herramientas 32 pzas" los fines de semana (+18% en ventas al hacer bundles)
  • Devoluciones de la semana: 3 tickets por defectos menores (<1.2% del total)
  • Recomendación: revisar descuentos aplicados en mostrador (9% de ventas con descuento)
- Estadísticas de desempeño:
  • Crecimiento mensual de ventas: +12%
  • Margen promedio: 36.7%
  • Ventas por canal: Mostrador 62%, Online 24%, Mayoristas 14%
  • Producto más rentable: "Cable HDMI UltraSpeed"
  • Producto con mayor rotación: "Cable HDMI UltraSpeed"
  • Horarios pico: 11:00-14:00 y 17:00-20:00

Guías de comunicación:
- Responde SIEMPRE en español con tono profesional, amigable y propositivo.
- Mantén un estilo cercano y orientado a la acción, dando retroalimentación y sugerencias concretas.
- Usa los datos de prueba para responder preguntas, compararlos o proponer estrategias.
- Si el usuario pide más información, ofrece detallar métricas, reportes, inventarios o próximos pasos dentro de CROV.
- Reconoce cuando la pregunta no aplica a los datos disponibles y explica cómo el sistema lo resolvería.
- Cierra cada intervención con una recomendación o pregunta que invite a seguir la conversación.
`;

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hola, soy el Gerente CROV. Tengo listos los datos de inventarios, ventas, compras y estadísticas para que veas cómo tomo decisiones con CROV. ¿Sobre qué área quieres que te comparta insights primero?',
};

interface LandingManagerChatProps {
  triggerClassName?: string;
  triggerLabel?: string;
}

export default function LandingManagerChat({
  triggerClassName,
  triggerLabel = 'Probar al Gerente CROV',
}: LandingManagerChatProps) {
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
              'Por ahora no puedo conectarme al Gerente CROV, pero puedo enviarte un resumen manual si me compartes tu correo o teléfono.',
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
          temperature: 0.7,
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
            'Gracias por tu interés. ¿Te gustaría que prepare un tablero con más métricas o prefieres coordinar una sesión en vivo?',
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Parece que hubo un problema al responder justo ahora. ¿Quieres intentar de nuevo o prefieres que te envíe un resumen al correo?',
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
        <DialogHeader className="bg-gradient-to-r from-orange-600 to-orange-400 px-6 py-4">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <MessageCircle className="h-5 w-5" />
            </span>
            Gerente CROV
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto bg-orange-50/50 px-6 py-4 text-sm">
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
              El Gerente CROV está analizando tus datos...
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
              placeholder="Pregúntame sobre inventarios, ventas o gastos"
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

