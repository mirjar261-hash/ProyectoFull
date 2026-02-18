'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mic, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  origin?: 'text' | 'voice';
}

// --- 1. Mapeo de palabras clave (Base de Conocimiento) ---
const PALABRAS_CLAVE: Record<string, string> = {
  // === MÓDULO CXC CLIENTES (CORREGIDO) ===
  'abono': 'modulo-cxc-clientes.txt',
  'abonos': 'modulo-cxc-clientes.txt',
  'abonar': 'modulo-cxc-clientes.txt',
  'credito': 'modulo-cxc-clientes.txt',
  'crédito': 'modulo-cxc-clientes.txt',
  'deuda': 'modulo-cxc-clientes.txt',
  'saldo': 'modulo-cxc-clientes.txt',
  'saldo pendiente': 'modulo-cxc-clientes.txt',
  'pagar nota': 'modulo-cxc-clientes.txt',
  'liquidar': 'modulo-cxc-clientes.txt',
  'historial de pagos': 'modulo-cxc-clientes.txt',
  'cxc': 'modulo-cxc-clientes.txt',
  'cuentas por cobrar': 'modulo-cxc-clientes.txt',
  'buscar cliente': 'modulo-cxc-clientes.txt',
  'ver info cliente': 'modulo-cxc-clientes.txt',

  // === MÓDULOS EXISTENTES ===
  calendario: 'modulo-calendario.txt',
  agenda: 'modulo-calendario.txt',
  actividad: 'modulo-calendario.txt',
  actividades: 'modulo-calendario.txt',
  evento: 'modulo-calendario.txt',
  eventos: 'modulo-calendario.txt',
  'cambiar mi contraseña': 'modulo-cambiar-contraseña.txt',
  compra: 'modulo-compras.txt',
  compras: 'modulo-compras.txt',
  departamento: 'modulo-departamento.txt',
  departamentos: 'modulo-departamento.txt',
  egresos: 'modulo-egresos.txt',
  'fondo caja': 'modulo-fondo-caja.txt',
  'fondo de caja': 'modulo-fondo-de-caja.txt',
  fondo: 'modulo-fondo-de-caja.txt',
  fondos: 'modulo-fondo-de-caja.txt',
  'olvide mi contraseña': 'modulo-forgot-password.txt',
  gasto: 'modulo-gasto.txt',
  gastos: 'modulo-gasto.txt',
  'reporte de gastos': 'modulo-gastos.txt',
  'reporte de gasto': 'modulo-gastos.txt',
  'reporte de ingresos': 'modulo-ingresos.txt',
  'reporte de ingreso': 'modulo-ingresos.txt',
  inventario: 'modulo-Inventario.txt',
  inventarios: 'modulo-Inventario.txt',
  inversion: 'modulo-Inversion.txt',
  inversiones: 'modulo-inversiones.txt',
  marca: 'modulo-marca.txt',
  marcas: 'modulo-marca.txt',
  modelo: 'modulo-modelo.txt',
  modelos: 'modulo-modelo.txt',
  pagos: 'modulo-pagos.txt',
  'pago en linea': 'modulo-payment.txt',
  'agregar producto': 'modulo-producto.txt',
  'agregar productos': 'modulo-producto.txt',
  'registrar producto': 'modulo-producto.txt',
  'registrar productos': 'modulo-producto.txt',
  'agregar servicio': 'modulo-producto.txt',
  'agregar servicios': 'modulo-producto.txt',
  'registrar servicio': 'modulo-producto.txt',
  'registrar servicios': 'modulo-producto.txt',
  insumo: 'modulo-producto.txt',
  insumos: 'modulo-producto.txt',
  'gestionar proveedor': 'modulo-proveedor.txt',
  proveedor: 'modulo-proveedor.txt',
  proveedores: 'modulo-proveedor.txt',
  'registrar empresa': 'modulo-register.txt',
  empresa: 'modulo-register.txt',
  'registrar cliente': 'modulo-Registrar-cliente.txt',
  cliente: 'modulo-Registrar-cliente.txt',
  clientes: 'modulo-Registrar-cliente.txt',
  reportes: 'modulo-reportes.txt',
  reporte: 'modulo-reportes.txt',
  retiro: 'modulo-retiro.txt',
  retiros: 'modulo-retiro.txt',
  sucursal: 'modulo-sucursal.txt',
  sucursales: 'modulo-sucursal.txt',
  taecel: 'modulo-taecel.txt',
  usuarios: 'modulo-usuarios.txt',
  usuario: 'modulo-usuarios.txt',
  ventas: 'modulo-venta.txt',
  venta: 'modulo-venta.txt',
  verificador: 'modulo-verificador.txt',
  'historial de cortes': 'modulo-historial-cortes.txt',
};

// --- 2. COMANDOS OCULTOS PARA GUIAS ---
const GUIA_COMMANDS = `
REGLA DE VISUALIZACIÓN:
SI Y SOLO SI el usuario pregunta explícitamente "cómo hacer" algo y existe una guía en esta lista, 
agrega el código al FINAL de tu respuesta (después de haber explicado los pasos).

Códigos disponibles:
- Realizar Abono/Pago Crédito: [GUIDE:CXC_ABONO]
- Crear/Registrar Producto: [GUIDE:PRODUCTO_CREATE]
- Modificar/Editar Producto: [GUIDE:PRODUCTO_UPDATE]
- Eliminar Producto: [GUIDE:PRODUCTO_DELETE]
- Agregar Insumos/Ingredientes: [GUIDE:PRODUCTO_INSUMOS]
- Realizar Venta: [GUIDE:VENTA_GENERAL]
- Registrar Compra: [GUIDE:COMPRA_GENERAL]
- Buscar en Verificador: [GUIDE:VERIFICADOR_GENERAL]
- Crear Cliente: [GUIDE:CLIENTE_CREATE]
- Crear Proveedor: [GUIDE:PROVEEDOR_CREATE]
- Crear Actividad/Evento en Agenda: [GUIDE:AGENDA_CREATE]
- Editar/Eliminar Actividad: [GUIDE:AGENDA_EDIT]
- Navegar en Calendario: [GUIDE:AGENDA_NAV]
`;

export default function HelpBotDialog() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const detectarModulo = (texto: string) => {
    const lower = texto.toLowerCase();
    for (const palabra in PALABRAS_CLAVE) {
      if (lower.includes(palabra)) return PALABRAS_CLAVE[palabra];
    }
    return null;
  };

  const cargarModulo = async (archivo: string | null) => {
    if (!archivo) return '';
    try {
      // Busca el archivo en la carpeta public/modulos/
      const res = await fetch(`/modulos/${archivo}`);
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return '';
    }
  };

  // =================================================================
  // 🧠 CEREBRO DEL BOT
  // =================================================================
  const getSystemPrompt = (tieneContexto: boolean) => {
    return `
      Eres el Asistente Oficial del sistema de Punto de Venta CROV.
      
      TU OBJETIVO PRINCIPAL:
      Proporcionar respuestas útiles, detalladas y paso a paso basadas en la documentación proporcionada.
      
      REGLAS DE RESPUESTA (ESTRICTAS):
      1. **NO SEAS FLOJO.** Si tienes información en el contexto (Documentación del módulo), **DEBES resumir los pasos en el chat**.
      2. NUNCA digas simplemente "mira la guía". Debes decir: "Para hacer X, sigue estos pasos: 1... 2... 3...".
      3. Solo después de explicar los pasos en texto, puedes ofrecer mostrar la guía visual usando el código correspondiente al final.
      
      ESTRUCTURA DE TU RESPUESTA:
      1. Saludo breve o confirmación ("Para realizar un abono...").
      2. Lista numerada de pasos (Extraída del texto de documentación que se te provee).
      3. Cierre amable ("¿Quieres que te muestre la guía visual en pantalla?").
      4. Código [GUIDE:...] (Si aplica, ponlo al mero final).

      TUS LIMITACIONES:
      - SOLO puedes hablar sobre el software CROV.
      - Si te preguntan cosas ajenas, discúlpate y vuelve al tema del sistema.
      
      ${tieneContexto ? 'Usa la siguiente DOCUMENTACIÓN TÉCNICA para extraer los pasos:' : 'NOTA: No se encontró documentación específica, usa tu conocimiento general del sistema.'}
      
      ${GUIA_COMMANDS}
    `;
  };

  const sendMessage = async (text: string, origin: 'text' | 'voice' = 'text') => {
    if (!text) return;
    
    const modulo = detectarModulo(text);
    const contenido = await cargarModulo(modulo);
    const tieneContexto = !!contenido;

    const msgs = [
      { 
        role: 'system', 
        content: getSystemPrompt(tieneContexto)
      },
      ...messages,
      { 
        role: 'user', 
        content: `Pregunta del usuario: "${text}"\n\n${tieneContexto ? `Documentación del módulo (EXTRAE LOS PASOS DE AQUÍ):\n${contenido}` : ''}` 
      },
    ];

    setMessages(prev => [...prev, { role: 'user', content: text, origin }]);
    setLoading(true);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: 'gpt-3.5-turbo', 
          messages: msgs,
          temperature: 0.3,
        }),
      });
      
      const data = await res.json();
      let answer = data.choices?.[0]?.message?.content ?? 'Sin respuesta';

      const guideMatch = answer.match(/\[GUIDE:([A-Z_]+)\]/);

      if (guideMatch) {
        const guideCode = guideMatch[1];
        answer = answer.replace(guideMatch[0], '').trim();

        console.log("🤖 Chatbot activando guía:", guideCode);
        
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('trigger-guide', { 
              detail: { guide: guideCode } 
            }));
        }, 1000);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, tuve un problema de conexión. ¿Podrías intentar de nuevo?' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if(!text) return;
    setInput('');
    sendMessage(text);
  };

  const startRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('model', 'whisper-1');
        form.append('file', blob, 'audio.webm');
        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          });
          const data = await res.json();
          if (data.text) sendMessage(data.text as string, 'voice');
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Disculpa, no pude entender el audio. ¿Podrías escribir tu pregunta?' }]);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'No pude acceder al micrófono. Por favor verifica tus permisos.' }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-4 right-4 rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg z-50 h-14 w-14"
        >
          <HelpCircle className="w-8 h-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-4 w-full max-w-3xl h-[700px] bg-neutral-100 flex flex-col">
        <DialogHeader className="bg-orange-500 rounded-t px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/asistenteCROV_upscaled.jpg" alt="Logo CROV" className="w-[50px] h-[50px] rounded-full border-2 border-white" />
            <div>
                <DialogTitle className="text-white text-lg">Asistente CROV-BOT</DialogTitle>
                <p className="text-orange-100 text-xs font-light">Tu experto en el sistema</p>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 text-sm mb-2 p-2">
          
          {messages.length === 0 && (
             <div className="flex justify-start">
               <span className="inline-block max-w-[80%] px-4 py-3 rounded-2xl whitespace-pre-wrap bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm">
                 ¡Hola! 👋 Soy tu asistente de CROV.<br/><br/>
                 Estoy aquí para ayudarte exclusivamente con dudas sobre el sistema (Ventas, Inventarios, Clientes...).<br/>
                 ¿En qué te puedo apoyar hoy?
               </span>
             </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const isVoice = m.origin === 'voice';
            const userClass = isVoice
              ? 'bg-blue-100 text-blue-900 rounded-br-none'
              : 'bg-green-100 text-green-900 rounded-br-none';
            const assistantClass = 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm';

            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <span
                  className={`inline-block max-w-[80%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                    isUser ? userClass : assistantClass
                  }`}
                >
                  {m.content}
                </span>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center text-sm text-gray-500 ml-2">
              <Loader2 className="animate-spin mr-2 w-4 h-4 text-orange-500" /> Consultando base de conocimientos...
            </div>
          )}
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-200">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ej: ¿Cómo hago un corte de caja?"
            className="flex-1 border-none focus-visible:ring-0 shadow-none"
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          />
          <Button onClick={startRecording} variant="ghost" size="icon" title={recording ? 'Detener grabación' : 'Grabar mensaje'} className="hover:bg-gray-100">
            <Mic className={recording ? 'text-red-500 animate-pulse' : 'text-gray-500'} />
          </Button>
          <Button onClick={handleSend} size="icon" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}