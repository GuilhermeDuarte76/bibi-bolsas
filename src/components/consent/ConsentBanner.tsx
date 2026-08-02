import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Cookie, X } from '@phosphor-icons/react';
import { useConsent, type ConsentState } from '@/lib/analytics';
import { hasAnyProvider } from '@/lib/analytics/config';
import { Button } from '@/components/ui/Button';
import { useOverlay } from '@/hooks/useOverlay';
import { cn } from '@/lib/utils';

/**
 * Aviso de cookies.
 *
 * Aparece so quando ha alguma ferramenta configurada no `.env` — sem tag para
 * consentir, pedir consentimento seria ruido. Em desenvolvimento, portanto,
 * a loja fica limpa por padrao.
 *
 * A LGPD pede consentimento previo, granular e revogavel: por isso "Rejeitar"
 * tem o mesmo peso visual de "Aceitar", ha escolha por categoria, e o rodape
 * mantem um atalho para mudar de ideia depois.
 */
export function ConsentBanner() {
  const decidedAt = useConsent((state) => state.decidedAt);
  const preferencesOpen = useConsent((state) => state.preferencesOpen);
  const openPreferences = useConsent((state) => state.openPreferences);
  const acceptAll = useConsent((state) => state.acceptAll);
  const rejectAll = useConsent((state) => state.rejectAll);

  if (!hasAnyProvider()) return null;

  const showBanner = !decidedAt && !preferencesOpen;

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-cream-lighter px-4 pt-4 pb-safe shadow-[var(--shadow-lift)] sm:px-6"
        >
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-light text-terracotta">
                <Cookie size={20} aria-hidden />
              </span>
              <p className="text-sm text-graphite-soft">
                Usamos cookies para entender como a loja é usada e para medir nossos anúncios. Os
                essenciais (sessão e sacola) são sempre necessários.{' '}
                <Link
                  to="/institucional/privacidade"
                  className="font-medium text-terracotta hover:underline"
                >
                  Política de privacidade
                </Link>
                .
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:ml-auto">
              <Button variant="ghost" onClick={openPreferences} className="sm:order-1">
                Personalizar
              </Button>
              <Button variant="outline" onClick={rejectAll} className="sm:order-2">
                Rejeitar
              </Button>
              <Button variant="secondary" onClick={acceptAll} className="sm:order-3">
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && <PreferencesDialog />}
    </>
  );
}

function PreferencesDialog() {
  const stored = useConsent((state) => state.consent);
  const decide = useConsent((state) => state.decide);
  const close = useConsent((state) => state.closePreferences);
  const [draft, setDraft] = useState<ConsentState>(stored);
  const closeRef = useOverlay<HTMLButtonElement>(true, close);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] grid place-items-end sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Preferências de cookies"
    >
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 animate-overlay-in bg-graphite/45 backdrop-blur-[2px]"
        onClick={close}
      />

      <div className="animate-modal-in relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-2xl)] bg-cream-lighter sm:max-w-lg sm:rounded-[var(--radius-2xl)]">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-display-xs text-graphite">Preferências de cookies</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="tactile -mr-1.5 grid h-11 w-11 place-items-center rounded-full text-graphite hover:bg-cream-light"
          >
            <X size={22} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <CategoryRow
            title="Essenciais"
            description="Sessão, sacola e segurança. Sem eles a loja não funciona."
            checked
            locked
          />
          <CategoryRow
            title="Análise de uso"
            description="Quais páginas são visitadas e onde as pessoas desistem. Usamos para melhorar a loja."
            checked={draft.analytics}
            onChange={(value) => setDraft({ ...draft, analytics: value })}
          />
          <CategoryRow
            title="Publicidade"
            description="Medir o resultado dos nossos anúncios e evitar mostrar o mesmo anúncio repetidamente."
            checked={draft.marketing}
            onChange={(value) => setDraft({ ...draft, marketing: value })}
          />
        </div>

        <footer className="shrink-0 border-t border-border px-5 pt-4 pb-safe">
          <Button fullWidth size="lg" onClick={() => decide(draft)}>
            Salvar preferências
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function CategoryRow({
  title,
  description,
  checked,
  locked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 border-b border-border/60 py-4 last:border-0',
        locked ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-terracotta disabled:opacity-60"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-medium text-graphite">
          {title}
          {locked && (
            <span className="rounded-full bg-cream-light px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-graphite-soft">
              Sempre ativo
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-graphite-soft">{description}</span>
      </span>
    </label>
  );
}
