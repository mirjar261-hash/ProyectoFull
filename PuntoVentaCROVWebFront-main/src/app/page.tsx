'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  

  const passwordRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${apiUrl}/auth/login`, {
        correo,
        password,
      });

      const { token, user, fecha_vencimiento, token_empresa, id_empresa, estatusEmpresa } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('sucursalId', user.sucursalId);
      localStorage.setItem('email', user.correo);
      if (token_empresa) {
        localStorage.setItem('empresaToken', token_empresa);
      }

      if (id_empresa) {
        localStorage.setItem('empresaId', String(id_empresa));
        localStorage.setItem('fechaVencimientoEmpresa', String(fecha_vencimiento));
        const estatusEmpresaNormalizado =
          estatusEmpresa === 1 || estatusEmpresa === '1' ? 'ACTIVA' : 'INACTIVA';
        localStorage.setItem('estatusEmpresa', estatusEmpresaNormalizado);
      }

      if (!user.validado) {
        router.push(`/verificarcorreo?email=${encodeURIComponent(correo)}`);
        return;
        
      }
      
      if (!user.cambio_contraseña) {
        router.push('/newpassword');
        return;
        
        
      }

      if (fecha_vencimiento) {
        const vencimiento = new Date(fecha_vencimiento);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (vencimiento >= hoy) {
          router.push('/dashboard');
        } else {
          const renewPath = id_empresa
            ? `/renew?empresaId=${id_empresa}`
            : '/renew';
          router.push(renewPath);
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Error de login', err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('Usuario no encontrado');
      } else {
        setError('Correo o contraseña incorrectos');
      }
    }
  };

  return (
    <main className="relative w-full min-h-screen flex items-center justify-center px-4">
      <Image src="/login-background.svg" alt="Fondo" fill className="object-cover -z-10" />
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl bg-white dark:bg-gray-900 z-10">


        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="Logo CROV"
              width={150}
              height={150}
              className="mb-6"
            />
            <h1 className="text-2xl font-extrabold text-orange-600">Inicio de Sesión</h1>
            <p className="text-sm text-gray-500">Sistema Punto de Venta</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Escribe tu correo electrónico"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              ref={passwordRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buttonRef.current?.click();
                }
              }}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button
            ref={buttonRef}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleLogin}
          >
            Iniciar Sesión
          </Button>

          <p className="text-center text-sm text-gray-700">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-orange-600 underline">
              Registrarme
            </Link>
          </p>
          <p className="text-center text-sm text-gray-700">
            <Link href="/forgot-password" className="text-orange-600 underline">
              Recuperar contraseña
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
