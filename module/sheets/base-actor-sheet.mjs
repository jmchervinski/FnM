const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

import { FNM } from "../config.mjs";
import { ehArrastoDeCondicao } from "../condicoes.mjs";

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
      usarAcaoInvocacao: FnmBaseActorSheet.onUsarAcaoInvocacao,
      danoAcaoInvocacao: FnmBaseActorSheet.onDanoAcaoInvocacao,
      curaAcaoInvocacao: FnmBaseActorSheet.onCuraAcaoInvocacao,
      aplicarDano: FnmBaseActorSheet.onAplicarDano,
      curar: FnmBaseActorSheet.onCurar,
      testeDeMorte: FnmBaseActorSheet.onTesteDeMorte,
      descansoCurto: FnmBaseActorSheet.onDescansoCurto,
      descansoLongo: FnmBaseActorSheet.onDescansoLongo,
      exaustaoMais: FnmBaseActorSheet.onExaustaoMais,
      exaustaoMenos: FnmBaseActorSheet.onExaustaoMenos,
      adicionarCondicao: FnmBaseActorSheet.onAdicionarCondicao,
      ajustarCondicao: FnmBaseActorSheet.onAjustarCondicao,
      removerCondicao: FnmBaseActorSheet.onRemoverCondicao,
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
    // Dado de FONTE, para os campos cuja derivação soma em cima do que foi
    // digitado: ligar o input ao valor derivado faria ele somar de novo a cada
    // gravação. O `name=` continua apontando para o caminho real.
    context.source = this.actor.toObject().system;
    context.editable = this.isEditable;
    context.config = FNM;
    context.isGM = game.user?.isGM ?? false;

    // Lista simples para os <select> de atributo dos formulários
    context.atributos = FNM.ordemAtributos.map(id => ({ id, ...FNM.atributos[id] }));

    // Atributos na ordem canônica do livro
    // O bônus de item aparece separado do valor digitado: o campo continua
    // editável e o total mostra o que os itens somaram por cima (p. 147)
    context.atributosView = FNM.ordemAtributos.map(key => ({
      key,
      ...FNM.atributos[key],
      value: sys.atributos[key].value,
      mod: sys.atributos[key].mod,
      bonusItens: sys.atributos[key].bonusItens ?? 0,
      total: sys.atributos[key].total ?? sys.atributos[key].value
    }));

    // De onde veio cada bônus de item, para a ficha explicar os totais
    context.fontesDeItem = sys.efeitosItens?.fontes ?? [];

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

    // Faixa de Condições: o que está ligado, os avisos que a automação não
    // calcula e o resumo do que já foi descontado dos números da ficha
    context.condicoesView = this.actor.condicoesDaFicha ?? [];
    context.condicoesAvisos = [
      ...new Set(context.condicoesView.flatMap(c => c.avisos ?? []))
    ];
    context.condicoesResumo = resumoDeCondicoes(sys.condicoes);

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

    // Soltar uma condição arrastada de uma carta do chat em cima da ficha.
    // O listener é da ficha inteira, e não de um alvo pequeno: quem arrasta
    // não deveria ter de acertar a faixa de Condições para acertar o ator.
    this.element.addEventListener("dragover", evento => {
      if (evento.dataTransfer?.types?.includes("text/plain")) evento.preventDefault();
    });
    this.element.addEventListener("drop", async evento => {
      let dados;
      try {
        dados = JSON.parse(evento.dataTransfer?.getData("text/plain") ?? "");
      } catch {
        return;
      }
      if (!ehArrastoDeCondicao(dados)) return;
      evento.preventDefault();
      evento.stopPropagation();
      await this.actor.aplicarCondicao(dados.id, dados);
    });
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

  /** Usa uma Ação de Invocação: cobra o custo e resolve o acerto (p. 262-272). */
  static async onUsarAcaoInvocacao(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.usarAcaoInvocacao(item);
  }

  /** Dano avulso de uma Ação, sem passar pelo acerto nem gastar o uso. */
  static async onDanoAcaoInvocacao(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.rolarDano(item);
  }

  /** Cura avulsa de uma Ação de Auxílio, pelo mesmo motivo. */
  static async onCuraAcaoInvocacao(event, target) {
    const item = this.#itemDe(target);
    if (item) await this.actor.rolarCuraAcao(item);
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
      content: `<p>Recupera todos os PV, PE e Dados de Vida, restaura os usos das habilidades,
        remove as falhas nas Portas da Morte e recupera um nível de exaustão (p. 335). Continuar?</p>`,
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
  /*  Condições                                 */
  /* ------------------------------------------ */

  /**
   * Escolhe uma condição do catálogo e a aplica. O diálogo pergunta as rodadas
   * e a CD porque é o que o fim de turno vai usar: sem CD, a condição fica até
   * alguém tirá-la na mão (p. 208).
   */
  static async onAdicionarCondicao() {
    const grupos = {};
    for (const c of FNM.condicoes) (grupos[c.grupo] ??= []).push(c);
    const opcoes = Object.entries(grupos)
      .map(
        ([grupo, itens]) =>
          `<optgroup label="${grupo}">` +
          itens.map(c => `<option value="${c.id}">${c.nome} (${c.nivel})</option>`).join("") +
          "</optgroup>"
      )
      .join("");

    const dados = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Aplicar Condição — ${this.actor.name}` },
      content: `
        <div class="form-group"><label>Condição</label>
          <select name="id" autofocus>${opcoes}</select></div>
        <div class="form-group"><label>Nível (só para o Sangramento)</label>
          <select name="nivel"><option value="">padrão</option>
            ${FNM.niveisCondicao.map(n => `<option value="${n}">${n}</option>`).join("")}
          </select></div>
        <div class="form-group"><label>Duração em rodadas</label>
          <input type="number" name="rodadas" value="0" min="-1" step="1" /></div>
        <div class="form-group"><label>CD do novo teste no fim do turno</label>
          <input type="number" name="cd" value="0" min="0" step="1" /></div>
        <div class="form-group"><label>Teste de Resistência</label>
          <select name="resistencia"><option value="">—</option>
            ${Object.entries(FNM.resistencias)
              .map(([id, r]) => `<option value="${id}">${r.nome}</option>`)
              .join("")}
          </select></div>
        <p class="hint">Rodadas em 0 deixa a condição sem prazo; -1 dura a cena. Sem CD, o fim do
          turno não oferece teste para se livrar (p. 208).</p>`,
      rejectClose: false,
      ok: {
        label: "Aplicar",
        icon: "fa-solid fa-skull-crossbones",
        callback: (event, button) => {
          const campos = button.form.elements;
          return {
            id: campos.id?.value,
            nivel: campos.nivel?.value ?? "",
            rodadas: Number(campos.rodadas?.value ?? 0) || 0,
            cd: Number(campos.cd?.value ?? 0) || null,
            resistencia: campos.resistencia?.value ?? ""
          };
        }
      }
    });
    if (!dados?.id) return;

    const nivelAplicado = dados.nivel || FNM.condicoesPorId[dados.id]?.nivel || "";
    await this.actor.aplicarCondicao(dados.id, {
      ...dados,
      nivelAplicado,
      // Sangramento sem fórmula própria usa a perda de vida do nível (p. 210)
      formula: FNM.condicoesPorId[dados.id]?.perdaDeVida
        ? (FNM.sangramentoPorNivel[nivelAplicado] ?? "")
        : "",
      origem: "aplicada na ficha"
    });
  }

  /**
   * Ajusta a duração e a CD de uma condição já ativa.
   *
   * O diálogo nasce com o que resta agora, e não com o prazo original: quem
   * abre isto no meio do combate quer decidir a partir do que está na mesa. E
   * aqui o valor digitado vale, ponto — a regra de "vale a duração mais longa"
   * é para quando o efeito é aplicado de novo, não para uma correção à mão.
   */
  static async onAjustarCondicao(event, target) {
    const id = target.closest("[data-condicao]")?.dataset.condicao;
    const cond = FNM.condicoesPorId[id];
    if (!cond) return;

    const efeito = this.actor.efeitoDaCondicao(id);
    const flags = efeito?.flags?.fnm ?? {};
    const restam = efeito?.duration?.rounds
      ? Math.max(0, Math.floor(efeito.duration.remaining ?? efeito.duration.rounds))
      : flags.cena
        ? -1
        : 0;

    const dados = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${cond.nome} — ${this.actor.name}` },
      content: `
        <p class="hint">${cond.efeito}</p>
        <div class="form-group"><label>Duração em rodadas</label>
          <input type="number" name="rodadas" value="${restam}" min="-1" step="1" autofocus /></div>
        <div class="form-group"><label>CD do novo teste no fim do turno</label>
          <input type="number" name="cd" value="${flags.cd ?? 0}" min="0" step="1" /></div>
        <div class="form-group"><label>Teste de Resistência</label>
          <select name="resistencia"><option value="">—</option>
            ${Object.entries(FNM.resistencias)
              .map(
                ([rid, r]) =>
                  `<option value="${rid}" ${rid === flags.resistencia ? "selected" : ""}>${r.nome}</option>`
              )
              .join("")}
          </select></div>
        <p class="hint">O relógio recomeça do valor digitado. <b>0</b> tira o prazo e a condição fica
          até alguém removê-la; <b>-1</b> dura a cena. Sem CD, o fim do turno não oferece teste para
          se livrar (p. 208).</p>`,
      rejectClose: false,
      ok: {
        label: "Ajustar",
        icon: "fa-solid fa-clock",
        callback: (evento, button) => {
          const campos = button.form.elements;
          return {
            rodadas: Number(campos.rodadas?.value ?? 0) || 0,
            cd: Number(campos.cd?.value ?? 0) || null,
            resistencia: campos.resistencia?.value ?? ""
          };
        }
      }
    });
    if (dados) await this.actor.ajustarCondicao(id, dados);
  }

  static async onRemoverCondicao(event, target) {
    const id = target.closest("[data-condicao]")?.dataset.condicao;
    if (id) await this.actor.removerCondicao(id);
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
      acaoInvocacao: "Nova Ação",
      tecnicaMarcial: "Nova Técnica Marcial"
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
    // Consumível é gasto no uso, não vestido: não há o que equipar
    if (item.system.equipavel === false) {
      return ui.notifications.warn(`${item.name} é um consumível: não dá para equipar.`);
    }
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

/**
 * O que as condições já tiraram dos números da ficha, em uma linha.
 *
 * A faixa mostra isto porque a penalidade não aparece em lugar nenhum além do
 * total: a Defesa simplesmente vale 3 a menos, e sem esta linha ninguém sabe
 * por quê.
 */
function resumoDeCondicoes(condicoes) {
  if (!condicoes) return [];
  const partes = [];
  const sinal = v => (v >= 0 ? `+${v}` : `${v}`);

  if (condicoes.totalAtaque) partes.push(`${sinal(condicoes.totalAtaque)} nas jogadas de ataque`);
  if (condicoes.totalAtaqueCorpoACorpo !== condicoes.totalAtaque) {
    partes.push(`${sinal(condicoes.totalAtaqueCorpoACorpo)} no corpo a corpo`);
  }
  if (condicoes.totalPericias) partes.push(`${sinal(condicoes.totalPericias)} nas perícias`);
  if (condicoes.totalResistencias) {
    partes.push(`${sinal(condicoes.totalResistencias)} nos Testes de Resistência`);
  }
  if (condicoes.totalReflexos !== condicoes.totalResistencias) {
    partes.push(`${sinal(condicoes.totalReflexos)} em Reflexos`);
  }
  if (condicoes.totalDefesa) partes.push(`${sinal(condicoes.totalDefesa)} de Defesa`);
  if (condicoes.totalDefesaCorpoACorpo !== condicoes.totalDefesa) {
    partes.push(`${sinal(condicoes.totalDefesaCorpoACorpo)} de Defesa contra corpo a corpo`);
  }
  if (condicoes.totalDefesaDistancia !== condicoes.totalDefesa) {
    partes.push(`${sinal(condicoes.totalDefesaDistancia)} de Defesa contra ataques a distância`);
  }
  if (condicoes.iniciativa) partes.push(`${sinal(condicoes.iniciativa)} de Iniciativa`);
  if (condicoes.totalPercepcao !== condicoes.totalPericias) {
    partes.push(`${sinal(condicoes.totalPercepcao)} em Percepção`);
  }
  if (condicoes.totalFurtividade !== condicoes.totalPericias) {
    partes.push(`${sinal(condicoes.totalFurtividade)} em Furtividade`);
  }
  if (condicoes.custoPE) partes.push(`+${condicoes.custoPE} PE em toda habilidade`);
  if (condicoes.semRD) partes.push("Redução de Dano zerada");
  if (condicoes.semAcoes) partes.push("sem ações");
  if (condicoes.semReacoes) partes.push("sem reações");
  if (condicoes.falhaReflexos) partes.push("falha automática em Reflexos");
  if (condicoes.deslocamentoMetade) partes.push("movimento pela metade");

  return partes;
}
