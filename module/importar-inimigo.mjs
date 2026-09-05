/**
 * Importação de fichas de inimigo exportadas por construtores externos.
 *
 * O formato aceito é o `version: "2.0"` do construtor de criaturas de
 * Feiticeiros & Maldições 2.5: um objeto com `creatures: [...]`, onde cada
 * criatura traz os totais já fechados (Defesa, Atenção, testes de resistência,
 * CD, acerto) em vez dos ingredientes deles.
 *
 * Por isso a importação liga `valoresManuais` e escreve em `system.manuais`:
 * os totais do construtor saem das tabelas por ND do Grimório (p. 23-52), que
 * este sistema não transcreve, e não teriam como sair das fórmulas do livro
 * básico. Desligar `valoresManuais` na ficha devolve tudo para as fórmulas, sem
 * perder os números importados.
 *
 * `mapearInimigo` é uma função pura — só depende de `FNM` e de JavaScript — para
 * que `npm run check` possa validar o resultado dela contra o schema sem subir
 * o Foundry.
 */
import { FNM, bonusTreinamentoND } from "./config.mjs";
import { comRolagem, opcoesDeDialogo } from "./dialogos.mjs";

/* -------------------------------------------- */
/*  Tradução dos vocabulários                   */
/* -------------------------------------------- */

/** Normaliza uma chave do arquivo: sem acento, sem pontuação, em minúsculas. */
function chave(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const GRAUS = {
  "4": "Grau 4",
  quarto: "Grau 4",
  "3": "Grau 3",
  terceiro: "Grau 3",
  semi2: "Semi-Grau 2",
  semigrau2: "Semi-Grau 2",
  "2": "Grau 2",
  segundo: "Grau 2",
  semi1: "Semi-Grau 1",
  semigrau1: "Semi-Grau 1",
  "1": "Grau 1",
  primeiro: "Grau 1",
  especial: "Grau Especial",
  grauespecial: "Grau Especial"
};

const TAMANHOS = {
  minusculo: "Minúsculo",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  enorme: "Enorme",
  colossal: "Colossal"
};

const TABELAS = {
  iniciante: "iniciante",
  intermediario: "intermediaria",
  intermediaria: "intermediaria",
  experiente: "experiente"
};

/** Origem do construtor -> Origem de Inimigo e Tipo da ficha. */
const ORIGENS = {
  maldicao: ["Espírito Amaldiçoado", "Maldição"],
  espiritoamaldicoado: ["Espírito Amaldiçoado", "Maldição"],
  feiticeiro: ["Feiticeiro", "Feiticeiro"],
  cacador: ["Caçador", "Humano"],
  naofeiticeiro: ["Não-Feiticeiro", "Humano"],
  humano: ["Não-Feiticeiro", "Humano"],
  restrito: ["Restrito Celeste", "Humano"],
  restritoceleste: ["Restrito Celeste", "Humano"],
  restringido: ["Restrito Celeste", "Humano"],
  corpoamaldicoado: ["Corpo Amaldiçoado", "Corpo Amaldiçoado"],
  corpo: ["Corpo Amaldiçoado", "Corpo Amaldiçoado"]
};

const TIPOS_ESPIRITO = {
  comum: "Comum",
  medo: "De Medo",
  demedo: "De Medo",
  vingativo: "Vingativo",
  vingativoimaginario: "Vingativo Imaginário",
  imaginario: "Vingativo Imaginário",
  enfermo: "Enfermo"
};

const CATEGORIAS_CARACTERISTICA = { geral: "Geral", especial: "Especial" };

/**
 * O construtor rotula a categoria de uma aptidão com o cabeçalho inteiro da
 * Galeria ("Aptidões de Controle e Leitura"); aqui basta o nome da categoria.
 */
function categoriaDeDote(rotulo) {
  const k = chave(rotulo);
  if (!k) return "";
  return (
    FNM.categoriasDoteAmaldicoado.find(c => k === chave(c)) ??
    FNM.categoriasDoteAmaldicoado.find(c => k.includes(chave(c))) ??
    ""
  );
}

/** Tipo de ação do construtor -> como a ficha nomeia a ação. */
const TIPOS_DE_ACAO = {
  comum: "Ação Comum",
  rapida: "Ação Rápida",
  bonus: "Ação Bônus",
  movimento: "Ação de Movimento",
  reacao: "Reação",
  livre: "Ação Livre",
  completa: "Ação Completa"
};

/** Alcance do construtor -> os dois eixos que a arma do sistema usa. */
const TIPOS_DE_ALCANCE = { cac: "Corpo a Corpo", corpoacorpo: "Corpo a Corpo", distancia: "A Distância", arremesso: "De Arremesso" };

/** Cada lista de poderes do arquivo e o item que ela vira na ficha. */
const LISTAS_DE_ITENS = [
  { campo: "features", tipo: "caracteristica" },
  { campo: "caracteristicas", tipo: "caracteristica" },
  { campo: "artimanhas", tipo: "caracteristica", categoria: "Especial", rotulo: "Artimanha" },
  { campo: "dotes", tipo: "dote", tipoDote: "Geral" },
  { campo: "aptidoesEspeciais", tipo: "dote", tipoDote: "Amaldiçoado" },
  { campo: "treinamentos", tipo: "dote", tipoDote: "Treinamento" }
];

/**
 * Campos do arquivo que este sistema não tem onde guardar. Ficam listados para
 * a importação avisar, em vez de sumirem em silêncio.
 */
const SEM_EQUIVALENTE = {
  combatSettings: "as chaves de motor do construtor (guardaAbsorbsFirst, rdReducao)",
  "combatState.activeConditions": "as condições ativas do combate em andamento",
  "combatState.activeModifiers": "os modificadores ativos do combate em andamento",
  "combatState.combatLog": "o log de combate",
  "combatState.integridadeCurrent":
    "a Integridade atual do construtor (a escala dele é 0-100; aqui ela acompanha o PV e " +
    "entra cheia, para a criatura não nascer com a alma em estado crítico)",
  overrides: "os overrides internos do construtor"
};

/* -------------------------------------------- */
/*  Utilidades                                  */
/* -------------------------------------------- */

const numero = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const inteiro = (v) => {
  const n = numero(v);
  return n === null ? null : Math.round(n);
};
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

/** Escapa texto vindo do arquivo antes de virar HTML de descrição. */
function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Texto solto do arquivo (com quebras de linha) vira parágrafos. */
function paragrafos(texto) {
  const partes = String(texto ?? "")
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean);
  return partes.map(p => `<p>${escapar(p)}</p>`).join("");
}

/** Junta uma lista de `{ tipo }` (ou de strings) na string que a ficha guarda. */
function listaDeTipos(lista) {
  if (!Array.isArray(lista)) return "";
  const nomes = lista
    .map(e => (typeof e === "string" ? e : e?.tipo ?? e?.nome ?? e?.name))
    .map(n => String(n ?? "").trim())
    .filter(Boolean);
  return [...new Set(nomes)].join(", ");
}

/**
 * Os campos de um poder que não são nome, descrição nem controle interno viram
 * uma lista no fim da descrição — melhor do que descartá-los.
 */
const CAMPOS_INTERNOS = new Set([
  "id", "name", "nome", "description", "descricao", "category", "categoria",
  "trigger", "source", "originKey", "automated", "locked", "custoPE", "custo"
]);

function extras(poder) {
  const linhas = [];
  for (const [k, v] of Object.entries(poder ?? {})) {
    if (CAMPOS_INTERNOS.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "object") continue;
    linhas.push(`<li><b>${escapar(k)}:</b> ${escapar(v)}</li>`);
  }
  return linhas.length ? `<ul>${linhas.join("")}</ul>` : "";
}

/* -------------------------------------------- */
/*  Mapeamento                                  */
/* -------------------------------------------- */

/**
 * Lê o arquivo exportado e devolve as criaturas que ele contém.
 * Aceita o envelope `{ creatures: [...] }` e também uma criatura solta.
 */
export function lerArquivo(dados) {
  if (Array.isArray(dados?.creatures)) return dados.creatures;
  if (Array.isArray(dados)) return dados;
  if (dados && typeof dados === "object" && (dados.core || dados.stats)) return [dados];
  return [];
}

/**
 * Traduz uma criatura do construtor para o formato do sistema.
 *
 * Devolve `{ nome, img, system, itens, avisos }`. Nada aqui toca no Foundry:
 * `system` é um objeto achatado de caminhos (`"detalhes.nivel": 17`) pronto
 * para `Actor#update`, e `itens` são dados de item prontos para `createEmbeddedDocuments`.
 */
export function mapearInimigo(criatura) {
  const avisos = [];
  const sys = {};
  const anota = (caminho, valor) => {
    if (valor !== null && valor !== undefined) sys[caminho] = valor;
  };

  const core = criatura?.core ?? {};
  const stats = criatura?.stats ?? {};
  const estado = criatura?.combatState ?? {};

  /* -------- Identidade e criação -------- */

  const nd = limitar(inteiro(core.nd) ?? 1, 1, 30);
  anota("detalhes.nivel", nd);

  const grau = GRAUS[chave(core.grau)];
  if (grau) anota("detalhes.grau", grau);
  else if (core.grau) avisos.push(`Grau desconhecido no arquivo: "${core.grau}".`);

  const patamar = chave(core.patamar);
  if (FNM.patamares.some(p => p.id === patamar)) anota("detalhes.patamar", patamar);
  else if (core.patamar) avisos.push(`Patamar desconhecido no arquivo: "${core.patamar}".`);

  const tabela = TABELAS[chave(core.difficulty)];
  if (tabela) anota("detalhes.tabelaCriacao", tabela);
  else if (core.difficulty) avisos.push(`Tabela de criação desconhecida: "${core.difficulty}".`);

  const tamanho = TAMANHOS[chave(core.size)];
  if (tamanho) anota("detalhes.tamanho", tamanho);
  else if (core.size) avisos.push(`Tamanho desconhecido no arquivo: "${core.size}".`);

  const origem = ORIGENS[chave(core.origin?.type)];
  if (origem) {
    anota("detalhes.origemInimigo", origem[0]);
    anota("detalhes.tipo", origem[1]);
  } else if (core.origin?.type) {
    avisos.push(`Origem desconhecida no arquivo: "${core.origin.type}".`);
  }

  const espirito = TIPOS_ESPIRITO[chave(core.origin?.subtype)];
  if (espirito) anota("detalhes.tipoEspirito", espirito);
  else if (core.origin?.subtype) {
    avisos.push(`Tipo de espírito desconhecido: "${core.origin.subtype}".`);
  }

  // O BT não é importado: ele sai do ND pela tabela da p. 8. Se o arquivo
  // discordar, o aviso aponta — normalmente é o ND que veio errado.
  const btArquivo = inteiro(core.bonusTreinamento);
  const btCalculado = bonusTreinamentoND(nd);
  if (btArquivo !== null && btArquivo !== btCalculado) {
    avisos.push(
      `O arquivo traz Bônus de Treinamento +${btArquivo}, mas a tabela do Grimório dá ` +
        `+${btCalculado} para ND ${nd}. A ficha usa +${btCalculado}.`
    );
  }

  /* -------- Atributos, aptidões e atributos-chave -------- */

  for (const id of FNM.ordemAtributos) {
    const v = inteiro(criatura?.attributes?.[id]);
    if (v !== null) anota(`atributos.${id}.value`, limitar(v, 1, 30));
  }

  for (const id of Object.keys(FNM.niveisAptidao)) {
    const v = inteiro(criatura?.aptidoes?.[id]);
    if (v !== null) anota(`jujutsu.aptidoes.${id}`, limitar(v, 0, 5));
  }

  if (criatura?.cdAttr && FNM.atributos[criatura.cdAttr]) {
    anota("jujutsu.atributoTecnica", criatura.cdAttr);
  }
  if (criatura?.attackAttr && FNM.atributos[criatura.attackAttr]) {
    // Só as jogadas físicas: o Ataque Amaldiçoado segue o atributo da técnica,
    // e deixá-lo em branco é o que faz a ficha buscar `atributoTecnica`.
    for (const id of Object.keys(FNM.tiposAtaque)) {
      if (id !== "amaldicoado") anota(`ataques.${id}.atributo`, criatura.attackAttr);
    }
  }

  /* -------- Totais fechados -------- */

  anota("detalhes.valoresManuais", true);

  const pvMax = inteiro(stats.hpMax);
  const peMax = inteiro(stats.peMax);
  if (pvMax !== null) {
    anota("recursos.pv.max", Math.max(0, pvMax));
    anota("recursos.pv.value", Math.max(0, inteiro(estado.hpCurrent) ?? pvMax));

    // A Integridade da Alma acompanha o máximo de PV e entra sempre cheia. O
    // construtor exporta `integridadeCurrent` numa escala de 0 a 100, que não
    // é a daqui — e deixar o padrão (10) contra um PV alto colocaria a criatura
    // em estado de alma Crítico já na importação, com -8 em tudo.
    anota("recursos.integridade.perdidos", 0);
    anota("recursos.integridade.value", Math.max(0, pvMax));
  }
  if (peMax !== null) {
    anota("recursos.pe.max", Math.max(0, peMax));
    anota("recursos.pe.value", Math.max(0, inteiro(estado.peCurrent) ?? peMax));
  }

  anota("combate.defesaManual", Math.max(0, inteiro(stats.defesa) ?? 0) || null);
  anota("manuais.atencao", inteiro(stats.atencao));
  anota("manuais.iniciativa", inteiro(stats.iniciativa));
  anota("manuais.cd", inteiro(stats.cdBase));
  anota("manuais.acerto", inteiro(stats.acerto));

  const desl = numero(stats.deslocamento);
  if (desl !== null) anota("combate.deslocamento", Math.max(0, desl));

  anota("combate.rd.geral", Math.max(0, inteiro(stats.rdGeral) ?? 0));
  anota("inimigo.rdIrredutivel", Math.max(0, inteiro(stats.rdIrredutivel) ?? 0));
  anota("inimigo.ignorarRD", Math.max(0, inteiro(stats.ignorarRd) ?? 0));
  anota("inimigo.vidaTempPorAtaque", Math.max(0, inteiro(stats.vidaTempPorAtaque) ?? 0));

  // Recursos com "usado" no arquivo e "restante" na ficha
  const porUso = (max, usado, atual) => {
    const m = Math.max(0, inteiro(max) ?? 0);
    const restante = atual !== undefined ? inteiro(atual) : m - (inteiro(usado) ?? 0);
    return { max: m, value: limitar(restante ?? m, 0, m) };
  };

  const guarda = porUso(stats.guardaInabavalMax, 0, estado.guardaInabavalCurrent);
  anota("inimigo.guardaInabalavel.max", guarda.max);
  anota("inimigo.guardaInabalavel.value", guarda.value);

  const parcial = porUso(stats.resistenciaParcialMax, estado.resistenciaParcialUsed);
  anota("inimigo.resistenciaParcial.max", parcial.max);
  anota("inimigo.resistenciaParcial.value", parcial.value);

  const total = porUso(stats.resistenciaTotalMax, estado.resistenciaTotalUsed);
  anota("inimigo.resistenciaTotal.max", total.max);
  anota("inimigo.resistenciaTotal.value", total.value);

  for (const id of Object.keys(FNM.resistencias)) {
    anota(`manuais.resistencias.${id}`, inteiro(criatura?.saves?.[id]));
    const margem = inteiro(criatura?.critMargins?.[id]);
    if (margem !== null) anota(`inimigo.margensCritico.${id}`, limitar(margem, 2, 20));
  }
  const margemAtaque = inteiro(criatura?.critMargins?.ataque);
  if (margemAtaque !== null) anota("inimigo.margensCritico.ataque", limitar(margemAtaque, 2, 20));

  anota("inimigo.confrontoDominio", inteiro(criatura?.confrontoDominio?.modBase));

  /* -------- Ações, defesas e perícias -------- */

  for (const id of ["comum", "rapida", "bonus", "movimento", "reacao"]) {
    const v = inteiro(criatura?.actions?.total?.[id]);
    if (v !== null) anota(`inimigo.acoes.${id}`, Math.max(0, v));
  }

  const def = criatura?.defenses ?? {};
  anota("defesas.imunidades", listaDeTipos(def.imunidades));
  anota("defesas.resistencias", listaDeTipos(def.resistencias));
  anota("defesas.vulnerabilidades", listaDeTipos(def.vulnerabilidades));
  anota(
    "inimigo.imunidadesCondicao",
    listaDeTipos([
      ...(def.condicoesImunes ?? []),
      ...(def.originCondicoesImunes ?? []),
      ...(def.doteCondicoesImunes ?? [])
    ])
  );

  for (const aviso of mapearPericias(criatura?.skills, sys)) avisos.push(aviso);

  if (criatura?.narratorNotes) anota("taticas", paragrafos(criatura.narratorNotes));

  /* -------- Poderes viram itens -------- */

  const itens = [];
  for (const lista of LISTAS_DE_ITENS) {
    for (const poder of criatura?.[lista.campo] ?? []) {
      itens.push(montarItem(poder, lista));
    }
  }
  const acoes = criatura?.actions?.list ?? [];
  const acertoBase = inteiro(stats.acerto);
  let comoArma = 0;
  for (const acao of acoes) {
    const item = montarAcao(acao, acertoBase, criatura?.critMargins?.ataque);
    if (item.type === "arma") comoArma += 1;
    itens.push(item);
  }
  if (acoes.length) {
    avisos.push(
      `Ações: ${comoArma} de acerto viraram Armas e ${acoes.length - comoArma} por Teste de ` +
        "Resistência viraram Feitiços. As duas ficam na aba Ações e são roláveis."
    );
  }
  if ((criatura?.artimanhas ?? []).length) {
    avisos.push("As Artimanhas entraram como Características especiais.");
  }

  /* -------- O que ficou de fora -------- */

  for (const [caminho, descricao] of Object.entries(SEM_EQUIVALENTE)) {
    const valor = caminho.split(".").reduce((o, k) => o?.[k], criatura);
    const temConteudo = Array.isArray(valor)
      ? valor.length > 0
      : valor && typeof valor === "object"
        ? Object.keys(valor).length > 0
        : valor !== undefined && valor !== null && valor !== "";
    if (temConteudo) avisos.push(`Não importado: ${descricao}.`);
  }

  const nome = String(criatura?.name ?? "").trim();
  const img = String(criatura?.portraitUrl ?? "").trim();

  return { nome, img, system: sys, itens, avisos };
}

/**
 * Perícias. O construtor exporta uma lista e este sistema guarda um bloco fixo
 * com `treinado`/`mestre` por perícia, então a tradução é por nome. Entradas
 * que não batem com nenhuma perícia do livro viram aviso em vez de sumirem.
 */
function mapearPericias(skills, sys) {
  const avisos = [];
  if (!Array.isArray(skills) || !skills.length) return avisos;

  const porChave = new Map(Object.entries(FNM.pericias).map(([id, cfg]) => [chave(cfg.nome), id]));
  for (const id of Object.keys(FNM.pericias)) porChave.set(chave(id), id);

  for (const s of skills) {
    // O `id` do construtor é um identificador interno ("skill-msyqh3wu-thv7"),
    // não o nome da perícia: ele só entra na busca depois dos campos de nome.
    const candidatos =
      typeof s === "string" ? [s] : [s?.name, s?.nome, s?.key, s?.pericia, s?.id];
    const bruto = candidatos.find(c => porChave.has(chave(c)));
    const id = porChave.get(chave(bruto));
    if (!id) {
      const mostrado = candidatos.find(Boolean) ?? JSON.stringify(s);
      avisos.push(`Perícia não reconhecida no arquivo: "${mostrado}".`);
      continue;
    }

    // "mastered"/"dominada" no construtor é o Mestre da ficha
    const mestre = Boolean(s?.mastered ?? s?.mestre ?? s?.dominada ?? s?.dominado ?? s?.master);
    sys[`pericias.${id}.treinado`] = true;
    sys[`pericias.${id}.mestre`] = mestre;

    // O bônus total do construtor sai das tabelas de perícia por ND do Grimório
    // (p. 23-52), que este sistema não transcreve — então ele entra como total
    // fechado, e não como um "outros" somado à fórmula.
    const total = inteiro(s?.overrideMod ?? s?.mod ?? s?.total);
    if (total !== null) sys[`manuais.pericias.${id}`] = total;
  }
  return avisos;
}

/**
 * Uma ação do construtor vira um item da ficha.
 *
 * Ação de **acerto** vira uma **Arma**: é o item que a ficha de NPC já sabe
 * rolar, com botão de ataque e de dano. Ação por **Teste de Resistência** vira
 * uma **Característica**, porque não existe item de ação com TR neste sistema —
 * e nesse caso os números ficam só na descrição.
 *
 * De qualquer jeito a descrição carrega o bloco inteiro (acerto, CD, TR,
 * alcance, área, dano, custo e condição), então nada do arquivo se perde.
 */
function montarAcao(acao, acertoBase, margemAtaque) {
  const nome = String(acao?.name ?? acao?.nome ?? "Ação").trim() || "Ação";
  const dano = acao?.damage ?? {};
  const tipoAtaque = chave(acao?.attackType);
  const porAcerto = tipoAtaque === "acerto";

  const tipoDano =
    Object.keys(FNM.tiposDano).find(t => chave(t) === chave(dano.type)) ?? "";
  const rolagem = String(dano.roll ?? "").trim();
  const condicao = acao?.condition ?? {};
  const temCondicao = condicao.name && chave(condicao.tier) !== "nenhuma";

  const linhas = [
    ["Ação", TIPOS_DE_ACAO[chave(acao?.type)] ?? acao?.type],
    ["Acerto", porAcerto && acao?.toHit !== undefined ? `+${acao.toHit}` : null],
    [
      "Teste de Resistência",
      !porAcerto && acao?.trType ? `${acao.trType} (CD ${acao?.cd ?? "?"})` : null
    ],
    ["Alcance", acao?.range],
    ["Área", acao?.area && acao.area !== "-" ? acao.area : null],
    ["Dano", rolagem ? `${rolagem}${tipoDano ? ` ${FNM.tiposDano[tipoDano].nome.toLowerCase()}` : ""}` : null],
    ["Dano médio", dano.average],
    ["Custo", acao?.cost ? `${acao.cost} PE` : null],
    [
      "Condição",
      temCondicao ? `${condicao.name} (${condicao.tier}, paga em ${condicao.payment ?? "PE"})` : null
    ]
  ]
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([r, v]) => `<li><b>${escapar(r)}:</b> ${escapar(v)}</li>`)
    .join("");

  const descricao =
    `<p><i>Ação importada do construtor.</i></p><ul>${linhas}</ul>` +
    paragrafos(acao?.description ?? acao?.descricao ?? "");

  if (!porAcerto) {
    // Ação por Teste de Resistência é um Feitiço: é o item que já resolve por
    // TR, com resistência, área, dano e custo em PE, e que a ficha sabe
    // conjurar. O nível fica em 0 porque uma ação de criatura não tem nível de
    // Feitiço — e é o único nível que um NPC sempre pode conjurar, então o
    // custo em PE declarado aqui é o que vale.
    const emArea = Boolean(acao?.area && acao.area !== "-");
    const tamanhoArea = numero(String(acao?.area ?? "").replace(",", ".").match(/[\d.]+/)?.[0]);

    return {
      name: nome,
      type: "feitico",
      img: "icons/svg/explosion.svg",
      system: {
        description: descricao,
        nivel: "0",
        tipo: rolagem ? "Dano" : "Especial",
        custoPE: Math.max(0, inteiro(acao?.cost) ?? 0),
        conjuracao: TIPOS_DE_ACAO[chave(acao?.type)] ?? "Ação Comum",
        alcance: String(acao?.range ?? ""),
        alvo: emArea ? "Área" : "Criatura",
        area: { formato: emArea ? "Esfera" : "", tamanho: emArea ? (tamanhoArea ?? 0) : 0 },
        duracao: "Imediato",
        resolucao: "resistencia",
        resistencia:
          Object.keys(FNM.resistencias).find(r => chave(r) === chave(acao?.trType)) ?? "",
        dano: rolagem,
        tipoDano,
        reducaoCusto: 0,
        variacaoDe: "",
        requisito: "",
        preparado: true,
        ajustes: { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0 }
      }
    };
  }

  // O acerto da ação já inclui as trocas feitas no construtor; o que sobra em
  // relação ao acerto base da criatura é o bônus próprio desta arma.
  const toHit = inteiro(acao?.toHit);
  const bonusAtaque = toHit !== null && acertoBase !== null ? toHit - acertoBase : 0;
  const margem = inteiro(margemAtaque);

  return {
    name: nome,
    type: "arma",
    img: "icons/svg/sword.svg",
    system: {
      description: descricao,
      categoria: "Simples",
      tipo: TIPOS_DE_ALCANCE[chave(acao?.rangeType)] ?? "Corpo a Corpo",
      // Qual ação do turno o ataque consome — é por isto que a aba de Ações
      // agrupa, então não pode ficar só na descrição
      acao: TIPOS_DE_ACAO[chave(acao?.type)] ?? "Ação Comum",
      grupo: "",
      dano: rolagem || "1d6",
      danoVersatil: "",
      tipoDano,
      critico: margem === null ? 20 : limitar(margem, 15, 20),
      propriedades: "",
      alcance: String(acao?.range ?? ""),
      // Um ataque natural de criatura não ocupa espaço nem custa dinheiro
      espacos: 0,
      custo: 0,
      grau: "",
      encantamentos: "",
      fineza: false,
      // O dano vem fechado das tabelas por ND: somar o atributo por cima
      // inflaria o golpe (Grimório, p. 53)
      danoFechado: true,
      treinado: true,
      equipada: true,
      bonusAtaque,
      bonusDano: 0,
      quantidade: 1,
      peso: 0,
      preco: "",
      ajustes: { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0 }
    }
  };
}

/** Monta o dado de um item a partir de um poder do arquivo. */
function montarItem(poder, lista) {
  const nome = String(poder?.name ?? poder?.nome ?? "Sem nome").trim() || "Sem nome";
  const texto = poder?.description ?? poder?.descricao ?? "";
  const gatilho = String(poder?.trigger ?? "").trim();

  const descricao =
    (lista.rotulo ? `<p><i>${lista.rotulo} importada do construtor.</i></p>` : "") +
    paragrafos(texto) +
    extras(poder);

  const system = {
    description: descricao,
    prerequisito: "",
    custoPE: Math.max(0, inteiro(poder?.custoPE ?? poder?.custo) ?? 0),
    // "passiva" no arquivo é o padrão; só vale anotar quando for outra coisa
    acao: gatilho && chave(gatilho) !== "passiva" ? gatilho : "",
    ajustes: { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0 }
  };

  if (lista.tipo === "dote") {
    Object.assign(system, {
      tipoDote: lista.tipoDote,
      // Só o Dote Amaldiçoado tem categoria; o rótulo vem como o cabeçalho
      // inteiro da Galeria ("Aptidões de Anatomia").
      categoria:
        lista.tipoDote === "Amaldiçoado"
          ? categoriaDeDote(poder?.categoria ?? poder?.category)
          : "",
      areaAptidao: "",
      nivelAptidao: 0,
      ndMinimo: 0
    });
  } else {
    system.categoria =
      lista.categoria ?? CATEGORIAS_CARACTERISTICA[chave(poder?.category ?? poder?.categoria)] ?? "Geral";
  }

  return {
    name: nome,
    type: lista.tipo,
    img: lista.tipo === "dote" ? "icons/svg/upgrade.svg" : "icons/svg/shield.svg",
    system
  };
}

/* -------------------------------------------- */
/*  Aplicação na ficha                          */
/* -------------------------------------------- */

/**
 * Escreve o resultado de `mapearInimigo` em um ator.
 *
 * `substituirItens` apaga os Dotes e Características que já estavam na ficha
 * antes de criar os novos; sem ele, os do arquivo são somados aos existentes.
 * Nada mais da ficha é apagado: o que o arquivo não traz fica como estava.
 */
export async function aplicarNoAtor(ator, mapeado, { substituirItens = false } = {}) {
  // Os caminhos de `system` vêm achatados ("detalhes.nivel"); expandObject os
  // aninha, e o prefixo "system." entra por fora.
  const update = { system: foundry.utils.expandObject(mapeado.system) };
  if (mapeado.nome) {
    update.name = mapeado.nome;
    // O nome do token protótipo não acompanha o do ator sozinho depois que o
    // ator já existe: sem isto, o token continua com o nome antigo no mapa.
    update["prototypeToken.name"] = mapeado.nome;
  }
  if (mapeado.img) {
    update.img = mapeado.img;
    update["prototypeToken.texture.src"] = mapeado.img;
  }

  // O Foundry valida o update inteiro de uma vez: um único campo inválido faz
  // ele recusar tudo — inclusive o nome. Falhar alto é melhor do que gravar os
  // itens e deixar a ficha com os números velhos sem ninguém perceber.
  await ator.update(update);

  if (substituirItens) {
    const antigos = ator.items
      .filter(i => i.type === "dote" || i.type === "caracteristica")
      .map(i => i.id);
    if (antigos.length) await ator.deleteEmbeddedDocuments("Item", antigos);
  }
  if (mapeado.itens.length) {
    await ator.createEmbeddedDocuments("Item", mapeado.itens);
  }

  return mapeado;
}

/* -------------------------------------------- */
/*  Fluxo na interface                          */
/* -------------------------------------------- */

// Resolvido na chamada, e não no topo do módulo: `mapearInimigo` precisa poder
// ser importado fora do Foundry, onde o global `foundry` não existe.
const dialogo = () => foundry.applications.api.DialogV2;

/** Escapa texto antes de entrar no HTML de um diálogo. */
const esc = (t) => foundry.utils.escapeHTML(String(t ?? ""));

/**
 * Pergunta por um arquivo, mostra o que será escrito e só então preenche a
 * ficha. O Narrador vê o resumo antes de confirmar, e a ficha segue editável à
 * mão depois — a importação é um atalho, não um modo de operação.
 */
export async function importarDeArquivo(ator) {
  if (ator?.type !== "npc") {
    ui.notifications.warn("A importação de ficha só existe para NPCs / Maldições.");
    return null;
  }

  const escolha = await dialogo().wait({
    ...opcoesDeDialogo(),
    window: { title: `Importar ficha de inimigo — ${ator.name}`, resizable: true },
    content: comRolagem(`
      <p>Escolha um JSON exportado por um construtor de criaturas de Feiticeiros &amp;
      Maldições 2.5.</p>
      <p><input type="file" name="arquivo" accept=".json,application/json" /></p>
      <label class="checkbox">
        <input type="checkbox" name="substituir" />
        Apagar os Dotes e Características que já estão na ficha
      </label>
      <p class="hint">Sem marcar, os poderes do arquivo são somados aos que já existem.
      O resto da ficha nunca é apagado: o que o arquivo não trouxer fica como está.</p>`),
    buttons: [
      {
        action: "importar",
        label: "Ler arquivo",
        default: true,
        // O terceiro argumento é a aplicação do diálogo em algumas versões e o
        // próprio <dialog> em outras; os dois servem como raiz de busca.
        callback: (_evento, _botao, janela) => {
          const raiz = janela?.element ?? janela ?? document;
          return {
            arquivo: raiz.querySelector('[name="arquivo"]')?.files?.[0] ?? null,
            substituir: raiz.querySelector('[name="substituir"]')?.checked === true
          };
        }
      },
      { action: "cancelar", label: "Cancelar" }
    ],
    rejectClose: false
  });

  if (!escolha || escolha === "cancelar" || !escolha.arquivo) return null;

  let dados;
  try {
    dados = JSON.parse(await escolha.arquivo.text());
  } catch (erro) {
    ui.notifications.error(`Não foi possível ler o JSON: ${erro.message}`);
    return null;
  }

  const criaturas = lerArquivo(dados);
  if (!criaturas.length) {
    ui.notifications.error(
      "O arquivo não tem nenhuma criatura reconhecível (esperava uma lista em `creatures`)."
    );
    return null;
  }

  const criatura = criaturas.length === 1 ? criaturas[0] : await escolherCriatura(criaturas);
  if (!criatura) return null;

  const mapeado = mapearInimigo(criatura);
  const confirmado = await confirmarResumo(ator, mapeado, escolha.substituir);
  if (!confirmado) return null;

  try {
    await aplicarNoAtor(ator, mapeado, { substituirItens: escolha.substituir });
  } catch (erro) {
    ui.notifications.error(`A importação falhou e a ficha não foi alterada: ${erro.message}`);
    console.error("F&M | Erro ao importar ficha de inimigo:", erro, mapeado);
    return null;
  }

  ui.notifications.info(
    `Ficha importada: ${Object.keys(mapeado.system).length} campos e ${mapeado.itens.length} ` +
      `item(ns) em "${ator.name}".`
  );
  if (mapeado.avisos.length) {
    console.warn("F&M | Avisos da importação de inimigo:", mapeado.avisos);
  }
  return mapeado;
}

/** Um arquivo pode trazer várias criaturas; o Narrador escolhe qual entra. */
async function escolherCriatura(criaturas) {
  const opcoes = criaturas
    .map((c, i) => {
      const nome = String(c?.name ?? "").trim() || `(sem nome ${i + 1})`;
      const nd = c?.core?.nd ?? "?";
      const patamar = c?.core?.patamar ?? "?";
      return `<option value="${i}">${esc(nome)} — ND ${esc(nd)} ${esc(patamar)}</option>`;
    })
    .join("");

  const indice = await dialogo().wait({
    ...opcoesDeDialogo(),
    window: { title: "Qual criatura importar?", resizable: true },
    content: comRolagem(
      `<p>O arquivo tem ${criaturas.length} criaturas.</p>
       <p><select name="indice" style="width:100%">${opcoes}</select></p>`
    ),
    buttons: [
      {
        action: "escolher",
        label: "Escolher",
        default: true,
        callback: (_e, _b, janela) => {
          const raiz = janela?.element ?? janela ?? document;
          return Number(raiz.querySelector('[name="indice"]')?.value ?? 0);
        }
      },
      { action: "cancelar", label: "Cancelar" }
    ],
    rejectClose: false
  });

  return Number.isInteger(indice) ? criaturas[indice] : null;
}

/** Mostra o que a importação vai escrever, antes de escrever. */
async function confirmarResumo(ator, mapeado, substituir) {
  const s = mapeado.system;
  const linha = (rotulo, valor) =>
    valor === undefined ? "" : `<li><b>${rotulo}:</b> ${esc(valor)}</li>`;

  const avisos = mapeado.avisos.length
    ? `<h4>Avisos</h4><ul>${mapeado.avisos.map(a => `<li>${esc(a)}</li>`).join("")}</ul>`
    : "";

  const confirmado = await dialogo().confirm({
    // Este é o diálogo comprido: o resumo cresce com o tamanho da ficha e os
    // avisos, e sem limite de altura ele empurra os botões para fora da tela.
    ...opcoesDeDialogo({ fracao: 0.5, maximo: 860 }),
    window: { title: "Confirmar importação", resizable: true },
    content: comRolagem(`
      <p>Vai ser escrito em <b>${esc(ator.name)}</b>:</p>
      <ul>
        ${linha("Nome", mapeado.nome || undefined)}
        ${linha("ND", s["detalhes.nivel"])}
        ${linha("Patamar", s["detalhes.patamar"])}
        ${linha("Grau", s["detalhes.grau"])}
        ${linha("Tamanho", s["detalhes.tamanho"])}
        ${linha("PV", s["recursos.pv.max"])}
        ${linha("PE", s["recursos.pe.max"])}
        ${linha("Defesa", s["combate.defesaManual"])}
        ${linha("CD", s["manuais.cd"])}
        ${linha("Acerto", s["manuais.acerto"])}
        <li><b>Campos no total:</b> ${Object.keys(s).length}</li>
        <li><b>Itens:</b> ${mapeado.itens.length}${
          substituir ? " (apagando os Dotes e Características atuais)" : " (somados aos atuais)"
        }</li>
      </ul>
      <p class="hint">A importação liga <b>Valores manuais</b>, porque o construtor exporta os
      totais já fechados. Desligar essa opção na ficha devolve tudo para as fórmulas do livro,
      sem perder os números importados.</p>
      ${avisos}`),
    rejectClose: false,
    modal: true
  });

  return confirmado === true;
}
