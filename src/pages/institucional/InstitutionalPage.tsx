import { Link, Navigate, NavLink, useParams } from 'react-router';
import { CaretRight, Check, ChatCircleDots } from '@phosphor-icons/react';
import { Container } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { INSTITUTIONAL_DOCS, findDoc, type DocSection } from './content';
import { cn } from '@/lib/utils';

const GROUP_LABEL: Record<string, string> = {
  ajuda: 'Ajuda',
  institucional: 'A Bibi',
};

/**
 * Renderiza qualquer pagina de ajuda ou institucional a partir do conteudo
 * declarado em `content.ts` — uma tela so, para todas terem o mesmo ritmo de
 * leitura, a mesma largura de linha e o mesmo comportamento no celular.
 */
export function InstitutionalPage({ group }: { group: 'ajuda' | 'institucional' }) {
  const { slug } = useParams<{ slug: string }>();
  const doc = findDoc(group, slug);

  usePageMeta({ title: doc?.title, description: doc?.metaDescription });

  if (!doc) return <Navigate to="/404" replace />;

  const siblings = INSTITUTIONAL_DOCS.filter((item) => item.group === group);

  return (
    <>
      {/* Capa: separa visualmente o titulo do corpo do texto */}
      <div className="border-b border-border bg-cream-light">
        <Container className="py-8 sm:py-12">
          <nav
            className="flex items-center gap-1.5 text-xs text-graphite-soft"
            aria-label="Você está em"
          >
            <Link to="/" className="hover:text-terracotta">
              Início
            </Link>
            <CaretRight size={12} aria-hidden />
            <span className="text-graphite">{GROUP_LABEL[group]}</span>
          </nav>

          <h1 className="mt-4 max-w-[18ch] font-display text-display-lg text-graphite">
            {doc.title}
          </h1>
          <p className="mt-3 max-w-[52ch] text-fluid-lg text-graphite-soft">{doc.subtitle}</p>
        </Container>
      </div>

      <Container className="py-section-sm">
        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          {/* Indice — lateral fixa no desktop, lista no fim da pagina no mobile */}
          <aside className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="eyebrow mb-3 lg:mb-4">Mais em {GROUP_LABEL[group]}</h2>
              <nav
                className="flex flex-col gap-1"
                aria-label={`Páginas de ${GROUP_LABEL[group]}`}
              >
                {siblings.map((item) => (
                  <NavLink
                    key={item.slug}
                    to={`/${group}/${item.slug}`}
                    className={({ isActive }) =>
                      cn(
                        'tactile flex min-h-touch items-center rounded-[var(--radius-md)] px-3 text-sm transition-colors',
                        isActive
                          ? 'bg-graphite font-medium text-cream-light'
                          : 'text-graphite-soft hover:bg-cream-light hover:text-graphite',
                      )
                    }
                  >
                    {item.title}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <article className="flex max-w-[66ch] flex-col gap-10">
              {doc.sections.map((section, index) => (
                <Section key={section.heading ?? index} section={section} />
              ))}
            </article>

            <div className="mt-12 flex max-w-[66ch] flex-col gap-4 rounded-[var(--radius-xl)] bg-cream-light p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-terracotta">
                  <ChatCircleDots size={22} aria-hidden />
                </span>
                <div>
                  <p className="font-display text-display-xs text-graphite">Ainda com dúvida?</p>
                  <p className="mt-0.5 text-sm text-graphite-soft">
                    A gente responde rápido, de gente para gente.
                  </p>
                </div>
              </div>
              <ButtonLink to="/ajuda/contato" variant="outline" className="shrink-0">
                Falar com a gente
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

function Section({ section }: { section: DocSection }) {
  return (
    <section className="flex flex-col gap-3.5">
      {section.heading && (
        <h2 className="font-display text-display-sm text-graphite">{section.heading}</h2>
      )}

      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="text-fluid-base text-graphite-soft">
          {paragraph}
        </p>
      ))}

      {section.bullets && (
        <ul className="flex flex-col gap-3">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-fluid-base text-graphite-soft">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-terracotta/12 text-terracotta">
                <Check size={12} weight="bold" aria-hidden />
              </span>
              <span className="min-w-0">{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {section.callout && (
        <p className="mt-1 rounded-[var(--radius-lg)] border-l-[3px] border-terracotta bg-cream-light px-5 py-4 text-fluid-base font-medium text-graphite">
          {section.callout}
        </p>
      )}
    </section>
  );
}
