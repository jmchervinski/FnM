/**
 * Reparos de mundo entre versões do sistema.
 *
 * Um item arrastado do compêndio é uma CÓPIA: ele não volta a consultar a
 * origem. Quem montou a ficha antes de os efeitos de item existirem ficou com
 * Anéis do Conhecimento que não dão Sabedoria nenhuma, e nada na mesa avisa —
 * o item está lá, com o texto certo, e o número simplesmente não aparece.
 *
 * O reparo é deliberadamente tímido: só preenche o que está VAZIO, só em itens
 * cujo nome bate exatamente com a curadoria de FNM.efeitosPorItem, e só uma vez
 * por versão. Um item que o jogador editou à mão nunca é tocado.
 */
import { FNM, linhaDeEfeito } from "./config.mjs";

const CHAVE_VERSAO = "ultimaVersaoMigrada";

/**
 * Itens de uma coleção que ganhariam efeitos do reparo.
 *
 * Exportada porque é a parte testável: escolher os alvos é regra, gravar é
 * banco de dados.
 */
export function itensParaReparar(itens) {
  return [...itens].filter(
    item =>
      item.type === "equipamento" &&
      (item.system?.efeitos ?? []).length === 0 &&
      Array.isArray(FNM.efeitosPorItem[item.name])
  );
}

/** A atualização que devolve a um item os efeitos que o livro dá a ele. */
function atualizacaoDe(item) {
  return {
    _id: item.id,
    "system.efeitos": FNM.efeitosPorItem[item.name].map(linhaDeEfeito)
  };
}

/**
 * Aplica a curadoria do livro nos itens que estão sem efeito nenhum, tanto na
 * barra lateral quanto dentro de cada ficha.
 *
 * Item de ator e item de mundo são gravados por caminhos DIFERENTES: um item
 * embutido só se atualiza pelo ator que o carrega. A primeira versão deste
 * reparo usou `colecao.parent`, que em uma EmbeddedCollection não existe — o
 * dono é `.model` —, então a gravação ia para lugar nenhum e o reparo ainda
 * assim dizia que tinha funcionado. Por isso a contagem agora vem do que o
 * Foundry devolve, e não do que era para ter sido feito.
 */
export async function repararEfeitosDeItens() {
  let reparados = 0;

  const doMundo = itensParaReparar(game.items);
  if (doMundo.length) {
    const feitos = await Item.implementation.updateDocuments(doMundo.map(atualizacaoDe));
    reparados += feitos.length;
  }

  for (const ator of game.actors) {
    const daFicha = itensParaReparar(ator.items);
    if (!daFicha.length) continue;
    const feitos = await ator.updateEmbeddedDocuments("Item", daFicha.map(atualizacaoDe));
    reparados += feitos.length;
  }

  return reparados;
}

/**
 * Roda os reparos pendentes uma vez por mundo, e só para o Narrador: quem
 * escreve no banco é quem tem permissão para isso.
 */
export async function migrarMundo() {
  if (!game.user.isGM) return;

  const versaoAtual = game.system.version;
  if (game.settings.get("fnm", CHAVE_VERSAO) === versaoAtual) return;

  try {
    const reparados = await repararEfeitosDeItens();
    if (reparados) {
      ui.notifications.info(
        `F&M: ${reparados} item(ns) receberam os efeitos que faltavam ` +
          "(bônus de atributo, perícia e CD)."
      );
    }
    await game.settings.set("fnm", CHAVE_VERSAO, versaoAtual);
  } catch (erro) {
    // Uma migração que falha não pode marcar a versão como migrada, senão o
    // reparo nunca mais roda naquele mundo
    console.error("F&M | Falha ao migrar o mundo:", erro);
    ui.notifications.error("F&M: o reparo dos itens falhou. Veja o console (F12).");
  }
}

/** Registra a marca de versão migrada. Chamada no `init`. */
export function registrarMigracoes() {
  game.settings.register("fnm", CHAVE_VERSAO, {
    name: "Última versão migrada",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}
