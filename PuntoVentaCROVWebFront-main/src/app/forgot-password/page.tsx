'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const requestCode = async () => {
    setError('');
    try {
      const res = await axios.get(
        `${apiUrl}/users/check-email?correo=${encodeURIComponent(email)}`
      );
      if (!res.data.exists) {
        setError('El correo no existe');
        return;
      }
      const send = await axios.post(`${apiUrl}/auth/send-code`, { email });
      setCodeSent(send.data.code);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error');
    }
  };

  const verifyCode = () => {
    if (codeInput.trim() === codeSent.trim()) {
      setStep(3);
    } else {
      setError('Código incorrecto');
    }
  };

  const resetPassword = async () => {
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    try {
      await axios.post(`${apiUrl}/auth/reset-password`, { email, password });
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar la contraseña');
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          {step === 1 && (
            <>
              <h1 className="text-xl font-bold text-center text-orange-600">
                Recuperar contraseña
              </h1>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Correo</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Escribe tu correo electrónico"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={requestCode}
              >
                Enviar código
              </Button>
              <p className="text-center text-sm text-gray-700">
                <Link href="/" className="text-orange-600 underline">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-xl font-bold text-center text-orange-600">
                Verifica tu correo
              </h1>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Código</label>
                <Input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Ingresa el código recibido"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={verifyCode}
              >
                Continuar
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-xl font-bold text-center text-orange-600">
                Nueva contraseña
              </h1>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={resetPassword}
              >
                Cambiar contraseña
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
