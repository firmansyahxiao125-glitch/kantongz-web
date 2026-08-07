'use client';

import { useRouter } from 'next/navigation';
import { KeyRound, LogOut, ShieldCheck, Timer } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody } from '@/components/ui/card';
import { signOut } from '@/lib/session';

/**
 * Pusat Keamanan.
 *
 * Berisi HANYA yang benar-benar dapat dilakukan hari ini: mengganti sandi lewat
 * alur pemulihan, dan mengakhiri sesi peramban ini. Daftar perangkat aktif dan
 * pencabutan sesi jarak jauh belum punya endpoint — dan tombol yang tidak
 * melakukan apa-apa di halaman keamanan lebih berbahaya daripada tombol yang
 * belum ada, karena ia membuat orang mengira dirinya sudah aman.
 */
export default function KeamananPage() {
  const router = useRouter();
  const [keluar, setKeluar] = useState(false);

  async function akhiriSesi(): Promise<void> {
    setKeluar(true);
    await signOut();
    router.replace('/masuk');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody className="flex items-start gap-4">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-success)_14%,transparent)] text-[var(--color-success)]"
            aria-hidden
          >
            <ShieldCheck size={19} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Sesi ini terlindungi</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Token akses hanya hidup di memori tab ini dan tidak pernah ditulis ke penyimpanan
              peramban. Token penyegaran disimpan dalam kuki <code>httpOnly</code> yang tidak dapat
              dibaca skrip mana pun, termasuk skrip yang tersuntik.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-start gap-4">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-muted"
            aria-hidden
          >
            <Timer size={19} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Keluar otomatis saat diam</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Setelah 15 menit tanpa aktivitas, sesi berakhir sendiri. Kamu akan diminta masuk lagi
              saat kembali.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-start gap-4">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-muted"
            aria-hidden
          >
            <KeyRound size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Ganti kata sandi</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Penggantian berjalan lewat kode yang dikirim ke emailmu. Setelah berhasil, seluruh
              perangkat dikeluarkan — termasuk yang ini.
            </p>
          </div>
          <ButtonLink href="/pulihkan" variant="secondary" size="sm">
            Ganti sandi
          </ButtonLink>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-start gap-4">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
            aria-hidden
          >
            <LogOut size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">Akhiri sesi di peramban ini</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Mencabut token penyegaran di server dan membersihkan kukinya. Pakai ini sebelum
              meninggalkan komputer bersama.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={keluar}
            onClick={() => {
              void akhiriSesi();
            }}
          >
            Keluar sekarang
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
