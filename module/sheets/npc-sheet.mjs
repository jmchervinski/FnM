import { FnmBaseActorSheet } from "./base-actor-sheet.mjs";
import { FNM } from "../config.mjs";

/** Ficha de NPC / Maldição — mais enxuta, com valores manuais por padrão. */
export class FnmNpcSheet extends FnmBaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["fnm-sheet", "fnm-npc"],
    position: { width: 760, height: 820 }
  };

  static PARTS = {
    header: { template: "systems/fnm/templates/actors/parts/npc-header.html" },
    tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["sheet-tabs"] },
    principal: {
      template: "systems/fnm/templates/actors/parts/npc-principal.html",
      scrollable: [""]
    },
    pericias: {
      template: "systems/fnm/templates/actors/parts/character-pericias.html",
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
        { id: "pericias", label: "Perícias" },
        { id: "habilidades", label: "Habilidades" },
        { id: "biografia", label: "Biografia" }
      ],
      initial: "principal"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.tabs = this._prepareTabs("primary");
    context.graus = FNM.graus;
    context.tiposNpc = ["Maldição", "Feiticeiro", "Humano", "Corpo Amaldiçoado", "Outro"];
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    if (partId === "biografia") {
      const enriquecer = html =>
        foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
          secrets: this.document.isOwner,
          rollData: this.actor.getRollData(),
          relativeTo: this.actor
        });
      context.enrichedBiografia = await enriquecer(this.actor.system.biografia);
      context.enrichedTaticas = await enriquecer(this.actor.system.taticas);
    }
    return context;
  }
}
