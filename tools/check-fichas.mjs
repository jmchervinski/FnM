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

let problemas = 0;
const falha = msg => {
  console.log(`❌ ${msg}`);
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

/* -------- 2. Nenhum name= repetido dentro da mesma ficha -------- */
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
    ? "✅ Fichas consistentes: todos os campos existem no schema e nenhum está duplicado."
    : `\n${problemas} problema(s) encontrado(s).`
);
process.exit(problemas ? 1 : 0);
