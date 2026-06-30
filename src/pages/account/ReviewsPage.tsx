import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import type { PendingReview } from '@/types';
import { reviewSchema, type ReviewFormValues } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { StarsInput } from '@/components/ui/Stars';
import { EmptyState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort } from '@/lib/utils';

export function ReviewsPage() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.pendingReviews, queryFn: () => accountService.listPendingReviews() });
  const [active, setActive] = useState<PendingReview | null>(null);

  if (active) return <ReviewForm pending={active} onDone={() => setActive(null)} />;

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl text-graphite">Avaliações pendentes</h2>
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-[var(--radius-xl)]" />
      ) : !data?.length ? (
        <EmptyState icon={Star} title="Tudo avaliado!" description="Você não tem avaliações pendentes no momento. Obrigada pelo carinho 💛" />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((p) => (
            <li key={p.productId} className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
              <img src={p.productImage} alt={p.productName} className="h-20 w-16 rounded-[var(--radius-md)] object-cover" />
              <div className="flex-1">
                <p className="font-medium text-graphite">{p.productName}</p>
                <p className="text-xs text-graphite-soft">Comprado em {formatDateShort(p.purchasedAt)}</p>
              </div>
              <Button size="sm" onClick={() => setActive(p)}>Avaliar</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewForm({ pending, onDone }: { pending: PendingReview; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: '', body: '' },
  });

  const submit = useMutation({
    mutationFn: (v: ReviewFormValues) => accountService.submitReview({ productId: pending.productId, ...v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pendingReviews });
      toast.success('Avaliação enviada para moderação. Obrigada!');
      onDone();
    },
  });

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl text-graphite">Avaliar produto</h2>
      <p className="mb-5 text-sm text-graphite-soft">{pending.productName}</p>

      <form onSubmit={handleSubmit((v) => submit.mutate(v))} className="flex flex-col gap-5 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <div>
          <p className="mb-2 text-sm font-medium text-graphite">Sua nota *</p>
          <StarsInput value={watch('rating')} onChange={(v) => setValue('rating', v, { shouldValidate: true })} />
          {errors.rating && <p role="alert" className="mt-1 text-xs text-danger">{errors.rating.message}</p>}
        </div>
        <Field label="Título" error={errors.title?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} placeholder="Resuma sua experiência" {...register('title')} />}
        </Field>
        <Field label="Comentário" error={errors.body?.message} required>
          {(id, d) => <Textarea id={id} aria-describedby={d} placeholder="O que você achou do produto?" {...register('body')} />}
        </Field>
        <div className="flex gap-3">
          <Button type="submit" loading={submit.isPending}>Enviar avaliação</Button>
          <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
