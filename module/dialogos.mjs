/**
 * Tamanho e rolagem dos diálogos do sistema.
 *
 * Um `DialogV2` cresce junto com o conteúdo e não se limita à tela. Num monitor
 * baixo — ou com a janela do navegador reduzida — o resumo da importação empurra
 * os botões de confirmar para fora da área visível, e não sobra como clicar
 * neles: o diálogo é modal, então nem dá para fugir dele.
 *
 * A correção tem duas metades, e as duas são relativas à tela de quem está
 * jogando, não a um número fixo:
 *
 * - a **largura** sai de uma fração da janela, com piso e teto, e nunca passa da
 *   própria janela;
 * - a **altura** é contida pelo CSS de `.fnm-dialogo-rolagem`, que segura o
 *   conteúdo em uma fração da altura da tela e rola o excedente.
 *
 * Com isso o rodapé de botões fica sempre visível, e o que é longo demais rola
 * por dentro.
 */

/**
 * Largura relativa à janela, para passar em `position` de um DialogV2.
 *
 * `fracao` é quanto da largura disponível o diálogo ocupa; `minimo` e `maximo`
 * evitam que ele fique estreito demais para ler numa tela larga ou largo demais
 * para caber numa estreita.
 */
export function tamanhoDeDialogo({ fracao = 0.42, minimo = 420, maximo = 780 } = {}) {
  const disponivel = globalThis.innerWidth || 1280;
  const desejada = Math.round(disponivel * fracao);
  const largura = Math.min(maximo, Math.max(minimo, desejada));
  // Numa janela estreita o piso não pode passar da janela: sobra uma margem
  // para a moldura do diálogo continuar agarrável.
  return { width: Math.min(largura, Math.max(280, disponivel - 40)) };
}

/** Embrulha o conteúdo de um diálogo na caixa que rola em vez de esticar. */
export function comRolagem(html) {
  return `<div class="fnm-dialogo-rolagem">${html}</div>`;
}

/**
 * As opções que todo diálogo longo deste sistema usa: largura relativa à tela e
 * moldura redimensionável, para quem quiser ajustar à mão.
 */
export function opcoesDeDialogo(medidas) {
  return {
    position: tamanhoDeDialogo(medidas),
    window: { resizable: true }
  };
}
