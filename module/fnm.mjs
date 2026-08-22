/**
 * Feiticeiros & Maldições para Foundry VTT — sistema NÃO-OFICIAL, feito por fã.
 *
 * Feiticeiros & Maldições é um projeto gratuito de fãs (Setsugiri, Parker, Jou,
 * Kame), ambientado no universo de Jujutsu Kaisen, de Gege Akutami.
 * Baseado no Livro de Regras v2.5.2.
 */
import { FnmActor, invocacoesDe } from "./documents/actor.mjs";
import { FnmItem } from "./documents/item.mjs";
import { registrarChat } from "./chat.mjs";
import {
  lerArquivo,
  mapearInimigo,
  aplicarNoAtor,
  importarDeArquivo
} from "./importar-inimigo.mjs";
import { FnmCharacterSheet } from "./sheets/character-sheet.mjs";
import { FnmNpcSheet } from "./sheets/npc-sheet.mjs";
import { FnmInvocacaoSheet } from "./sheets/invocacao-sheet.mjs";
import { FnmItemSheet } from "./sheets/item-sheet.mjs";
import {
  FNM,
  modificador,
  bonusTreinamento,
  metadeNivel,
  bonusProficiencia,
  feiticosAcessiveis,
  estadoDaAlma
} from "./config.mjs";
import {
  CharacterDataModel,
  NpcDataModel,
  InvocacaoDataModel,
  OrigemDataModel,
  EspecializacaoDataModel,
  HabilidadeDataModel,
  TalentoDataModel,
  AptidaoDataModel,
  DoteDataModel,
  CaracteristicaDataModel,
  TecnicaDataModel,
  FeiticoDataModel,
  ArmaDataModel,
  EquipamentoDataModel,
  VotoDataModel,
  AcaoInvocacaoDataModel
} from "./data-models.mjs";

Hooks.once("init", async function () {
  console.log(
    "F&M | Inicializando o sistema não-oficial de Feiticeiros & Maldições " +
      "(créditos: Setsugiri, Parker, Jou e Kame — universo de Gege Akutami)"
  );

  // API do sistema, útil para macros e módulos de terceiros
  game.fnm = {
    FnmActor,
    FnmItem,
    config: FNM,
    // Importação de fichas de inimigo de construtores externos, também para macros
    importar: { lerArquivo, mapearInimigo, aplicarNoAtor, importarDeArquivo },
    utils: {
      modificador,
      bonusTreinamento,
      metadeNivel,
      bonusProficiencia,
      feiticosAcessiveis,
      estadoDaAlma
    }
  };

  CONFIG.Actor.documentClass = FnmActor;
  CONFIG.Item.documentClass = FnmItem;

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc: NpcDataModel,
    invocacao: InvocacaoDataModel
  };
  CONFIG.Item.dataModels = {
    origem: OrigemDataModel,
    especializacao: EspecializacaoDataModel,
    habilidade: HabilidadeDataModel,
    talento: TalentoDataModel,
    aptidao: AptidaoDataModel,
    dote: DoteDataModel,
    caracteristica: CaracteristicaDataModel,
    tecnica: TecnicaDataModel,
    feitico: FeiticoDataModel,
    arma: ArmaDataModel,
    equipamento: EquipamentoDataModel,
    voto: VotoDataModel,
    acaoInvocacao: AcaoInvocacaoDataModel
  };

  // Barras de token e valores rastreáveis
  const barrasPadrao = {
    bar: ["recursos.pv", "recursos.pe", "recursos.integridade"],
    value: ["combate.defesa", "combate.atencao", "exaustao"]
  };
  CONFIG.Actor.trackableAttributes = {
    character: barrasPadrao,
    npc: barrasPadrao,
    invocacao: { bar: ["recursos.pv", "recursos.pe"], value: ["combate.defesa"] }
  };

  // Iniciativa: 1d20 + modificador de Destreza + outros bônus (p. 291)
  CONFIG.Combat.initiative = { formula: "1d20 + @iniciativa", decimals: 0 };

  // Condições do sistema substituem os efeitos de status padrão do Foundry
  CONFIG.statusEffects = FNM.condicoes.map(c => ({
    id: c.id,
    name: c.nome,
    img: c.icone,
    description: `<b>${c.grupo} · ${c.nivel}</b><br>${c.efeito}`
  }));

  // Sheets registradas pelo caminho namespaced (evita globais depreciados)
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, "fnm", FnmCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "FNM.SheetCharacter"
  });
  DocumentSheetConfig.registerSheet(Actor, "fnm", FnmNpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "FNM.SheetNpc"
  });
  DocumentSheetConfig.registerSheet(Actor, "fnm", FnmInvocacaoSheet, {
    types: ["invocacao"],
    makeDefault: true,
    label: "FNM.SheetInvocacao"
  });
  DocumentSheetConfig.registerSheet(Item, "fnm", FnmItemSheet, {
    makeDefault: true,
    label: "FNM.SheetItem"
  });

  registrarHelpers();
  registrarChat();
  await preloadHandlebarsTemplates();
});

/** Helpers de template usados pelas fichas. */
function registrarHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gte", (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper("lte", (a, b) => Number(a) <= Number(b));
  Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
  // Monta uma lista literal dentro do template: {{#each (array "A" "B")}}
  Handlebars.registerHelper("array", (...args) => args.slice(0, -1));
  // Formata um valor como bônus assinado: 3 -> "+3", -2 -> "-2"
  Handlebars.registerHelper("sinal", v => {
    const n = Number(v) || 0;
    return n >= 0 ? `+${n}` : `${n}`;
  });
  // Decimal no formato do livro: 4.5 vira "4,5" e 6 continua "6"
  Handlebars.registerHelper("numero", v => String(Number(v) || 0).replace(".", ","));
  Handlebars.registerHelper("porcento", (v, max) => {
    const m = Number(max) || 0;
    if (!m) return 0;
    return Math.clamp(Math.round((Number(v) / m) * 100), 0, 100);
  });
}

async function preloadHandlebarsTemplates() {
  const paths = [
    "systems/fnm/templates/actors/parts/actor-itens.html",
    "systems/fnm/templates/actors/parts/actor-recursos.html",
    "systems/fnm/templates/actors/parts/actor-atributos.html",
    "systems/fnm/templates/actors/parts/actor-footer.html",
    "systems/fnm/templates/actors/parts/linha-uso.html",
    "systems/fnm/templates/chat/ataque-dialogo.html",
    "systems/fnm/templates/chat/ataque.html",
    "systems/fnm/templates/chat/dano.html",
    "systems/fnm/templates/chat/resistencia.html"
  ];
  return foundry.applications.handlebars.loadTemplates(paths);
}

/* -------------------------------------------- */
/*  Criação de atores: valores iniciais úteis   */
/* -------------------------------------------- */

Hooks.on("preCreateActor", (actor, data) => {
  const updates = { prototypeToken: {} };

  if (actor.type === "character") {
    updates.prototypeToken.actorLink = true;
    updates.prototypeToken.sight = { enabled: true };
    updates.prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  } else {
    updates.prototypeToken.actorLink = false;
    updates.prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
  }

  actor.updateSource(updates);
});

/* -------------------------------------------- */
/*  Invocações acompanham o nível do invocador  */
/* -------------------------------------------- */

/**
 * O nível do invocador é a única coisa que a Invocação lê da ficha dele, e dela
 * saem Vida, Defesa, todo teste e a CD das ações (p. 261). Mas o Foundry deriva
 * cada ator por conta própria: subir de nível recalculava o personagem e
 * deixava o shikigami parado nos números antigos, até o mundo ser recarregado.
 *
 * `reset()` reinicializa o documento, o que refaz `prepareDerivedData` — é o
 * caminho mais barato para a Invocação reler o nível novo.
 */
function recalcularInvocacoes(atorId) {
  for (const invocacao of invocacoesDe(atorId, game.actors)) {
    invocacao.reset();
    // Só redesenha a ficha de quem estava com ela aberta
    if (invocacao.sheet?.rendered) invocacao.sheet.render(false);
  }
}

Hooks.on("updateActor", (actor, mudanca) => {
  // Só o nível importa: reagir a toda alteração recalcularia as Invocações a
  // cada ponto de vida perdido pelo invocador, sem mudar nenhum número delas
  if (foundry.utils.getProperty(mudanca, "system.detalhes.nivel") === undefined) return;
  recalcularInvocacoes(actor.id);
});

// Sem invocador as fórmulas caem para nível 1: as Invocações precisam saber
Hooks.on("deleteActor", actor => recalcularInvocacoes(actor.id));
