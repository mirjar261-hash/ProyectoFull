'use client';

import { useState,useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NewPasswordFormProps {
  onSubmit?: (password: string) => void;
}

export default function NewPasswordForm({ onSubmit }: NewPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const confirmRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isValid =
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    password === confirmPassword;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setConfirmTouched(true)
    if (!isValid) return;
    onSubmit?.(password);
    setPassword('');
    setConfirmPassword('');
    setTouched(false);
    setConfirmTouched(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-orange-50 to-white px-4">
      <Card className="w-full max-w-md border border-orange-200 shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          <h1 className="text-xl font-bold text-center text-orange-600">
            Nueva contraseña
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                Por seguridad escriba una nueva contraseña
              </label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Escribe tu nueva contraseña"
                 onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmRef.current?.focus();
                  }
                }}
              />
            </div>
            {touched && password.trim().length === 0 && (
              <p className="text-red-500 text-sm text-center">
                La contraseña es obligatoria
              </p>
            )}
            
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirma tu nueva contraseña
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
                placeholder="Confirma tu nueva contraseña"
                ref={confirmRef}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buttonRef.current?.focus();
                  }
                }}
              />
            </div>
            {confirmTouched && password !== confirmPassword && (
              <p className="text-red-500 text-sm text-center">
                Las contraseñas no coinciden
              </p>
            )}

            <Button
              type="submit"
              disabled={!isValid}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              ref={buttonRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buttonRef.current?.click();
                }
              }}
            >
              cambiar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
