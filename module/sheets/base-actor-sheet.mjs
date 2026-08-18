const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

import { FNM } from "../config.mjs";

/**
 * Base compartilhada pelas fichas de Personagem, NPC e Invocação
 * (ApplicationV2): rolagens de perícia/resistência/atributo, ações de item e
 * as operações de dano, cura e descanso.
 */
export class FnmBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet"],
    position: { width: 820, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: FnmBaseActorSheet.onEditImage,
      rolarPericia: FnmBaseActorSheet.onRolarPericia,
      rolarResistencia: FnmBaseActorSheet.onRolarResistencia,
      rolarAtributo: FnmBaseActorSheet.onRolarAtributo,
      rolarOficio: FnmBaseActorSheet.onRolarOficio,
      rolarAtaqueBase: FnmBaseActorSheet.onRolarAtaqueBase,
      rolarDesarmado: FnmBaseActorSheet.onRolarDesarmado,
      rolarIniciativa: FnmBaseActorSheet.onRolarIniciativa,
      gastarUso: FnmBaseActorSheet.onGastarUso,
      recuperarUso: FnmBaseActorSheet.onRecuperarUso,
      atacarArma: FnmBaseActorSheet.onAtacarArma,
      danoArma: FnmBaseActorSheet.onDanoArma,
      conjurarFeitico: FnmBaseActorSheet.onConjurarFeitico,
      aplicarDano: FnmBaseActorSheet.onAplicarDano,
      curar: FnmBaseActorSheet.onCurar,
      testeDeMorte: FnmBaseActorSheet.onTesteDeMorte,
      descansoCurto: FnmBaseActorSheet.onDescansoCurto,
      descansoLongo: FnmBaseActorSheet.onDescansoLongo,
      exaustaoMais: FnmBaseActorSheet.onExaustaoMais,
      exaustaoMenos: FnmBaseActorSheet.onExaustaoMenos,
      itemCreate: FnmBaseActorSheet.onItemCreate,
      itemEdit: FnmBaseActorSheet.onItemEdit,
      itemDelete: FnmBaseActorSheet.onItemDelete,
      itemChat: FnmBaseActorSheet.onItemChat,
      itemExpand: FnmBaseActorSheet.onItemExpand,
      itemToggle: FnmBaseActorSheet.onItemToggle
    }
  };

  /** Estado aberto/fechado das seções colapsáveis, preservado entre renders. */
  #colapsos = {};

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.actor = this.actor;
    context.system = sys;
    context.editable = this.isEditable;
    context.config = FNM;
    context.isGM = game.user?.isGM ?? false;

    // Lista simples para os <select> de atributo dos formulários
    context.atributos = FNM.ordemAtributos.map(id => ({ id, ...FNM.atributos[id] }));

    // Atributos na ordem canônica do livro
    context.atributosView = FNM.ordemAtributos.map(key => ({
      key,
      ...FNM.atributos[key],
      value: sys.atributos[key].value,
      mod: sys.atributos[key].mod
    }));

    // Perícias ordenadas alfabeticamente, como na ficha oficial
    context.periciasView = Object.entries(sys.pericias)
      .map(([key, p]) => ({ key, ...p, abrevAtributo: FNM.atributos[p.atributo]?.abrev }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    context.resistenciasView = Object.entries(sys.resistencias).map(([key, r]) => ({
      key,
      ...r,
      abrevAtributo: FNM.atributos[r.atributo]?.abrev
    }));

    // Itens agrupados por tipo, para as listas da ficha
    context.itens = {};
    for (const item of this.actor.items) {
      (context.itens[item.type] ??= []).push(item);
    }
    for (const lista of Object.values(context.itens)) {
      lista.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }

    // Feitiços agrupados por nível
    context.feiticosPorNivel = FNM.niveisFeitico
      .map(n => ({
        ...n,
        disponivel: (sys.niveisFeiticoDisponiveis ?? []).includes(n.id),
        itens: (context.itens.feitico ?? []).filter(f => f.system.nivel === n.id)
      }))
      .filter(g => g.itens.length || g.disponivel);

    context.exaustaoView = FNM.exaustao.map(e => ({ ...e, ativo: sys.exaustao >= e.nivel }));

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    return context;
  }

  /** Preserva o estado das seções colapsáveis entre re-renderizações. */
  _onRender(context, options) {
    super._onRender?.(context, options);
    for (const det of this.element.querySelectorAll("details[data-colapso]")) {
      const chave = det.dataset.colapso;
      if (chave in this.#colapsos) det.open = this.#colapsos[chave];
      det.addEventListener("toggle", () => {
        this.#colapsos[chave] = det.open;
      });
    }
  }

  /* ------------------------------------------ */
  /*  Rolagens                                  */
  /* ------------------------------------------ */

  static async onRolarPericia(event, target) {
    await this.actor.rolarPericia(target.dataset.pericia);
  }

  static async onRolarResistencia(event, target) {
    await this.actor.rolarResistencia(target.dataset.resistencia);
  }

  static async onRolarAtributo(event, target) {
    await this.actor.rolarAtributo(target.dataset.atributo);
  }

  static async onRolarOficio(event, target) {
    await this.actor.rolarOficio(Number(target.dataset.idx));
  }

  static async onRolarAtaqueBase(event, target) {
    await this.actor.rolarAtaqueBase(target.dataset.ataque);
  }

  static async onRolarDesarmado() {
    await this.actor.rolarDesarmado();
  }

  /** Consome um uso de uma habilidade/talento/aptidão (colunas Atual/Máx.). */
  static async onGastarUso(event, target) {
    const item = this.#itemDe(target);
    if (!item?.system?.usos) return;
    const atual = item.system.usos.value;
    if (atual <= 0) return ui.notifications.warn(`${item.name} não tem usos restantes.`);
    await item.update({ "system.usos.value": atual - 1 });
  }

  static async onRecuperarUso(event, target) {
    const item = this.#itemDe(target);
    if (!item?.system?.usos) return;
    const { value, max } = item.system.usos;
    await item.update({ "system.usos.value": Math.min(max, value + 1) });
  }

  static async onRolarIniciativa() {
    const roll = this.actor.getInitiativeRoll();
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "<b>Iniciativa</b> (1d20 + Destreza)"
    });
  }

  static async onAtacarArma(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.rolarAtaqueArma(item);
  }

  /**
   * Rolagem de dano avulsa, para quando não se quer passar pelo ataque. O
   * caminho normal é o botão da carta do ataque, que já sabe do crítico e do
   * atributo usado. Aqui, Shift força a empunhadura de duas mãos.
   */
  static async onDanoArma(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.rolarDano(item, { versatil: event.shiftKey });
  }

  static async onConjurarFeitico(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.conjurarFeitico(item);
  }

  /* ------------------------------------------ */
  /*  Recursos                                  */
  /* ------------------------------------------ */

  static async onAplicarDano() {
    const tiposHtml = Object.entries(FNM.tiposDano)
      .map(([id, t]) => `<option value="${id}">${t.nome} (${t.categoria})</option>`)
      .join("");

    const dados = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Aplicar Dano — ${this.actor.name}` },
      content: `
        <div class="form-group"><label>Quantidade</label>
          <input type="number" name="quantidade" value="0" min="0" step="1" autofocus /></div>
        <div class="form-group"><label>Tipo de dano</label>
          <select name="tipo"><option value="">—</option>${tiposHtml}</select></div>
        <div class="form-group"><label class="checkbox">
          <input type="checkbox" name="ignorarRD" /> Ignorar Redução de Dano</label></div>
        <p class="hint">Dano na Alma ignora defesas, reduz a vida máxima e a Integridade (p. 311).</p>`,
      rejectClose: false,
      ok: {
        label: "Aplicar",
        icon: "fa-solid fa-heart-crack",
        callback: (event, button) => ({
          quantidade: Number(button.form.elements.quantidade?.value ?? 0) || 0,
          tipo: button.form.elements.tipo?.value ?? "",
          ignorarRD: button.form.elements.ignorarRD?.checked ?? false
        })
      }
    });
    if (dados) await this.actor.aplicarDano(dados.quantidade, dados);
  }

  static async onCurar() {
    const dados = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Curar — ${this.actor.name}` },
      content: `<div class="form-group"><label>Pontos de Vida recuperados</label>
        <input type="number" name="quantidade" value="0" min="0" step="1" autofocus /></div>`,
      rejectClose: false,
      ok: {
        label: "Curar",
        icon: "fa-solid fa-heart",
        callback: (event, button) => Number(button.form.elements.quantidade?.value ?? 0) || 0
      }
    });
    if (dados) await this.actor.curar(dados);
  }

  static async onTesteDeMorte() {
    await this.actor.rolarTesteDeMorte();
  }

  static async onDescansoCurto() {
    const disponiveis = this.actor.system.dadosVidaRestantes ?? 0;
    const dados = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Descanso Curto — ${this.actor.name}` },
      content: `
        <p>Recupera metade do máximo de PE e permite gastar Dados de Vida para curar (p. 335).</p>
        <div class="form-group"><label>Dados de Vida a gastar (disponíveis: ${disponiveis})</label>
          <input type="number" name="dados" value="0" min="0" max="${disponiveis}" step="1" autofocus /></div>`,
      rejectClose: false,
      ok: {
        label: "Descansar",
        icon: "fa-solid fa-mug-hot",
        callback: (event, button) => Number(button.form.elements.dados?.value ?? 0) || 0
      }
    });
    if (dados !== null) await this.actor.descansoCurto({ dadosGastos: dados });
  }

  static async onDescansoLongo() {
    const confirmado = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Descanso Longo — ${this.actor.name}` },
      content: `<p>Recupera todos os PV, PE e Dados de Vida, remove as falhas nas Portas da Morte
        e recupera um nível de exaustão (p. 335). Continuar?</p>`,
      rejectClose: false
    });
    if (confirmado) await this.actor.descansoLongo();
  }

  static async onExaustaoMais() {
    await this.actor.ajustarExaustao(1);
  }

  static async onExaustaoMenos() {
    await this.actor.ajustarExaustao(-1);
  }

  /* ------------------------------------------ */
  /*  Itens                                     */
  /* ------------------------------------------ */

  #itemDe(target) {
    const li = target.closest("[data-item-id]");
    return this.actor.items.get(li?.dataset.itemId);
  }

  static async onItemCreate(event, target) {
    const type = target.dataset.type;
    const nomes = {
      origem: "Nova Origem",
      especializacao: "Nova Especialização",
      habilidade: "Nova Habilidade",
      talento: "Novo Talento",
      aptidao: "Nova Aptidão",
      tecnica: "Nova Técnica",
      feitico: "Novo Feitiço",
      arma: "Nova Arma",
      equipamento: "Novo Equipamento",
      voto: "Novo Voto de Restrição",
      acaoInvocacao: "Nova Ação"
    };
    const data = { name: nomes[type] ?? "Novo Item", type };
    if (target.dataset.nivel) data.system = { nivel: target.dataset.nivel };
    // Os botões da ficha de Invocação já dizem se é Ação Simples, Complexa,
    // Reação ou Característica — o item nasce com o tipo certo
    if (target.dataset.tipoAcao) {
      data.name = target.dataset.tipoAcao === "Característica" ? "Nova Característica" : "Nova Ação";
      data.system = { ...(data.system ?? {}), tipo: target.dataset.tipoAcao };
    }
    const [criado] = await this.actor.createEmbeddedDocuments("Item", [data]);
    criado?.sheet.render(true);
  }

  static onItemEdit(event, target) {
    this.#itemDe(target)?.sheet.render(true);
  }

  static async onItemDelete(event, target) {
    const item = this.#itemDe(target);
    if (!item) return;
    const confirmado = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Excluir item" },
      content: `<p>Excluir <b>${item.name}</b> da ficha de ${this.actor.name}?</p>`,
      rejectClose: false
    });
    if (confirmado) await item.delete();
  }

  static onItemChat(event, target) {
    this.#itemDe(target)?.roll();
  }

  static onItemExpand(event, target) {
    target.closest(".item")?.classList.toggle("expanded");
  }

  /** Alterna equipada/equipado ou ativo, conforme o tipo do item. */
  static async onItemToggle(event, target) {
    const item = this.#itemDe(target);
    if (!item) return;
    const campo =
      item.type === "arma" ? "equipada" : item.type === "equipamento" ? "equipado" : "ativo";
    await item.update({ [`system.${campo}`]: !item.system[campo] });
  }

  /** Abre o FilePicker para trocar o retrato. */
  static async onEditImage(event, target) {
    const attr = target.dataset.edit ?? "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current,
      callback: path => this.document.update({ [attr]: path })
    });
    return fp.browse();
  }
}
