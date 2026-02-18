'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Evita doble envío en desarrollo (StrictMode hace remount)
const alreadySentEmails = new Set<string>();

function VerificarCorreoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [codeSent, setCodeSent] = useState(''); // código que viene del back
  const [userId, setUserId] = useState(''); // guardamos el ID del usuario que viene del back
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  const inputsRef = useRef<HTMLInputElement[]>([]);

  const canSubmit = useMemo(() => code.join('').length === 6, [code]);

  const sendCode = useCallback(
    async (force = false) => {
      if (!email) return;
      if (!force && alreadySentEmails.has(email)) return;

      setError('');
      setSending(true);
      try {
        const res = await axios.post(`${apiUrl}/auth/send-code`, { email });

         // Guarda el código que manda el backend
        const codeFromApi = String(res.data?.code ?? '');
        setCodeSent(codeFromApi);
       // Buscar el ID del usuario asociado al correo
        const usersRes = await axios.get(`${apiUrl}/users/activos`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const usuario = Array.isArray(usersRes.data)
          ? usersRes.data.find((u: any) => u.correo === email)
          : null;

        if (usuario?.id) {
          const id = String(usuario.id);
          setUserId(id);
          localStorage.setItem('userId', id);
        } else {
          setError('No se encontró el usuario con este correo');
        }
        
       
        alreadySentEmails.add(email);
      } catch (err) {
        console.error(err);
        setError('No se pudo enviar el código');
      } finally {
        setSending(false);
      }
    },
    [email]
  );

  useEffect(() => {
    if (email) sendCode(false);
  }, [email, sendCode]);

  const handleChange = (index: number, value: string) => {
    if (/^\d$/.test(value) || value === '') {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value && index < code.length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    const pasteArray = text.split('');
    const newCode = [...code];
    pasteArray.slice(0, code.length - index).forEach((char, idx) => {
      newCode[index + idx] = char;
    });
    setCode(newCode);
    const lastFilled = Math.min(index + pasteArray.length - 1, code.length - 1);
    inputsRef.current[lastFilled]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) {
        verifyCode();
      }
    }
  };

  // Validación local y actualización en backend
  const verifyCode = async () => {
    setError('');
    setSuccess('');
    const entered = code.join('');

    if (!entered || entered.length < 6) {
      setError('Ingresa el código completo');
      return;
    }

    if (!codeSent || !userId) {
      setError('No tengo datos para validar. Vuelve a enviar el código.');
      return;
    }

    if (entered.trim() === codeSent.trim()) {
      try {
        setLoading(true);
       await axios.put(`${apiUrl}/users/${userId}`,
        { validado: 1 }, 
        {
          headers: { Authorization: `Bearer ${token}` }, 
        }
      );
        setSuccess('Correo validado.');
        setTimeout(() => router.push('/newpassword'), 3000);
      } catch (err) {
        console.error(err);
        setError('No se pudo marcar como validado');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Código incorrecto');
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          <h1 className="text-xl font-bold text-center text-orange-600">Verifica tu correo</h1>
          <p className="text-center text-sm text-gray-700">
            Ingresa el código enviado a {email}
          </p>

          <div className="flex justify-center gap-2">
            {code.map((digit, idx) => (
              <Input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el!)}
                className="w-10 h-10 text-center"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={(e) => handlePaste(idx, e)}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          <div className="space-y-2">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
              onClick={verifyCode}
              disabled={loading || !canSubmit}
            >
              {loading ? 'Validando...' : 'Confirmar'}
            </Button>

            <Button
              variant="outline"
              className="w-full disabled:opacity-60"
              onClick={() => sendCode(true)}
              disabled={sending || !email}
            >
              {sending ? 'Enviando…' : 'Reenviar código'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerificarCorreoPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <VerificarCorreoPageContent />
    </Suspense>
  );
}
