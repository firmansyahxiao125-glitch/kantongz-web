/**
 * Perubahan relatif antar-periode.
 *
 * Dipindahkan keluar dari `dasbor/page.tsx` supaya dapat DIUJI. Fungsi yang
 * hidup di dalam berkas komponen tidak dapat diimpor tanpa merender seluruh
 * halaman, dan yang tidak dapat diuji adalah yang paling mungkin salah — di
 * sini, salahnya berbentuk persentase uang yang keliru.
 *
 * Perilakunya TIDAK berubah sedikit pun; hanya tempatnya.
 */

/**
 * Delta pengeluaran datang sebagai RUPIAH, sementara ubin menampilkan persen.
 *
 * Bulan lalu diturunkan dari keduanya. Bila bulan lalu nol atau negatif —
 * bulan pertama memakai aplikasi — tidak ada persen yang bermakna: pembagian
 * dengan nol menghasilkan `Infinity`, dan membulatkannya menjadi angka apa pun
 * adalah mengarang pembanding yang tidak pernah ada.
 *
 * `null` berarti "tidak ada pembanding", dan itu BUKAN nol. Nol berarti tidak
 * berubah.
 */
export function rasioPengeluaran(bulanIni: number, delta: number | null): number | null {
  if (delta === null) return null;

  const bulanLalu = bulanIni - delta;
  if (bulanLalu <= 0) return null;

  return delta / bulanLalu;
}
