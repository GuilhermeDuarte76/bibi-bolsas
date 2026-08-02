import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { accountService } from '@/lib/api';
import { Container } from '@/components/ui/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { usePageMeta } from '@/hooks/usePageMeta';

type State = 'checking' | 'done' | 'invalid' | 'error';

/**
 * Destino do link de confirmacao de troca de e-mail: /confirmar-email?token=...
 *
 * Rota publica: o link costuma ser aberto no celular, fora da sessao em que a
 * troca foi pedida. O endpoint tambem e publico por isso.
 */
export function ConfirmEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>(token ? 'checking' : 'invalid');
  const [message, setMessage] = useState<string>();
  const confirmed = useRef(false);

  usePageMeta({ title: 'Confirmar e-mail', noIndex: true });

  useEffect(() => {
    if (!token || confirmed.current) return;
    // StrictMode roda o efeito duas vezes: sem a trava, o token seria
    // consumido no primeiro envio e o segundo falharia.
    confirmed.current = true;

    accountService
      .confirmEmailChange(token)
      .then(() => setState('done'))
      .catch((error: Error) => {
        setMessage(error.message);
        setState('error');
      });
  }, [token]);

  const content = {
    checking: {
      icon: <CircleNotch size={28} className="animate-spin" aria-hidden />,
      tone: 'bg-cream-light text-terracotta',
      title: 'Confirmando seu e-mail…',
      description: 'Só um instante.',
    },
    done: {
      icon: <CheckCircle size={28} weight="light" aria-hidden />,
      tone: 'bg-success-soft text-success',
      title: 'E-mail confirmado',
      description: 'Seu novo endereço já pode ser usado para entrar na conta.',
    },
    invalid: {
      icon: <WarningCircle size={28} weight="light" aria-hidden />,
      tone: 'bg-danger-soft text-danger',
      title: 'Link incompleto',
      description: 'Abra o link direto do e-mail que enviamos.',
    },
    error: {
      icon: <WarningCircle size={28} weight="light" aria-hidden />,
      tone: 'bg-danger-soft text-danger',
      title: 'Não foi possível confirmar',
      description:
        message || 'O link pode ter expirado ou já ter sido usado. Peça uma nova troca na sua conta.',
    },
  }[state];

  return (
    <Container className="py-section">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Logo size="lg" animated={false} />

        <span className={`mt-8 grid h-16 w-16 place-items-center rounded-full ${content.tone}`}>
          {content.icon}
        </span>
        <h1 className="mt-5 font-display text-display-sm text-graphite">{content.title}</h1>
        <p className="mt-2 text-fluid-base text-graphite-soft">{content.description}</p>

        {state !== 'checking' && (
          <ButtonLink to={state === 'done' ? '/entrar' : '/minha-conta/dados'} className="mt-7">
            {state === 'done' ? 'Entrar na conta' : 'Ir para meus dados'}
          </ButtonLink>
        )}
      </div>
    </Container>
  );
}
