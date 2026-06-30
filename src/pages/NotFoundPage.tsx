import { Container } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="font-display text-7xl text-terracotta">404</span>
        <h1 className="mt-4 font-display text-3xl text-graphite">Página não encontrada</h1>
        <p className="mt-3 text-graphite-soft">
          A página que você procura não existe ou foi movida. Que tal voltar para a vitrine?
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/">Ir para a Home</ButtonLink>
          <ButtonLink to="/catalogo" variant="outline">Ver produtos</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
