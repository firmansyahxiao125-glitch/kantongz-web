import { ApiError, request, setAccessToken, setUnauthorizedHandler } from '@/lib/api';
import type { PendingVerification, Session, User } from '@/lib/contracts';

/**
 * Keadaan sesi di peramban.
 *
 * Store vanilla dengan langganan, dibaca komponen lewat `useSyncExternalStore`.
 * Bukan React state: token akses juga dibaca oleh `fetch` di luar pohon render,
 * dan keadaan yang hanya hidup di dalam React tidak dapat dijangkau dari sana.
 *
 * Refresh token TIDAK ADA di berkas ini dan tidak dapat dijangkau dari
 * JavaScript mana pun — ia tinggal di kuki `httpOnly` yang ditulis BFF.
 */

export type SessionStatus = 'memuat' | 'tamu' | 'masuk' | 'galat';

/**
 * Serikat terdiskriminasi, bukan `user: User | null`.
 *
 * Dengan bentuk ini `status === 'masuk'` sudah cukup bagi TypeScript untuk tahu
 * penggunanya ada, dan tidak ada satu pun `!` atau `?? fallback` yang perlu
 * ditulis di komponen — yang keduanya adalah tempat bug tumbuh diam-diam.
 *
 * ── MENGAPA ADA `galat`, TERPISAH DARI `tamu` ──────────────────────────
 *
 * "Kamu belum masuk" dan "kami tidak bisa menghubungi peladen" adalah dua
 * kenyataan yang berbeda, dan sebelumnya keduanya berakhir sebagai `tamu`.
 *
 * Akibatnya diukur di peramban: dengan backend diblokir, pemulihan sesi
 * BERHASIL menyegarkan token lewat BFF, lalu gagal pada satu `GET /v1/auth/me`
 * — dan `catch` yang tidak membedakan sebab memanggil `forget()`. Pengguna
 * dilempar ke halaman masuk padahal kuki refresh-nya masih sah.
 *
 * Artinya: satu blip jaringan, atau satu restart API selama sepuluh detik,
 * mengeluarkan setiap pengguna yang sedang membuka aplikasi. Yang benar adalah
 * mengatakan sambungannya putus dan menawarkan mencoba lagi — persis seperti
 * yang sudah dilakukan setiap layar berdata.
 */
export type SessionState =
  | { status: 'memuat'; user: null }
  | { status: 'tamu'; user: null }
  | { status: 'masuk'; user: User }
  | { status: 'galat'; user: null };

/** §6 — batas diam. Sama dengan aplikasi mobile, karena aturannya satu. */
const IDLE_TIMEOUT_MS = 15 * 60_000;
/** Disegarkan sebelum kedaluwarsa, bukan sesudah — permintaan yang berangkat
 *  dengan token yang mati di tengah jalan tidak dapat diulang dengan aman. */
const REFRESH_SKEW_MS = 60_000;

let state: SessionState = { status: 'memuat', user: null };
let expiresAt = 0;
let lastActivity = Date.now();
let inFlight: Promise<boolean> | null = null;

const listeners = new Set<() => void>();

function emit(next: SessionState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(): SessionState {
  return state;
}

/** Dipakai `useSyncExternalStore` saat render server, di mana sesi selalu
 *  belum diketahui. Objek stabil: nilai baru setiap panggilan akan membuat
 *  React melihat perubahan tanpa henti. */
const SERVER_STATE: SessionState = { status: 'memuat', user: null };
export function serverSnapshot(): SessionState {
  return SERVER_STATE;
}

export function noteActivity(): void {
  lastActivity = Date.now();
}

function adopt(session: Session): void {
  setAccessToken(session.tokens.accessToken);
  expiresAt = session.tokens.accessTokenExpiresAt;
  noteActivity();
  emit({ status: 'masuk', user: session.user });
}

function forget(): void {
  setAccessToken(null);
  expiresAt = 0;
  inFlight = null;
  emit({ status: 'tamu', user: null });
}

/* ── operasi ─────────────────────────────────────────────────────────── */

export async function signIn(email: string, password: string): Promise<void> {
  const session = await request<Session>('/api/auth/sign-in', {
    method: 'POST',
    body: { email, password },
    auth: false,
    absolute: true,
  });
  adopt(session);
}

export async function register(
  fullName: string,
  email: string,
  password: string,
): Promise<PendingVerification> {
  return request<PendingVerification>('/api/auth/register', {
    method: 'POST',
    body: { fullName, email, password },
    auth: false,
    absolute: true,
  });
}

export async function verify(ticket: string, code: string): Promise<void> {
  const session = await request<Session>('/api/auth/verify', {
    method: 'POST',
    body: { ticket, code },
    auth: false,
    absolute: true,
  });
  adopt(session);
}

export async function requestPasswordReset(email: string): Promise<PendingVerification> {
  return request<PendingVerification>('/api/auth/password/forgot', {
    method: 'POST',
    body: { email },
    auth: false,
    absolute: true,
  });
}

export async function resetPassword(
  ticket: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await request<Record<string, never>>('/api/auth/password/reset', {
    method: 'POST',
    body: { ticket, code, newPassword },
    auth: false,
    absolute: true,
  });
}

export async function signOut(): Promise<void> {
  try {
    await request<Record<string, never>>('/api/auth/sign-out', {
      method: 'POST',
      auth: false,
      absolute: true,
    });
  } finally {
    /* Keluar dari sisi klien terjadi apa pun jawaban server. Pengguna yang
       menekan "keluar" di komputer bersama tidak boleh tetap masuk karena
       jaringannya sedang putus. */
    forget();
  }
}

/* ── penyegaran ──────────────────────────────────────────────────────── */

interface RefreshedTokens {
  accessToken: string;
  accessTokenExpiresAt: number;
}

/**
 * Penyegaran satu-jalur.
 *
 * Sepuluh permintaan yang berbarengan menemui token kedaluwarsa akan memanggil
 * ini sepuluh kali. Tanpa penggabungan, sembilan di antaranya merotasi token
 * yang sudah dirotasi — dan itu persis definisi pemakaian ulang yang mencabut
 * seluruh keluarga (§5.2). Satu janji dibagi ke semua pemanggil.
 */
export function refresh(): Promise<boolean> {
  inFlight ??= (async () => {
    try {
      const tokens = await request<RefreshedTokens>('/api/auth/refresh', {
        method: 'POST',
        auth: false,
        absolute: true,
      });

      setAccessToken(tokens.accessToken);
      expiresAt = tokens.accessTokenExpiresAt;

      if (state.status !== 'masuk') {
        const user = await request<User>('/v1/auth/me');
        emit({ status: 'masuk', user });
      }

      return true;
    } catch (error) {
      /*
       * SEBABNYA MENENTUKAN AKIBATNYA.
       *
       * Sesi yang benar-benar tidak sah harus dilupakan — kuki refresh sudah
       * dicabut BFF, dan menahan token mati hanya menunda kebingungan.
       *
       * Kegagalan JARINGAN bukan itu. Kukinya masih ada dan masih sah; yang
       * gagal hanyalah perjalanan permintaannya. Melupakan sesi di sini
       * mengubah gangguan sepuluh detik menjadi logout paksa, dan pengguna
       * kehilangan apa pun yang sedang ia isi.
       */
      if (sesiTidakSah(error)) {
        forget();
      } else {
        setAccessToken(null);
        expiresAt = 0;
        emit({ status: 'galat', user: null });
      }
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Memastikan ada token yang layak pakai sebelum permintaan berangkat.
 *
 * Mengembalikan `false` bila sesi sudah tidak dapat diselamatkan — pemanggil
 * mengarahkan ke halaman masuk, bukan menampilkan galat.
 */
export async function ensureFreshToken(): Promise<boolean> {
  if (state.status === 'tamu') return false;

  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    await signOut();
    return false;
  }

  if (expiresAt - Date.now() > REFRESH_SKEW_MS) return true;

  return refresh();
}

/**
 * Dipanggil sekali saat aplikasi dimuat.
 *
 * Token akses hanya ada di memori, jadi setiap muat ulang halaman dimulai tanpa
 * satu pun. Kuki refresh yang masih berlaku memulihkan sesinya; yang tidak,
 * mendarat di `tamu` tanpa satu pun pesan galat — belum masuk bukan kegagalan.
 */
/**
 * Membedakan "sesi ini tidak sah" dari "permintaannya tidak sampai".
 *
 * 401 berarti backend sudah menjawab dan menolak. Kegagalan jaringan (`network`,
 * status 0) dan 5xx berarti backend TIDAK pernah menjawab — dan tidak ada yang
 * boleh disimpulkan tentang keabsahan sesi dari sesuatu yang tidak menjawab.
 */
function sesiTidakSah(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export async function restore(): Promise<void> {
  await refresh();
  if (state.status === 'memuat') emit({ status: 'tamu', user: null });
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'session_expired';
}

/* Didaftarkan saat modul dimuat: setiap 401 dari backend melewati penyegaran
   satu-jalur di atas sebelum menjadi galat yang terlihat pengguna. */
setUnauthorizedHandler(refresh);
