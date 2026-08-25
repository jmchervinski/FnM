/**
 * Item de Feiticeiros & Maldições (não-oficial).
 * Envia o item ao chat com um resumo das suas informações mecânicas.
 */
import { FNM, custoSustento } from "../config.mjs";
import { alvosMarcados } from "../chat.mjs";
import { avisosDeAplicacao, blocoDeCondicoes, resolverCondicoes } from "../condicoes.mjs";

/**
 * Resumo do grau de uma Ferramenta Amaldiçoada (p. 154), comum a armas,
 * escudos e uniformes. O bônus é o do grau atual e não acumula com os
 * anteriores; a contagem de Encantamentos, sim.
 */
function linhasFerramenta(sys) {
  const grau = FNM.grausFerramenta[sys.grau];
  if (!grau) return [];
  // O uniforme não ganha valor numérico do grau: só Encantamentos
  const efeito =
    sys.tipo === "Escudo"
      ? [`RD ${grau.rdEscudo}`]
      : sys.tipo === "Uniforme"
        ? []
        : [`+${grau.bonusArma} no dano`];
  return [
    `<b>Ferramenta Amaldiçoada de ${grau.nome}:</b> ` +
      [...efeito, `${sys.encantamentosPermitidos ?? 0} Encantamento(s)`]
        .concat(grau.unica ? ["habilidade única"] : [])
        .join(" · "),
    ...(sys.encantamentos ? [`<b>Encantamentos:</b> ${sys.encantamentos}`] : [])
  ];
}

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
          `<b>Arma ${sys.categoria} ${sys.tipo}</b>${grupo ? ` · Grupo ${grupo.nome}` : ""}`
        );
        linhas.push(
          `<b>Dano:</b> ${sys.dano}${sys.danoVersatil ? `/${sys.danoVersatil}` : ""}` +
            `${tipo ? ` ${tipo}` : ""} · <b>Crítico:</b> ${sys.critico}`
        );
        if (sys.propriedades) linhas.push(`<b>Propriedades:</b> ${sys.propriedades}`);
        if (sys.alcance) linhas.push(`<b>Alcance:</b> ${sys.alcance}`);
        linhas.push(`<b>Espaços:</b> ${sys.espacos} · <b>Custo:</b> ${sys.custo}`);
        linhas.push(...linhasFerramenta(sys));
        if (grupo) linhas.push(`<i>Efeito de crítico:</i> ${grupo.critico}`);
        break;
      }
      case "equipamento": {
        linhas.push(
          `<b>${sys.tipo}</b>${sys.categoria ? ` · ${sys.categoria}` : ""}` +
            `${sys.acao ? ` · ${sys.acao}` : ""}`
        );
        if (sys.alvo) linhas.push(`<b>Aplica-se a:</b> ${sys.alvo}`);
        if (sys.prerequisito) linhas.push(`<b>Pré-Requisito:</b> ${sys.prerequisito}`);
        const efeitos = [];
        if (sys.defesa) efeitos.push(`Defesa +${sys.defesa}`);
        if (sys.rdTotal) efeitos.push(`Redução de Dano ${sys.rdTotal}`);
        if (sys.penalidade) efeitos.push(`${sys.penalidade} em perícias de Destreza`);
        if (sys.dano) efeitos.push(`dano ${sys.dano}`);
        if (efeitos.length) linhas.push(`<b>Enquanto equipado:</b> ${efeitos.join(" · ")}`);
        linhas.push(
          `<b>Espaços:</b> ${sys.espacos} · <b>Custo:</b> ${sys.custo} · <b>Qtd.:</b> ${sys.quantidade}`
        );
        linhas.push(...linhasFerramenta(sys));
        break;
      }
      case "tecnicaMarcial": {
        linhas.push(
          `<b>${sys.nivelLabel}</b> · <b>${sys.custoEfetivo} Estamina</b> · ${sys.execucao}`
        );
        linhas.push(
          `<b>Alcance:</b> ${sys.alcance || `${sys.alcancePadrao} metros`} · <b>Alvo:</b> ${sys.alvo}` +
            (sys.area.formato ? ` · <b>Área:</b> ${sys.area.formato} de ${sys.area.tamanho} m` : "")
        );
        linhas.push(`<b>Duração:</b> ${sys.duracao}`);
        if (sys.resolucao === "resistencia") {
          const tr = FNM.resistencias[sys.resistencia]?.nome ?? "a definir";
          const cd = this.actor?.system?.cdEspecializacao;
          linhas.push(`<b>Teste de Resistência:</b> ${tr}${cd ? ` contra <b>CD ${cd}</b>` : ""}`);
        } else if (sys.resolucao === "ataque") {
          linhas.push("<b>Resolução:</b> jogada de ataque");
        }
        const danoMarcial = sys.dano || sys.danoPadrao;
        if (danoMarcial) {
          const tipo = FNM.tiposDano[sys.tipoDano]?.nome;
          linhas.push(`<b>Dano:</b> ${danoMarcial}${tipo ? ` (${tipo})` : ""}`);
        }
        if (sys.requisito) linhas.push(`<b>Requisito:</b> ${sys.requisito}`);
        break;
      }
      case "acaoInvocacao": {
        const partes = [sys.tipo];
        if (sys.categoria) partes.push(sys.categoria);
        if (sys.custoPE) partes.push(`${sys.custoPE} PE`);
        linhas.push(`<b>${partes.join(" · ")}</b>`);
        if (sys.alvo) linhas.push(`<b>Alvo:</b> ${sys.alvo}`);
        if (sys.resolucao === "resistencia") {
          const tr = FNM.resistencias[sys.resistencia]?.nome ?? "a definir";
          const cd = this.actor?.system?.cdAcao;
          linhas.push(
            `<b>Teste de Resistência:</b> ${tr}` +
              (cd ? ` contra <b>CD ${cd} + modificador do atributo</b> (p. 263)` : "")
          );
        } else if (sys.resolucao === "ataque") {
          linhas.push("<b>Resolução:</b> jogada de ataque da Invocação");
        }
        if (sys.dano) {
          const tipo = FNM.tiposDano[sys.tipoDano]?.nome;
          linhas.push(`<b>Dano:</b> ${sys.dano}${tipo ? ` (${tipo})` : ""}`);
        }
        if (sys.cura) linhas.push(`<b>Cura:</b> ${sys.cura}`);
        const alcance = [];
        if (sys.alcance) alcance.push(`${sys.alcance} m`);
        if (sys.area) alcance.push(`área de ${sys.area} m${sys.formatoArea ? ` (${sys.formatoArea})` : ""}`);
        if (alcance.length) linhas.push(`<b>Alcance:</b> ${alcance.join(" · ")}`);
        if (sys.prejuizoAuxilio) {
          linhas.push(`<b>Prejuízo por múltiplos auxílios:</b> ${sys.prejuizoAuxilio}`);
        }
        break;
      }
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

  /**
   * As condições que este item aplica, resolvidas contra a CD de quem o usa.
   * Um item na mochila, sem ator, ainda mostra a lista — só sem CD nenhuma.
   */
  condicoesAplicadas() {
    const lista = this.system.condicoes ?? [];
    if (!lista.length) return [];
    const s = this.actor?.system;
    const cd =
      this.type === "feitico"
        ? (s?.cdAmaldicoada ?? null)
        : this.type === "acaoInvocacao"
          ? (this.actor?.cdDaAcaoInvocacao?.(this) ?? null)
          : (s?.cdEspecializacao ?? null);

    return resolverCondicoes(lista, {
      nivelItem: this.system.nivel ?? "",
      foco: this.system.focoEmCondicoes === true,
      cd,
      resistencia: this.system.resistencia ?? ""
    });
  }

  /** Envia o item ao chat com o resumo mecânico e a descrição. */
  async roll() {
    const linhas = this._resumo();
    const condicoes = this.condicoesAplicadas();
    linhas.push(
      ...avisosDeAplicacao(condicoes, this.system.nivel ?? "", this.system.focoEmCondicoes === true)
    );

    const descricao = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.system.description ?? "",
      { rollData: this.getRollData(), relativeTo: this }
    );
    const bloco = await blocoDeCondicoes(condicoes);

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content:
        `<div class="fnm-carta">` +
        `<h3><img src="${this.img}" width="28" height="28" /> ${this.name}</h3>` +
        (linhas.length ? `<p>${linhas.join("<br>")}</p>` : "") +
        (descricao ? `<div class="fnm-carta-desc">${descricao}</div>` : "") +
        `</div>` +
        bloco,
      flags: {
        fnm: {
          tipo: "efeito",
          atorId: this.actor?.id ?? null,
          itemId: this.id,
          alvos: alvosMarcados(),
          origemNome: this.name,
          condicoes
        }
      }
    });
  }
}
