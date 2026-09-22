/**
 * Normaliza la foto de perfil que llega del backend.
 * <p>
 * Los perfiles incompletos (o sembrados sin foto) pueden llegar con cadena
 * vacía o con espacios: usarla tal cual en un `<img>` deja el avatar roto en
 * lugar de las iniciales. Devolvemos `null` cuando no hay nada que mostrar y
 * la URL limpia cuando sí la hay.
 */
export function fotoUtil(url?: string | null): string | null {
  const value = (url ?? '').trim();
  return value.length > 0 ? value : null;
}
