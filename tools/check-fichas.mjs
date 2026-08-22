/**
 * Verificação estática das fichas — roda com `npm run check`.
 *
 * Todas as PARTS de uma ApplicationV2 são renderizadas dentro do MESMO <form>,
 * e o Foundry valida o submit inteiro de uma vez. Basta um campo inválido para
 * ele descartar TODAS as alterações, e a ficha passa a "não aceitar nada" sem
 * nenhum erro visível. Este script pega as duas causas desse sintoma:
 *
 *   1. um name= que não existe no schema do DataModel;
 *   2. o mesmo name= repetido em duas partes (o FormDataExtended devolve um
 *      array em vez de um escalar e a validação reprova).
 */
import fs from "node:fs";
import path from "node:path";

/* Stub das data fields: só precisamos da estrutura que defineSchema() monta. */
class Campo {
  constructor(tipo, a, b) {
    this.tipo = tipo;
    if (tipo === "Schema") this.fields = a;
    else if (tipo === "Array") this.element = a;
    this.options = tipo === "Schema" || tipo === "Array" ? b ?? {} : a ?? {};
  }
}
const mk = tipo =>
  class extends Campo {
    constructor(a, b) {
      super(tipo, a, b);
    }
  };

globalThis.foundry = {
  data: {
    fields: {
      HTMLField: mk("HTML"),
      NumberField: mk("Number"),
      SchemaField: mk("Schema"),
      StringField: mk("String"),
      BooleanField: mk("Boolean"),
      ArrayField: mk("Array")
    }
  },
  abstract: { TypeDataModel: class {} }
};

const ROOT = path.resolve(import.meta.dirname, "..");
const PARTS = path.join(ROOT, "templates/actors/parts");
const M = await import(new URL("../module/data-models.mjs", import.meta.url));

/** Achata um schema em caminhos de folha (arrays viram `campo.*.sub`). */
function caminhos(fields, prefixo = "", saida = new Set()) {
  for (const [chave, campo] of Object.entries(fields)) {
    const p = prefixo ? `${prefixo}.${chave}` : chave;
    if (campo.tipo === "Schema") caminhos(campo.fields, p, saida);
    else if (campo.tipo === "Array") {
      saida.add(p);
      if (campo.element?.tipo === "Schema") caminhos(campo.element.fields, `${p}.*`, saida);
    } else saida.add(p);
  }
  return saida;
}

const MODELOS = {
  character: M.CharacterDataModel,
  npc: M.NpcDataModel,
  invocacao: M.InvocacaoDataModel,
  origem: M.OrigemDataModel,
  especializacao: M.EspecializacaoDataModel,
  habilidade: M.HabilidadeDataModel,
  talento: M.TalentoDataModel,
  aptidao: M.AptidaoDataModel,
  dote: M.DoteDataModel,
  caracteristica: M.CaracteristicaDataModel,
  tecnica: M.TecnicaDataModel,
  feitico: M.FeiticoDataModel,
  arma: M.ArmaDataModel,
  equipamento: M.EquipamentoDataModel,
  voto: M.VotoDataModel,
  acaoInvocacao: M.AcaoInvocacaoDataModel,
  tecnicaMarcial: M.TecnicaMarcialDataModel
};

const esquemas = Object.fromEntries(
  Object.entries(MODELOS).map(([nome, cls]) => [nome, caminhos(cls.defineSchema())])
);

/** Quais tipos de documento cada template pode representar. */
const USO = {
  "character-header.html": ["character"],
  "character-principal.html": ["character"],
  "character-pericias.html": ["character", "npc", "invocacao"],
  "character-jujutsu.html": ["character"],
  "character-feiticos.html": ["character"],
  "character-restringido.html": ["character"],
  "character-registro.html": ["character"],
  "character-progressao.html": ["character"],
  "character-treinamentos.html": ["character"],
  "linha-uso.html": ["character", "npc", "invocacao"],
  "actor-atributos.html": ["character", "npc", "invocacao"],
  "actor-recursos.html": ["character", "npc", "invocacao"],
  "actor-itens.html": ["character", "npc", "invocacao"],
  "actor-footer.html": ["character", "npc", "invocacao"],
  "npc-header.html": ["npc"],
  "npc-principal.html": ["npc"],
  "npc-acoes.html": ["npc"],
  "npc-habilidades.html": ["npc", "invocacao"],
  "npc-biografia.html": ["npc", "invocacao"],
  "invocacao-header.html": ["invocacao"],
  "invocacao-principal.html": ["invocacao"],
  "invocacao-acoes.html": ["invocacao"],
  "item-sheet.html": Object.keys(MODELOS).filter(
    k => !["character", "npc", "invocacao"].includes(k)
  )
};

/** Composição de cada ficha: partes declaradas em PARTS + parciais incluídos. */
const FICHAS = {
  Personagem: [
    "character-header", "character-principal", "character-pericias", "character-jujutsu",
    "character-feiticos", "character-restringido", "character-registro", "character-progressao",
    "character-treinamentos", "actor-footer"
  ],
  NPC: [
    "npc-header", "npc-principal", "character-pericias", "npc-acoes",
    "npc-habilidades", "npc-biografia", "actor-footer"
  ],
  "Invocação": [
    "invocacao-header", "invocacao-principal", "character-pericias", "invocacao-acoes",
    "npc-biografia", "actor-footer"
  ]
};
const PARCIAIS = {
  "character-principal": ["actor-atributos", "actor-recursos", "linha-uso"],
  "character-jujutsu": ["linha-uso"],
  "character-progressao": ["actor-itens"],
  "invocacao-principal": ["actor-atributos", "actor-recursos"],
  "npc-principal": ["actor-atributos", "actor-recursos"],
  "npc-habilidades": ["actor-itens"]
};

/** Extrai os name= e target= de um template. */
function camposDe(arquivo) {
  const txt = fs.readFileSync(arquivo, "utf8");
  // Ignora comentários {{!-- --}} para não casar com exemplos no texto
  const limpo = txt.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  return [...limpo.matchAll(/(?:name|target)="system\.([^"]+)"/g)].map(m => m[1]);
}

/**
 * Ícones permitidos — todos existem no Font Awesome 6 Free Solid, que é o que o
 * Foundry distribui. Um nome fora desta lista (ou exclusivo do FA Pro) aparece
 * como quadrado vazio na ficha. Ao usar um ícone novo, confirme que ele é free
 * e acrescente-o aqui.
 */
const ICONES_PERMITIDOS = new Set([
  "arrow-up", "asterisk", "bed", "bolt", "clock", "comment", "crosshairs",
  "dice-d20", "edit", "file-import", "fire", "ghost", "hand-fist", "heart",
  "lock", "minus", "plus", "power-off", "shield-alt", "skull", "suitcase",
  "trash"
]);
/**
 * Prefixos de estilo do Font Awesome, que não são nomes de ícone.
 *
 * Os templates usam a forma curta (`fas`), e não `fa-solid`: `fas` existe no
 * Font Awesome 5 e no 6, enquanto `fa-solid` só existe do 6 em diante. Como o
 * Foundry troca a versão do Font Awesome entre releases, a forma curta é a que
 * renderiza em mais versões.
 */
const ESTILOS_FA = new Set(["solid", "regular", "brands", "light", "thin", "duotone", "sharp"]);

let problemas = 0;
const falha = msg => {
  console.log(`ERRO  ${msg}`);
  problemas++;
};

/* -------- 1. Todo name= existe no schema do documento -------- */
const arquivos = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) arquivos.push(p);
  }
};
walk(path.join(ROOT, "templates"));

/**
 * As cartas de chat e o diálogo de ataque não editam um documento: os campos
 * deles são escolhas da rolagem, lidas do formulário e descartadas depois. Só
 * as fichas precisam casar com um schema, então a verificação de `name=` pula
 * templates/chat — as demais (ícones, emoji) continuam valendo para eles.
 */
const ehTemplateDeChat = arq => path.relative(ROOT, arq).replace(/\\/g, "/").startsWith("templates/chat/");

for (const arq of arquivos) {
  if (ehTemplateDeChat(arq)) continue;
  const base = path.basename(arq);
  const tipos = USO[base];
  if (!tipos) {
    falha(`${base}: template sem mapeamento em USO — adicione-o a tools/check-fichas.mjs`);
    continue;
  }
  for (const nome of new Set(camposDe(arq))) {
    // Interpolações do Handlebars e índices viram curingas de um segmento
    const alvo = nome.replace(/\{\{[^}]+\}\}/g, "*").replace(/\.\d+\./g, ".*.");
    const re = new RegExp(
      "^" +
        alvo
          .split(".")
          .map(s => (s === "*" ? "[^.]+" : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
          .join("\\.") +
        "$"
    );
    const casa = esq => [...esq].some(k => re.test(k));
    if (!tipos.some(t => esquemas[t] && casa(esquemas[t]))) {
      const onde = Object.entries(esquemas).filter(([, s]) => casa(s)).map(([k]) => k);
      falha(
        `${base}: name="system.${nome}" não existe no schema de ${tipos.join("/")}` +
          (onde.length ? ` (existe em: ${onde.join(", ")})` : "")
      );
    }
  }
}

/* -------- 2. Todo ícone existe no Font Awesome 6 Free -------- */
for (const arq of arquivos) {
  const txt = fs.readFileSync(arq, "utf8");
  for (const m of txt.matchAll(/\bfa-([a-z0-9-]+)/g)) {
    const nome = m[1];
    if (ESTILOS_FA.has(nome) || ICONES_PERMITIDOS.has(nome)) continue;
    falha(
      `${path.basename(arq)}: ícone "fa-${nome}" não está na lista de ícones ` +
        `permitidos (Font Awesome 6 Free) — renderiza como quadrado vazio`
    );
  }
}

/* -------- 3. Caminhos de ícone do Foundry existem de fato -------- */

/**
 * Ícones `icons/svg/*.svg` são servidos pelo próprio Foundry. Um caminho que não
 * existe na instalação vira imagem quebrada — um quadrado vazio na ficha, no
 * compêndio ou na paleta de condições do token.
 *
 * A verificação só roda se houver uma instalação do Foundry para conferir;
 * aponte FOUNDRY_PATH para a pasta que contém `public/icons`.
 */
const CANDIDATOS_FOUNDRY = [
  process.env.FOUNDRY_PATH,
  "D:/Foundry/v13/code",
  "C:/Program Files/Foundry Virtual Tabletop/resources/app"
].filter(Boolean);

const raizFoundry = CANDIDATOS_FOUNDRY.find(p =>
  fs.existsSync(path.join(p, "public/icons/svg"))
);

if (raizFoundry) {
  const fontes = [];
  const walkFontes = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (["node_modules", ".git", "packs", "packs-src"].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkFontes(p);
      else if (/\.(mjs|html|json)$/.test(e.name)) fontes.push(p);
    }
  };
  walkFontes(ROOT);

  const vistos = new Set();
  for (const arq of fontes) {
    for (const m of fs.readFileSync(arq, "utf8").matchAll(/icons\/[a-z0-9/_-]+\.(?:svg|webp|png|jpg)/g)) {
      const rel = m[0];
      if (vistos.has(rel)) continue;
      vistos.add(rel);
      if (!fs.existsSync(path.join(raizFoundry, "public", rel))) {
        falha(
          `${path.relative(ROOT, arq).replace(/\\/g, "/")}: "${rel}" não existe no ` +
            `Foundry — renderiza como imagem quebrada`
        );
      }
    }
  }
  console.log(`      (${vistos.size} caminhos de ícone conferidos contra ${raizFoundry})`);
} else {
  console.log("      (Foundry não encontrado: caminhos de ícone não conferidos)");
}

/* -------- 3.4. Todo template compila como Handlebars -------- */

/**
 * Um `{{#if}}` sem fechamento não quebra nada até a ficha ser aberta, e aí a
 * aba inteira some sem erro visível. O Handlebars que o Foundry distribui
 * compila os templates aqui, antes disso.
 */
if (raizFoundry) {
  const hbs = path.join(raizFoundry, "node_modules/handlebars/lib/index.js");
  if (fs.existsSync(hbs)) {
    const { default: Handlebars } = await import(`file://${hbs.replace(/\\/g, "/")}`);
    let compilados = 0;
    for (const arq of arquivos) {
      try {
        Handlebars.precompile(fs.readFileSync(arq, "utf8"));
        compilados++;
      } catch (erro) {
        falha(
          `${path.relative(ROOT, arq).replace(/\\/g, "/")}: não compila como Handlebars — ` +
            String(erro.message).split("\n")[0]
        );
      }
    }
    console.log(`      (${compilados} template(s) compilados como Handlebars)`);
  }
}

/* -------- 3.5. A importação de inimigo escreve só onde existe campo -------- */

/**
 * `mapearInimigo` devolve caminhos achatados (`"detalhes.nivel"`) que vão
 * direto para `Actor#update`. Um caminho que não existe no schema é descartado
 * em silêncio pelo Foundry: a importação "funciona" e o campo some. Aqui o
 * mapeador roda contra um arquivo de exemplo e todo caminho produzido é
 * conferido contra o schema do NPC.
 */
{
  const { mapearInimigo, lerArquivo } = await import(
    new URL("../module/importar-inimigo.mjs", import.meta.url)
  );

  const dados = path.join(ROOT, "tools/dados");
  const exemplos = fs.readdirSync(dados).filter(f => /^exemplo-inimigo.*\.json$/.test(f));
  if (!exemplos.length) falha("tools/dados: nenhum exemplo-inimigo*.json para conferir");

  const criaturas = exemplos.flatMap(arq => {
    const lidas = lerArquivo(JSON.parse(fs.readFileSync(path.join(dados, arq), "utf8")));
    if (!lidas.length) falha(`tools/dados/${arq}: nenhuma criatura reconhecida`);
    return lidas;
  });

  const doNpc = esquemas.npc;
  for (const criatura of criaturas) {
    const { system, itens } = mapearInimigo(criatura);

    for (const caminho of Object.keys(system)) {
      // Índices de array viram `*` no schema achatado
      const normalizado = caminho.replace(/\.\d+(?=\.|$)/g, ".*");
      if (!doNpc.has(normalizado)) {
        falha(`importar-inimigo.mjs: "${caminho}" não existe no schema de NPC`);
      }
    }

    for (const item of itens) {
      const doItem = esquemas[item.type];
      if (!doItem) {
        falha(`importar-inimigo.mjs: item de tipo desconhecido "${item.type}"`);
        continue;
      }
      for (const campo of Object.keys(item.system)) {
        // O item passa objetos inteiros (`ajustes`), e o schema achatado só tem
        // as folhas deles — um prefixo conhecido conta como campo existente.
        const existe =
          doItem.has(campo) || [...doItem].some(p => p.startsWith(`${campo}.`));
        if (!existe) {
          falha(`importar-inimigo.mjs: "${campo}" não existe no schema de ${item.type}`);
        }
      }
    }
  }
  console.log(
    `      (importação conferida com ${criaturas.length} criatura(s) em ` +
      `${exemplos.length} arquivo(s) de exemplo)`
  );
}

/* -------- 3.6. Todo template citado no código existe de fato -------- */

/**
 * Um caminho de template errado — ou um template novo que ninguém referenciou —
 * só aparece em runtime, na hora em que a carta ou a aba tenta renderizar. Aqui
 * os dois lados são conferidos contra o disco.
 */
{
  const fontes = [];
  const walkMjs = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkMjs(p);
      else if (e.name.endsWith(".mjs")) fontes.push(p);
    }
  };
  walkMjs(path.join(ROOT, "module"));

  const citados = new Set();
  for (const arq of fontes) {
    for (const m of fs.readFileSync(arq, "utf8").matchAll(/systems\/fnm\/(templates\/[\w/-]+\.html)/g)) {
      citados.add(m[1]);
      if (!fs.existsSync(path.join(ROOT, m[1]))) {
        falha(`${path.basename(arq)}: template "${m[1]}" não existe`);
      }
    }
  }

  // Uma carta de chat renderiza fora do ciclo da ficha; sem estar no preload,
  // ela depende de o Foundry buscar o template na hora.
  const preload = fs.readFileSync(path.join(ROOT, "module/fnm.mjs"), "utf8");
  for (const arq of fs.readdirSync(path.join(ROOT, "templates/chat"))) {
    const rel = `templates/chat/${arq}`;
    if (!preload.includes(`systems/fnm/${rel}`)) {
      falha(`fnm.mjs: "${rel}" não está na lista de templates pré-carregados`);
    }
  }
  console.log(`      (${citados.size} template(s) citados no código conferidos)`);
}

/* -------- 4. O CSS não vaza para a moldura da janela -------- */

/**
 * A classe do sistema (`.fnm-sheet`) fica na RAIZ da aplicação, que inclui a
 * barra de título. No Foundry v13 os controles da janela são
 * `<button class="header-control icon fa-solid fa-xmark">`, com as classes do
 * ícone no próprio botão — então um seletor como `.fnm-sheet button` tem
 * especificidade maior que `.fa-solid` e sobrescreve o font-family dele,
 * transformando fechar/minimizar em quadrados de glifo ausente.
 *
 * Seletores de elemento precisam ser ancorados em `.window-content`.
 */
const CSS = fs.readFileSync(path.join(ROOT, "styles/fnm.css"), "utf8");
const ELEMENTOS_DE_MOLDURA = /(^|,)\s*\.fnm-[a-z]+\s+(button|input|select|textarea|a|i|img|h1)\b/gm;

for (const m of CSS.matchAll(ELEMENTOS_DE_MOLDURA)) {
  const trecho = m[0].trim().replace(/^,\s*/, "");
  falha(
    `styles/fnm.css: "${trecho}" atinge a moldura da janela — ` +
      `ancore em .window-content (ex.: .fnm-sheet .window-content ${m[2]})`
  );
}

/* -------- 5. Nenhum emoji no código, nos templates ou no CSS -------- */

/**
 * O sistema não usa emoji: ícones vêm do Font Awesome e ênfase vem de <b>.
 * Emoji dependem da fonte do sistema operacional e viram quadrado vazio quando
 * a pilha de fontes não tem um fallback colorido.
 *
 * Pontuação tipográfica e sinais matemáticos são texto, não emoji.
 */
const PONTUACAO_OK = new Set(
  [
    0x2010, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
    0x2026, 0x2032, 0x2033, 0x2039, 0x203a, 0x2044, 0x2192, 0x2212, 0x2264,
    0x2265, 0x00ab, 0x00bb, 0x00a9, 0x00ae, 0x2122
  ]
);
const EXT_CODIGO = [".mjs", ".html", ".css", ".json"];

const arquivosCodigo = [];
const walkCodigo = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", "packs", "packs-src"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkCodigo(p);
    else if (EXT_CODIGO.some(x => e.name.endsWith(x))) arquivosCodigo.push(p);
  }
};
walkCodigo(ROOT);

for (const arq of arquivosCodigo) {
  const linhas = fs.readFileSync(arq, "utf8").split("\n");
  linhas.forEach((linha, i) => {
    for (const ch of linha) {
      const cp = ch.codePointAt(0);
      if (cp < 0x2000 || PONTUACAO_OK.has(cp)) continue;
      falha(
        `${path.relative(ROOT, arq).replace(/\\/g, "/")}:${i + 1}: ` +
          `caractere U+${cp.toString(16).toUpperCase().padStart(4, "0")} — ` +
          `o sistema não usa emoji (use Font Awesome ou <b>)`
      );
      return;
    }
  });
}

/* -------- 6. Nenhum name= repetido dentro da mesma ficha -------- */
for (const [ficha, partes] of Object.entries(FICHAS)) {
  const todas = partes.flatMap(p => [p, ...(PARCIAIS[p] ?? [])]);
  const vistos = new Map();
  for (const parte of new Set(todas)) {
    const arq = path.join(PARTS, `${parte}.html`);
    if (!fs.existsSync(arq)) {
      falha(`Ficha de ${ficha}: parte declarada mas inexistente — ${parte}.html`);
      continue;
    }
    for (const nome of camposDe(arq)) {
      (vistos.get(nome) ?? vistos.set(nome, []).get(nome)).push(parte);
    }
  }
  for (const [nome, arqs] of vistos) {
    if (arqs.length > 1) {
      falha(
        `Ficha de ${ficha}: name="system.${nome}" aparece ${arqs.length}x ` +
          `(${arqs.join(", ")}) — o submit inteiro será rejeitado`
      );
    }
  }
}

/* -------- 7. Os itens dos compêndios cabem no schema do seu tipo -------- */

/**
 * Um campo fora do schema não quebra o build: o Foundry simplesmente descarta o
 * valor ao carregar o compêndio, e o item aparece com o padrão em vez do que
 * está na tabela do livro. Como os packs são gerados por código, um nome errado
 * some em silêncio nos 500+ itens — daí conferir aqui.
 */
const { PACKS } = await import(new URL("./pack-data.mjs", import.meta.url));

/** Achata o `system` de um item nos mesmos caminhos de folha do schema. */
function folhas(valor, prefixo = "", saida = []) {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    for (const [k, v] of Object.entries(valor)) {
      folhas(v, prefixo ? `${prefixo}.${k}` : k, saida);
    }
  } else if (prefixo) saida.push(prefixo);
  return saida;
}

for (const [pack, dados] of Object.entries(PACKS)) {
  const pastas = new Set((dados.folders ?? []).map(f => f._id));
  for (const f of dados.folders ?? []) {
    if (f.folder && !pastas.has(f.folder)) {
      falha(`${pack}: pasta "${f.name}" aponta para uma pasta-mãe inexistente`);
    }
  }
  for (const item of dados.items) {
    const esquema = esquemas[item.type];
    if (!esquema) {
      falha(`${pack}: item "${item.name}" tem tipo desconhecido "${item.type}"`);
      continue;
    }
    if (item.folder && !pastas.has(item.folder)) {
      falha(`${pack}: item "${item.name}" aponta para uma pasta inexistente`);
    }
    for (const campo of folhas(item.system)) {
      // Um HTMLField é folha, mesmo quando o valor traz objetos aninhados
      if (esquema.has(campo) || [...esquema].some(k => campo.startsWith(`${k}.`))) continue;
      falha(`${pack}: item "${item.name}" tem system.${campo} fora do schema de ${item.type}`);
    }
  }
}

console.log(
  problemas === 0
    ? "OK    Fichas e compêndios consistentes: todos os campos existem no schema."
    : `\n${problemas} problema(s) encontrado(s).`
);
process.exit(problemas ? 1 : 0);
