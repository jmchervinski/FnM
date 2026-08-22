import { FnmBaseActorSheet } from "./base-actor-sheet.mjs";
import { FNM } from "../config.mjs";

/**
 * Ficha de Invocação — shikigamis, corpos amaldiçoados, marionetes e maldições
 * domadas (p. 255-272).
 *
 * Diferente das outras fichas, quase tudo aqui é derivado de duas escolhas: o
 * grau da Invocação e quem é o invocador. A aba Principal mostra o orçamento da
 * criação — pontos de atributo, perícias treinadas e ações — contra o que o
 * grau concede, e a aba Ações traz as tabelas de referência do mesmo grau.
 */
export class FnmInvocacaoSheet extends FnmBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet", "fnm-invocacao"],
    position: { width: 760, height: 800 }
  };

  static PARTS = {
    header: { template: "systems/fnm/templates/actors/parts/invocacao-header.html" },
    tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["sheet-tabs"] },
    principal: {
      template: "systems/fnm/templates/actors/parts/invocacao-principal.html",
      scrollable: [""]
    },
    pericias: {
      template: "systems/fnm/templates/actors/parts/character-pericias.html",
      scrollable: [""]
    },
    acoes: {
      template: "systems/fnm/templates/actors/parts/invocacao-acoes.html",
      scrollable: [""]
    },
    biografia: {
      template: "systems/fnm/templates/actors/parts/npc-biografia.html",
      scrollable: [""]
    },
    footer: { template: "systems/fnm/templates/actors/parts/actor-footer.html" }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "principal", label: "Principal" },
        { id: "pericias", label: "Perícias" },
        { id: "acoes", label: "Ações e Características" },
        { id: "biografia", label: "Biografia" }
      ],
      initial: "principal"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.tabs = this._prepareTabs("primary");
    context.tiposInvocacao = FNM.tiposInvocacao;
    context.tamanhos = FNM.tamanhos;
    context.tiposAcao = FNM.tiposAcaoInvocacao;
    context.grausInvocacao = Object.entries(FNM.grausInvocacao).map(([id, g]) => ({ id, ...g }));

    const grau = FNM.grausInvocacao[sys.detalhes.grau] ?? FNM.grausInvocacao.Quarto;
    context.grauAtual = grau;
    // A fórmula de PV usa frações da Constituição e do nível: mostradas por extenso
    context.fatorCon = grau.pv.con === 0.5 ? "metade" : `${grau.pv.con}x`;
    context.fatorNivel =
      grau.pv.nivel === 1 ? "1x" : `${String(grau.pv.nivel).replace(".", ",")}x`;
    // Uma Ação com Custo gasta no mínimo 1 PE e no máximo 2 por grau (p. 269)
    context.maximoPeAcao = grau.custo;

    // Integridade fica de fora dos TRs que uma Invocação pode treinar (p. 261)
    context.resistenciasTreinaveis = Object.entries(FNM.resistencias)
      .filter(([id]) => id !== "integridade")
      .map(([id, r]) => ({ id, ...r }));

    const invocador = this.actor.system.invocador;
    context.invocadorAtual = invocador;
    context.invocadores = game.actors
      .filter(a => a.type === "character")
      .map(a => ({ id: a.id, name: a.name, selected: a.id === sys.detalhes.invocador }));

    // Ações e Características agrupadas, na ordem em que o livro as apresenta.
    // Cada entrada já traz o que a linha precisa mostrar sobre a automação:
    // como a ação resolve, contra que CD, e que botões fazem sentido.
    context.acoesPorTipo = FNM.tiposAcaoInvocacao
      .map(tipo => ({
        tipo,
        itens: (context.itens.acaoInvocacao ?? [])
          .filter(a => a.system.tipo === tipo)
          .map(item => this._entradaDeAcao(item))
      }))
      .filter(g => g.itens.length);

    // Avisos de orçamento estourado, para a ficha destacar em vermelho
    const o = sys.orcamento ?? {};
    context.excedeuPontos = o.pontos?.gastos > o.pontos?.total;
    context.excedeuPericias = o.pericias?.usadas > o.pericias?.total;
    context.excedeuAcoes = o.acoes?.usadas > o.acoes?.total;
    context.excedeuComCusto = o.acoesComCusto?.usadas > o.acoesComCusto?.total;

    return context;
  }

  /**
   * Uma linha da lista de Ações, com o que a ficha precisa exibir sobre como
   * ela resolve. A CD sai do mesmo cálculo que a automação usa na hora de
   * publicar a carta, para o número da ficha e o da mesa nunca divergirem.
   */
  _entradaDeAcao(item) {
    const sys = item.system;
    const cd = sys.ehResistencia ? this.actor.cdDaAcaoInvocacao(item) : null;
    return {
      item,
      id: item.id,
      name: item.name,
      img: item.img,
      system: sys,
      linhaNome: sys.linhaAtaque === "distancia" ? "A Distância" : "Corpo a Corpo",
      // Só a jogada em que a Invocação foi treinada soma o Bônus de Treinamento
      treinada: this.actor.system.detalhes.ataqueTreinado === sys.linhaAtaque,
      resistenciaNome: FNM.resistencias[sys.resistencia]?.nome ?? "",
      cd
    };
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    if (partId === "biografia") {
      context.enrichedBiografia =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.biografia ?? "",
          { secrets: this.document.isOwner, relativeTo: this.actor }
        );
    }
    return context;
  }
}
