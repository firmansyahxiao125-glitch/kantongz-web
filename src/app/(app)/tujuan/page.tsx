'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormAlert } from '@/components/auth/form-alert';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { formatDate, formatIdr } from '@/lib/format';
import { keys, ledger, type Goal } from '@/lib/ledger';
import { fadeUp, spring, stagger } from '@/lib/motion';

const schema = z.object({
  name: z.string().trim().min(1, 'Beri nama tujuannya.').max(80, 'Nama terlalu panjang.'),
  targetAmount: z.coerce
    .number({ message: 'Masukkan targetnya.' })
    .int('Tulis dalam rupiah utuh, tanpa koma.')
    .positive('Target harus lebih dari nol.'),
  targetDate: z.string(),
});

type Values = z.infer<typeof schema>;

export default function TujuanPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const q = useQuery({ queryKey: keys.goals, queryFn: ledger.goals });

  const remove = useMutation({
    mutationFn: (id: string) => ledger.deleteGoal(id),
    onSuccess: async () => {
      toast.success('Tujuan dihapus.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.goals }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
    },
    onError: () => {
      toast.error('Gagal menghapus. Coba lagi.');
    },
  });

  const goals = q.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tujuan"
        description="Target menabung, dengan kemajuan yang kamu catat sendiri."
        actions={
          <Button
            icon={<Plus size={16} aria-hidden />}
            onClick={() => {
              setOpen(true);
            }}
          >
            Buat tujuan
          </Button>
        }
      />

      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState
          error={q.error}
          onRetry={() => {
            void q.refetch();
          }}
        />
      ) : goals.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Belum ada tujuan"
              description="Dana darurat, DP rumah, liburan — apa pun yang ingin kamu kumpulkan sedikit demi sedikit."
              action={
                <Button
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  Buat tujuan pertama
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {goals.map((goal) => {
            const ratio = Math.min(goal.savedAmount / goal.targetAmount, 1);

            return (
              <motion.li key={goal.id} variants={fadeUp}>
                <Card className="group h-full">
                  <CardBody className="flex h-full flex-col">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-lg"
                          style={{
                            background: `color-mix(in oklab, ${goal.color ?? 'var(--color-identity-none)'} 16%, transparent)`,
                            color: goal.color ?? 'var(--color-identity-none)',
                          }}
                          aria-hidden
                        >
                          {goal.achieved ? <Check size={17} /> : <Target size={17} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{goal.name}</p>
                          {goal.targetDate ? (
                            <p className="text-xs text-dim">
                              Target {formatDate(goal.targetDate)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus tujuan ${goal.name}`}
                        loading={remove.isPending && remove.variables === goal.id}
                        onClick={() => {
                          remove.mutate(goal.id);
                        }}
                        className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 size={15} aria-hidden />
                      </Button>
                    </div>

                    <p className="text-xl font-semibold tabular tracking-tight text-ink">
                      {formatIdr(goal.savedAmount)}
                      <span className="text-sm font-normal text-dim">
                        {' '}
                        / {formatIdr(goal.targetAmount)}
                      </span>
                    </p>

                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"
                      role="progressbar"
                      aria-valuenow={Math.round(ratio * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Terkumpul ${String(Math.round(ratio * 100))} persen`}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: goal.achieved
                            ? 'var(--color-positive)'
                            : (goal.color ?? 'var(--color-identity-none)'),
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${String(ratio * 100)}%` }}
                        transition={spring}
                      />
                    </div>

                    <div className="mt-auto flex gap-2 pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        block
                        icon={<Plus size={14} aria-hidden />}
                        onClick={() => {
                          setContributing(goal);
                        }}
                      >
                        Catat kemajuan
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Buat tujuan"
        description="Berapa yang ingin dikumpulkan, dan kapan."
      >
        <GoalForm
          onDone={() => {
            setOpen(false);
          }}
        />
      </Dialog>

      <Dialog
        open={contributing !== null}
        onClose={() => {
          setContributing(null);
        }}
        title="Catat kemajuan"
        description={
          contributing
            ? `${contributing.name} — terkumpul ${formatIdr(contributing.savedAmount)}.`
            : undefined
        }
      >
        {contributing ? (
          <ContributeForm
            goal={contributing}
            onDone={() => {
              setContributing(null);
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const client = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', targetAmount: '' as unknown as number, targetDate: '' },
  });

  const create = useMutation({
    mutationFn: (values: Values) =>
      ledger.createGoal({
        name: values.name,
        targetAmount: values.targetAmount,
        ...(values.targetDate ? { targetDate: values.targetDate } : {}),
      }),
    onSuccess: async () => {
      toast.success('Tujuan dibuat.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.goals }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
      onDone();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        create.mutate(values);
      })}
    >
      <FormAlert
        message={
          create.error
            ? isApiError(create.error)
              ? messageFor(create.error.code)
              : messageFor('unknown')
            : null
        }
      />

      <Field
        label="Nama tujuan"
        placeholder="Dana darurat"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />

      <Field
        label="Target (Rp)"
        type="number"
        inputMode="numeric"
        step={1}
        min={1}
        placeholder="30000000"
        error={form.formState.errors.targetAmount?.message}
        {...form.register('targetAmount')}
      />

      <Field
        label="Tanggal target"
        type="date"
        hint="Opsional."
        error={form.formState.errors.targetDate?.message}
        {...form.register('targetDate')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={create.isPending}>
          Buat tujuan
        </Button>
      </div>
    </form>
  );
}

const contributeSchema = z.object({
  amount: z.coerce
    .number({ message: 'Masukkan jumlahnya.' })
    .int('Tulis dalam rupiah utuh, tanpa koma.')
    .positive('Jumlah harus lebih dari nol.'),
});

type ContributeValues = z.infer<typeof contributeSchema>;

function ContributeForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const client = useQueryClient();
  const [arah, setArah] = useState<1 | -1>(1);

  const form = useForm<ContributeValues>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: '' as unknown as number },
  });

  const contribute = useMutation({
    /* Tanda ditentukan tombol arah, bukan oleh angka bertanda minus yang
       diketik pengguna — minus yang tak sengaja terketik akan menarik tabungan
       tanpa satu pun konfirmasi. */
    mutationFn: (values: ContributeValues) => ledger.contribute(goal.id, values.amount * arah),
    onSuccess: async (updated) => {
      toast.success(
        updated.achieved ? `${goal.name} tercapai.` : `Kemajuan ${goal.name} diperbarui.`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.goals }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
      onDone();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        contribute.mutate(values);
      })}
    >
      <FormAlert
        message={
          contribute.error
            ? isApiError(contribute.error)
              ? messageFor(contribute.error.code)
              : messageFor('unknown')
            : null
        }
      />

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Arah">
        <Button
          type="button"
          variant={arah === 1 ? 'primary' : 'secondary'}
          icon={<Plus size={15} aria-hidden />}
          aria-pressed={arah === 1}
          onClick={() => {
            setArah(1);
          }}
        >
          Tambah
        </Button>
        <Button
          type="button"
          variant={arah === -1 ? 'primary' : 'secondary'}
          icon={<Minus size={15} aria-hidden />}
          aria-pressed={arah === -1}
          onClick={() => {
            setArah(-1);
          }}
        >
          Tarik
        </Button>
      </div>

      <Field
        label="Jumlah (Rp)"
        type="number"
        inputMode="numeric"
        step={1}
        min={1}
        placeholder="500000"
        autoFocus
        error={form.formState.errors.amount?.message}
        {...form.register('amount')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={contribute.isPending}>
          Simpan
        </Button>
      </div>
    </form>
  );
}
