'use client';

import { useMutation } from '@tanstack/react-query';
import { ScanLine } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api';
import { MAX_RECEIPT_BYTES, receipt, type ReceiptDraft } from '@/lib/ledger';

/**
 * Pemindai struk.
 *
 * Menyerahkan RANCANGAN ke pemanggilnya, bukan transaksi — aturan yang sama
 * yang dipegang rutenya di API. Struk yang terbaca separuh menghasilkan angka
 * yang terlihat sah, jadi yang keluar dari sini selalu singgah di formulir
 * sebelum menjadi catatan.
 */

const JENIS = ['image/jpeg', 'image/png', 'image/webp'];

export function ReceiptScanButton({
  onDraft,
  disabled = false,
}: {
  onDraft: (draft: ReceiptDraft) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  const scan = useMutation({
    mutationFn: (file: File) => receipt.scan(file),
    onSuccess: (draft) => {
      onDraft(draft);
    },
    onError: (error) => {
      /* Batas dan jenis sudah disaring sebelum unggahan, jadi yang sampai ke
         sini adalah kegagalan yang tidak dapat diperbaiki pengguna dengan
         memilih berkas lain. Katakan apa adanya. */
      toast.error(
        isApiError(error) && error.code === 'network'
          ? 'Tidak bisa terhubung ke server. Periksa koneksimu, lalu coba lagi.'
          : 'Struk gagal dibaca. Catat manual saja, atau coba foto yang lebih terang.',
      );
    },
  });

  return (
    <>
      {/*
        `display: none`, bukan `sr-only`.

        Yang kedua tetap dapat difokus dengan Tab, jadi pengguna papan tik akan
        mendarat di kontrol berkas yang tidak terlihat di antara dua tombol yang
        terlihat. Tombol di bawahlah pintu satu-satunya, untuk semua orang.

        Tanpa `capture`: memaksa kamera akan menutup jalan bagi struk yang sudah
        terlanjur ada di galeri, dan itu justru kasus yang paling sering.
      */}
      <input
        ref={input}
        type="file"
        className="hidden"
        accept={JENIS.join(',')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          /* Dikosongkan SEBELUM apa pun yang lain: tanpa ini, memilih berkas
             yang sama dua kali berturut-turut tidak memicu `change` sama
             sekali — percobaan kedua akan terlihat seperti tombol yang mati. */
          event.target.value = '';
          if (!file) return;

          if (!JENIS.includes(file.type)) {
            toast.error('Pilih gambar JPG, PNG, atau WebP.');
            return;
          }
          if (file.size > MAX_RECEIPT_BYTES) {
            toast.error('Gambarnya lebih dari 8 MB. Perkecil dulu, lalu coba lagi.');
            return;
          }

          scan.mutate(file);
        }}
      />

      <Button
        variant="secondary"
        icon={<ScanLine size={16} aria-hidden />}
        disabled={disabled}
        loading={scan.isPending}
        onClick={() => {
          input.current?.click();
        }}
      >
        Pindai struk
      </Button>
    </>
  );
}
