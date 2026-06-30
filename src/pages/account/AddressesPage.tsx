import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, PencilSimple, Plus, Star, Trash } from '@phosphor-icons/react';
import { accountService, queryKeys } from '@/lib/api';
import type { Address } from '@/types';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { AddressForm } from '@/components/checkout/AddressForm';
import { toast } from '@/components/ui/Toast';
import { formatZip } from '@/lib/utils';

export function AddressesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.addresses, queryFn: () => accountService.listAddresses() });
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  const save = useMutation({
    mutationFn: accountService.saveAddress,
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.addresses }); setEditing(null); toast.success('Endereço salvo'); },
  });
  const remove = useMutation({
    mutationFn: accountService.deleteAddress,
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.addresses }); toast.success('Endereço removido'); },
  });

  if (editing) {
    return (
      <div>
        <h2 className="mb-5 font-display text-2xl text-graphite">{editing === 'new' ? 'Novo endereço' : 'Editar endereço'}</h2>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <AddressForm
            submitting={save.isPending}
            defaultValues={editing === 'new' ? undefined : editing}
            onSubmit={(v) => save.mutate({ ...(editing === 'new' ? {} : { id: editing.id }), ...v, complement: v.complement ?? '' })}
          />
          <button onClick={() => setEditing(null)} className="mt-3 text-sm text-graphite-soft hover:text-graphite">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl text-graphite">Endereços</h2>
        <Button size="sm" onClick={() => setEditing('new')}><Plus size={16} /> Novo</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-[var(--radius-xl)]" />
      ) : !data?.length ? (
        <EmptyState icon={MapPin} title="Nenhum endereço salvo" description="Adicione um endereço para agilizar seus próximos pedidos." action={{ label: 'Adicionar endereço', onClick: () => setEditing('new') }} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
              <div className="flex items-start justify-between">
                <span className="flex items-center gap-2 font-medium text-graphite"><MapPin size={18} className="text-cinnamon" /> {a.label}</span>
                {a.isDefault && <Pill tone="success"><Star size={12} weight="fill" /> Padrão</Pill>}
              </div>
              <p className="mt-3 text-sm text-graphite">{a.recipient}</p>
              <p className="text-sm text-graphite-soft">{a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''}</p>
              <p className="text-sm text-graphite-soft">{a.district} — {a.city}/{a.state} · {formatZip(a.zip)}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(a)}><PencilSimple size={15} /> Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(a.id)} className="text-danger"><Trash size={15} /> Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
