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

/* -------- 7. A Invocação resolve as próprias Ações -------- */

{
  // Uma Invocação de Segundo Grau de um invocador de nível 9: BT +3, metade
  // do nível 4. É o degrau em que a Constituição passa a contar inteira.
  const invocacaoBase = sys => {
    sys.detalhes.grau = "Segundo";
    sys.detalhes.ataqueTreinado = "corpoACorpo";
    sys.atributos.forca.value = 18;
    sys.atributos.destreza.value = 14;
    sys.atributos.constituicao.value = 16;
    sys.recursos.integridade.value = 999;
  };

  // Uma Invocação não tem nível próprio: nível e Bônus de Treinamento saem do
  // invocador (p. 261). O mundo de mentira precisa de um, senão tudo cai no
  // nível 1 e o teste mediria a fórmula errada.
  globalThis.game.actors = { get: id => (id === "gojo" ? { system: { nivel: 9 } } : null) };
  const comInvocador = sys => {
    invocacaoBase(sys);
    sys.detalhes.invocador = "gojo";
  };

  /* A escolha da criação chega às linhas de ataque */
  {
    const inv = prepararAtor(M.InvocacaoDataModel, invocacaoBase);
    confere(
      "Invocação: a jogada treinada soma o Bônus de Treinamento",
      inv.ataques.corpoACorpo.treinado,
      true
    );
    confere(
      "Invocação: a jogada não treinada não soma",
      inv.ataques.distancia.treinado,
      false
    );
    // Força 18 (+4) + metade do nível + BT contra Destreza 14 (+2) + metade do nível
    confere(
      "Invocação: o treino vale exatamente o Bônus de Treinamento",
      inv.ataques.corpoACorpo.total - inv.ataques.distancia.total,
      4 - 2 + inv.bonusTreinamentoUsuario
    );

    const semTreino = prepararAtor(M.InvocacaoDataModel, sys => {
      invocacaoBase(sys);
      sys.detalhes.ataqueTreinado = "";
    });
    confere(
      "Invocação: sem jogada treinada nenhuma linha soma o BT",
      semTreino.ataques.corpoACorpo.treinado,
      false
    );
  }

  /* A Ação declara sozinha o que a automação pode fazer com ela */
  {
    const ataque = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.resolucao = "ataque";
      sys.dano = "2d12";
      sys.categoria = "Ataque";
      sys.tipo = "Ação Complexa";
    });
    confere("Ação: resolução por ataque é reconhecida", ataque.ehAtaque, true);
    confere("Ação: com dado de dano ela é rolável", ataque.rolavel, true);
    confere("Ação: sem limite de usos ela é ilimitada", ataque.ilimitada, true);
    confere("Ação: ilimitada nunca fica sem usos", ataque.semUsos, false);

    const tr = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.resolucao = "resistencia";
      sys.resistencia = "reflexos";
      sys.dano = "1d12 + 1d6";
    });
    confere("Ação: resolução por TR é reconhecida", tr.ehResistencia, true);
    confere("Ação: um TR não vira jogada de ataque", tr.ehAtaque, false);

    const auxilio = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.categoria = "Auxílio";
      sys.cura = "1d12";
    });
    confere("Ação: a cura sozinha já torna a ação rolável", auxilio.rolavel, true);
    confere("Ação: cura não é dano", auxilio.temDano, false);

    const texto = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.tipo = "Característica";
    });
    confere("Ação: uma Característica sem números não é rolável", texto.rolavel, false);

    // Uma Característica é passiva: nem com dado de dano ela vira uma ação a
    // ser usada — o dado continua rolável à parte
    const passivaComDado = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.tipo = "Característica";
      sys.dano = "1d6";
    });
    confere("Ação: Característica com dano continua passiva", passivaComDado.rolavel, false);
    confere("Ação: mas o dado dela continua rolável", passivaComDado.temDano, true);

    const esgotada = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.dano = "1d8";
      sys.usos = { value: 0, max: 3 };
    });
    confere("Ação: usos zerados travam o uso", esgotada.semUsos, true);

    // O travessão é como a ficha escreve "não tem": não pode virar fórmula
    const semDado = prepararAtor(M.AcaoInvocacaoDataModel, sys => {
      sys.dano = "—";
      sys.cura = "—";
    });
    confere("Ação: um travessão não é dado de dano", semDado.temDano, false);
    confere("Ação: nem dado de cura", semDado.temCura, false);
  }

  /* O perfil que vai para o diálogo de ataque e para a carta */
  {
    globalThis.Actor = class {};
    globalThis.Roll = class {};
    const { FnmActor } = await import(new URL("../module/documents/actor.mjs", import.meta.url));

    const perfilDe = (ajustarInvocacao, sysAcao) => {
      const sys = prepararAtor(M.InvocacaoDataModel, ajustarInvocacao);
      const item = prepararAtor(M.AcaoInvocacaoDataModel, a => fundir(a, sysAcao));
      return FnmActor.prototype._perfilAcaoInvocacao.call({ system: sys }, {
        name: "Golpe",
        img: "",
        system: item
      });
    };

    const corpo = perfilDe(invocacaoBase, { linhaAtaque: "corpoACorpo", dano: "2d12" });
    confere("Perfil: corpo a corpo usa Força", corpo.atributos[0], "forca");
    confere("Perfil: a linha treinada entra como treinada", corpo.treinado, true);
    confere("Perfil: o dano da ação é o da rolagem", corpo.dano, "2d12");
    confere("Perfil: o modificador entra no dano", corpo.somaAtributoNoDano, true);

    const distante = perfilDe(invocacaoBase, { linhaAtaque: "distancia", dano: "1d10" });
    confere("Perfil: a distância usa Destreza", distante.atributos[0], "destreza");
    confere("Perfil: a linha não treinada sai sem treino", distante.treinado, false);

    // Só o Grau Especial dobra o modificador no dano e na cura (p. 272)
    confere("Perfil: fora do Especial o modificador conta uma vez", corpo.multiplicadorAtributoNoDano, 1);
    const especial = perfilDe(
      sys => {
        invocacaoBase(sys);
        sys.detalhes.grau = "Especial";
      },
      { linhaAtaque: "corpoACorpo", dano: "3d12" }
    );
    confere("Perfil: o Grau Especial dobra o modificador", especial.multiplicadorAtributoNoDano, 2);

    /* A CD do TR: 10 + metade do nível do Controlador + modificador da ação */
    const inv9 = prepararAtor(M.InvocacaoDataModel, comInvocador);
    confere("Invocação: o nível vem do invocador", inv9.nivelUsuario, 9);
    confere("Invocação: o Bônus de Treinamento também", inv9.bonusTreinamentoUsuario, 4);
    // 10 + metade do nível 9 do Controlador (p. 263)
    confere("Invocação: a CD base sobe com o nível do invocador", inv9.cdAcao, 14);

    const cd = FnmActor.prototype._cdAcaoInvocacao.call({ system: inv9 }, corpo);
    confere("CD: o atributo é o da linha de ataque da ação", cd.chave, "forca");
    confere("CD: a base é a da Invocação", cd.base, 14);
    confere("CD: o modificador é o do atributo da ação", cd.mod, 4);
    // A ficha e a carta têm de mostrar o MESMO número
    confere("CD: ficha e carta fecham no mesmo total", cd.base + cd.mod, 18);
  }
}

/* -------- 8. O PE temporário é gasto antes do normal -------- */

{
  globalThis.Actor ??= class {};
  const { FnmActor } = await import(new URL("../module/documents/actor.mjs", import.meta.url));

  // Um ator de mentira que só sabe guardar recursos e registrar o update
  const ator = (value, temporario, max = 20) => {
    const alvo = {
      system: { recursos: { pe: { value, max }, peTemporario: temporario } },
      updates: {},
      async update(dados) {
        Object.assign(this.updates, dados);
      }
    };
    Object.defineProperty(alvo, "peDisponivel", {
      get: Object.getOwnPropertyDescriptor(FnmActor.prototype, "peDisponivel").get
    });
    alvo.gastarPE = FnmActor.prototype.gastarPE;
    return alvo;
  };

  confere("PE: o disponível soma o temporário", ator(5, 3).peDisponivel, 8);

  // O caso que estava quebrado: o custo cabia no temporário e era recusado
  const soTemporario = ator(0, 6);
  const extrato = await soTemporario.gastarPE(4);
  confere("PE: gasta do temporário quando o normal está zerado", extrato === null, false);
  confere(
    "PE: e desconta só do temporário",
    soTemporario.updates["system.recursos.peTemporario"],
    2
  );
  confere(
    "PE: sem tocar no normal",
    soTemporario.updates["system.recursos.pe.value"],
    undefined
  );

  // O temporário sai primeiro, e o resto vem do normal
  const misto = ator(10, 3);
  await misto.gastarPE(5);
  confere("PE: o temporário é consumido primeiro", misto.updates["system.recursos.peTemporario"], 0);
  confere("PE: o resto sai do normal", misto.updates["system.recursos.pe.value"], 8);

  // Sem temporário nenhum, o comportamento antigo continua valendo
  const semTemp = ator(10, 0);
  await semTemp.gastarPE(4);
  confere("PE: sem temporário desconta do normal", semTemp.updates["system.recursos.pe.value"], 6);
  confere(
    "PE: e não escreve no temporário à toa",
    semTemp.updates["system.recursos.peTemporario"],
    undefined
  );

  // Mais caro que tudo que existe: não gasta nada e avisa quem chamou
  const pobre = ator(2, 1);
  confere("PE: acima do disponível não gasta", await pobre.gastarPE(5), null);
  confere("PE: e não escreve update nenhum", Object.keys(pobre.updates).length, 0);
}

/* -------- 9. O Descanso Longo devolve os usos das habilidades -------- */

{
  globalThis.Actor ??= class {};
  globalThis.ChatMessage = { create: async () => null, getSpeaker: () => ({}) };
  globalThis.foundry.utils.deepClone = o => JSON.parse(JSON.stringify(o));
  const { FnmActor } = await import(new URL("../module/documents/actor.mjs", import.meta.url));

  const item = (id, value, max) => ({ id, system: { usos: { value, max } } });
  const itens = [
    item("gasta", 0, 3), // habilidade esgotada: tem de voltar cheia
    item("meia", 1, 2), // parcialmente gasta: idem
    item("cheia", 2, 2), // já cheia: não precisa de update
    item("semUsos", 0, 0) // sem contador: não é da conta do descanso
  ];

  const ator = {
    name: "Yuji",
    items: itens,
    system: {
      recursos: {
        pv: { value: 1, max: 30 },
        pe: { value: 0, max: 10 },
        estamina: { value: 0, max: 0 }
      },
      dadosVida: [{ dado: "d8", total: 3, gastos: 2 }],
      exaustao: 2,
      inimigo: { guardaInabalavel: { value: 0, max: 2 }, resistenciaParcial: { value: 0, max: 0 } }
    },
    updates: {},
    embutidos: [],
    async update(dados) {
      Object.assign(this.updates, dados);
    },
    async updateEmbeddedDocuments(tipo, lista) {
      this.embutidos.push(...lista);
    }
  };
  ator.descansoLongo = FnmActor.prototype.descansoLongo;
  await ator.descansoLongo();

  const tocados = ator.embutidos.map(u => u._id).sort().join(",");
  confere("Descanso: devolve os usos dos itens gastos", tocados, "gasta,meia");
  confere(
    "Descanso: e devolve até o máximo de cada um",
    ator.embutidos.map(u => u["system.usos.value"]).join(","),
    "3,2"
  );
  // Os contadores próprios do NPC vêm do Grimório, e não de um item
  confere(
    "Descanso: o contador do NPC também volta",
    ator.updates["system.inimigo.guardaInabalavel.value"],
    2
  );
  confere(
    "Descanso: um contador zerado não é inventado",
    ator.updates["system.inimigo.resistenciaParcial.value"],
    undefined
  );
  // O que já funcionava continua funcionando
  confere("Descanso: PV voltam ao máximo", ator.updates["system.recursos.pv.value"], 30);
  confere("Descanso: a exaustão cai um nível", ator.updates["system.exaustao"], 1);
}

/* -------- 10. As Invocações acompanham o nível do invocador -------- */

{
  globalThis.Actor ??= class {};
  const { invocacoesDe } = await import(new URL("../module/documents/actor.mjs", import.meta.url));

  const inv = (id, invocador) => ({ id, type: "invocacao", system: { detalhes: { invocador } } });
  const mundo = [
    { id: "gojo", type: "character", system: {} },
    inv("cao", "gojo"),
    inv("sapo", "gojo"),
    inv("coruja", "megumi"),
    { id: "maldicao", type: "npc", system: { detalhes: { invocador: "gojo" } } }
  ];

  const nomes = lista => lista.map(a => a.id).join(",");
  confere(
    "Invocador: acha as Invocações que dependem dele",
    nomes(invocacoesDe("gojo", mundo)),
    "cao,sapo"
  );
  confere(
    "Invocador: não pega a Invocação de outro",
    nomes(invocacoesDe("megumi", mundo)),
    "coruja"
  );
  // Um NPC com o campo preenchido não é uma Invocação: o tipo é que manda
  confere(
    "Invocador: só o tipo invocacao conta",
    invocacoesDe("gojo", mundo).every(a => a.type === "invocacao"),
    true
  );
  // Uma Invocação sem invocador não pode ser arrastada por um id vazio
  confere("Invocador: id vazio não casa com ninguém", nomes(invocacoesDe("", mundo)), "");
  confere("Invocador: sem mundo não quebra", nomes(invocacoesDe("gojo", null)), "");
}

/* -------- 11. Restringido: Estamina, Técnicas Marciais e Dádivas -------- */

{
  const {
    tecnicasMarciaisAcessiveis,
    tecnicasMarciaisConhecidas,
    dadivasRecebidas,
    arsenalDoRestringido
  } = await import(new URL("../module/config.mjs", import.meta.url));

  /* Acesso aos níveis de Técnica Marcial (p. 124): 1 no início, 2 no 5, 3 no 9, 4 no 15 */
  const acesso = n => tecnicasMarciaisAcessiveis(n).join("");
  confere("Restringido: nível 1 acessa só técnicas de nível 1", acesso(1), "1");
  confere("Restringido: nível 4 ainda não abriu o 2", acesso(4), "1");
  confere("Restringido: nível 5 abre o nível 2", acesso(5), "12");
  confere("Restringido: nível 9 abre o nível 3", acesso(9), "123");
  confere("Restringido: nível 14 ainda não abriu o 4", acesso(14), "123");
  confere("Restringido: nível 15 abre o nível 4", acesso(15), "1234");

  /* Quantas conhece: 2 e mais uma em cada ímpar de 3 a 19 */
  confere("Restringido: começa com 2 Técnicas Marciais", tecnicasMarciaisConhecidas(1), 2);
  confere("Restringido: o nível 3 dá a terceira", tecnicasMarciaisConhecidas(3), 3);
  confere("Restringido: o nível 4 não dá nada novo", tecnicasMarciaisConhecidas(4), 3);
  confere("Restringido: no nível 20 conhece 11", tecnicasMarciaisConhecidas(20), 11);

  /* Dádivas: uma a cada 4 níveis */
  confere("Dádiva: nenhuma antes do nível 4", dadivasRecebidas(3), 0);
  confere("Dádiva: a primeira no nível 4", dadivasRecebidas(4), 1);
  confere("Dádiva: cinco no nível 20", dadivasRecebidas(20), 5);

  /* Arsenal: indexado pelo Bônus de Treinamento, que satura em +6 */
  confere("Arsenal: nível 1 usa a linha do BT +2", arsenalDoRestringido(1).bt, 2);
  confere("Arsenal: e é a linha com duas de quarto grau", arsenalDoRestringido(1).pecas.Quarto, 2);
  confere("Arsenal: nível 20 satura no BT +6", arsenalDoRestringido(20).bt, 6);
  confere("Arsenal: no topo são duas de grau especial", arsenalDoRestringido(20).pecas.Especial, 2);

  /* Custo da Técnica Marcial: o padrão vem do nível, mas pode ser fechado */
  const tec = (ajustar = () => {}) => prepararAtor(M.TecnicaMarcialDataModel, ajustar);
  confere("Técnica Marcial: nível 1 custa 2 de Estamina", tec().custoEfetivo, 2);
  confere("Técnica Marcial: nível 4 custa 12", tec(t => (t.nivel = "4")).custoEfetivo, 12);
  confere(
    "Técnica Marcial: um custo fechado vence o padrão",
    tec(t => (t.custoEstamina = 3)).custoEfetivo,
    3
  );
  // Custo 0 é legítimo e não pode cair no padrão do nível
  confere(
    "Técnica Marcial: custo zero é respeitado",
    tec(t => (t.custoEstamina = 0)).custoEfetivo,
    0
  );
  // Sem energia amaldiçoada, o dano fica no físico (p. 248)
  confere("Técnica Marcial: impacto é físico", tec().danoNaoFisico, false);
  confere(
    "Técnica Marcial: queimante é sinalizado",
    tec(t => (t.tipoDano = "queimante")).danoNaoFisico,
    true
  );
  // As tabelas de criação são as dos Feitiços do mesmo nível
  confere(
    "Técnica Marcial: o dano padrão vem da tabela do Feitiço",
    tec(t => {
      t.nivel = "2";
      t.resolucao = "ataque";
    }).danoPadrao,
    "8d8"
  );

  /* As Dádivas viram bônus reais na ficha — e só para um Restringido */
  const restringidoBase = (sys, dadivas = []) => {
    sys.detalhes.nivel = 10;
    sys.restringido.dadivas = dadivas;
    sys.recursos.integridade.value = 999;
  };
  // O item de especialização é o que torna o personagem um Restringido
  const especRestringido = {
    type: "especializacao",
    system: { ajustes: {}, especializacao: "restringido", niveis: 10 }
  };
  const restringido = (dadivas, extra = () => {}) =>
    prepararAtor(
      M.CharacterDataModel,
      sys => {
        restringidoBase(sys, dadivas);
        extra(sys);
      },
      [especRestringido]
    );

  const semDadiva = restringido([]);
  confere("Restringido: o item de especialização o identifica", semDadiva.ehRestringido, true);
  confere("Restringido: não tem PE", semDadiva.recursos.pe.max, 0);
  confere("Restringido: recebe 4 de Estamina por nível", semDadiva.recursos.estamina.max, 40);

  const comAgilidade = restringido(["agilidade"]);
  confere(
    "Dádiva: Agilidade Exímia dá +2 em perícia de Destreza",
    comAgilidade.pericias.acrobacia.total - semDadiva.pericias.acrobacia.total,
    2
  );
  confere(
    "Dádiva: e +2 no TR de Reflexos",
    comAgilidade.resistencias.reflexos.total - semDadiva.resistencias.reflexos.total,
    2
  );
  confere(
    "Dádiva: e +3 m de deslocamento",
    comAgilidade.combate.deslocamentoAtual - semDadiva.combate.deslocamentoAtual,
    3
  );
  confere(
    "Dádiva: sem tocar em perícia de outro atributo",
    comAgilidade.pericias.atletismo.total - semDadiva.pericias.atletismo.total,
    0
  );

  // Vigor Infindável mexe em PV e Estamina, e a Integridade acompanha o PV
  const comVigor = restringido(["vigor"]);
  confere(
    "Dádiva: Vigor Infindável soma o nível ao PV máximo",
    comVigor.recursos.pv.max - semDadiva.recursos.pv.max,
    10
  );
  confere(
    "Dádiva: e 1 de Estamina a cada 2 níveis",
    comVigor.recursos.estamina.max - semDadiva.recursos.estamina.max,
    5
  );
  // O caso que quase escapou: a Integridade máxima acompanha o PV máximo, e a
  // alma é derivada ANTES das Dádivas — o bônus tem de entrar cedo
  confere(
    "Dádiva: a Integridade máxima acompanha o PV aumentado",
    comVigor.recursos.integridade.max,
    comVigor.recursos.pv.max
  );

  // Físico Robusto dá RD contra todo tipo igual a metade do nível
  const comRobusto = restringido(["robusto"]);
  confere(
    "Dádiva: Físico Robusto dá RD igual a metade do nível",
    comRobusto.combate.reducaoDanoTotal - semDadiva.combate.reducaoDanoTotal,
    5
  );
  confere(
    "Dádiva: e a RD entra na grade por tipo",
    comRobusto.combate.rdPorTipo.cortante - semDadiva.combate.rdPorTipo.cortante,
    5
  );

  // Restrito pelos Céus: Força ou Constituição na Defesa, limitado pelo nível
  const forte = sys => (sys.atributos.forca.value = 20); // modificador +5
  confere(
    "Restrito pelos Céus: a Força entra na Defesa",
    restringido([], sys => {
      forte(sys);
      sys.restringido.atributoDefesa = "forca";
    }).combate.defesa - restringido([], forte).combate.defesa,
    5
  );
  // "limitado pelo seu nível": num nível 3 o teto é 3, não o modificador +5
  const nivel3 = sys => {
    forte(sys);
    sys.detalhes.nivel = 3;
  };
  confere(
    "Restrito pelos Céus: o bônus na Defesa é limitado pelo nível",
    restringido([], sys => {
      nivel3(sys);
      sys.restringido.atributoDefesa = "forca";
    }).combate.defesa - restringido([], nivel3).combate.defesa,
    3
  );

  // Um feiticeiro comum com o campo preenchido não leva nada disso
  const feiticeiro = prepararAtor(M.CharacterDataModel, sys => {
    sys.detalhes.nivel = 10;
    sys.restringido.dadivas = ["agilidade", "vigor"];
    sys.restringido.atributoDefesa = "forca";
    sys.recursos.integridade.value = 999;
  });
  const feiticeiroLimpo = prepararAtor(M.CharacterDataModel, sys => {
    sys.detalhes.nivel = 10;
    sys.recursos.integridade.value = 999;
  });
  confere("Dádiva: quem não é Restringido não recebe nada", feiticeiro.ehRestringido, false);
  confere(
    "Dádiva: e as perícias dele ficam intactas",
    feiticeiro.pericias.acrobacia.total,
    feiticeiroLimpo.pericias.acrobacia.total
  );
  confere(
    "Dádiva: e a Defesa dele também",
    feiticeiro.combate.defesa,
    feiticeiroLimpo.combate.defesa
  );
  // PV e Estamina são somados ANTES do cálculo dos máximos, num bloco que não
  // repete a guarda: quem protege é a lista vir vazia para quem não é Restringido
  confere(
    "Dádiva: e o PV máximo dele não sobe",
    feiticeiro.recursos.pv.max,
    feiticeiroLimpo.recursos.pv.max
  );
  confere(
    "Dádiva: nem a Estamina máxima",
    feiticeiro.recursos.estamina.max,
    feiticeiroLimpo.recursos.estamina.max
  );
}

/* -------- 12. O diálogo cabe na tela de quem está jogando -------- */

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
