// ===================================================================
// Penentuan BASE URL backend secara ROBUST.
//
// Masalah sebelumnya: default di-hardcode ke "http://192.168.40.254:4000"
// (IP LAN). Saat halaman diakses dari IP publik (mis. http://202.52.15.30:5175),
// browser TIDAK BISA menjangkau IP LAN tersebut -> error "Failed to fetch"
// (hanya terjadi di layar yang memakai lib/api.ts, yaitu Cutting Report &
// Cutting Entan; layar lain memakai 202.52.15.30 langsung sehingga aman).
//
// Solusi: tentukan host backend mengikuti host halaman yang sedang dibuka.
//   1) Bila VITE_API_BASE_URL di-set -> pakai itu (paling diutamakan).
//   2) Bila tidak -> pakai protocol + hostname halaman saat ini + port backend.
//      Jadi diakses via 202.52.15.30 -> backend 202.52.15.30:4000,
//      diakses via 192.168.40.254 -> backend 192.168.40.254:4000, dst.
//   3) Fallback terakhir (tanpa window / SSR / test) -> 202.52.15.30:4000
//      (samakan dengan default yang dipakai layar lain di app ini).
// ===================================================================

const BACKEND_PORT: string =
  ((import.meta as any).env?.VITE_API_PORT as string) || '4000';

function resolveApiBaseUrl(): string {
  const fromEnv = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '';
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const { protocol, hostname } = window.location;
    // protocol sudah termasuk ':' (mis. "http:")
    return `${protocol}//${hostname}:${BACKEND_PORT}`;
  }

  return 'http://202.52.15.30:4000';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('nextg_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    const isNetworkError =
      err instanceof TypeError &&
      (err.message.includes('Failed to fetch') ||
       err.message.includes('NetworkError') ||
       err.message.includes('Network request failed'));

    if (isNetworkError) {
      throw new Error(
        `Tidak dapat terhubung ke server (${API_BASE_URL}).\n` +
        `Pastikan backend berjalan dan dapat diakses dari browser ini.\n` +
        `Jika host/port backend berbeda, set di frontend/.env:\n` +
        `VITE_API_BASE_URL=http://<host-backend>:4000\n` +
        `Detail: ${err.message}`
      );
    }
    throw err;
  }
}