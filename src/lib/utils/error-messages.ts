/**
 * Traduce mensajes de error de Supabase/Auth al español
 */

export function translateAuthError(error: string): string {
  const errorMessages: Record<string, string> = {
    // Auth errors
    'Invalid login credentials': 'Credenciales de inicio de sesión inválidas',
    'Email not confirmed': 'Email no confirmado',
    'User already registered': 'El usuario ya está registrado',
    'Invalid email': 'Email inválido',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Email rate limit exceeded': 'Límite de emails excedido. Intentá nuevamente más tarde.',
    'User not found': 'Usuario no encontrado',
    'Invalid password': 'Contraseña inválida',
    'Email already in use': 'El email ya está en uso',

    // Database errors
    'duplicate key value violates unique constraint': 'El registro ya existe',
    'violates foreign key constraint': 'Referencia inválida',
    'violates not-null constraint': 'Campo requerido faltante',
    'permission denied': 'Permiso denegado',
    'infinite recursion detected': 'Error de configuración de seguridad',

    // Common errors
    'Failed to fetch': 'Error de conexión. Verificá tu internet.',
    'Network error': 'Error de red',
    'Timeout': 'La operación tardó demasiado',
  }

  // Buscar coincidencia exacta
  if (errorMessages[error]) {
    return errorMessages[error]
  }

  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }

  // Si no hay traducción, devolver el error original
  return error
}
