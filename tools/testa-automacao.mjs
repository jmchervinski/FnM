/**
 * Testa a automação das fichas — roda com `npm run check`.
 *
 * O check-fichas confere que os campos EXISTEM; este aqui confere que eles
 * FUNCIONAM. A diferença importa: um ajuste de item que nunca é somado, ou um
 * orçamento que compara a coisa errada, passa por qualquer verificação de
 * schema e só aparece na mesa, como um número silenciosamente torto.
 *
 * O truque é o mesmo do check-fichas: um stub das data fields do Foundry, os
 * dados padrão montados a partir do próprio schema, e então os métodos reais de
 * `prepareDerivedData` rodando em cima disso.
 */
import fs from "node:fs";
import path from "node:path";

/* Stub das data fields: guarda o tipo e as opções, que é do que os padrões
   precisam. `prepareDerivedData` vazio na base para o super() dos modelos. */
class Campo {
  constructor(tipo, a, b) {
    this.tipo = tipo;
    if (tipo === "Schema") this.fields = a;
    else if (tipo === "Array") this.element = a;
    this.options = tipo === "Schema" || tipo === "Array" ? (b ?? {}) : (a ?? {});
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
    fields: Object.fromEntries(
      ["HTMLField", "NumberField", "SchemaField", "StringField", "BooleanField", "ArrayField"].map(
        n => [n, mk(n.replace("Field", ""))]
      )
    )
  },
  abstract: { TypeDataModel: class { prepareDerivedData() {} } },
  utils: {
    expandObject: plano => {
      const raiz = {};
      for (const [caminho, valor] of Object.entries(plano)) {
        const partes = caminho.split(".");
        let no = raiz;
        while (partes.length > 1) no = no[partes.shift()] ??= {};
        no[partes[0]] = valor;
      }
      return raiz;
    }
  }
};

const ROOT = path.resolve(import.meta.dirname, "..");
const M = await import(new URL("../module/data-models.mjs", import.meta.url));
const { FNM } = await import(new URL("../module/config.mjs", import.meta.url));
const { mapearInimigo, lerArquivo } = await import(
  new URL("../module/importar-inimigo.mjs", import.meta.url)
);

let problemas = 0;
const confere = (rotulo, obtido, esperado) => {
  if (String(obtido) === String(esperado)) return;
  console.log(`ERRO  ${rotulo}: obteve ${obtido}, esperava ${esperado}`);
  problemas++;
};

/** Dados padrão de um modelo, a partir do próprio schema. */
function padroes(fields) {
  const out = {};
  for (const [chave, campo] of Object.entries(fields)) {
    if (campo.tipo === "Schema") out[chave] = padroes(campo.fields);
    else if (campo.tipo === "Array") out[chave] = [];
    else if (campo.options.initial !== undefined) out[chave] = campo.options.initial;
    else if (campo.tipo === "Number") out[chave] = campo.options.nullable ? null : 0;
    else if (campo.tipo === "Boolean") out[chave] = false;
    else out[chave] = "";
  }
  return out;
}

function fundir(alvo, fonte) {
  for (const [chave, valor] of Object.entries(fonte)) {
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      fundir((alvo[chave] ??= {}), valor);
    } else alvo[chave] = valor;
  }
  return alvo;
}

/** Monta um ator do tipo pedido, com os itens dados, e roda a derivação real. */
function prepararAtor(Modelo, ajustar = () => {}, itens = []) {
  const sys = padroes(Modelo.defineSchema());
  ajustar(sys);
  Object.setPrototypeOf(sys, Modelo.prototype);
  sys.parent = { items: itens };
  sys.prepareDerivedData();
  return sys;
}

const comAjustes = (type, ajustes) => ({
  type,
  system: { ajustes: { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0, ...ajustes } }
});

/**
 * Um NPC saudável: PV alto e alma cheia, para o Estado da Alma não injetar uma
 * penalidade global no meio do teste e mascarar o que está sendo medido.
 */
const npcBase = sys => {
  sys.detalhes.nivel = 5;
  sys.detalhes.valoresManuais = false;
  sys.recursos.pv = { value: 100, max: 100, perdidos: 0, ajuste: 0 };
  sys.recursos.pe = { value: 20, max: 20, perdidos: 0, ajuste: 0 };
  sys.recursos.integridade = { value: 100, max: 100, perdidos: 0, ajuste: 0 };
};

/* -------- 1. Ajustes de Dote e Característica chegam ao NPC -------- */

{
  const base = prepararAtor(M.NpcDataModel, npcBase);
  const com = prepararAtor(M.NpcDataModel, npcBase, [
    comAjustes("dote", { defesa: 2, pv: 10, pe: 5, deslocamento: 3, reducaoDano: 4 }),
    comAjustes("caracteristica", { defesa: 1, pv: 7, pe: 2 })
  ]);

  confere("NPC: alma continua estável no teste", com.alma.estado, "Estável");
  confere("NPC: Defesa soma o ajuste dos itens", com.combate.defesa, base.combate.defesa + 3);
  confere(
    "NPC: Deslocamento soma o ajuste dos itens",
    com.combate.deslocamentoAtual,
    base.combate.deslocamentoAtual + 3
  );
  confere(
    "NPC: RD soma o ajuste dos itens",
    com.combate.reducaoDanoTotal,
    base.combate.reducaoDanoTotal + 4
  );
  confere("NPC: PV máximo soma o ajuste dos itens", com.recursos.pv.max, base.recursos.pv.max + 17);
  confere("NPC: PE máximo soma o ajuste dos itens", com.recursos.pe.max, base.recursos.pe.max + 7);
}

/* -------- 2. As colunas PERDIDOS e ajuste do recurso valem para o NPC -------- */

{
  const npc = prepararAtor(M.NpcDataModel, sys => {
    npcBase(sys);
    sys.recursos.pv.perdidos = 30;
    sys.recursos.pv.ajuste = 5;
  });
  confere("NPC: PV máximo desconta PERDIDOS e soma o ajuste", npc.recursos.pv.max, 75);
  confere(
    "NPC: Integridade máxima acompanha o PV máximo",
    npc.recursos.integridade.max,
    npc.recursos.pv.max
  );
}

/* -------- 3. Os totais fechados substituem as fórmulas -------- */

{
  const npc = prepararAtor(M.NpcDataModel, sys => {
    npcBase(sys);
    sys.detalhes.valoresManuais = true;
    sys.combate.defesaManual = 27;
    sys.manuais.atencao = 25;
    sys.manuais.cd = 21;
    sys.manuais.resistencias.reflexos = 13;
    sys.manuais.pericias.atletismo = 16;
  });
  confere("NPC: Defesa fechada vence a fórmula", npc.combate.defesa, 27);
  confere("NPC: Atenção fechada vence a fórmula", npc.combate.atencao, 25);
  confere("NPC: CD fechada vence a fórmula", npc.cdAmaldicoada, 21);
  confere("NPC: TR fechado vence a fórmula", npc.resistencias.reflexos.total, 13);
  confere("NPC: perícia fechada vence a fórmula", npc.pericias.atletismo.total, 16);

  // Sem os valores manuais, tudo volta às fórmulas sem perder o que foi digitado
  const semManuais = prepararAtor(M.NpcDataModel, sys => {
    npcBase(sys);
    sys.detalhes.valoresManuais = false;
    sys.combate.defesaManual = 27;
    sys.manuais.atencao = 25;
  });
  confere(
    "NPC: desligar os manuais devolve a Defesa à fórmula",
    semManuais.combate.defesa,
    10 + semManuais.metadeNivel
  );

  // A penalidade de Exaustão entra por cima do total fechado
  const exausto = prepararAtor(M.NpcDataModel, sys => {
    npcBase(sys);
    sys.detalhes.valoresManuais = true;
    sys.combate.defesaManual = 27;
    sys.exaustao = 2;
  });
  confere("NPC: a Exaustão ainda pesa sobre o total fechado", exausto.combate.defesa, 25);
}

/* -------- 4. O orçamento do Patamar mede os pontos gastos -------- */

{
  // Todos os atributos em 10 é o ponto de partida: zero ponto gasto (p. 16)
  const zerado = prepararAtor(M.NpcDataModel, npcBase);
  confere("NPC: atributos na base gastam 0 pontos", zerado.orcamento.atributos.gasto, 0);

  const gastou = prepararAtor(M.NpcDataModel, sys => {
    npcBase(sys);
    sys.atributos.forca.value = 20;
    sys.atributos.destreza.value = 8;
  });
  confere(
    "NPC: baixar um atributo devolve pontos ao orçamento",
    gastou.orcamento.atributos.gasto,
    8
  );
}

/* -------- 5. A ficha importada bate com o arquivo, depois de derivada -------- */

{
  const dados = path.join(ROOT, "tools/dados");
  for (const arq of fs.readdirSync(dados).filter(f => /^exemplo-inimigo.*\.json$/.test(f))) {
    const criatura = lerArquivo(JSON.parse(fs.readFileSync(path.join(dados, arq), "utf8")))[0];
    const mapeado = mapearInimigo(criatura);

    const npc = prepararAtor(
      M.NpcDataModel,
      sys => fundir(sys, foundry.utils.expandObject(mapeado.system)),
      mapeado.itens.map(i => ({ type: i.type, system: i.system }))
    );

    const st = criatura.stats;
    const rot = t => `${arq}: ${t}`;
    confere(rot("PV máximo"), npc.recursos.pv.max, st.hpMax);
    confere(rot("PE máximo"), npc.recursos.pe.max, st.peMax);
    confere(rot("Defesa"), npc.combate.defesa, st.defesa);
    confere(rot("Atenção"), npc.combate.atencao, st.atencao);
    confere(rot("Iniciativa"), npc.combate.iniciativa, st.iniciativa);
    confere(rot("CD"), npc.cdAmaldicoada, st.cdBase);
    confere(rot("Acerto"), npc.ataqueAmaldicoado, st.acerto);

    // A alma cheia é o que impede a criatura de nascer com -8 em tudo
    confere(rot("Estado da Alma"), npc.alma.estado, "Estável");
    confere(rot("penalidade global"), npc.penalidadeGlobal, 0);

    for (const [id, cfg] of Object.entries(FNM.resistencias)) {
      if (criatura.saves?.[id] !== undefined) {
        confere(rot(`TR ${cfg.nome}`), npc.resistencias[id].total, criatura.saves[id]);
      }
    }
    for (const s of criatura.skills ?? []) {
      const par = Object.entries(FNM.pericias).find(([, c]) => c.nome === s.name);
      if (par) confere(rot(`Perícia ${s.name}`), npc.pericias[par[0]].total, s.mod);
    }
  }
}

/* -------- 6. Quem faz o Teste de Resistência é o alvo, não quem conjurou -------- */

{
  // O mundo de mentira: dois atores e o que cada um representa no cenário
  const ator = (id, nome, meu) => ({ id, name: nome, isOwner: meu });
  const conjurador = ator("caster", "Criatura teste", true);
  const vitima = ator("alvo", "Yuji", true);
  const alheio = ator("outro", "Megumi", false);

  const tokens = {
    "Scene.x.Token.alvo": { actor: vitima },
    "Scene.x.Token.alheio": { actor: alheio }
  };

  const avisos = [];
  globalThis.fromUuidSync = uuid => tokens[uuid];
  globalThis.ui = { notifications: { warn: m => avisos.push(m), info: m => avisos.push(m) } };
  globalThis.game = { user: { targets: new Set() } };
  globalThis.canvas = { tokens: { controlled: [] } };

  const { alvosDaCarta } = await import(new URL("../module/chat.mjs", import.meta.url));
  const nomes = lista => lista.map(a => a.name).join(",");

  // O caso que quebrou: a carta guardou a vítima, mas quem clicou estava com o
  // próprio conjurador selecionado. Vale o que a carta guardou.
  globalThis.canvas.tokens.controlled = [{ actor: conjurador }];
  confere(
    "TR: o alvo guardado na carta vence a seleção atual",
    nomes(alvosDaCarta({ alvos: ["Scene.x.Token.alvo"], atorId: "caster" }, "testar")),
    "Yuji"
  );

  // Sem alvo guardado, o conjurador selecionado não vira alvo de si mesmo
  avisos.length = 0;
  confere(
    "TR: sem alvo guardado, o conjurador não testa contra o próprio efeito",
    nomes(alvosDaCarta({ alvos: [], atorId: "caster" }, "testar")),
    ""
  );
  confere("TR: e avisa que a carta não guardou alvos", avisos.length, 1);

  // Um alvo que o usuário não controla não rola: o dono é que clica
  avisos.length = 0;
  confere(
    "TR: alvo de outro jogador não rola por quem clicou",
    nomes(alvosDaCarta({ alvos: ["Scene.x.Token.alheio"], atorId: "caster" }, "testar")),
    ""
  );
  confere("TR: e o aviso diz de quem é o alvo", /Megumi/.test(avisos[0] ?? "") ? "sim" : "não", "sim");

  // Vários alvos, dos quais só um é meu
  avisos.length = 0;
  confere(
    "TR: rola só para os alvos que você controla",
    nomes(alvosDaCarta(
      { alvos: ["Scene.x.Token.alvo", "Scene.x.Token.alheio"], atorId: "caster" },
      "testar"
    )),
    "Yuji"
  );
}

/* -------- 7. O diálogo cabe na tela de quem está jogando -------- */

{
  const { tamanhoDeDialogo } = await import(new URL("../module/dialogos.mjs", import.meta.url));

  // Da janela espremida ao 4K. O que não pode acontecer é o diálogo nascer mais
  // largo que a tela: aí a moldura sai da área visível e os botões do rodapé
  // ficam inalcançáveis, que é o defeito que isto conserta.
  const larguras = [400, 800, 1024, 1280, 1366, 1600, 1920, 2560, 3840];
  const medidas = [
    { rotulo: "confirmação da importação", opcoes: { fracao: 0.5, maximo: 860 } },
    { rotulo: "diálogo de ataque", opcoes: { fracao: 0.34, minimo: 400, maximo: 520 } }
  ];

  const largacoOriginal = globalThis.innerWidth;
  for (const { rotulo, opcoes } of medidas) {
    for (const tela of larguras) {
      globalThis.innerWidth = tela;
      const { width } = tamanhoDeDialogo(opcoes);
      const teto = Math.max(280, tela - 40);
      if (width > teto) {
        confere(`${rotulo} em ${tela}px: cabe na tela`, `${width}px`, `até ${teto}px`);
      }
    }
  }
  globalThis.innerWidth = largacoOriginal;

  // Sem janela (fora do navegador) ainda sai um número utilizável
  delete globalThis.innerWidth;
  confere(
    "diálogo sem window: cai num padrão utilizável",
    Number.isFinite(tamanhoDeDialogo().width),
    true
  );
  globalThis.innerWidth = largacoOriginal;
}

if (problemas) {
  console.log(`\n${problemas} problema(s) de automação encontrado(s).`);
  process.exit(1);
}
console.log("OK    Automação das fichas: ajustes, totais fechados e orçamento conferem.");
