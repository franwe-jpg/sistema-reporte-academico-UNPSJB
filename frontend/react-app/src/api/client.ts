// Direccion de la API. Se puede cambiar sin tocar el codigo definiendo
// VITE_API_URL (por ejemplo al publicar el frontend en otra direccion).
// Se le quita la barra final: las rutas ya empiezan con "/", y "https://x//auth"
// no es la misma ruta que "https://x/auth" (el servidor responde 404).
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  // Opcional: manejo básico de 401
  if (res.status === 401) {
    console.warn("Token inválido o expirado.");
    // acá podrías, si quisieras, redirigir a /login
    // window.location.href = "/login";
  }

  return res;
}

export default apiFetch;
