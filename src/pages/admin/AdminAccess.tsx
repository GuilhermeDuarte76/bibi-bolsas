import { useQuery } from '@tanstack/react-query';
import { Plus, ShieldCheck, ShieldWarning } from '@phosphor-icons/react';
import { adminService, queryKeys } from '@/lib/api';
import type { AdminRole, AdminUser, AuditEntry } from '@/types';
import { PageHeader, AdminTable, Panel } from '@/components/admin/AdminUI';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Owner / Super Admin',
  gerente: 'Gerente',
  atendimento: 'Atendimento',
  catalogo: 'Catálogo / Estoque',
  financeiro: 'Financeiro',
  logistica: 'Logística',
  marketing: 'Marketing',
};

/** Linha do tempo de auditoria (AuditTimeline). */
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
            {i < entries.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-1">
            <p className="text-sm text-graphite">
              <strong className="font-medium">{e.actor}</strong> · {e.action} em <strong className="font-medium">{e.target}</strong>
            </p>
            {e.meta && <p className="text-xs text-graphite-soft">{e.meta}</p>}
            <p className="text-xs text-store-gray">{formatDate(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AdminUsers() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.admin.users, queryFn: () => adminService.listUsers() });
  return (
    <div>
      <PageHeader title="Usuários" subtitle="Contas com acesso ao painel administrativo." action={<Button onClick={() => toast.info('Convidar usuário (mock)')}><Plus size={16} /> Convidar</Button>} />
      {isLoading ? <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" /> : (
        <AdminTable<AdminUser>
          rowKey={(u) => u.id}
          rows={data ?? []}
          columns={[
            { key: 'name', header: 'Usuário', render: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-graphite-soft">{u.email}</p></div> },
            { key: 'role', header: 'Perfil', render: (u) => ROLE_LABEL[u.role] },
            { key: 'mfa', header: 'MFA', render: (u) => u.mfaEnabled ? <Pill tone="success"><ShieldCheck size={12} weight="fill" /> Ativo</Pill> : <Pill tone="danger"><ShieldWarning size={12} weight="fill" /> Pendente</Pill> },
            { key: 'last', header: 'Último acesso', render: (u) => u.lastLogin ? formatDate(u.lastLogin) : '—' },
            { key: 'status', header: 'Status', render: (u) => <Pill tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Ativo' : 'Inativo'}</Pill> },
          ]}
        />
      )}
    </div>
  );
}

const PERMISSIONS = ['Visualizar', 'Criar', 'Editar', 'Excluir', 'Aprovar', 'Reembolsar', 'Configurar'];
const MATRIX: Record<AdminRole, boolean[]> = {
  owner: [true, true, true, true, true, true, true],
  gerente: [true, true, true, true, true, true, false],
  financeiro: [true, false, false, false, true, true, false],
  catalogo: [true, true, true, true, false, false, false],
  logistica: [true, false, true, false, false, false, false],
  atendimento: [true, false, false, false, false, false, false],
  marketing: [true, true, true, false, false, false, false],
};

export function AdminPermissions() {
  const { data } = useQuery({ queryKey: queryKeys.admin.audit, queryFn: () => adminService.listAudit() });
  return (
    <div>
      <PageHeader title="Permissões" subtitle="RBAC por perfil + policies por ação sensível. Validação real sempre no backend." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Matriz de permissões">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 font-semibold text-graphite-soft">Perfil</th>
                  {PERMISSIONS.map((p) => <th key={p} className="px-3 py-2 text-center font-semibold text-graphite-soft">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(MATRIX) as AdminRole[]).map((role) => (
                  <tr key={role} className="border-b border-border/60">
                    <td className="px-3 py-2.5 font-medium text-graphite">{ROLE_LABEL[role]}</td>
                    {MATRIX[role].map((allowed, i) => (
                      <td key={i} className="px-3 py-2.5 text-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${allowed ? 'bg-success' : 'bg-border'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Auditoria recente">
          {data ? <AuditTimeline entries={data} /> : <Skeleton className="h-48 w-full" />}
        </Panel>
      </div>
    </div>
  );
}

export function AdminSettings() {
  return (
    <div>
      <PageHeader title="Configurações" subtitle="Ajustes gerais da loja, pagamento, frete, fiscal e notificações." />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Loja">
          <Setting label="Nome da loja" value="Bibi Bolsas" />
          <Setting label="E-mail de contato" value="contato@bibibolsas.com.br" />
          <Setting label="Frete grátis acima de" value="R$ 299,00" />
        </Panel>
        <Panel title="Pagamento">
          <Setting label="Gateway" value="Pagar.me (sandbox)" />
          <Setting label="Parcelas máx. sem juros" value="10x" />
          <Setting label="Desconto Pix" value="5%" />
        </Panel>
        <Panel title="Fiscal">
          <Setting label="Emissor" value="Focus NFe (sandbox)" />
          <Setting label="Regime tributário" value="Simples Nacional" />
        </Panel>
        <Panel title="Notificações">
          <Setting label="E-mail transacional" value="Ativo" />
          <Setting label="WhatsApp (consentimento)" value="Ativo" />
        </Panel>
      </div>
      <p className="mt-6 text-xs text-graphite-soft">Segredos e credenciais ficam fora do front-end, protegidos no backend (Docker secrets). Esta tela é demonstrativa.</p>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-graphite-soft">{label}</span>
      <span className="text-sm font-medium text-graphite">{value}</span>
    </div>
  );
}
