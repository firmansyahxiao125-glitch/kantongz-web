/**
 * Kontrak yang dibagi dengan backend.
 *
 * Bentuk-bentuk ini BEKU dan berasal dari `M3_SPEC.md` §17 dan §18, yang
 * sendiri mewarisinya dari aplikasi mobile M2. Menambah satu kode galat saja
 * adalah perubahan kontrak — bukan detail implementasi — karena
 * `Record<AuthErrorCode, string>` di lapisan pesan akan menolak kompilasi
 * sampai terjemahannya ada.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_code'
  | 'code_expired'
  | 'network'
  | 'rate_limited'
  | 'session_expired'
  | 'unknown';

/**
 * Kode di luar autentikasi.
 *
 * Terpisah karena `AuthErrorCode` beku di sisi backend maupun di aplikasi
 * mobile. Union ini boleh tumbuh; yang di atas tidak.
 */
export type DomainErrorCode = 'not_found' | 'invalid_input' | 'conflict';

export type ErrorCode = AuthErrorCode | DomainErrorCode;

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milidetik, absolut. */
  accessTokenExpiresAt: number;
}

export interface Session {
  user: User;
  tokens: AuthTokens;
}

export interface PendingVerification {
  ticket: string;
  maskedEmail: string;
  codeLength: number;
}

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  model?: string;
  appVersion?: string;
}

/**
 * Terjemahan kode galat.
 *
 * Pesan dari server TIDAK PERNAH ditampilkan langsung — ia hanya untuk log.
 * Aplikasi menerjemahkan kodenya sendiri, dan itu yang menjaga bahasa produk
 * tetap satu suara di seluruh permukaan.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_credentials: 'Email atau kata sandi tidak cocok. Periksa kembali, lalu coba lagi.',
  email_taken: 'Email ini sudah terdaftar. Masuk dengan akun itu, atau pulihkan sandinya.',
  weak_password: 'Kata sandi terlalu mudah ditebak. Perpanjang atau campur jenis karakternya.',
  invalid_code: 'Kode tidak cocok. Periksa kembali angkanya, lalu masukkan ulang.',
  code_expired: 'Kode sudah kedaluwarsa. Minta kode baru untuk melanjutkan.',
  network: 'Tidak bisa terhubung ke server. Periksa koneksi internetmu, lalu coba lagi.',
  rate_limited: 'Terlalu banyak percobaan masuk. Tunggu sebentar sebelum mencoba lagi.',
  session_expired: 'Sesimu sudah berakhir. Masuk lagi untuk melanjutkan.',
  unknown: 'Terjadi kesalahan yang tidak terduga. Coba lagi sebentar lagi.',

  /* "Tidak ditemukan" mencakup juga milik orang lain — backend sengaja tidak
     membedakannya, dan pesan ini tidak boleh membocorkan bedanya. */
  not_found: 'Data ini tidak ditemukan. Mungkin sudah dihapus.',
  invalid_input: 'Ada isian yang belum benar. Periksa kembali, lalu coba lagi.',
  conflict: 'Sudah ada data dengan nama yang sama. Pakai nama lain.',
};

export function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}
