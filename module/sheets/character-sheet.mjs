import { FnmBaseActorSheet } from "./base-actor-sheet.mjs";
import { FNM } from "../config.mjs";

/** Ficha de Personagem (Feiticeiro) — sete abas espelhando o livro. */
export class FnmCharacterSheet extends FnmBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet", "fnm-personagem"],
    position: { width: 860, height: 940 },
    actions: {
      subirNivel: FnmCharacterSheet.onSubirNivel,
      adicionarDadoVida: FnmCharacterSheet.onAdicionarDadoVida,
      removerDadoVida: FnmCharacterSheet.onRemoverDadoVida,
      adicionarOficio: FnmCharacterSheet.onAdicionarOficio,
      removerOficio: FnmCharacterSheet.onRemoverOficio,
      etapaTreinamento: FnmCharacterSheet.onEtapaTreinamento,
      usarTecnicaMarcial: FnmCharacterSheet.onUsarTecnicaMarcial,
      alternarDadiva: FnmCharacterSheet.onAlternarDadiva
    }
  };

  static PARTS = {
    header: { template: "systems/fnm/templates/actors/parts/character-header.html" },
    tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["sheet-tabs"] },
    principal: {
      template: "systems/fnm/templates/actors/parts/character-principal.html",
      scrollable: [""]
    },
    pericias: {
      template: "systems/fnm/templates/actors/parts/character-pericias.html",
      scrollable: [""]
    },
    jujutsu: {
      template: "systems/fnm/templates/actors/parts/character-jujutsu.html",
      scrollable: [""]
    },
    feiticos: {
      template: "systems/fnm/templates/actors/parts/character-feiticos.html",
      scrollable: [""]
    },
    restringido: {
      template: "systems/fnm/templates/actors/parts/character-restringido.html",
      scrollable: [""]
    },
    registro: {
      template: "systems/fnm/templates/actors/parts/character-registro.html",
      scrollable: [""]
    },
    progressao: {
      template: "systems/fnm/templates/actors/parts/character-progressao.html",
      scrollable: [""]
    },
    treinamentos: {
      template: "systems/fnm/templates/actors/parts/character-treinamentos.html",
      scrollable: [""]
    },
    footer: { template: "systems/fnm/templates/actors/parts/actor-footer.html" }
  };

  /** As abas espelham as páginas do Modelo de Ficha oficial v2.5. */
  static TABS = {
    primary: {
      tabs: [
        { id: "principal", label: "Ficha Pessoal" },
        { id: "pericias", label: "Perícias" },
        { id: "jujutsu", label: "Perfil Amaldiçoado" },
        { id: "feiticos", label: "Feitiços" },
        { id: "restringido", label: "Restringido" },
        { id: "registro", label: "Registro e Inventário" },
        { id: "progressao", label: "Progressão" },
        { id: "treinamentos", label: "Treinamentos" }
      ],
      initial: "principal"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.tabs = this._prepareTabs("primary");
    // A parte de Perícias é compartilhada com a ficha de NPC, que não tem Ofícios
    context.ehPersonagem = true;
    context.origens = FNM.origens;
    context.claes = FNM.claes;
    context.graus = FNM.graus;
    context.especializacoes = FNM.especializacoes;

    // Perfil Amaldiçoado: níveis de aptidão como trilhas de 5 quadrados
    context.aptidoesView = Object.entries(FNM.niveisAptidao).map(([key, cfg]) => ({
      key,
      ...cfg,
      value: sys.jujutsu?.aptidoes?.[key] ?? 0,
      pips: Array.fromRange(5).map(i => ({
        value: i + 1,
        filled: (sys.jujutsu?.aptidoes?.[key] ?? 0) >= i + 1
      }))
    }));

    // Aptidões amaldiçoadas agrupadas por categoria
    context.aptidoesPorCategoria = FNM.categoriasAptidao
      .map(cat => ({
        categoria: cat,
        itens: (context.itens.aptidao ?? []).filter(a => a.system.categoria === cat)
      }))
      .filter(g => g.itens.length);

    // Restringido (p. 114-126): Técnicas Marciais agrupadas por nível, como os
    // Feitiços, e a lista de Dádivas com a marcação do que já foi escolhido
    const rv = sys.restringidoView ?? {};
    context.tecnicasPorNivel = FNM.niveisTecnicaMarcial.map(n => ({
      ...n,
      disponivel: (rv.niveisDisponiveis ?? []).includes(n.id),
      itens: (context.itens.tecnicaMarcial ?? []).filter(t => t.system.nivel === n.id)
    }));
    const escolhidas = sys.restringido?.dadivas ?? [];
    context.dadivasView = FNM.dadivasDoCeu.map(d => ({
      ...d,
      escolhida: escolhidas.includes(d.id)
    }));
    context.excedeuTecnicas = (rv.usadas ?? 0) > (rv.conhecidas ?? 0);
    context.excedeuDadivas = (rv.dadivasUsadas ?? 0) > (rv.dadivasTotal ?? 0);

    // Carga vem do data model (p. 129); aqui só sobra o peso, que é informativo
    context.carga = sys.carga;
    context.pesoTotal = [...(context.itens.arma ?? []), ...(context.itens.equipamento ?? [])].reduce(
      (n, i) => n + (i.system.peso ?? 0) * (i.system.quantidade ?? 1),
      0
    );

    // Grade de Redução de Dano por tipo, como no quadro "RDs" da ficha
    context.rdView = FNM.tiposComRD.map(tipo => ({
      id: tipo,
      ...FNM.tiposDano[tipo],
      valor: sys.combate.rd?.[tipo] ?? 0,
      total: sys.combate.rdPorTipo?.[tipo] ?? 0
    }));

    // As três linhas de Jogadas de Ataque
    context.ataquesView = Object.entries(FNM.tiposAtaque).map(([id, cfg]) => ({
      id,
      ...cfg,
      ...(sys.ataques?.[id] ?? {})
    }));

    // Linhas de Ofício (a ficha oficial traz três)
    context.oficiosView = sys.oficiosView ?? [];

    // Atributo-chave em vigor, vindo do item da Especialização
    context.atributoChaveNome = FNM.atributos[sys.atributoChave]?.nome ?? "—";

    // Treinamentos: 4 etapas por trilha
    context.treinamentosView = (sys.treinamentosView ?? []).map(t => ({
      ...t,
      pips: Array.fromRange(4).map(i => ({ value: i + 1, filled: t.etapas >= i + 1 }))
    }));

    // Dados de Vida, para a aba de Progressão
    context.dadosVidaView = (sys.dadosVida ?? []).map((d, idx) => ({
      ...d,
      idx,
      restantes: Math.max(0, d.total - d.gastos)
    }));

    // Aviso quando o nível dos itens de especialização não bate com o nível do personagem
    context.niveisDivergentes =
      sys.niveisEspecializacao > 0 && sys.niveisEspecializacao !== sys.detalhes.nivel;

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    const enriquecer = html =>
      foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor
      });

    if (partId === "registro") {
      context.enrichedBiografia = await enriquecer(this.actor.system.biografia);
      context.enrichedAparencia = await enriquecer(this.actor.system.aparencia?.descricao);
      context.enrichedDominio = await enriquecer(this.actor.system.aspectos?.dominioInato);
      context.enrichedAnotacoes = await enriquecer(this.actor.system.anotacoes);
    }
    if (partId === "jujutsu") {
      context.enrichedExpansao = await enriquecer(this.actor.system.jujutsu?.expansao?.descricao);
      context.enrichedTecnicaMaxima = await enriquecer(
        this.actor.system.jujutsu?.tecnicaMaxima?.descricao
      );
    }
    if (partId === "restringido") {
      context.enrichedFundamento = await enriquecer(this.actor.system.restringido?.fundamento);
    }
    return context;
  }

  /** Usa uma Técnica Marcial: gasta Estamina e resolve o acerto (p. 124). */
  static async onUsarTecnicaMarcial(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (item) await this.actor.usarTecnicaMarcial(item);
  }

  /**
   * Marca ou desmarca uma Dádiva do Céu. A lista é gravada direto no ator: os
   * checkboxes não têm `name=`, porque um campo fora do schema derrubaria o
   * submit inteiro da ficha.
   */
  static async onAlternarDadiva(event, target) {
    const id = target.dataset.dadiva;
    if (!id) return;
    const atuais = this.actor.system.restringido?.dadivas ?? [];
    const novas = atuais.includes(id) ? atuais.filter(d => d !== id) : [...atuais, id];
    await this.actor.update({ "system.restringido.dadivas": novas });
  }

  /** Sobe o nível de personagem e lembra o que precisa ser escolhido. */
  static async onSubirNivel() {
    const sys = this.actor.system;
    if (sys.detalhes.nivel >= 20) {
      return ui.notifications.warn("Nível máximo (20) já atingido.");
    }
    const novo = sys.detalhes.nivel + 1;
    const par = novo % 2 === 0;

    const ganhos = [
      "Um nível em uma Especialização (aumente <b>Níveis</b> no item da especialização e some os PV).",
      "Uma <b>Aptidão Amaldiçoada</b> (todo nível, exceto Restringidos — p. 172)."
    ];
    if (par) {
      ganhos.push("Um novo <b>Feitiço</b> (todo nível par — p. 199).");
      ganhos.push("Subir <b>+1 em um Nível de Aptidão</b> (todo nível par — p. 173).");
    }
    if (novo === 10 || novo === 20) {
      ganhos.push("Um <b>Feitiço adicional</b> e <b>+1 Nível de Aptidão adicional</b> (níveis 10 e 20).");
    }
    if ([5, 9, 13, 17].includes(novo)) {
      ganhos.push("O <b>Bônus de Treinamento</b> aumenta e um novo nível de Feitiço é liberado (p. 199/282).");
    }

    const confirmado = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Subir para o Nível ${novo}` },
      content:
        `<p>Subir <b>${this.actor.name}</b> para o <b>Nível ${novo}</b>?</p>` +
        `<p>Lembre-se de registrar:</p><ul><li>${ganhos.join("</li><li>")}</li></ul>`,
      rejectClose: false
    });
    if (!confirmado) return;

    await this.actor.update({ "system.detalhes.nivel": novo });
    ui.notifications.info(`${this.actor.name} subiu para o Nível ${novo}.`);
  }

  static async onAdicionarDadoVida() {
    const sys = this.actor.system;
    const pool = foundry.utils.deepClone(sys.dadosVida ?? []);
    pool.push({ dado: "d8", total: 1, gastos: 0 });
    await this.actor.update({ "system.dadosVida": pool });
  }

  static async onRemoverDadoVida(event, target) {
    const idx = Number(target.dataset.idx);
    const pool = foundry.utils.deepClone(this.actor.system.dadosVida ?? []);
    pool.splice(idx, 1);
    await this.actor.update({ "system.dadosVida": pool });
  }

  static async onAdicionarOficio() {
    const lista = foundry.utils.deepClone(this.actor.system.oficios ?? []);
    lista.push({ especialidade: "", treinado: false, mestre: false, outros: 0 });
    await this.actor.update({ "system.oficios": lista });
  }

  static async onRemoverOficio(event, target) {
    const lista = foundry.utils.deepClone(this.actor.system.oficios ?? []);
    lista.splice(Number(target.dataset.idx), 1);
    await this.actor.update({ "system.oficios": lista });
  }

  /**
   * Marca as etapas de um treinamento. Clicar na etapa já preenchida mais alta
   * desmarca até ela − 1, como as trilhas de quadradinhos da ficha oficial.
   */
  static async onEtapaTreinamento(event, target) {
    const id = target.dataset.treinamento;
    const valor = Number(target.dataset.value);
    const atual = this.actor.system.treinamentos?.[id] ?? 0;
    await this.actor.update({ [`system.treinamentos.${id}`]: atual === valor ? valor - 1 : valor });
  }
}
