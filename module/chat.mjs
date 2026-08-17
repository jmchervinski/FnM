/**
 * Cartas de chat de Feiticeiros & Maldições (não-oficial).
 *
 * A carta de ataque é o único lugar em que o jogador vê o resultado, então ela
 * carrega tudo que decide a jogada: o veredito contra a Defesa, o detalhamento
 * dos modificadores e os botões que continuam a ação — rolar o dano, rolar o
 * dano crítico. Os botões guardam nas flags da mensagem o que precisam para
 * refazer a rolagem sem depender do estado da ficha aberta.
 */
import { FNM } from "./config.mjs";

const TEMPLATE_ATAQUE = "systems/fnm/templates/chat/ataque.html";
const TEMPLATE_DANO = "systems/fnm/templates/chat/dano.html";

/**
 * Veredito da jogada, com a explicação que o livro dá para cada caso. `tom`
 * escolhe a cor da faixa: acerto, erro ou neutro.
 */
const RESULTADOS = {
  critico: {
    rotulo: "Acerto Crítico",
    tom: "acerto",
    nota: "Um crítico joga todos os dados de dano duas vezes; os modificadores entram uma vez só (p. 307)."
  },
  acerto: { rotulo: "Acerto", tom: "acerto" },
  erro: { rotulo: "Erro", tom: "erro" },
  desastre: {
    rotulo: "Desastre",
    tom: "erro",
    nota: "Um desastre sempre erra, e o alvo pode atacar você como reação (p. 307)."
  },
  camuflagem: {
    rotulo: "Erro pela camuflagem",
    tom: "erro",
    nota: "A camuflagem erra o ataque qualquer que seja o resultado do d20 (p. 294)."
  },
  indefinido: { rotulo: "Sem Defesa informada", tom: "neutro" }
};

/** Publica a carta de uma jogada de ataque. */
export async function cartaAtaque({
  ator,
  perfil,
  roll,
  natural,
  resultado,
  modificadores,
  situacional,
  vantagem,
  desvantagemAlcance,
  defesa,
  cobertura,
  camuflagem,
  d10,
  atributo,
  versatil
}) {
  const veredito = RESULTADOS[resultado] ?? RESULTADOS.indefinido;
  const notas = [];

  if (veredito.nota) notas.push(veredito.nota);
  if (!perfil.treinado) {
    notas.push("Sem treinamento com esta arma o Bônus de Treinamento não entra na jogada (p. 279).");
  }
  // O efeito de crítico do grupo não é automático: precisa ser liberado (p. 308)
  const grupo = FNM.gruposArma[perfil.grupo];
  if (resultado === "critico" && grupo) {
    notas.push(
      `<b>Efeito de crítico do grupo ${grupo.nome}:</b> ${grupo.critico} ` +
        "<i>Só se aplica se o personagem tiver liberado o efeito de crítico do grupo (p. 308).</i>"
    );
  }

  const conteudo = await foundry.applications.handlebars.renderTemplate(TEMPLATE_ATAQUE, {
    nome: perfil.nome,
    img: perfil.img,
    subtitulo: perfil.subtitulo,
    rolagem: await roll.render(),
    total: roll.total,
    natural,
    veredito,
    defesa,
    cobertura: cobertura.defesa ? cobertura : null,
    camuflagem: d10 !== null ? { ...camuflagem, d10 } : null,
    modificadores,
    situacional,
    vantagem,
    desvantagemAlcance,
    atributoNome: FNM.atributos[atributo]?.nome ?? "",
    propriedades: perfil.propriedades,
    alcance: perfil.alcance,
    limiarCritico: perfil.critico,
    notas,
    // Sem dado de dano (linha da ficha, Faixas, Rede) não há o que rolar
    temDano: !!perfil.dano && perfil.dano !== "—",
    temVersatil: !!perfil.danoVersatil,
    critico: resultado === "critico",
    // O botão principal repete a empunhadura escolhida no diálogo; o segundo
    // oferece a outra, mantendo o crítico da mesma jogada
    versatil,
    versatilAlternativo: !versatil,
    danoEscolhido: versatil ? perfil.danoVersatil : perfil.dano,
    danoAlternativo: versatil ? perfil.dano : perfil.danoVersatil,
    rotuloAlternativo: versatil ? "Com uma mão" : "Com as duas mãos"
  });

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ator }),
    content: conteudo,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: {
      fnm: {
        tipo: "ataque",
        atorId: ator.id,
        itemId: perfil.item?.id ?? null,
        atributo,
        versatil,
        critico: resultado === "critico"
      }
    }
  });
}

/** Publica a carta de uma rolagem de dano. */
export async function cartaDano({ ator, perfil, roll, critico, versatil, componentes }) {
  const tipo = FNM.tiposDano[perfil.tipoDano];
  const conteudo = await foundry.applications.handlebars.renderTemplate(TEMPLATE_DANO, {
    nome: perfil.nome,
    img: perfil.img,
    subtitulo: perfil.subtitulo,
    rolagem: await roll.render(),
    total: roll.total,
    critico,
    versatil,
    tipoDano: tipo?.nome ?? "",
    categoriaDano: tipo?.categoria ?? "",
    componentes
  });

  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ator }),
    content: conteudo,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    flags: { fnm: { tipo: "dano", atorId: ator.id, itemId: perfil.item?.id ?? null } }
  });
}

/**
 * Liga os botões das cartas. O ator vem da flag, e não do speaker, para que a
 * carta continue funcionando depois que a ficha for fechada ou o token, movido.
 */
export function registrarChat() {
  Hooks.on("renderChatMessageHTML", (mensagem, elemento) => {
    const flags = mensagem.flags?.fnm;
    if (flags?.tipo !== "ataque") return;

    for (const botao of elemento.querySelectorAll("[data-fnm-acao]")) {
      botao.addEventListener("click", async evento => {
        evento.preventDefault();
        const ator = game.actors.get(flags.atorId);
        if (!ator) return ui.notifications.warn("O ator desta carta não existe mais.");
        if (!ator.isOwner) return ui.notifications.warn(`Você não controla ${ator.name}.`);

        const item = flags.itemId ? ator.items.get(flags.itemId) : null;
        if (flags.itemId && !item) {
          return ui.notifications.warn("A arma desta carta não está mais no inventário.");
        }

        await ator.rolarDano(item, {
          critico: flags.critico === true,
          versatil: botao.dataset.fnmVersatil === "true",
          atributo: flags.atributo
        });
      });
    }
  });
}
