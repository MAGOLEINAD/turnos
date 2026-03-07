// Wrapper para medir performance de queries Supabase
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    console.log(`🔍 [SUPABASE] ${queryName}: ${duration.toFixed(2)}ms`);

    // Si tarda más de 500ms, avisa en rojo
    if (duration > 500) {
      console.warn(`⚠️ [SLOW QUERY] ${queryName}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ [SUPABASE ERROR] ${queryName}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

// Para server components/actions
export function measureServerQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measureQuery(`[SERVER] ${queryName}`, queryFn);
}

// Para client components
export function measureClientQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measureQuery(`[CLIENT] ${queryName}`, queryFn);
}
