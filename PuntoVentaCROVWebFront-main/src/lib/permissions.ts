import axios from 'axios'

const apiUrl = process.env.NEXT_PUBLIC_API_URL

// Caché simple en memoria por usuario
const permisosCache = new Map<number, any>()

/**
 * Obtiene todos los permisos del usuario. La respuesta se mantiene en caché
 * para evitar múltiples solicitudes al mismo endpoint.
 */
export async function getUserPermissions(
  userId: number,
  token?: string
): Promise<any> {
  if (permisosCache.has(userId)) {
    return permisosCache.get(userId)
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const { data } = await axios.get(`${apiUrl}/permisos/${userId}`, { headers })
  permisosCache.set(userId, data)
  return data
}

export async function hasPermission(
  userId: number,
  permiso: string | number,
  token?: string
): Promise<boolean> {
  try {
   const data = await getUserPermissions(userId, token)

    if (Array.isArray(data)) {
      const permisoStr = String(permiso)
      return data.some(
        (p: any) =>
          p.nombre === permisoStr ||
          p.permiso === permisoStr ||
          String(p.id) === permisoStr
      )
    }

    const key = String(permiso)
    const value = data?.[key]
    return value === 1 || value === true
  } catch (error) {
    console.error('Error al consultar permisos', error)
    return false
  }
}