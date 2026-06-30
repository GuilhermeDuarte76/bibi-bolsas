import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import { PageHeader } from '@/components/admin/AdminUI';
import { Stars } from '@/components/ui/Stars';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDateShort } from '@/lib/utils';

export function AdminReviews() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.reviews, queryFn: () => adminService.listReviews() });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => adminService.moderateReview(id, status),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: queryKeys.admin.reviews }); toast.success(v.status === 'approved' ? 'Avaliação aprovada' : 'Avaliação rejeitada'); },
  });

  const pending = data?.filter((r) => r.status === 'pending') ?? [];
  const approved = data?.filter((r) => r.status === 'approved') ?? [];

  return (
    <div>
      <PageHeader title="Avaliações" subtitle="Modere as avaliações antes de publicá-las na loja." />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-graphite">
              Aguardando moderação {pending.length > 0 && <Pill tone="warning">{pending.length}</Pill>}
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-graphite-soft">Nenhuma avaliação aguardando moderação.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.map((r) => (
                  <li key={r.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars rating={r.rating} />
                        <span className="text-sm font-medium text-graphite">{r.productName}</span>
                        {!r.verifiedPurchase && <Pill tone="warning">Sem compra verificada</Pill>}
                      </div>
                      <span className="text-xs text-graphite-soft">{r.customerName} · {formatDateShort(r.createdAt)}</span>
                    </div>
                    <p className="mt-2 font-medium text-graphite">{r.title}</p>
                    <p className="text-sm text-graphite-soft">{r.body}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => moderate.mutate({ id: r.id, status: 'approved' })}><Check size={15} /> Aprovar</Button>
                      <Button size="sm" variant="outline" className="text-danger" onClick={() => moderate.mutate({ id: r.id, status: 'rejected' })}><X size={15} /> Rejeitar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-graphite">Publicadas</h2>
            <ul className="flex flex-col gap-3">
              {approved.map((r) => (
                <li key={r.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><Stars rating={r.rating} /><span className="text-sm font-medium text-graphite">{r.productName}</span></div>
                    <Pill tone="success">Publicada</Pill>
                  </div>
                  <p className="mt-2 text-sm text-graphite-soft">{r.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
