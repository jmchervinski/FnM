/**
 * Item de Feiticeiros & Maldições (não-oficial).
 * Envia o item ao chat com um resumo das suas informações mecânicas.
 */
import { FNM, custoSustento } from "../config.mjs";

export class FnmItem extends Item {
  /** @override */
  getRollData() {
    const data = this.actor?.getRollData() ?? {};
    return { ...data, item: this.system };
  }

  /** Linhas de resumo mecânico, específicas de cada tipo de item. */
  _resumo() {
    const sys = this.system;
    const linhas = [];

    switch (this.type) {
      case "origem": {
        const origem = FNM.origens.find(o => o.id === sys.origem);
        linhas.push(`<b>Origem:</b> ${origem?.nome ?? sys.origem}`);
        if (sys.cla) linhas.push(`<b>Clã:</b> ${sys.cla}`);
        if (sys.bonusAtributos) linhas.push(`<b>Bônus em Atributo:</b> ${sys.bonusAtributos}`);
        break;
      }
      case "especializacao": {
        const cfg = FNM.especializacoes.find(e => e.id === sys.especializacao);
        linhas.push(`<b>Especialização:</b> ${cfg?.nome ?? sys.especializacao} (nível ${sys.niveis})`);
        if (cfg) {
          linhas.push(
            `<b>PV:</b> ${cfg.pvPrimeiro} no 1º nível · ${cfg.dadoVida} (ou ${cfg.pvFixo}) nos seguintes` +
              ` · <b>${cfg.estamina ? "Estamina" : "PE"}:</b> ${cfg.estamina ?? cfg.pe} por nível`
          );
        }
        if (sys.atributoChave) {
          linhas.push(`<b>Atributo Chave:</b> ${FNM.atributos[sys.atributoChave]?.nome ?? ""}`);
        }
        break;
      }
      case "habilidade":
        linhas.push(`<b>Nível requerido:</b> ${sys.nivelRequerido}`);
        if (sys.especializacao) linhas.push(`<b>Especialização:</b> ${sys.especializacao}`);
        if (sys.acao) linhas.push(`<b>Ação:</b> ${sys.acao}`);
        if (sys.custoPE) linhas.push(`<b>Custo:</b> ${sys.custoPE} PE`);
        break;
      case "talento":
        linhas.push(`<b>Talento ${sys.categoria}</b>`);
        if (sys.prerequisito) linhas.push(`<b>Pré-requisito:</b> ${sys.prerequisito}`);
        break;
      case "aptidao": {
        linhas.push(`<b>Aptidão de ${sys.categoria}</b>`);
        if (sys.areaAptidao && sys.nivelAptidao) {
          const area = FNM.niveisAptidao[sys.areaAptidao];
          linhas.push(`<b>Nível de Aptidão:</b> ${area?.sigla ?? sys.areaAptidao} ${sys.nivelAptidao}`);
        }
        if (sys.prerequisito) linhas.push(`<b>Pré-requisito:</b> ${sys.prerequisito}`);
        if (sys.acao) linhas.push(`<b>Ação:</b> ${sys.acao}`);
        if (sys.custoPE) linhas.push(`<b>Custo:</b> ${sys.custoPE} PE`);
        break;
      }
      case "tecnica":
        linhas.push(`<b>Técnica ${sys.tipo}</b>`);
        if (sys.atributo) {
          linhas.push(`<b>Atributo da Técnica:</b> ${FNM.atributos[sys.atributo]?.nome ?? ""}`);
        }
        break;
      case "feitico": {
        linhas.push(
          `<b>${sys.nivelLabel}</b> · ${sys.tipo} · <b>Custo:</b> ${sys.custoEfetivo} PE`
        );
        linhas.push(
          `<b>Conjuração:</b> ${sys.conjuracao} · <b>Alcance:</b> ` +
            `${sys.alcance || `${sys.alcancePadrao} metros`} · <b>Alvo:</b> ${sys.alvo}`
        );
        if (sys.area.formato) {
          linhas.push(`<b>Área:</b> ${sys.area.formato} de ${sys.area.tamanho} metros`);
        }
        linhas.push(
          `<b>Duração:</b> ${sys.duracao}` +
            (sys.duracao === "Sustentado" ? ` (${custoSustento(sys.nivel)} PE/rodada)` : "")
        );
        if (sys.resolucao === "resistencia") {
          const tr = FNM.resistencias[sys.resistencia]?.nome ?? "definido pelo Narrador";
          linhas.push(`<b>Teste de Resistência:</b> ${tr}`);
        } else if (sys.resolucao === "ataque") {
          linhas.push("<b>Resolução:</b> jogada de Ataque Amaldiçoado");
        }
        const dano = sys.dano || sys.danoPadrao;
        if (dano) {
          const tipo = FNM.tiposDano[sys.tipoDano]?.nome;
          linhas.push(`<b>Dano:</b> ${dano}${tipo ? ` (${tipo})` : ""}`);
        }
        if (sys.requisito) linhas.push(`<b>Requisito:</b> ${sys.requisito}`);
        break;
      }
      case "arma": {
        const grupo = FNM.gruposArma[sys.grupo];
        const tipo = FNM.tiposDano[sys.tipoDano]?.nome ?? "";
        linhas.push(
          `<b>Arma ${sys.categoria}</b>${grupo ? ` · Grupo ${grupo.nome}` : ""}`
        );
        linhas.push(
          `<b>Dano:</b> ${sys.dano}${sys.danoVersatil ? `/${sys.danoVersatil}` : ""}` +
            `${tipo ? ` ${tipo}` : ""} · <b>Crítico:</b> ${sys.critico}`
        );
        if (sys.propriedades) linhas.push(`<b>Propriedades:</b> ${sys.propriedades}`);
        if (sys.alcance) linhas.push(`<b>Alcance:</b> ${sys.alcance}`);
        linhas.push(`<b>Espaços:</b> ${sys.espacos} · <b>Custo:</b> ${sys.custo}`);
        if (sys.grau) linhas.push(`<b>Grau:</b> ${sys.grau}`);
        if (grupo) linhas.push(`<i>Efeito de crítico:</i> ${grupo.critico}`);
        break;
      }
      case "equipamento":
        linhas.push(`<b>${sys.tipo}</b>`);
        if (sys.grau) linhas.push(`<b>Grau:</b> ${sys.grau}`);
        linhas.push(
          `<b>Espaços:</b> ${sys.espacos} · <b>Custo:</b> ${sys.custo} · <b>Qtd.:</b> ${sys.quantidade}`
        );
        break;
      case "voto":
        linhas.push(`<b>Voto de Restrição — Peso ${sys.peso}</b>`);
        if (sys.restricao) linhas.push(`<b>Restrição:</b> ${sys.restricao}`);
        break;
    }

    // Ajustes mecânicos concedidos ao dono
    const aj = sys.ajustes ?? {};
    const bonus = Object.entries({
      "PV máx.": aj.pv,
      "PE máx.": aj.pe,
      Defesa: aj.defesa,
      Deslocamento: aj.deslocamento,
      "Redução de Dano": aj.reducaoDano
    })
      .filter(([, v]) => v)
      .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`);
    if (bonus.length) linhas.push(`<b>Ajustes:</b> ${bonus.join(", ")}`);

    return linhas;
  }

  /** Envia o item ao chat com o resumo mecânico e a descrição. */
  async roll() {
    const linhas = this._resumo();
    const descricao = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.system.description ?? "",
      { rollData: this.getRollData(), relativeTo: this }
    );

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content:
        `<div class="fnm-carta">` +
        `<h3><img src="${this.img}" width="28" height="28" /> ${this.name}</h3>` +
        (linhas.length ? `<p>${linhas.join("<br>")}</p>` : "") +
        (descricao ? `<div class="fnm-carta-desc">${descricao}</div>` : "") +
        `</div>`
    });
  }
}
