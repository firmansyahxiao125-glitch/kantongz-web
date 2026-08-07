'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { formatIdr } from '@/lib/format';
import { intelligence, intelligenceKeys, type Answer, type Simulation } from '@/lib/ledger';
import { DURATION, EASE_OUT, fadeUp, stagger } from '@/lib/motion';

/**
 * Asisten. ROADMAP M11 dan M13.
 *
 * Setiap jawaban menampilkan `grounding` — dari mana angkanya. Itulah yang
 * membedakan jawaban yang dapat diperiksa dari kalimat yang terdengar
 * meyakinkan, dan pada aplikasi uang perbedaannya menentukan segalanya.
 */

const CONTOH = [
  'Berapa pengeluaranku bulan ini?',
  'Ke mana uangku pergi?',
  'Pengeluaran terbesarku apa?',
  'Langgananku apa saja?',
  'Saldoku cukup sampai kapan?',
];

interface Turn {
  id: number;
  question: string;
  answer: Answer | null;
  error: unknown;
}

export default function AsistenPage() {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(0);

  const summary = useQuery({ queryKey: intelligenceKeys.summary, queryFn: intelligence.summary });

  const ask = useMutation({
    mutationFn: (text: string) => intelligence.ask(text),
  });

  function kirim(text: string): void {
    const trimmed = text.trim();
    if (trimmed.length < 3 || ask.isPending) return;

    nextId.current += 1;
    const id = nextId.current;

    setTurns((current) => [...current, { id, question: trimmed, answer: null, error: null }]);
    setQuestion('');

    ask.mutate(trimmed, {
      onSuccess: (answer) => {
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, answer } : t)));
      },
      onError: (error) => {
        setTurns((current) => current.map((t) => (t.id === id ? { ...t, error } : t)));
      },
    });
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            <header className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--color-holo)]" aria-hidden />
              <h2 className="text-sm font-semibold text-ink">Ringkasan bulan ini</h2>
            </header>

            {summary.isPending ? (
              <Skeleton className="h-16" />
            ) : summary.isError ? (
              <ErrorState
                error={summary.error}
                onRetry={() => {
                  void summary.refetch();
                }}
              />
            ) : (
              <>
                <p className="text-sm leading-relaxed text-ink">{summary.data.narrative}</p>

                {/* Dinyatakan terbuka. Ringkasan bertemplat yang menyamar sebagai
                    analisis merusak kepercayaan pada seluruh angka di sekitarnya. */}
                {summary.data.narrativeSource === 'template' ? (
                  <p className="mt-3 text-xs leading-relaxed text-faint">
                    Disusun dari templat — model bahasa lokal tidak berjalan. Angkanya tetap dihitung
                    dari datamu.
                  </p>
                ) : null}

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Masuk</dt>
                    <dd className="tabular text-[var(--color-positive)]">
                      {formatIdr(summary.data.income)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Keluar</dt>
                    <dd className="tabular text-ink">{formatIdr(summary.data.expense)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Selisih</dt>
                    <dd
                      className={`tabular ${summary.data.net < 0 ? 'text-[var(--color-negative)]' : 'text-ink'}`}
                    >
                      {formatIdr(summary.data.net)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Tanya datamu</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Seluruh angka dihitung dari transaksimu sendiri. Setiap jawaban menyebut dari mana
              angkanya.
            </p>

            <ul className="mt-4 space-y-4">
              <AnimatePresence initial={false}>
                {turns.map((turn) => (
                  <motion.li
                    key={turn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                    className="space-y-2"
                  >
                    <p className="text-sm font-medium text-ink">{turn.question}</p>

                    {turn.error ? (
                      <p className="text-sm text-[var(--color-negative)]" role="alert">
                        {isApiError(turn.error)
                          ? messageFor(turn.error.code)
                          : messageFor('unknown')}
                      </p>
                    ) : turn.answer ? (
                      <div className="rounded-xl bg-[var(--surface-2)] px-3.5 py-3">
                        <p className="text-sm leading-relaxed text-ink">{turn.answer.answer}</p>
                        {/* Dari mana angkanya. Jawaban tanpa asal tidak dapat
                            diperiksa siapa pun. */}
                        {turn.answer.grounding ? (
                          <p className="mt-2 text-xs leading-relaxed text-faint">
                            {turn.answer.grounding}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Skeleton className="h-12" />
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {turns.length === 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {CONTOH.map((contoh) => (
                  <Button
                    key={contoh}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      kirim(contoh);
                    }}
                  >
                    {contoh}
                  </Button>
                ))}
              </div>
            ) : null}

            <form
              className="mt-5 flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                kirim(question);
              }}
            >
              <div className="flex-1">
                <Field
                  label="Pertanyaan"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                  }}
                  placeholder="Berapa pengeluaranku bulan ini?"
                  maxLength={300}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                icon={<Send size={16} aria-hidden />}
                loading={ask.isPending}
                disabled={question.trim().length < 3}
                aria-label="Kirim pertanyaan"
              >
                Tanya
              </Button>
            </form>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <SimulationCard />
      </motion.div>
    </motion.div>
  );
}

const VERDICT: Record<Simulation['verdict'], { label: string; className: string }> = {
  aman: { label: 'Aman', className: 'text-[var(--color-positive)]' },
  ketat: { label: 'Ketat', className: 'text-[var(--color-caution)]' },
  tidak_aman: { label: 'Tidak aman', className: 'text-[var(--color-negative)]' },
};

/**
 * Simulasi what-if.
 *
 * Aritmetika murni dari data pengguna sendiri — tidak ada model yang terlibat,
 * dan itulah sebabnya jawabannya dapat diperiksa ulang dengan kalkulator.
 */
function SimulationCard() {
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('24');

  const simulate = useMutation({
    mutationFn: ({ nominal, jangka }: { nominal: number; jangka: number }) =>
      intelligence.simulate(nominal, jangka),
  });

  const nominal = Number(amount);
  const jangka = Number(months);
  const valid = Number.isInteger(nominal) && nominal > 0 && jangka >= 1 && jangka <= 360;

  return (
    <Card>
      <CardBody>
        <h2 className="text-sm font-semibold text-ink">Kalau aku ambil komitmen ini…</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Cicilan, langganan, atau apa pun yang berulang tiap bulan. Dihitung dari pemasukan dan
          pengeluaranmu sembilan puluh hari terakhir.
        </p>

        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) simulate.mutate({ nominal, jangka });
          }}
        >
          <div className="w-44">
            <Field
              label="Per bulan (Rp)"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/\D/g, ''));
              }}
              placeholder="1200000"
            />
          </div>
          <div className="w-28">
            <Field
              label="Bulan"
              type="number"
              inputMode="numeric"
              min={1}
              max={360}
              value={months}
              onChange={(event) => {
                setMonths(event.target.value.replace(/\D/g, ''));
              }}
            />
          </div>
          <Button type="submit" size="lg" disabled={!valid} loading={simulate.isPending}>
            Hitung
          </Button>
        </form>

        {simulate.data ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className={`text-sm font-semibold ${VERDICT[simulate.data.verdict].className}`}>
              {VERDICT[simulate.data.verdict].label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{simulate.data.reason}</p>

            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Sisa bulanan sekarang</dt>
                <dd className="tabular text-ink">
                  {formatIdr(simulate.data.currentMonthlySurplus)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Setelah komitmen</dt>
                <dd
                  className={`tabular ${simulate.data.projectedMonthlySurplus < 0 ? 'text-[var(--color-negative)]' : 'text-ink'}`}
                >
                  {formatIdr(simulate.data.projectedMonthlySurplus)}
                </dd>
              </div>
            </dl>

            {/* Seberapa jauh jawabannya layak dipercaya, dinyatakan terbuka. */}
            {simulate.data.reliable ? null : (
              <p className="mt-3 text-xs leading-relaxed text-faint">
                Baru {simulate.data.basisDays} hari data tercatat — angka ini belum menggambarkan
                pola bulananmu.
              </p>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
