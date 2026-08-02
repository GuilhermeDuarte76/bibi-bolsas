import { useEffect, useRef } from 'react';

/*
 * Trava de scroll compartilhada.
 *
 * Cada overlay mexendo em `body.style.overflow` por conta propria gera briga:
 * abrir a busca com a sacola aberta e fechar a busca destravava o fundo com a
 * sacola ainda na tela. Com contador, o fundo so volta a rolar quando o ultimo
 * overlay fecha.
 */
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function lockScroll() {
  if (lockCount === 0) {
    const { body } = document;
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    // Compensa a scrollbar do desktop para o conteudo nao "pular" ao travar.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }
}

/**
 * Comportamento padrao de qualquer camada sobreposta (drawer, modal, overlay):
 *
 * - trava o scroll do fundo sem deslocar o layout;
 * - fecha no ESC;
 * - devolve o foco para quem abriu, ao fechar.
 *
 * Retorna a ref que deve ser colocada no primeiro elemento focavel do overlay
 * (normalmente o botao de fechar), para o teclado nao ficar preso no fundo.
 */
export function useOverlay<T extends HTMLElement = HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const initialFocusRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    lockScroll();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const focusTimer = window.setTimeout(() => initialFocusRef.current?.focus(), 0);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  return initialFocusRef;
}
