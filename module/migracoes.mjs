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

/** Itens que ganhariam efeitos do reparo, dentro de um dono qualquer. */
function itensParaReparar(colecao) {
  return colecao.filter(
    item =>
      item.type === "equipamento" &&
      (item.system.efeitos ?? []).length === 0 &&
      Array.isArray(FNM.efeitosPorItem[item.name])
  );
}

/** Aplica a curadoria do livro nos itens que estão sem efeito nenhum. */
export async function repararEfeitosDeItens() {
  let reparados = 0;

  const aplicar = async colecao => {
    const alvos = itensParaReparar(colecao);
    if (!alvos.length) return;
    await Item.implementation.updateDocuments(
      alvos.map(item => ({
        _id: item.id,
        "system.efeitos": FNM.efeitosPorItem[item.name].map(linhaDeEfeito)
      })),
      { parent: colecao === game.items ? null : colecao.parent }
    );
    reparados += alvos.length;
  };

  await aplicar(game.items);
  for (const ator of game.actors) await aplicar(ator.items);

  return reparados;
}

/**
 * Roda os reparos pendentes uma vez por mundo, e só para o Narrador: quem
 * escreve no banco é quem tem permissão para isso.
 */
export async function migrarMundo() {
  if (!game.user.isGM) return;

  const versaoAtual = game.system.version;
  const ultima = game.settings.get("fnm", CHAVE_VERSAO);
  if (ultima === versaoAtual) return;

  try {
    const reparados = await repararEfeitosDeItens();
    if (reparados) {
      ui.notifications.info(
        `F&M: ${reparados} item(ns) do compêndio receberam os efeitos que faltavam ` +
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
