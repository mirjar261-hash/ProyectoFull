'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import NewPasswordForm from '@/components/NewPasswordForm';
import { toast } from 'sonner';


const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function NewPasswordPage() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const email = typeof window !== 'undefined' ? localStorage.getItem('email') || '' : '';

  const handleSubmit = async (password: string) => {
    try {
      await axios.post(`${apiUrl}/auth/reset-password`, { email, password });

      if (userId && token) {
        await axios.put(
          `${apiUrl}/users/${userId}`,
          { cambio_contraseña: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success('Contraseña actualizada');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar la contraseña');
    }
  };

  return(
   
    <NewPasswordForm onSubmit={handleSubmit} />
  );
}
