const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import { FNM } from "../config.mjs";

/** Ficha única de item, com os campos variando conforme o tipo. */
export class FnmItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet", "fnm-item"],
    position: { width: 560, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: FnmItemSheet.onEditImage,
      aplicarPadroes: FnmItemSheet.onAplicarPadroes,
      adicionarCondicaoItem: FnmItemSheet.onAdicionarCondicao,
      removerCondicaoItem: FnmItemSheet.onRemoverCondicao,
      adicionarEfeitoItem: FnmItemSheet.onAdicionarEfeito,
      removerEfeitoItem: FnmItemSheet.onRemoverEfeito
    }
  };

  static PARTS = {
    form: { template: "systems/fnm/templates/items/item-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.item.system;

    context.item = this.item;
    context.system = sys;
    // Dado de FONTE: o <prose-mirror> edita o HTML cru, e não o enriquecido —
    // salvar o enriquecido gravaria os links já resolvidos por cima do texto.
    context.source = this.item.toObject().system;
    context.editable = this.isEditable;
    context.config = FNM;

    // Listas de opções usadas pelos selects do formulário
    context.atributos = Object.entries(FNM.atributos).map(([id, a]) => ({ id, ...a }));
    context.resistencias = Object.entries(FNM.resistencias).map(([id, r]) => ({ id, ...r }));
    context.tiposDano = Object.entries(FNM.tiposDano).map(([id, t]) => ({ id, ...t }));
    context.gruposArma = Object.entries(FNM.gruposArma).map(([id, g]) => ({ id, ...g }));
    context.areasAptidao = Object.entries(FNM.niveisAptidao).map(([id, a]) => ({ id, ...a }));
    context.niveisFeitico = FNM.niveisFeitico;
    context.origens = FNM.origens;
    context.especializacoes = FNM.especializacoes;
    context.graus = FNM.graus;
    // Ferramentas Amaldiçoadas usam os cinco degraus da tabela de benefícios,
    // sem os semi-graus da escala de feiticeiros (p. 154)
    context.grausFerramenta = Object.entries(FNM.grausFerramenta).map(([id, g]) => ({ id, ...g }));
    // Ações de Invocação: Integridade e os danos proibidos ficam fora das listas
    context.resistenciasTreinaveis = context.resistencias.filter(r => r.id !== "integridade");
    context.tiposDanoAcao = context.tiposDano.filter(
      t => !["energiaReversa", "alma"].includes(t.id)
    );

    // Catálogo de condições para os <select>, e o aviso de foco só onde ele
    // existe: nível de Feitiço ou de Técnica Marcial (p. 208)
    context.catalogoCondicoes = FNM.condicoes;
    context.temNivelDeCriacao = ["feitico", "tecnicaMarcial"].includes(this.item.type);

    context.chavesEfeito = FnmItemSheet._chavesDeEfeito();

    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.description ?? "", {
        secrets: this.document.isOwner,
        relativeTo: this.item
      });

    if (this.item.type === "tecnica") {
      context.enrichedFuncionamento =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          sys.funcionamento ?? "",
          { secrets: this.document.isOwner, relativeTo: this.item }
        );
    }
    if (this.item.type === "voto") {
      context.enrichedRestricao =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.restricao ?? "", {
          secrets: this.document.isOwner,
          relativeTo: this.item
        });
    }

    return context;
  }

  /**
   * Preenche um Feitiço com os valores padrão do seu nível (p. 205-206):
   * alcance, dano e área conforme a tabela do livro.
   */
  static async onAplicarPadroes() {
    if (this.item.type !== "feitico") return;
    const sys = this.item.system;
    const cfg = FNM.niveisFeitico.find(n => n.id === sys.nivel);
    if (!cfg) return;

    const emArea = sys.alvo === "Área";
    const dano = emArea ? cfg.danoArea : sys.resolucao === "ataque" ? cfg.danoAtaque : cfg.danoTR;

    const atualizacoes = {
      "system.alcance": `${cfg.alcance} metros`,
      "system.dano": dano
    };
    if (emArea && cfg.area) atualizacoes["system.area.tamanho"] = cfg.area;

    await this.item.update(atualizacoes);
    ui.notifications.info(
      `Valores padrão de ${cfg.nome} aplicados: alcance ${cfg.alcance} m, dano ${dano}.`
    );
  }

  /**
   * As chaves possíveis de um efeito, agrupadas por família. O select é um só e
   * mostra todas: o alvo escolhido diz qual grupo faz sentido, e o agregado
   * ignora a chave que não pertence ao alvo.
   */
  static _chavesDeEfeito() {
    const lista = (catalogo, nome) => ({
      nome,
      itens: Object.entries(catalogo).map(([id, c]) => ({ id, nome: c.nome }))
    });
    return [
      lista(FNM.atributos, "Atributos"),
      lista(FNM.pericias, "Perícias"),
      lista(FNM.resistencias, "Testes de Resistência"),
      lista(FNM.tiposAtaque, "Jogadas de Ataque"),
      {
        nome: "Tipos de dano",
        itens: FNM.tiposComRD.map(id => ({ id, nome: FNM.tiposDano[id].nome }))
      }
    ];
  }

  static async onAdicionarEfeito() {
    const lista = this.item.toObject().system.efeitos ?? [];
    await this.item.update({
      "system.efeitos": [...lista, { alvo: "defesa", chave: "", valor: 0, proficiencia: "" }]
    });
  }

  static async onRemoverEfeito(event, target) {
    const idx = Number(target.dataset.idx);
    const lista = this.item.toObject().system.efeitos ?? [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= lista.length) return;
    await this.item.update({ "system.efeitos": lista.filter((_, i) => i !== idx) });
  }

  /**
   * Adiciona uma linha em branco na lista de condições.
   *
   * A gravação é do array inteiro: um ArrayField no Foundry é substituído, não
   * remendado, então tanto adicionar quanto remover reescrevem a lista toda.
   */
  static async onAdicionarCondicao() {
    const lista = this.item.toObject().system.condicoes ?? [];
    await this.item.update({
      "system.condicoes": [...lista, { id: "", nivel: "", rodadas: 0, formula: "" }]
    });
  }

  static async onRemoverCondicao(event, target) {
    const idx = Number(target.dataset.idx);
    const lista = this.item.toObject().system.condicoes ?? [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= lista.length) return;
    await this.item.update({ "system.condicoes": lista.filter((_, i) => i !== idx) });
  }

  /** Abre o FilePicker para trocar a imagem do item. */
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
