const API_BASE = "http://localhost:8000";

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
