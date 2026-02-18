import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { toUTC } from '../utils/date';
import prisma from '../utils/prisma';

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN as string | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const crovInternalLogin: RequestHandler = async (req, res) => {
  const correoRaw = String(req.body?.correo ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').trim();

  if (!correoRaw || !EMAIL_REGEX.test(correoRaw)) {
    res.status(400).json({ error: 'Correo inválido' });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Contraseña requerida' });
    return;
  }

  if (!INTERNAL_TOKEN) {
    res.status(500).json({ error: 'Token interno no configurado' });
    return;
  }

  const empleado = await prisma.empleados_CROV.findFirst({
    where: { correo: correoRaw, activo: 1 },
  });

  if (!empleado || !empleado.password) {
    res.status(404).json({ error: 'Empleado no encontrado' });
    return;
  }

  const valid = await bcrypt.compare(password, empleado.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales incorrectas' });
    return;
  }

  const loginAt = toUTC(new Date());
  const token = jwt.sign(
    {
      userId: empleado.id,
      sucursalId: 0,
      role: 'internal',
    },
    INTERNAL_TOKEN,
    { expiresIn: '1d' }
  );

  res.json({
    token,
    empleado: {
      id: empleado.id,
      nombre_completo: empleado.nombre_completo,
      correo: empleado.correo,
      puesto: empleado.puesto,
      activo: empleado.activo,
      totalAhorro: empleado.totalAhorro,
      residente: empleado.residente,
    },
    login_at: loginAt,
  });
};

export const crovInternalChangePassword: RequestHandler = async (req, res) => {
  const userId = req.user?.userId;
  const actual = String(req.body?.actual ?? '').trim();
  const nueva = String(req.body?.nueva ?? '').trim();
  const confirmacion = String(req.body?.confirmacion ?? '').trim();

  if (!userId) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  if (!actual || !nueva || !confirmacion) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }

  if (nueva.length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    return;
  }

  if (nueva !== confirmacion) {
    res.status(400).json({ error: 'La confirmación no coincide' });
    return;
  }

  if (actual === nueva) {
    res.status(400).json({ error: 'La nueva contraseña debe ser diferente' });
    return;
  }

  const empleado = await prisma.empleados_CROV.findUnique({
    where: { id: userId },
  });

  if (!empleado || !empleado.password) {
    res.status(404).json({ error: 'Empleado no encontrado' });
    return;
  }

  const valid = await bcrypt.compare(actual, empleado.password);
  if (!valid) {
    res.status(401).json({ error: 'Contraseña actual incorrecta' });
    return;
  }

  const hashed = await bcrypt.hash(nueva, 10);
  await prisma.empleados_CROV.update({
    where: { id: userId },
    data: { password: hashed },
  });

  res.json({ mensaje: 'Contraseña actualizada correctamente' });
};
