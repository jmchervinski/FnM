/**
 * Condições de Feiticeiros & Maldições (não-oficial) — catálogo vivo, p. 317.
 *
 * O sistema guarda cada condição como um Active Effect com `statuses`, que é o
 * mesmo canal do HUD de token do Foundry: ligar "Cego" pelo HUD ou arrastar o
 * "Cego" de uma carta de Feitiço acaba no mesmo lugar, e a ficha reage igual
 * nos dois casos.
 *
 * A conta em si não passa por `changes` de Active Effect. Os números da ficha
 * são todos derivados em `prepareDerivedData` (Defesa vem de 10 + DES + metade
 * do nível, e assim por diante), e um `change` seria recalculado por cima logo
 * depois. Então o caminho é o do pf2e: a condição entra como *dado*, e cada
 * fórmula da ficha soma a penalidade dela ao montar o próprio valor.
 *
 * Duas regras do capítulo moram aqui e não em outro lugar:
 *
 *   1. Condições com os mesmos efeitos NÃO se acumulam: vale a mais severa
 *      (p. 317). Enredado (-2 de Defesa) mais Caído (-3) dá -3, não -5. Por
 *      isso a agregação usa o pior valor de cada campo, e nunca a soma.
 *   2. Certas condições aplicam outras — Agarrado deixa Desprevenido e Imóvel.
 *      Elas entram por `implica`, expandidas na hora de agregar, e não como
 *      efeitos separados: assim remover o Agarrado devolve as duas juntas, sem
 *      deixar um Imóvel órfão na ficha.
 */
import { FNM } from "./config.mjs";

const TEMPLATE_CONDICOES = "systems/fnm/templates/chat/condicoes.html";

/* -------------------------------------------- */
/*  Agregação                                   */
/* -------------------------------------------- */

/** Todos os campos numéricos e sinalizadores que uma condição pode mexer. */
const ZERADO = {
  ataque: 0,
  ataqueCorpoACorpo: 0,
  pericias: 0,
  resistencias: 0,
  reflexos: 0,
  defesa: 0,
  defesaCorpoACorpo: 0,
  defesaDistancia: 0,
  iniciativa: 0,
  percepcao: 0,
  furtividade: 0,
  deslocamentoMenos: 0,
  deslocamentoMetade: false,
  custoPE: 0,
  ataquesContra: 0,
  semAcoes: false,
  semReacoes: false,
  falhaReflexos: false,
  semRD: false,
  criticoCorpoACorpo: false,
  sempreAcertado: false,
  danoExtraPorNivel: false,
  mudo: false,
  semConversaoDeAcoes: false
};

/**
 * O resultado de agregar condição nenhuma. Congelado e compartilhado: a ficha
 * consulta estes campos em `prepareBaseData`, antes de saber quais condições o
 * ator tem, e ninguém deve conseguir sujá-lo por engano.
 */
export const SEM_CONDICOES = Object.freeze(agregarCondicoes([]));

/**
 * A lista de condições ativas somada às que elas aplicam junto (p. 317).
 * Devolve ids únicos, na ordem do catálogo, para a ficha listar sempre igual.
 */
export function expandirCondicoes(ids = []) {
  const vistos = new Set();
  const fila = [...ids];
  while (fila.length) {
    const id = fila.shift();
    if (!FNM.condicoesPorId[id] || vistos.has(id)) continue;
    vistos.add(id);
    fila.push(...(FNM.condicoesPorId[id].implica ?? []));
  }
  return FNM.condicoes.filter(c => vistos.has(c.id)).map(c => c.id);
}

/** As condições que ESTA lista aplica por consequência, e que não estavam nela. */
export function condicoesImplicadas(ids = []) {
  const diretas = new Set(ids);
  return expandirCondicoes(ids).filter(id => !diretas.has(id));
}

/**
 * Soma o efeito mecânico das condições ativas.
 *
 * Campos numéricos seguem a regra de não-acúmulo (p. 317): o pior valor vence,
 * nunca a soma. Sinalizadores são um OU lógico. Os campos `total*` no fim
 * combinam os que se sobrepõem — a penalidade de Reflexos do Desprevenido e a
 * de resistências do Envenenado descrevem o mesmo prejuízo, então também vale
 * só a mais severa.
 */
export function agregarCondicoes(ids = []) {
  const ativas = expandirCondicoes(ids);
  const ag = { ...ZERADO, ativas, deslocamentoTeto: null };

  for (const id of ativas) {
    const mecanica = FNM.condicoesPorId[id]?.mecanica;
    if (!mecanica) continue;
    for (const [chave, valor] of Object.entries(mecanica)) {
      if (typeof valor === "boolean") {
        ag[chave] = ag[chave] || valor;
      } else if (chave === "deslocamentoTeto") {
        ag[chave] = ag[chave] === null ? valor : Math.min(ag[chave], valor);
      } else {
        // Mesmo efeito não acumula: fica o mais severo, ou o melhor bônus
        ag[chave] = valor < 0 ? Math.min(ag[chave] ?? 0, valor) : Math.max(ag[chave] ?? 0, valor);
      }
    }
  }

  ag.totalAtaque = ag.ataque;
  ag.totalAtaqueCorpoACorpo = Math.min(ag.ataque, ag.ataqueCorpoACorpo);
  ag.totalPericias = ag.pericias;
  // Percepção e Furtividade têm modificadores próprios: a penalidade não soma
  // com a geral (vale a pior), mas o bônus do Invisível é outro efeito e soma
  ag.totalPercepcao = Math.min(ag.pericias, ag.percepcao);
  ag.totalFurtividade = ag.pericias + ag.furtividade;
  ag.totalResistencias = ag.resistencias;
  ag.totalReflexos = Math.min(ag.resistencias, ag.reflexos);
  ag.totalDefesa = ag.defesa;
  ag.totalDefesaCorpoACorpo = Math.min(ag.defesa, ag.defesaCorpoACorpo);
  // Um ajuste positivo contra ataques a distância (o +3 do Caído) é bônus e
  // entra somando; um negativo seria mais uma penalidade de Defesa
  ag.totalDefesaDistancia =
    ag.defesaDistancia < 0 ? Math.min(ag.defesa, ag.defesaDistancia) : ag.defesa + ag.defesaDistancia;

  return ag;
}

/**
 * O deslocamento que sobra depois das condições (p. 318).
 * A ordem é a do texto: primeiro o que subtrai metros, depois o teto de quem
 * está rastejando ou preso, e por último a metade de Lento e Enredado.
 */
export function deslocamentoComCondicoes(base, condicoes = SEM_CONDICOES) {
  let valor = base - (condicoes.deslocamentoMenos ?? 0);
  if (condicoes.deslocamentoTeto !== null && condicoes.deslocamentoTeto !== undefined) {
    valor = Math.min(valor, condicoes.deslocamentoTeto);
  }
  if (condicoes.deslocamentoMetade) valor = valor / 2;
  return Math.max(0, Math.round(valor * 100) / 100);
}

/* -------------------------------------------- */
/*  Aplicando condições (p. 207-210)            */
/* -------------------------------------------- */

/** Nível de uma condição. Sangramento é variável e recebe o nível de fora. */
export function nivelDaCondicao(id, nivelEscolhido = "") {
  const cond = FNM.condicoesPorId[id];
  if (!cond) return "";
  if (cond.nivel === "Variável") return nivelEscolhido || "Fraca";
  return cond.nivel;
}

/**
 * Duração padrão em rodadas de uma condição, pela tabela da p. 208.
 *
 * `nivelItem` é o nível do Feitiço ou da Técnica Marcial que aplicou ("1" a
 * "5", ou "max" para a Técnica Máxima). Um Feitiço focado em condições estende
 * tudo em uma rodada, menos as Extremas — e uma condição acima do que o nível
 * normalmente alcança dura sempre uma rodada só (p. 208).
 *
 * Devolve `0` quando aquele nível não alcança aquela condição, e `-1` para a
 * duração de cena, que só termina quando o alvo passa na CD.
 */
export function duracaoPadraoCondicao(nivelItem, nivelCondicao, { foco = false } = {}) {
  const tabela = FNM.duracaoCondicao[nivelItem];
  if (!tabela || !nivelCondicao) return 0;

  const padrao = tabela[nivelCondicao] ?? 0;
  if (!foco) return padrao;

  // O Feitiço focado conta como um nível acima só para ESCOLHER a condição:
  // a que passa do alcance normal dele entra, mas dura uma rodada
  if (padrao === 0) {
    const alcancaFocado = (FNM.duracaoCondicao[proximoNivelItem(nivelItem)] ?? {})[nivelCondicao];
    return alcancaFocado ? 1 : 0;
  }
  if (padrao === -1 || nivelCondicao === "Extrema") return padrao;
  return padrao + 1;
}

/** O nível de Feitiço imediatamente acima, para a regra do foco em condições. */
function proximoNivelItem(nivelItem) {
  const ordem = ["0", "1", "2", "3", "4", "5", "max"];
  const i = ordem.indexOf(String(nivelItem));
  return i < 0 ? nivelItem : (ordem[i + 1] ?? "max");
}

/** Dados de dano que a condição custa em um Feitiço de Dano (p. 207). */
export function reducaoDeDados(nivelCondicao) {
  return FNM.reducaoDadosPorCondicao[nivelCondicao] ?? 0;
}

/**
 * Como a carta e a ficha escrevem uma duração.
 *
 * Nem toda condição conta rodadas: o Sangramento só termina em um sucesso no
 * TR, o Caído sai com uma ação de movimento e o Desorientado acaba assim que
 * seu efeito acontece (p. 210, 318-319).
 */
export function rotuloDuracao(rodadas, duracaoEspecial = "") {
  if (duracaoEspecial === "tr") return "até passar no TR";
  if (duracaoEspecial === "acao") return "até se levantar";
  if (duracaoEspecial === "efeito") return "até o efeito acontecer";
  if (rodadas === -1) return "cena";
  if (!rodadas) return "sem duração fixa";
  return rodadas === 1 ? "1 rodada" : `${rodadas} rodadas`;
}

/**
 * Resolve a lista de condições declarada em um item para o que a carta precisa
 * publicar: nome, ícone, nível efetivo, duração e a perda de vida do
 * Sangramento. Ids desconhecidos são descartados em silêncio — é uma ficha
 * antiga ou um dado de fora, e não vale derrubar o uso do item por isso.
 */
export function resolverCondicoes(lista = [], { nivelItem = "", foco = false, cd = null, resistencia = "" } = {}) {
  const saida = [];
  for (const entrada of lista) {
    const cond = FNM.condicoesPorId[entrada?.id];
    if (!cond) continue;

    const nivel = nivelDaCondicao(cond.id, entrada.nivel);
    // Condições com duração própria não contam rodadas (p. 210, 318-319), a
    // menos que a ficha do item declare um prazo explícito
    const rodadas = entrada.rodadas
      ? entrada.rodadas
      : cond.duracao
        ? 0
        : duracaoPadraoCondicao(nivelItem, nivel, { foco });
    const formula =
      entrada.formula || (cond.perdaDeVida ? (FNM.sangramentoPorNivel[nivel] ?? "") : "");

    saida.push({
      id: cond.id,
      nome: cond.nome,
      icone: cond.icone,
      grupo: cond.grupo,
      efeito: cond.efeito,
      avisos: cond.avisos ?? [],
      nivelAplicado: nivel,
      rodadas,
      duracaoLabel: rotuloDuracao(rodadas, cond.duracao ?? ""),
      formula,
      // Sangramento se encerra pelo TR e não pela contagem de rodadas (p. 210)
      duracaoEspecial: cond.duracao ?? "",
      cd,
      resistencia: resistencia || cond.resistenciaPadrao || "",
      // Quanto dano em dados esta condição custou ao Feitiço (p. 207)
      reducaoDados: reducaoDeDados(nivel),
      implicadas: (cond.implica ?? []).map(i => FNM.condicoesPorId[i]?.nome).filter(Boolean)
    });
  }
  return saida;
}

/**
 * As linhas que a carta acrescenta quando um efeito aplica condições: o que o
 * capítulo de criação cobra por elas e o que já saiu fora das regras.
 *
 * Isto não impede nada — a mesa pode ter combinado outra coisa, e o livro deixa
 * espaço para isso. É um aviso, no mesmo tom do que a ficha já faz com Feitiço
 * de nível acima do acesso.
 */
export function avisosDeAplicacao(condicoes = [], nivelItem = "", foco = false) {
  if (!condicoes.length) return [];
  const linhas = [];

  const nomes = condicoes
    .map(c => `${c.nome} (${c.nivelAplicado}${c.rodadas ? `, ${c.duracaoLabel}` : ""})`)
    .join(" · ");
  linhas.push(`<b>Condições:</b> ${nomes}`);

  const dados = condicoes.reduce((n, c) => n + c.reducaoDados, 0);
  if (dados && !foco) {
    linhas.push(
      `<b>Custo em dano:</b> -${dados} dado(s) de dano pelas condições aplicadas (p. 207).`
    );
  }
  if (foco) {
    linhas.push(
      "<b>Foco em condições:</b> o efeito não causa dano, alcança um nível de condição acima e " +
        "estende a duração em uma rodada (p. 208)."
    );
  }

  // Nível 0 não aplica condição nenhuma, e cada nível tem um teto de quantas
  const limite = Number(nivelItem);
  if (nivelItem === "0") {
    linhas.push("<b>Atenção:</b> Feitiços de nível 0 não podem aplicar condições (p. 207).");
  } else if (Number.isFinite(limite) && condicoes.length > limite) {
    linhas.push(
      `<b>Atenção:</b> um efeito de nível ${limite} aplica no máximo ${limite} condição(ões), ` +
        `e este traz ${condicoes.length} (p. 207).`
    );
  }

  // Condição com duração própria (Sangramento, Caído, Desorientado) não conta
  // rodadas e não precisa de aviso nenhum
  const foraDoAlcance = condicoes.filter(c => !c.rodadas && !c.duracaoEspecial);
  if (foraDoAlcance.length && nivelItem) {
    linhas.push(
      `<b>Atenção:</b> ${foraDoAlcance.map(c => c.nome).join(", ")} não tem duração padrão ` +
        `neste nível — preencha as rodadas na ficha do item ou combine com o Narrador (p. 208).`
    );
  }

  return linhas;
}

/* -------------------------------------------- */
/*  Active Effects                              */
/* -------------------------------------------- */

/**
 * O Active Effect de uma condição. `statuses` é o que faz o ícone aparecer no
 * token e o que a ficha lê para derivar os números; o resto vai em flags, para
 * o fim de turno saber contra o que testar.
 */
export function dadosDeCondicao(id, opcoes = {}) {
  const cond = FNM.condicoesPorId[id];
  if (!cond) return null;

  const {
    rodadas = 0,
    cd = null,
    resistencia = "",
    formula = "",
    nivelAplicado = "",
    origem = "",
    origemUuid = null
  } = opcoes;

  const dados = {
    name: cond.nome,
    img: cond.icone,
    statuses: [id],
    description: `<p><b>${cond.grupo} · ${nivelAplicado || cond.nivel}</b></p><p>${cond.efeito}</p>`,
    flags: {
      fnm: {
        condicao: id,
        nivelAplicado: nivelAplicado || cond.nivel,
        cd,
        resistencia: resistencia || cond.resistenciaPadrao || "",
        formula,
        origem,
        // Duração de cena: acaba quando o alvo passar na CD, não na contagem
        cena: rodadas === -1
      }
    }
  };

  // O Foundry preenche startRound/startTurn sozinho ao criar o efeito
  if (rodadas > 0) dados.duration = { rounds: rodadas };
  // `origin` liga o efeito ao item que o causou, para quem quiser rastrear
  if (origemUuid) dados.origin = origemUuid;
  return dados;
}

/** Texto sem acento e em minúsculas, para comparar nome com lista escrita à mão. */
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * A ficha de inimigo lista as imunidades a condição como texto livre (é assim
 * que o Grimório as escreve). Isto só pergunta se o nome da condição aparece lá.
 */
export function ehImuneA(ator, id) {
  const lista = ator?.system?.inimigo?.imunidadesCondicao;
  const cond = FNM.condicoesPorId[id];
  if (!lista || !cond) return false;
  return normalizar(lista).includes(normalizar(cond.nome));
}

/** O Active Effect desta condição no ator, se houver. */
export function efeitoDaCondicao(ator, id) {
  return ator?.effects?.find(e => e.statuses?.has(id)) ?? null;
}

/** As condições aplicadas diretamente no ator (sem as que vêm por consequência). */
export function condicoesDoAtor(ator) {
  return [...(ator?.statuses ?? [])].filter(id => FNM.condicoesPorId[id]);
}

/**
 * Aplica uma condição em um ator. Reaplicar uma condição que já está lá
 * atualiza a duração e a CD em vez de criar uma segunda: duas cópias da mesma
 * condição não fazem nada que uma não faça (p. 317).
 */
export async function aplicarCondicao(ator, id, opcoes = {}) {
  const dados = dadosDeCondicao(id, opcoes);
  if (!dados) {
    ui.notifications.warn(`Condição desconhecida: ${id}`);
    return null;
  }
  if (!ator.isOwner) {
    ui.notifications.warn(`Você não controla ${ator.name}.`);
    return null;
  }

  // Imunidades de inimigo são texto livre na ficha, então isto avisa em vez de
  // impedir: a lista pode dizer "condições mentais" ou "veneno", e adivinhar o
  // que ela cobre seria pior do que deixar o Narrador decidir (p. 317)
  if (ehImuneA(ator, id)) {
    ui.notifications.info(
      `${ator.name} consta como imune a ${dados.name}. A condição foi aplicada mesmo assim — ` +
        "remova-a se a imunidade valer aqui."
    );
  }

  const existente = efeitoDaCondicao(ator, id);
  if (existente) {
    const atualizacao = { flags: dados.flags };
    const duracao = duracaoMaisLonga(existente, dados.duration?.rounds ?? 0);
    if (duracao) atualizacao.duration = duracao;
    await existente.update(atualizacao);
    return existente;
  }

  const [criado] = await ator.createEmbeddedDocuments("ActiveEffect", [dados]);
  return criado ?? null;
}

/**
 * Qual duração fica quando a mesma condição é aplicada de novo, ou `null` para
 * manter a que já está lá.
 *
 * A comparação é contra o que RESTA da condição antiga, e não contra o prazo
 * original dela: uma condição de 5 rodadas com 1 rodada pela frente é mais
 * curta que uma nova de 3, e recebê-la de novo tem de esticar o efeito. Sem
 * prazo nenhum ganha de qualquer contagem — é o mais longo que existe.
 */
function duracaoMaisLonga(existente, novasRodadas) {
  const rodadasAntigas = existente.duration?.rounds ?? 0;
  // A nova não tem prazo: some a contagem, se havia uma
  if (!novasRodadas) return rodadasAntigas ? { rounds: null, turns: null } : null;
  // A antiga não tinha prazo: nenhuma contagem a encurta
  if (!rodadasAntigas) return null;

  // `remaining` só existe dentro de um combate; fora dele o prazo original é a
  // melhor aproximação que há do que ainda falta
  const restante = existente.duration.remaining ?? rodadasAntigas;
  if (novasRodadas <= restante) return null;

  // Esticou: o relógio recomeça agora, com o prazo novo
  return {
    rounds: novasRodadas,
    ...ActiveEffect.implementation.getInitialDuration().duration
  };
}

/**
 * Reescreve a duração e a CD de uma condição que já está no ator, sem a regra
 * do "vale a mais longa": aqui quem manda é quem clicou. É o caminho para
 * esticar, encurtar ou tirar o prazo de uma condição no meio do combate —
 * uma habilidade que prolonga o efeito, um acordo de mesa, um erro de digitação.
 */
export async function ajustarCondicao(ator, id, { rodadas = 0, cd = null, resistencia = "" } = {}) {
  const efeito = efeitoDaCondicao(ator, id);
  if (!efeito) {
    ui.notifications.warn(`${ator.name} não está sob esta condição.`);
    return null;
  }

  const flags = efeito.flags?.fnm ?? {};
  const atualizacao = {
    "flags.fnm.cd": cd,
    "flags.fnm.resistencia": resistencia,
    "flags.fnm.cena": rodadas === -1
  };

  if (rodadas > 0) {
    atualizacao.duration = {
      rounds: rodadas,
      ...ActiveEffect.implementation.getInitialDuration().duration
    };
  } else {
    // Sem prazo (0) ou pela cena (-1): as duas saem da contagem de rodadas
    atualizacao["duration.rounds"] = null;
    atualizacao["duration.turns"] = null;
  }

  await efeito.update(atualizacao);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ator }),
    content:
      `<div class="fnm-carta"><b>${FNM.condicoesPorId[id]?.nome ?? id}</b> em ${ator.name}: ` +
      `duração agora é <b>${rotuloDuracao(rodadas, FNM.condicoesPorId[id]?.duracao ?? "")}</b>` +
      (cd ? `, CD ${cd}` : ", sem novo teste no fim do turno") +
      (flags.cd && !cd ? " (o teste de fim de turno foi retirado)" : "") +
      ".</div>"
  });
  return efeito;
}

/** Aplica de uma vez a lista de condições resolvida por `resolverCondicoes`. */
export async function aplicarCondicoes(ator, condicoes = [], { origem = "", origemUuid = null } = {}) {
  const aplicadas = [];
  for (const c of condicoes) {
    const efeito = await aplicarCondicao(ator, c.id, { ...c, origem, origemUuid });
    if (efeito) aplicadas.push(c);
  }
  if (aplicadas.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ator }),
      content:
        `<div class="fnm-carta"><b>${ator.name}</b> recebe ` +
        aplicadas
          .map(c => `<b>${c.nome}</b>${c.rodadas ? ` (${c.duracaoLabel})` : ""}`)
          .join(", ") +
        (origem ? ` — de ${origem}` : "") +
        "</div>"
    });
  }
  return aplicadas;
}

/** Remove uma condição do ator. */
export async function removerCondicao(ator, id) {
  const efeito = efeitoDaCondicao(ator, id);
  if (!efeito) return false;
  await efeito.delete();
  return true;
}

/** Liga ou desliga uma condição, para os cliques da ficha. */
export async function alternarCondicao(ator, id, opcoes = {}) {
  if (efeitoDaCondicao(ator, id)) return removerCondicao(ator, id);
  return aplicarCondicao(ator, id, opcoes);
}

/**
 * O que a ficha mostra na faixa de condições: as aplicadas, com duração e CD,
 * e depois as que vêm por consequência de outra, sem botão de remover — elas
 * saem sozinhas quando a condição de origem sair.
 */
export function condicoesParaFicha(ator) {
  const diretas = condicoesDoAtor(ator);
  const linhas = diretas.map(id => {
    const cond = FNM.condicoesPorId[id];
    const efeito = efeitoDaCondicao(ator, id);
    const flags = efeito?.flags?.fnm ?? {};
    const restam = efeito?.duration?.rounds ? (efeito.duration.remaining ?? null) : null;
    return {
      id,
      nome: cond.nome,
      icone: cond.icone,
      grupo: cond.grupo,
      nivel: flags.nivelAplicado || cond.nivel,
      efeito: cond.efeito,
      avisos: cond.avisos ?? [],
      cd: flags.cd ?? null,
      formula: flags.formula ?? "",
      origem: flags.origem ?? "",
      duracaoLabel: cond.duracao
        ? rotuloDuracao(0, cond.duracao)
        : flags.cena
          ? "cena"
          : restam !== null
            ? rotuloDuracao(Math.max(0, restam))
            : "",
      implicada: false
    };
  });

  for (const id of condicoesImplicadas(diretas)) {
    const cond = FNM.condicoesPorId[id];
    const de = diretas
      .filter(d => (FNM.condicoesPorId[d]?.implica ?? []).includes(id))
      .map(d => FNM.condicoesPorId[d].nome);
    linhas.push({
      id,
      nome: cond.nome,
      icone: cond.icone,
      grupo: cond.grupo,
      nivel: cond.nivel,
      efeito: cond.efeito,
      avisos: cond.avisos ?? [],
      cd: null,
      duracaoLabel: "",
      implicada: true,
      porCausaDe: de.join(", ")
    });
  }

  return linhas;
}

/* -------------------------------------------- */
/*  Cartas de chat                              */
/* -------------------------------------------- */

/** O bloco de condições de uma carta, pronto para ser colado no conteúdo. */
export async function blocoDeCondicoes(condicoes = [], { titulo, dica } = {}) {
  if (!condicoes.length) return "";
  return foundry.applications.handlebars.renderTemplate(TEMPLATE_CONDICOES, {
    condicoes,
    titulo: titulo ?? "Condições aplicadas",
    dica:
      dica ??
      "Clique para aplicar nos alvos da carta, Shift+clique para aplicar nos tokens selecionados, " +
        "ou arraste a condição para um token ou ficha."
  });
}

/**
 * Liga os chips de condição de uma carta de chat.
 *
 * A lista boa é a das flags, e não a do DOM: a carta é lida por todo mundo, e
 * quem clica pode ser o jogador do alvo, que não tem a ficha de origem aberta.
 */
export function ligarCondicoes(elemento, flags, escolherAlvos) {
  const lista = flags?.condicoes ?? [];
  if (!lista.length) return;

  for (const chip of elemento.querySelectorAll("[data-fnm-condicao]")) {
    const dados = lista[Number(chip.dataset.fnmIndice)] ?? lista.find(c => c.id === chip.dataset.fnmCondicao);
    if (!dados) continue;

    chip.addEventListener("click", async evento => {
      evento.preventDefault();
      const alvos = evento.shiftKey ? tokensSelecionados() : escolherAlvos(flags, "receber a condição");
      for (const alvo of alvos) {
        await aplicarCondicao(alvo, dados.id, { ...dados, origem: flags.origemNome ?? "" });
      }
      if (alvos.length) {
        ui.notifications.info(
          `${dados.nome} aplicada em ${alvos.map(a => a.name).join(", ")}.`
        );
      }
    });

    chip.addEventListener("dragstart", evento => {
      evento.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ type: "fnm-condicao", ...dados, origem: flags.origemNome ?? "" })
      );
      evento.dataTransfer.effectAllowed = "copy";
    });
  }
}

/** Os atores dos tokens selecionados agora, para o Shift+clique. */
function tokensSelecionados() {
  const atores = (canvas?.tokens?.controlled ?? []).map(t => t.actor).filter(a => a?.isOwner);
  if (!atores.length) ui.notifications.warn("Selecione ao menos um token que você controle.");
  return [...new Set(atores)];
}

/** O que veio de um arrastar-e-soltar é uma condição do sistema? */
export function ehArrastoDeCondicao(dados) {
  return dados?.type === "fnm-condicao" && !!FNM.condicoesPorId[dados.id];
}

/* -------------------------------------------- */
/*  Automação de turno                          */
/* -------------------------------------------- */

/**
 * Início do turno: o Sangramento cobra a perda de vida (p. 317).
 *
 * Perda de vida não é dano — passa por cima de Redução de Dano e resistências
 * (p. 316), então vai direto nos PV atuais.
 */
async function aoInicioDoTurno(ator) {
  for (const id of condicoesDoAtor(ator)) {
    const cond = FNM.condicoesPorId[id];
    if (!cond?.perdaDeVida) continue;

    const efeito = efeitoDaCondicao(ator, id);
    const formula = efeito?.flags?.fnm?.formula || FNM.sangramentoPorNivel.Fraca;
    const roll = new Roll(formula);
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: ator }),
      flavor: `<b>${cond.nome}</b> — perda de vida no início do turno (p. 317)`
    });
    await ator.aplicarDano(roll.total, { perdaDeVida: true });
  }
}

/**
 * Fim do turno: as condições que vieram com uma CD dão ao alvo uma nova chance
 * de se livrar (p. 208). A carta traz o botão; quem rola é quem controla o
 * token, e um sucesso apaga a condição sozinho.
 *
 * O Desorientado não espera teste nenhum: ele acaba assim que seu efeito
 * acontece, e o fim do turno é o mais tarde que isso pode ser (p. 319).
 */
async function aoFimDoTurno(ator) {
  const pendentes = [];

  for (const id of condicoesDoAtor(ator)) {
    const cond = FNM.condicoesPorId[id];
    const efeito = efeitoDaCondicao(ator, id);
    const flags = efeito?.flags?.fnm ?? {};

    if (cond?.duracao === "efeito") {
      await removerCondicao(ator, id);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: ator }),
        content: `<div class="fnm-carta"><b>${cond.nome}</b> se encerra no fim do turno de ${ator.name} (p. 319).</div>`
      });
      continue;
    }

    // Duração vencida: o efeito some sem teste nenhum
    if (efeito?.duration?.rounds && (efeito.duration.remaining ?? 1) <= 0) {
      await removerCondicao(ator, id);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: ator }),
        content: `<div class="fnm-carta"><b>${cond.nome}</b> se esgota em ${ator.name}.</div>`
      });
      continue;
    }

    if (flags.cd) {
      pendentes.push({
        id,
        nome: cond.nome,
        icone: cond.icone,
        cd: flags.cd,
        resistencia: flags.resistencia || cond.resistenciaPadrao || "",
        nivelAplicado: flags.nivelAplicado || cond.nivel
      });
    }
  }

  if (!pendentes.length) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ator }),
    content:
      `<div class="fnm-carta"><h3>Fim do turno de ${ator.name}</h3>` +
      `<p class="fnm-linhas">Cada condição abaixo permite um novo Teste de Resistência contra a mesma
        CD que a aplicou (p. 208).</p>` +
      `<div class="fnm-acoes">` +
      pendentes
        .map(
          (p, i) =>
            `<button type="button" data-fnm-acao="trCondicao" data-fnm-indice="${i}">` +
            `<i class="fas fa-dice-d20"></i> ${p.nome} — CD ${p.cd}</button>`
        )
        .join("") +
      `</div></div>`,
    flags: { fnm: { tipo: "fimDeTurno", atorId: ator.id, pendentes } }
  });
}

/**
 * Rola o teste que encerra uma condição. Sangramento Extremo exige sucesso
 * crítico para se livrar; os demais bastam um sucesso comum (p. 210).
 */
export async function rolarTRdeCondicao(ator, pendente) {
  if (!pendente?.resistencia) {
    return ui.notifications.warn(
      `${pendente?.nome ?? "Esta condição"} não declara qual Teste de Resistência encerra o efeito — ` +
        "escolha um na ficha do item que a aplicou."
    );
  }

  const resultado = await ator.rolarResistencia(pendente.resistencia, { cd: pendente.cd });
  if (!resultado) return null;

  const exigeCritico = pendente.nivelAplicado === "Extrema" && pendente.id === "sangramento";
  const livrou = exigeCritico ? resultado.critico : resultado.sucesso;

  if (livrou) {
    await removerCondicao(ator, pendente.id);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ator }),
      content: `<div class="fnm-carta"><b>${ator.name}</b> se livra de <b>${pendente.nome}</b>.</div>`
    });
  } else {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ator }),
      content:
        `<div class="fnm-carta"><b>${pendente.nome}</b> persiste em ${ator.name}.` +
        (exigeCritico
          ? " <i>Um Sangramento Extremo só termina com um sucesso crítico (p. 210).</i>"
          : "") +
        "</div>"
    });
  }
  return livrou;
}

/* -------------------------------------------- */
/*  Registro                                    */
/* -------------------------------------------- */

/**
 * As condições do sistema substituem os efeitos de status padrão do Foundry, e
 * o texto do HUD já traz o grupo, o nível e o que a automação faz sozinha.
 */
export function registrarStatusEffects() {
  CONFIG.statusEffects = FNM.condicoes.map(c => ({
    id: c.id,
    name: c.nome,
    img: c.icone,
    description:
      `<p><b>${c.grupo} · ${c.nivel}</b></p><p>${c.efeito}</p>` +
      (c.avisos?.length ? `<p><i>${c.avisos.join(" ")}</i></p>` : "")
  }));
}

/** Hooks de arrastar-e-soltar no mapa e de virada de turno. */
export function registrarCondicoes() {
  // Condição arrastada de uma carta para um token do mapa
  Hooks.on("dropCanvasData", (canvasAtual, dados) => {
    if (!ehArrastoDeCondicao(dados)) return true;
    const alvo = tokenSob(canvasAtual, dados.x, dados.y);
    if (!alvo?.actor) {
      ui.notifications.warn("Solte a condição em cima de um token.");
      return false;
    }
    aplicarCondicao(alvo.actor, dados.id, dados);
    return false;
  });

  // A virada de turno é resolvida uma vez só, pelo Narrador ativo: sem isso,
  // cada cliente aberto rolaria o próprio Sangramento e o alvo perderia vida
  // uma vez por jogador conectado
  Hooks.on("updateCombat", async (combate, mudanca) => {
    if (mudanca.turn === undefined && mudanca.round === undefined) return;
    if (!game.users?.activeGM?.isSelf) return;

    const anterior = combate.combatants?.get(combate.previous?.combatantId)?.actor;
    if (anterior) await aoFimDoTurno(anterior);

    const atual = combate.combatant?.actor;
    if (atual) await aoInicioDoTurno(atual);
  });
}

/** O token mais acima sob um ponto do mapa. */
function tokenSob(canvasAtual, x, y) {
  const candidatos = (canvasAtual?.tokens?.placeables ?? []).filter(t => t.bounds?.contains(x, y));
  return candidatos.at(-1) ?? null;
}
