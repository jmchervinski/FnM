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
      removerDadoVida: FnmCharacterSheet.onRemoverDadoVida
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
    inventario: {
      template: "systems/fnm/templates/actors/parts/character-inventario.html",
      scrollable: [""]
    },
    progressao: {
      template: "systems/fnm/templates/actors/parts/character-progressao.html",
      scrollable: [""]
    },
    conceito: {
      template: "systems/fnm/templates/actors/parts/character-conceito.html",
      scrollable: [""]
    },
    footer: { template: "systems/fnm/templates/actors/parts/actor-footer.html" }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "principal", label: "Principal" },
        { id: "pericias", label: "Perícias" },
        { id: "jujutsu", label: "Perfil Amaldiçoado" },
        { id: "feiticos", label: "Feitiços" },
        { id: "inventario", label: "Inventário" },
        { id: "progressao", label: "Progressão" },
        { id: "conceito", label: "Conceito" }
      ],
      initial: "principal"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.tabs = this._prepareTabs("primary");
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

    // Somatório de espaços ocupados no inventário (p. 129)
    const espacos = [...(context.itens.arma ?? []), ...(context.itens.equipamento ?? [])].reduce(
      (n, i) => n + (i.system.espacos ?? 0) * (i.system.quantidade ?? 1),
      0
    );
    context.espacosOcupados = espacos;

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

    if (partId === "conceito") {
      context.enrichedBiografia = await enriquecer(this.actor.system.biografia);
      context.enrichedDominio = await enriquecer(this.actor.system.aspectos?.dominioInato);
      context.enrichedAnotacoes = await enriquecer(this.actor.system.anotacoes);
    }
    return context;
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
}
