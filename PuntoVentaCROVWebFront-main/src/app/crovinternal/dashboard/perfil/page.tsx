'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; 
import { getInternalAuthHeaders } from '@/lib/internalAuth';
import { getInitials, getContrastColor , catalogoColoresPerfil} from '@/lib/avatar';

type InternalUser = {
  id?: number;
  nombre_completo?: string;
  nombreCompleto?: string;
  nombre?: string;
  correo?: string;
  email?: string;
  celular?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  fechaNacimiento?: string;
  puesto?: string | null;
  residente?: number | boolean | string;
  activo?: number | boolean | string;
  totalAhorro?: number;
  total_ahorro?: number;
  color_perfil?: string;
};


const toInputDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const toDateOnlyISOString = (value?: string | null) => {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeBooleanFlag = (value?: number | boolean | string) => {
  if (typeof value === 'string') return value.trim().toLowerCase() === '1' || value === 'true';
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'boolean') return value;
  return false;
};

const normalizeUser = (raw: InternalUser | null, fallbackId?: number | null) => {
  if (!raw) {
    return {
      id: fallbackId ?? null,
      nombreCompleto: '',
      correo: '',
      celular: '',
      fechaNacimiento: '',
      puesto: null,
      residente: null,
      activo: null,
      totalAhorro: null,
      color_perfil: catalogoColoresPerfil[0], // color por defecto
    };
  }

  return {
    id: Number(raw.id ?? fallbackId ?? 0) || null,
    nombreCompleto: raw.nombre_completo ?? raw.nombreCompleto ?? raw.nombre ?? '',
    correo: raw.correo ?? raw.email ?? '',
    celular: raw.celular ?? raw.telefono ?? '',
    fechaNacimiento: toInputDate(raw.fecha_nacimiento ?? raw.fechaNacimiento),
    puesto: raw.puesto ?? null,
    residente:
      raw.residente == null ? null : normalizeBooleanFlag(raw.residente) ? 1 : 0,
    activo:
      raw.activo == null ? null : normalizeBooleanFlag(raw.activo) ? 1 : 0,
    totalAhorro: raw.totalAhorro ?? raw.total_ahorro ?? null,
    color_perfil: raw.color_perfil ?? catalogoColoresPerfil[0],
  };
};


const PasswordField = ({
  id,
  label,
  value,
  onChange,
  show,
  toggle,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  toggle: () => void;
  error?: string;
}) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

export default function PerfilInternoPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('internalToken') : null;
  const authHeaders = useMemo(() => getInternalAuthHeaders(token), [token]);

  const [internalUser, setInternalUser] =
    useState<ReturnType<typeof normalizeUser> | null>(null);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [celular, setCelular] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [correo, setCorreo] = useState('');
  const [colorPerfil, setColorPerfil] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  );
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = localStorage.getItem('internalUser');
    const storedId = Number(localStorage.getItem('internalUserId') ?? 0);
    const parsed = storedUser ? (JSON.parse(storedUser) as InternalUser) : null;

    const localNormalized = normalizeUser(parsed, storedId || null);
    setInternalUser(localNormalized);
    setNombreCompleto(localNormalized.nombreCompleto);
    setCelular(localNormalized.celular);
    setFechaNacimiento(localNormalized.fechaNacimiento);
    setCorreo(localNormalized.correo);
    setColorPerfil(localNormalized.color_perfil);

    const fetchFromDb = async () => {
      try {
        if (!apiUrl || !authHeaders || !localNormalized.id) return;

        const res = await axios.get(
          `${apiUrl}/crovinternal/empleados-crov/${localNormalized.id}`,
          { headers: authHeaders }
        );
        const dbNormalized = normalizeUser(
          res.data as InternalUser,
          localNormalized.id
        );
        //console.log(dbNormalized);
        
        setInternalUser(dbNormalized);
        setNombreCompleto(dbNormalized.nombreCompleto);
        setCelular(dbNormalized.celular);
        setFechaNacimiento(dbNormalized.fechaNacimiento);
        setCorreo(dbNormalized.correo);
        setColorPerfil(dbNormalized.color_perfil);

        localStorage.setItem('internalUser', JSON.stringify(res.data));
        localStorage.setItem(
          'internalUserId',
          String(dbNormalized.id)
        );
      } catch (error) {
        console.error('Error cargando perfil desde BD', error);
      }
    };

    fetchFromDb();
  }, [apiUrl, authHeaders]);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError('');

    if (!nombreCompleto.trim()) {
      setProfileError('El nombre es obligatorio.');
      return;
    }

    try {
      setSavingProfile(true);
      await axios.put(
        `${apiUrl}/crovinternal/empleados-crov/${internalUser?.id}`,
        {
          nombre_completo: nombreCompleto.trim(),
          celular: celular.trim() || null,
          fecha_nacimiento: toDateOnlyISOString(fechaNacimiento),
          color_perfil: colorPerfil,
        },
        { headers: authHeaders }
      );
      
      toast.success('Perfil actualizado correctamente.');
    } catch {
      toast.error('No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setShowPasswordForm(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current = 'Contraseña actual requerida';
    if (!newPassword) errors.new = 'Nueva contraseña requerida';
    if (!confirmPassword) errors.confirm = 'Confirma la contraseña';
    if (newPassword !== confirmPassword)
      errors.confirm = 'No coinciden';

    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setSavingPassword(true);
      const actual = currentPassword.trim();
      const nueva = newPassword.trim();
      const confirmacion = confirmPassword.trim();

      await axios.put(
        `${apiUrl}/crovinternal_auth/changepassword`,
        { actual, nueva, confirmacion },
        { headers: authHeaders }
      );

      toast.success('Contraseña actualizada');
      handleCancelPasswordChange();
    } catch (error: any) {
  console.log('STATUS:', error?.response?.status);
  console.log('DATA:', error?.response?.data);
  toast.error(error?.response?.data?.error ?? 'No se pudo actualizar la contraseña');
      toast.error('No se pudo actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-orange-600">Mi perfil</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/crovinternal/dashboard')}
        >
          Volver
        </Button>
      </div>

      {/* PERFIL */}
      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              placeholder="Nombre completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
            />

            <Input
              placeholder="Teléfono"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />

            <Input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />

            <p className="text-sm text-gray-600">
              Correo: {correo || 'No registrado'}
            </p>

            {profileError && (
              <p className="text-sm text-red-500">{profileError}</p>
            )}

            {/* Preview del avatar de perfil */}
            <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-lg bg-gray-50 border border-gray-100">

              <div className="flex flex-col items-center gap-3 min-w-[120px]">
                 <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                   Vista Previa
                 </span>
                 <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                   <AvatarFallback 
                     className="text-xl font-bold"
                     style={{ 
                       backgroundColor: colorPerfil, 
                       color: getContrastColor(colorPerfil) 
                     }}
                   >
                     {getInitials(nombreCompleto)}
                   </AvatarFallback>
                 </Avatar>
              </div>

              {/* Selector */}
              <div className="flex-1 space-y-3">
                 <div className='flex flex-col'>
                    <label className="text-sm font-medium text-gray-700">
                      Color del perfil
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Selecciona un color para identificarte en el sistema.
                    </p>
                 </div>

                 <div className="flex flex-wrap gap-3">
                    {catalogoColoresPerfil.map((presetColor) => (
                      <button
                        key={presetColor}
                        type="button"
                        onClick={() => setColorPerfil(presetColor)}
                        className={`w-8 h-8 rounded-full border-2 transition-all outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 ${
                          colorPerfil === presetColor 
                            ? 'border-gray-900 scale-110 shadow-sm' 
                            : 'border-transparent hover:scale-105 hover:border-black/10'
                        }`}
                        style={{ backgroundColor: presetColor }}
                        title={presetColor}
                        aria-label={`Seleccionar color ${presetColor}`}
                      />
                    ))}
                 </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-orange-500 text-white"
            >
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SEGURIDAD */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
            Cambiar contraseña
          </Button>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <PasswordField
                id="current"
                label="Contraseña actual"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                toggle={() => setShowCurrent(!showCurrent)}
                error={passwordErrors.current}
              />

              <PasswordField
                id="new"
                label="Nueva contraseña"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                toggle={() => setShowNew(!showNew)}
                error={passwordErrors.new}
              />

              <PasswordField
                id="confirm"
                label="Confirmar contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                toggle={() => setShowConfirm(!showConfirm)}
                error={passwordErrors.confirm}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-orange-500 text-white"
                >
                  Guardar contraseña
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelPasswordChange}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
