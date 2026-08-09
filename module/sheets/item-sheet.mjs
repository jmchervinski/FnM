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
      aplicarPadroes: FnmItemSheet.onAplicarPadroes
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
