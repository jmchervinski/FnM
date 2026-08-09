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
  tecnica: M.TecnicaDataModel,
  feitico: M.FeiticoDataModel,
  arma: M.ArmaDataModel,
  equipamento: M.EquipamentoDataModel,
  voto: M.VotoDataModel
};

const esquemas = Object.fromEntries(
  Object.entries(MODELOS).map(([nome, cls]) => [nome, caminhos(cls.defineSchema())])
);

/** Quais tipos de documento cada template pode representar. */
const USO = {
  "character-header.html": ["character"],
  "character-principal.html": ["character"],
  "character-pericias.html": ["character", "npc"],
  "character-jujutsu.html": ["character"],
  "character-feiticos.html": ["character"],
  "character-registro.html": ["character"],
  "character-progressao.html": ["character"],
  "character-treinamentos.html": ["character"],
  "linha-uso.html": ["character", "npc", "invocacao"],
  "actor-atributos.html": ["character", "npc", "invocacao"],
  "actor-recursos.html": ["character", "npc", "invocacao"],
  "actor-itens.html": ["character", "npc", "invocacao"],
  "actor-footer.html": ["character", "npc", "invocacao"],
  "npc-header.html": ["npc"],
  "npc-principal.html": ["npc", "invocacao"],
  "npc-habilidades.html": ["npc", "invocacao"],
  "npc-biografia.html": ["npc", "invocacao"],
  "invocacao-header.html": ["invocacao"],
  "item-sheet.html": Object.keys(MODELOS).filter(
    k => !["character", "npc", "invocacao"].includes(k)
  )
};

/** Composição de cada ficha: partes declaradas em PARTS + parciais incluídos. */
const FICHAS = {
  Personagem: [
    "character-header", "character-principal", "character-pericias", "character-jujutsu",
    "character-feiticos", "character-registro", "character-progressao",
    "character-treinamentos", "actor-footer"
  ],
  NPC: [
    "npc-header", "npc-principal", "character-pericias", "npc-habilidades",
    "npc-biografia", "actor-footer"
  ],
  "Invocação": [
    "invocacao-header", "npc-principal", "npc-habilidades", "npc-biografia", "actor-footer"
  ]
};
const PARCIAIS = {
  "character-principal": ["actor-atributos", "actor-recursos", "linha-uso"],
  "character-jujutsu": ["linha-uso"],
  "character-progressao": ["actor-itens"],
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
  "dice-d20", "edit", "fire", "ghost", "hand-fist", "heart", "lock", "minus",
  "plus", "power-off", "shield-alt", "skull", "suitcase", "trash"
]);
/** Prefixos de estilo do Font Awesome, que não são nomes de ícone. */
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

for (const arq of arquivos) {
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

/* -------- 3. Nenhum emoji no código, nos templates ou no CSS -------- */

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

/* -------- 4. Nenhum name= repetido dentro da mesma ficha -------- */
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

console.log(
  problemas === 0
    ? "OK    Fichas consistentes: todos os campos existem no schema e nenhum está duplicado."
    : `\n${problemas} problema(s) encontrado(s).`
);
process.exit(problemas ? 1 : 0);
