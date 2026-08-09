import { FnmBaseActorSheet } from "./base-actor-sheet.mjs";
import { FNM } from "../config.mjs";

/**
 * Ficha de Invocação — shikigamis, corpos amaldiçoados e marionetes
 * controlados por um Controlador ou por uma técnica (p. 256-263).
 */
export class FnmInvocacaoSheet extends FnmBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet", "fnm-invocacao"],
    position: { width: 720, height: 760 }
  };

  static PARTS = {
    header: { template: "systems/fnm/templates/actors/parts/invocacao-header.html" },
    tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["sheet-tabs"] },
    principal: {
      template: "systems/fnm/templates/actors/parts/npc-principal.html",
      scrollable: [""]
    },
    habilidades: {
      template: "systems/fnm/templates/actors/parts/npc-habilidades.html",
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
        { id: "habilidades", label: "Habilidades" },
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
    context.graus = FNM.graus;
    context.tiposInvocacao = FNM.tiposInvocacao;

    // Lista de possíveis invocadores (personagens do mundo)
    context.invocadores = game.actors
      .filter(a => a.type === "character")
      .map(a => ({ id: a.id, name: a.name, selected: a.id === sys.detalhes.invocador }));

    return context;
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
