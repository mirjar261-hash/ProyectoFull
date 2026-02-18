'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; 
import { Button } from '@/components/ui/button';
import { 
  Send, Loader2, HelpCircle, X, Terminal, Ticket, 
  ShoppingCart, TrendingUp, Package, Wallet, History, CreditCard,
  Users, Truck
} from 'lucide-react'; 

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Interfaz para permitir control desde el componente padre
interface GerenteChatProps {
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void; 
  externalShowHelp?: boolean;
  onHelpChange?: (help: boolean) => void;
}

// --- RENDERIZADO DE MENSAJES Y TABLAS ---
const MessageRenderer = ({ content }: { content: string }) => {
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-orange-700">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let tableRows: string[] = [];
  let inTable = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');

    if (isTableLine) {
      if (!inTable) inTable = true;
      tableRows.push(trimmed);
    } else {
      if (inTable) {
        elements.push(<TableBlock key={`table-${idx}`} rows={tableRows} />);
        tableRows = [];
        inTable = false;
      }
      if (trimmed || line === '') {
        elements.push(
          <div key={`p-${idx}`} className="mb-1 min-h-[1.5em] text-base text-gray-800 leading-relaxed">
            {formatText(line)}
          </div>
        );
      }
    }
  });

  if (inTable && tableRows.length > 0) {
    elements.push(<TableBlock key="table-end" rows={tableRows} />);
  }

  return <div className="space-y-1">{elements}</div>;
};

const TableBlock = ({ rows }: { rows: string[] }) => {
  const cleanRows = rows.filter(row => !row.includes('---'));
  if (cleanRows.length === 0) return null;

  const header = cleanRows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
  const body = cleanRows.slice(1).map(row => row.split('|').filter(c => c.trim() !== '').map(c => c.trim()));

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-orange-200 shadow-sm bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-orange-100 text-orange-900 uppercase font-bold tracking-wider">
          <tr>
            {header.map((head, i) => (
              <th key={i} className="px-4 py-3 border-b border-orange-200 text-center whitespace-nowrap">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-orange-50/50 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5 text-center text-gray-700 whitespace-nowrap font-medium">
                  {cell.includes('✅') ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs border border-green-200">{cell}</span> : 
                   cell.includes('🔻') ? <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs border border-red-200">{cell}</span> :
                   cell.includes('⚠️') ? <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full text-xs border border-yellow-200">{cell}</span> :
                   cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function GerenteChatDialog({ 
  externalOpen, 
  onOpenChange, 
  externalShowHelp, 
  onHelpChange 
}: GerenteChatProps) { 

  const [internalOpen, setInternalOpen] = useState(false);
  const [internalShowHelp, setInternalShowHelp] = useState(false);
  
  const isControlled = typeof externalOpen !== 'undefined';
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen;

  const isHelpControlled = typeof externalShowHelp !== 'undefined';
  const showHelp = isHelpControlled ? externalShowHelp : internalShowHelp;
  const setShowHelp = isHelpControlled && onHelpChange ? onHelpChange : setInternalShowHelp;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text) return;
    
    const newMessages = [...messages, { role: 'user', content: text } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setShowHelp(false);
    
    const sucursalIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('sucursalId')) : 1;
    const usuarioIdSession = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 1;
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const historyPayload = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${apiUrl}/gerente/consultaSql?sucursalId=${sucursalIdSession}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
            message: text, 
            history: historyPayload,
            usuarioSolicitanteId: usuarioIdSession 
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sin respuesta del servidor.' }]);

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Tuve un problema de conexión jefe, por favor intente de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const menuAyuda = [
    {
        titulo: "👥 Clientes",
        icono: <Users className="w-4 h-4 text-cyan-600" />,
        opciones: ["Registrar nuevo cliente", "Ver lista de clientes", "Modificar datos de cliente", "¿Quién es mi mejor cliente?"]
    },
    {
        titulo: "🚚 Proveedores",
        icono: <Truck className="w-4 h-4 text-amber-700" />,
        // AGREGADO: Opción para el reporte de Top Proveedores
        opciones: ["Registrar nuevo proveedor", "Ver lista de proveedores", "Actualizar teléfono de proveedor", "¿A qué proveedor le compro más?"]
    },
    {
        titulo: "💳 Créditos y Cobranza",
        icono: <CreditCard className="w-4 h-4 text-indigo-600" />,
        opciones: ["Ver créditos pendientes", "Abonar 500 a la venta VV-001", "Registrar pago de Juan Perez", "Historial de abonos venta 50"]
    },
    {
        titulo: "💸 Caja y Movimientos",
        icono: <Wallet className="w-4 h-4 text-emerald-600" />,
        opciones: ["Fondo de 1000 pesos para Juan", "Registrar gasto de 200 en comida", "Retiro de efectivo de 500","Registra una inversion"]
    },
    {
        titulo: "📅 Cortes e Historial",
        icono: <History className="w-4 h-4 text-blue-600" />,
        opciones: ["Ver historial de cortes", "Hacer pre-corte de caja"]
    },
    {
        titulo: "📊 Análisis y Reportes",
        icono: <TrendingUp className="w-4 h-4 text-purple-600" />,
        // AGREGADO: Opción para el reporte de Top Cajeros
        opciones: ["¿Cuánto vendí hoy?", "Comparativa ventas vs mes pasado", "Top 5 productos más vendidos", "Rendimiento de cajeros"]
    },
    {
        // SECCIÓN MANTENIDA: DEVOLUCIONES
        titulo: "🛒 Ventas, Compras y Devoluciones",
        icono: <ShoppingCart className="w-4 h-4 text-orange-600" />,
        opciones: [
            "Registrar venta rápida", 
            "Registrar compra a proveedor", 
            "Devolución de venta (Folio)", 
            "Devolución de compra (Proveedor)"
        ]
    },
    {
        titulo: "📦 Inventario",
        icono: <Package className="w-4 h-4 text-gray-600" />,
        opciones: ["Registrar un nuevo producto", "Modificar precio de producto"]
    },
    {
        titulo: "🚨 Soporte",
        icono: <Ticket className="w-4 h-4 text-red-600" />,
        opciones: ["Levantar reporte de fallo"]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95 border border-orange-400">
          <Terminal className="w-4 h-4 mr-2" />
          Gerente Virtual
        </Button>
      </DialogTrigger>
      
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] sm:max-w-4xl translate-x-[-50%] translate-y-[-50%] bg-neutral-50 p-0 shadow-2xl duration-200 sm:rounded-xl h-[700px] flex flex-col border border-gray-200 overflow-hidden font-sans">
        
        {/* HEADER */}
        <DialogHeader className="bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-3 flex flex-row items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
                <img src="/asistenteCROV_upscaled.jpg" alt="Logo" className="w-10 h-10 rounded-full border-2 border-white/80 shadow-sm" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-orange-600 rounded-full animate-pulse"></span>
            </div>
            <div className="flex flex-col text-left">
                <DialogTitle className="text-white text-base font-bold leading-tight">Gerente CROV</DialogTitle>
                <span className="text-orange-100 text-xs font-medium opacity-90">En línea | Modo Operativo</span>
            </div>
          </div>

          <div data-guide="btn-help-chat">
            <Button variant="ghost" size="icon" onClick={() => setShowHelp(!showHelp)} className={`rounded-full text-white hover:bg-white/20 transition-colors ${showHelp ? 'bg-white/20' : ''}`} title="Ver comandos disponibles">
                {showHelp ? <X className="w-5 h-5"/> : <HelpCircle className="w-5 h-5" />}
            </Button>
          </div>
        </DialogHeader>

        {/* SIDEBAR DE AYUDA */}
        {showHelp && (
            <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px] flex justify-end">
                <div className="absolute inset-0" onClick={() => setShowHelp(false)} />
                <div className="relative w-80 h-full bg-white shadow-2xl border-l border-gray-100 overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-4 bg-orange-50 border-b border-orange-100 sticky top-0 z-10 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Comandos Rápidos
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)} className="h-6 w-6 p-0 text-orange-400"><X className="w-4 h-4"/></Button>
                    </div>
                    <div className="p-3 space-y-6 pb-20">
                        {menuAyuda.map((grupo, idx) => (
                            <div key={idx} className="space-y-2" data-guide={`help-item-${idx}`}>
                                <div className="px-2 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-1">
                                    {grupo.icono} {grupo.titulo}
                                </div>
                                <div className="space-y-1">
                                    {grupo.opciones.map((opcion, i) => (
                                        <button key={i} onClick={() => sendMessage(opcion)} className="w-full text-left text-xs px-3 py-2 text-gray-600 hover:bg-orange-50 hover:text-orange-700 rounded-md transition-all border border-transparent hover:border-orange-100 active:scale-[0.98]">
                                            {opcion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ÁREA DE CHAT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA] scrollbar-thin scrollbar-thumb-gray-300">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                    <img src="/asistenteCROV_upscaled.jpg" className="w-16 h-16 opacity-80 grayscale hover:grayscale-0 transition-all duration-500" alt="Start" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">AI</div>
                </div>
                <div className="max-w-xs">
                    <p className="text-gray-700 font-semibold text-lg">¡Hola jefe!</p>
                    <p className="text-sm mt-1 text-gray-500">Soy su gerente operativo. Ahora puedo gestionar clientes, devoluciones y ventas.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowHelp(true)} className="text-xs bg-white hover:bg-orange-50 text-orange-600 border-orange-200">
                  <HelpCircle className="w-3 h-3 mr-2" /> Ver ejemplos
                </Button>
             </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`
                  relative max-w-[90%] sm:max-w-[85%] px-5 py-3 shadow-sm 
                  ${m.role === 'user' 
                      ? 'bg-orange-500 text-white rounded-2xl rounded-tr-sm text-base'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm w-full'
                  }
                `}
              >
                {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                    <MessageRenderer content={m.content} />
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-pulse">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-500 font-medium">Procesando solicitud...</span>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-3 bg-white border-t border-gray-200 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
            <div className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                <Textarea
                    value={input} rows={1}
                    onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                    onKeyDown={handleKeyDown}
                    placeholder="Escriba aquí (Ej: 'Devolución de venta' o 'Registrar proveedor')..."
                    className="flex-1 min-h-[40px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 text-base py-2 resize-none placeholder:text-gray-400"
                />
                <Button 
                  onClick={() => sendMessage()} 
                  disabled={loading || !input.trim()} 
                  size="icon" 
                  className={`mb-1 rounded-lg w-10 h-10 transition-all duration-200 ${input.trim() ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md transform hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    <Send className="w-5 h-5" />
                </Button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2 flex justify-center items-center gap-1">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> CROV AI v1.6 - Cobranza & Operación
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}