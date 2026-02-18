'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'axios';

export default function InternalLoginPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('internalToken')) {
      router.replace('/crovinternal/dashboard');
    }
  }, [router]);

  const handleLogin = async () => {
    setError('');
    if (!apiUrl) {
      setError('API no configurada');
      return;
    }

    try {
      const res = await axios.post(`${apiUrl}/crovinternal_auth/login`, {
        correo: user,
        password: pass,
      });
      const { token, empleado } = res.data;

      if (!token) {
        setError('Token inválido');
        return;
      }

      localStorage.setItem('internalToken', token);
      if (empleado) {
        localStorage.setItem('internalUser', JSON.stringify(empleado));
        if (empleado.id != null) {
          localStorage.setItem('internalUserId', String(empleado.id));
        }
        const residenteRaw = empleado.residente ?? empleado.es_residente ?? 0;
        let residente = 0;
        if (typeof residenteRaw === 'string') {
          residente = residenteRaw.trim() === '1' || residenteRaw.trim().toLowerCase() === 'true' ? 1 : 0;
        } else if (typeof residenteRaw === 'number') {
          residente = Number(residenteRaw) === 1 ? 1 : 0;
        } else if (typeof residenteRaw === 'boolean') {
          residente = residenteRaw ? 1 : 0;
        }
        localStorage.setItem('internalResident', String(residente));
      }

      router.push('/crovinternal/dashboard');
    } catch (err: unknown) {
      console.error('Error de login interno', err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('Usuario no encontrado');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-xl font-bold text-center text-orange-600">Acceso Interno</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
