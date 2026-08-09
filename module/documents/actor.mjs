/**
 * Actor de Feiticeiros & Maldições (não-oficial).
 *
 * Concentra a execução das regras de rolagem do Livro de Regras v2.5.2:
 * testes d20 com vantagem/desvantagem (p. 282), Testes de Resistência (p. 280),
 * jogadas de ataque e dano com crítico/desastre (p. 307), conjuração de
 * Feitiços com gasto de PE (p. 199), Portas da Morte (p. 313) e descansos
 * (p. 335).
 */
import { FNM, custoSustento } from "../config.mjs";

/** Constrói a fórmula do d20 conforme vantagem/desvantagem (p. 282). */
function formulaD20(vantagem = 0) {
  if (vantagem > 0) return "2d20kh";
  if (vantagem < 0) return "2d20kl";
  return "1d20";
}

/** Rótulo em texto do estado de vantagem, para a carta do chat. */
function rotuloVantagem(vantagem) {
  if (vantagem > 0) return " (com vantagem)";
  if (vantagem < 0) return " (com desvantagem)";
  return "";
}

export class FnmActor extends Actor {
  /** @override */
  getRollData() {
    return this.system.getRollData?.() ?? super.getRollData();
  }

  /* ------------------------------------------ */
  /*  Diálogo padrão de teste                   */
  /* ------------------------------------------ */

  /**
   * Abre o diálogo comum a todos os testes d20: bônus situacional, CD e
   * vantagem/desvantagem. Vantagem e desvantagem se anulam (p. 282), então o
   * diálogo oferece as três opções como um único seletor.
   */
  async _dialogoTeste(titulo, { cd = 15, mostrarCD = true } = {}) {
    const campoCD = mostrarCD
      ? `<div class="form-group">
           <label>Classe de Dificuldade</label>
           <input type="number" name="cd" value="${cd}" step="1" />
         </div>`
      : "";

    return foundry.applications.api.DialogV2.prompt({
      window: { title: `${titulo} — ${this.name}` },
      content: `
        <div class="form-group">
          <label>Bônus situacional</label>
          <input type="number" name="situacional" value="0" step="1" autofocus />
        </div>
        <div class="form-group">
          <label>Rolagem</label>
          <select name="vantagem">
            <option value="0">Normal</option>
            <option value="1">Vantagem</option>
            <option value="-1">Desvantagem</option>
          </select>
        </div>
        ${campoCD}
        <p class="hint">Vantagem e desvantagem de fontes diferentes se anulam (p. 282).</p>`,
      rejectClose: false,
      ok: {
        label: "Rolar",
        icon: "fa-solid fa-dice-d20",
        callback: (event, button) => ({
          situacional: Number(button.form.elements.situacional?.value ?? 0) || 0,
          vantagem: Number(button.form.elements.vantagem?.value ?? 0) || 0,
          cd: Number(button.form.elements.cd?.value ?? cd) || cd
        })
      }
    });
  }

  /**
   * Executa um teste d20 + bônus contra uma CD, montando a carta do chat com
   * o grau de sucesso. Um 20 natural em Teste de Resistência eleva o nível de
   * sucesso em um (p. 281).
   */
  async executarTeste({
    label,
    bonus = 0,
    situacional = 0,
    cd = null,
    vantagem = 0,
    ehResistencia = false,
    mestre = false,
    linhasExtras = []
  } = {}) {
    const total = bonus + situacional;
    const roll = new Roll(`${formulaD20(vantagem)} + @bonus`, { bonus: total });
    await roll.evaluate();

    const natural = roll.dice[0]?.total ?? 0;
    const linhas = [...linhasExtras];
    let veredito = "";

    if (cd !== null) {
      let sucesso = roll.total >= cd;
      // Sucesso crítico só existe se você for mestre no teste (p. 281)
      let critico = ehResistencia && mestre && sucesso && roll.total >= cd + 10;

      if (ehResistencia && natural === 20) {
        if (!sucesso) {
          sucesso = true;
          linhas.push("<b>20 natural:</b> o nível de sucesso sobe um grau — falha vira sucesso.");
        } else if (mestre && !critico) {
          critico = true;
          linhas.push("<b>20 natural:</b> o sucesso comum vira sucesso crítico.");
        }
      }

      veredito = critico
        ? "🌟 Sucesso Crítico"
        : sucesso
          ? "✅ Sucesso"
          : "❌ Falha";
      veredito = ` — CD ${cd}: ${veredito}`;
    }

    const detalheBonus = situacional
      ? ` (bônus ${bonus >= 0 ? "+" : ""}${bonus}, situacional ${situacional >= 0 ? "+" : ""}${situacional})`
      : "";

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        `<b>${label}</b>${detalheBonus}${rotuloVantagem(vantagem)}${veredito}` +
        (linhas.length ? `<br>${linhas.join("<br>")}` : "")
    });

    return { roll, total: roll.total, natural };
  }

  /* ------------------------------------------ */
  /*  Perícias e Resistências                   */
  /* ------------------------------------------ */

  /** Teste de Perícia (p. 278). */
  async rolarPericia(id) {
    const pericia = this.system.pericias?.[id];
    if (!pericia) return ui.notifications.error(`Perícia desconhecida: ${id}`);

    if (pericia.bloqueada) {
      const seguir = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${pericia.nome} exige treinamento` },
        content: `<p><b>${pericia.nome}</b> só pode ser usada por personagens Treinados
          (p. 284-287). Rolar mesmo assim?</p>`,
        rejectClose: false
      });
      if (!seguir) return null;
    }

    const dados = await this._dialogoTeste(`Teste de ${pericia.nome}`);
    if (!dados) return null;

    const nome = pericia.especialidade
      ? `${pericia.nome} (${pericia.especialidade})`
      : pericia.nome;
    return this.executarTeste({
      label: `Teste de ${nome}`,
      bonus: pericia.total,
      ...dados
    });
  }

  /** Teste de Resistência (p. 280). */
  async rolarResistencia(id) {
    const resistencia = this.system.resistencias?.[id];
    if (!resistencia) return ui.notifications.error(`Resistência desconhecida: ${id}`);

    const dados = await this._dialogoTeste(`TR de ${resistencia.nome}`);
    if (!dados) return null;

    return this.executarTeste({
      label: `Teste de Resistência de ${resistencia.nome}`,
      bonus: resistencia.total,
      ehResistencia: true,
      mestre: resistencia.mestre,
      ...dados
    });
  }

  /** Teste de atributo puro, para situações fora das perícias. */
  async rolarAtributo(chave) {
    const attr = this.system.atributos?.[chave];
    if (!attr) return ui.notifications.error(`Atributo desconhecido: ${chave}`);

    const dados = await this._dialogoTeste(`Teste de ${attr.label}`);
    if (!dados) return null;

    return this.executarTeste({
      label: `Teste de ${attr.label}`,
      bonus: attr.mod + this.system.penalidadeGlobal,
      ...dados
    });
  }

  /** Iniciativa = 1d20 + modificador de Destreza + outros bônus (p. 291). */
  getInitiativeRoll() {
    return new Roll("1d20 + @iniciativa", this.getRollData());
  }

  /* ------------------------------------------ */
  /*  Ataques                                   */
  /* ------------------------------------------ */

  /**
   * Jogada de ataque com uma arma (p. 279). Corpo a corpo usa Força — ou
   * Destreza, se a arma tiver Fineza. Ataques a distância usam Destreza.
   */
  async rolarAtaqueArma(item) {
    const sys = item.system;
    const s = this.system;
    const distancia = ["A Distância", "De Arremesso"].includes(sys.categoria);

    // Arremesso pode usar Força ou Destreza; escolhemos o melhor (p. 306)
    let chaveAttr;
    if (sys.categoria === "A Distância") chaveAttr = "destreza";
    else if (sys.categoria === "De Arremesso") {
      chaveAttr =
        s.atributos.destreza.mod >= s.atributos.forca.mod ? "destreza" : "forca";
    } else if (sys.fineza && s.atributos.destreza.mod > s.atributos.forca.mod) {
      chaveAttr = "destreza";
    } else chaveAttr = "forca";

    const modAttr = s.atributos[chaveAttr].mod;
    // Sem treinamento na arma você não soma o Bônus de Treinamento (p. 131)
    const treino = sys.treinado ? s.bonusTreinamento : 0;
    const bonus = modAttr + s.metadeNivel + treino + sys.bonusAtaque + s.penalidadeGlobal;

    const dados = await this._dialogoTeste(`Ataque: ${item.name}`, { cd: 15 });
    if (!dados) return null;

    const roll = new Roll(`${formulaD20(dados.vantagem)} + @bonus`, {
      bonus: bonus + dados.situacional
    });
    await roll.evaluate();
    const natural = roll.dice[0]?.total ?? 0;

    const critico = natural >= sys.critico;
    const desastre = natural === 1;
    const linhas = [
      `<b>Atributo:</b> ${s.atributos[chaveAttr].label} (${modAttr >= 0 ? "+" : ""}${modAttr})` +
        ` · <b>Treinado:</b> ${sys.treinado ? "sim" : "não"}` +
        (distancia && sys.alcance ? ` · <b>Alcance:</b> ${sys.alcance}` : "")
    ];
    if (critico) {
      linhas.push(
        `🌟 <b>Acerto Crítico!</b> Um crítico sempre acerta e dobra os dados de dano (p. 307).` +
          (sys.grupo && FNM.gruposArma[sys.grupo]
            ? `<br><i>Efeito de crítico (${FNM.gruposArma[sys.grupo].nome}):</i> ${FNM.gruposArma[sys.grupo].critico}`
            : "")
      );
    }
    if (desastre) {
      linhas.push(
        "💥 <b>Desastre!</b> O ataque sempre erra e o alvo pode atacá-lo como reação (p. 307)."
      );
    }
    if (cdAlvoInformada(dados.cd)) {
      const acerta = critico || (!desastre && roll.total >= dados.cd);
      linhas.push(`<b>Contra Defesa ${dados.cd}:</b> ${acerta ? "acerta" : "erra"}`);
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `⚔️ <b>${item.name}</b>${rotuloVantagem(dados.vantagem)}<br>${linhas.join("<br>")}`
    });

    return { roll, critico, desastre, chaveAttr };
  }

  /** Rolagem de dano de uma arma (p. 306). Crítico dobra os dados, não os modificadores. */
  async rolarDanoArma(item, { critico = false, versatil = false, chaveAttr = null } = {}) {
    const sys = item.system;
    const s = this.system;

    const chave =
      chaveAttr ??
      (["A Distância"].includes(sys.categoria)
        ? "destreza"
        : sys.fineza && s.atributos.destreza.mod > s.atributos.forca.mod
          ? "destreza"
          : "forca");
    const modAttr = s.atributos[chave].mod;

    const base = (versatil && sys.danoVersatil ? sys.danoVersatil : sys.dano) || "0";
    // No crítico, jogam-se todos os dados de dano duas vezes (p. 307)
    const dados = critico ? `(${base}) + (${base})` : base;
    const formula = `${dados} + @mod + @extra`;

    const roll = new Roll(formula, { mod: modAttr, extra: sys.bonusDano });
    await roll.evaluate();

    const tipo = FNM.tiposDano[sys.tipoDano]?.nome ?? "";
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        `🩸 <b>Dano — ${item.name}</b>${critico ? " (Crítico)" : ""}` +
        (tipo ? ` · ${tipo}` : "")
    });
    return roll;
  }

  /** Ataque desarmado (p. 305). Todo personagem é treinado nele. */
  async rolarDesarmado() {
    const s = this.system;
    const bonus =
      s.atributos.forca.mod + s.metadeNivel + s.bonusTreinamento + s.penalidadeGlobal;
    const dados = await this._dialogoTeste("Ataque Desarmado", { cd: 15 });
    if (!dados) return null;

    const resultado = await this.executarTeste({
      label: "Ataque Desarmado",
      bonus,
      ...dados,
      linhasExtras: [`<b>Dano:</b> ${s.danoDesarmado} + Força (grupo Pugilato)`]
    });

    const critico = resultado.natural === 20;
    const base = s.danoDesarmado;
    const roll = new Roll(critico ? `(${base}) + (${base}) + @mod` : `${base} + @mod`, {
      mod: s.atributos.forca.mod
    });
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `🩸 <b>Dano Desarmado</b>${critico ? " (Crítico)" : ""} · Impacto`
    });
    return resultado;
  }

  /* ------------------------------------------ */
  /*  Feitiços                                  */
  /* ------------------------------------------ */

  /**
   * Conjura um Feitiço: verifica acesso ao nível, cobra os PE (com o acréscimo
   * do Estado da Alma, p. 312), resolve ataque ou TR e rola o dano.
   */
  async conjurarFeitico(item) {
    const sys = item.system;
    const s = this.system;

    // Restringidos não possuem energia amaldiçoada (p. 114)
    if (s.ehRestringido) {
      return ui.notifications.warn(
        `${this.name} é um Restringido e não possui energia amaldiçoada para conjurar Feitiços.`
      );
    }

    const disponiveis = s.niveisFeiticoDisponiveis ?? ["0"];
    if (sys.nivel !== "max" && !disponiveis.includes(sys.nivel)) {
      const seguir = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Nível de Feitiço acima do acesso" },
        content: `<p><b>${this.name}</b> (nível ${s.nivel ?? this.system.detalhes.nivel}) ainda não tem
          acesso a Feitiços de ${sys.nivelLabel} (p. 199). Conjurar mesmo assim?</p>`,
        rejectClose: false
      });
      if (!seguir) return null;
    }

    // Estados da Alma aumentam o custo de todas as habilidades (p. 312)
    const custo = sys.custoEfetivo + (s.alma?.custoExtra ?? 0);
    const pe = s.recursos.pe;
    if (custo > pe.value) {
      return ui.notifications.warn(
        `PE insuficiente: ${item.name} custa ${custo} PE e ${this.name} tem ${pe.value}.`
      );
    }

    const linhas = [
      `<b>Nível:</b> ${sys.nivelLabel} · <b>Tipo:</b> ${sys.tipo} · <b>Conjuração:</b> ${sys.conjuracao}`,
      `<b>Alcance:</b> ${sys.alcance || `${sys.alcancePadrao} metros`} · <b>Alvo:</b> ${sys.alvo}` +
        (sys.area.formato ? ` · <b>Área:</b> ${sys.area.formato} de ${sys.area.tamanho} m` : ""),
      `<b>Duração:</b> ${sys.duracao}` +
        (sys.duracao === "Sustentado"
          ? ` (${custoSustento(sys.nivel)} PE por rodada para sustentar)`
          : "")
    ];
    if (sys.requisito) linhas.push(`<b>Requisito:</b> ${sys.requisito}`);

    let custoTotal = custo;
    if (s.alma?.custoExtra) {
      linhas.push(
        `⚠️ <b>Alma ${s.alma.estado}:</b> +${s.alma.custoExtra} PE no custo (p. 312).`
      );
    }

    await this.update({ "system.recursos.pe.value": pe.value - custoTotal });
    linhas.push(`<b>PE:</b> -${custoTotal} → ${pe.value - custoTotal}/${pe.max}`);

    // Resolução: teste de ataque amaldiçoado ou TR imposto ao alvo (p. 280/205)
    if (sys.resolucao === "resistencia") {
      const nomeTR = FNM.resistencias[sys.resistencia]?.nome ?? "à escolha do Narrador";
      linhas.push(
        `<b>Teste de Resistência:</b> ${nomeTR} contra <b>CD ${s.cdAmaldicoada}</b>` +
          (sys.nivel === "0"
            ? " (sucesso anula o dano)"
            : " (sucesso reduz o dano à metade)")
      );
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<div class="fnm-carta"><h3>🌀 ${item.name}</h3>` +
        `<p>${linhas.join("<br>")}</p>` +
        (sys.description ? `<div class="fnm-carta-desc">${sys.description}</div>` : "") +
        `</div>`
    });

    if (sys.resolucao === "ataque") {
      const dados = await this._dialogoTeste(`Ataque Amaldiçoado: ${item.name}`, { cd: 15 });
      if (dados) {
        await this.executarTeste({
          label: `Ataque Amaldiçoado — ${item.name}`,
          bonus: s.ataqueAmaldicoado,
          ...dados
        });
      }
    }

    const formulaDano = sys.dano || sys.danoPadrao;
    if (formulaDano) {
      const roll = new Roll(formulaDano, this.getRollData());
      await roll.evaluate();
      const tipo = FNM.tiposDano[sys.tipoDano]?.nome ?? "";
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: `🩸 <b>Dano — ${item.name}</b>${tipo ? ` · ${tipo}` : ""}`
      });
    }

    return true;
  }

  /* ------------------------------------------ */
  /*  Dano, cura e Portas da Morte              */
  /* ------------------------------------------ */

  /**
   * Aplica dano respeitando PV temporários e Redução de Dano. Dano na Alma
   * atravessa tudo e reduz também a vida máxima (p. 311).
   */
  async aplicarDano(quantidade, { tipo = "", ignorarRD = false } = {}) {
    const s = this.system;
    let dano = Math.max(0, Math.floor(Number(quantidade) || 0));
    const linhas = [];
    const naAlma = tipo === "alma";

    if (!naAlma && !ignorarRD && s.combate.reducaoDanoTotal > 0) {
      const rd = Math.min(dano, s.combate.reducaoDanoTotal);
      dano -= rd;
      linhas.push(`Redução de Dano absorveu ${rd}.`);
    }

    const atualizacoes = {};
    let restante = dano;

    if (!naAlma && s.recursos.pvTemporario > 0) {
      const absorvido = Math.min(s.recursos.pvTemporario, restante);
      atualizacoes["system.recursos.pvTemporario"] = s.recursos.pvTemporario - absorvido;
      restante -= absorvido;
      if (absorvido) linhas.push(`PV temporários absorveram ${absorvido}.`);
    }

    const novoPV = s.recursos.pv.value - restante;
    atualizacoes["system.recursos.pv.value"] = novoPV;

    if (naAlma) {
      // Dano na Alma é perda de vida: reduz a vida máxima junto da atual (p. 311)
      atualizacoes["system.recursos.pv.ajuste"] = s.recursos.pv.ajuste - restante;
      atualizacoes["system.recursos.integridade.value"] = Math.max(
        0,
        s.recursos.integridade.value - restante
      );
      linhas.push(
        `<b>Dano na Alma:</b> ignora defesas e resistências, reduz a vida máxima e a Integridade (p. 311).`
      );
    }

    // Já nas Portas da Morte, receber dano adiciona uma falha (p. 313)
    if (s.morrendo && restante > 0) {
      atualizacoes["system.morte.falhas"] = Math.min(3, s.morte.falhas + 1);
      linhas.push("Receber dano enquanto morrendo adiciona <b>uma falha</b> nas Portas da Morte.");
    }

    // Ferimento Complexo: metade da vida máxima ou mais, com mínimo 50 (p. 313)
    if (dano >= Math.max(50, Math.ceil(s.recursos.pv.max / 2))) {
      linhas.push("⚠️ Dano massivo: o alvo recebe um <b>Ferimento Complexo</b> (p. 313-314).");
    }
    // Dano que ultrapassa o máximo de vida em negativo mata na hora (p. 313)
    if (novoPV <= -s.recursos.pv.max) {
      linhas.push("💀 A vida caiu além do negativo do máximo: <b>morte imediata</b>, sem Portas da Morte.");
    } else if (novoPV <= 0 && s.recursos.pv.value > 0) {
      linhas.push("💀 A vida chegou a 0: o personagem entra nas <b>Portas da Morte</b> (p. 313).");
    }

    await this.update(atualizacoes);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<b>${this.name}</b> sofre <b>${dano}</b> de dano` +
        (tipo ? ` (${FNM.tiposDano[tipo]?.nome ?? tipo})` : "") +
        ` → ${novoPV}/${s.recursos.pv.max} PV.` +
        (linhas.length ? `<br>${linhas.join("<br>")}` : "")
    });
  }

  /** Cura pontos de vida, sem ultrapassar o máximo. */
  async curar(quantidade) {
    const s = this.system;
    const cura = Math.max(0, Math.floor(Number(quantidade) || 0));
    const novo = Math.min(s.recursos.pv.max, s.recursos.pv.value + cura);
    const atualizacoes = { "system.recursos.pv.value": novo };

    // Ao sair das Portas da Morte, os contadores de morte são zerados (p. 313)
    const estabilizou = s.recursos.pv.value <= 0 && novo > 0;
    if (estabilizou) {
      atualizacoes["system.morte.sucessos"] = 0;
      atualizacoes["system.morte.falhas"] = 0;
    }

    await this.update(atualizacoes);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<b>${this.name}</b> recupera <b>${cura}</b> PV → ${novo}/${s.recursos.pv.max}.` +
        (estabilizou ? " <b>Estabilizado!</b>" : "")
    });
  }

  /**
   * Rolagem das Portas da Morte (p. 313): 1 = duas falhas, 2-9 = uma falha,
   * 10-19 = um sucesso, 20 = dois sucessos.
   */
  async rolarTesteDeMorte() {
    const s = this.system;
    if (!s.morrendo) {
      return ui.notifications.warn(`${this.name} não está nas Portas da Morte.`);
    }

    const roll = new Roll("1d20");
    await roll.evaluate();
    const r = roll.total;

    let sucessos = s.morte.sucessos;
    let falhas = s.morte.falhas;
    let texto;

    if (r === 1) {
      falhas += 2;
      texto = "1 natural — <b>duas falhas</b>.";
    } else if (r <= 9) {
      falhas += 1;
      texto = "<b>Uma falha.</b>";
    } else if (r <= 19) {
      sucessos += 1;
      texto = "<b>Um sucesso.</b>";
    } else {
      sucessos += 2;
      texto = "20 natural — <b>dois sucessos</b>.";
    }

    sucessos = Math.min(3, sucessos);
    falhas = Math.min(3, falhas);
    const atualizacoes = { "system.morte.sucessos": sucessos, "system.morte.falhas": falhas };

    if (sucessos >= 3) {
      // Estabilizado fica com 1 ponto de vida e sai das Portas da Morte (p. 313)
      atualizacoes["system.recursos.pv.value"] = 1;
      atualizacoes["system.morte.sucessos"] = 0;
      atualizacoes["system.morte.falhas"] = 0;
      texto += " <b>Estabilizado!</b> O personagem volta com 1 PV.";
    } else if (falhas >= 3) {
      texto += " 💀 <b>O personagem morre.</b>";
    } else {
      texto += ` (Sucessos ${sucessos}/3 · Falhas ${falhas}/3)`;
    }

    await this.update(atualizacoes);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `☠️ <b>Portas da Morte</b> — ${texto}`
    });
    return roll;
  }

  /* ------------------------------------------ */
  /*  Descansos e Exaustão                      */
  /* ------------------------------------------ */

  /**
   * Descanso Curto (p. 335): metade do máximo de PE e a possibilidade de
   * gastar Dados de Vida para se curar (cada dado soma o modificador de
   * Constituição). Restringidos recuperam metade da Estamina.
   */
  async descansoCurto({ dadosGastos = 0 } = {}) {
    const s = this.system;
    const atualizacoes = {};
    const linhas = [];

    const pe = Math.min(s.recursos.pe.max, s.recursos.pe.value + Math.floor(s.recursos.pe.max / 2));
    atualizacoes["system.recursos.pe.value"] = pe;
    linhas.push(`PE: ${s.recursos.pe.value} → ${pe}/${s.recursos.pe.max} (metade do máximo).`);

    if (s.recursos.estamina.max > 0) {
      const est = Math.min(
        s.recursos.estamina.max,
        s.recursos.estamina.value + Math.floor(s.recursos.estamina.max / 2)
      );
      atualizacoes["system.recursos.estamina.value"] = est;
      linhas.push(`Estamina: ${s.recursos.estamina.value} → ${est}/${s.recursos.estamina.max}.`);
    }

    if (dadosGastos > 0 && Array.isArray(s.dadosVida) && s.dadosVida.length) {
      const modCon = s.atributos.constituicao.mod;
      const pool = foundry.utils.deepClone(s.dadosVida);
      let restantes = dadosGastos;
      const formulas = [];

      for (const entrada of pool) {
        while (restantes > 0 && entrada.gastos < entrada.total) {
          entrada.gastos += 1;
          restantes -= 1;
          formulas.push(`1${entrada.dado}`);
        }
      }

      if (formulas.length) {
        const roll = new Roll(`${formulas.join(" + ")} + @bonus`, {
          bonus: modCon * formulas.length
        });
        await roll.evaluate();
        const cura = Math.max(0, roll.total);
        const novoPV = Math.min(s.recursos.pv.max, s.recursos.pv.value + cura);
        atualizacoes["system.recursos.pv.value"] = novoPV;
        atualizacoes["system.dadosVida"] = pool;
        linhas.push(
          `Dados de Vida (${formulas.length}): curou <b>${cura}</b> PV → ${novoPV}/${s.recursos.pv.max}.`
        );
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this }),
          flavor: `🛏️ <b>Dados de Vida</b> (+${modCon} de Constituição por dado)`
        });
      }
    }

    await this.update(atualizacoes);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `🛏️ <b>${this.name}</b> realiza um <b>Descanso Curto</b>.<br>${linhas.join("<br>")}`
    });
  }

  /**
   * Descanso Longo (p. 335): recupera todos os PV, PE e Dados de Vida.
   * Também recupera um nível de exaustão (p. 324) e remove as falhas de morte.
   */
  async descansoLongo() {
    const s = this.system;
    const pool = foundry.utils.deepClone(s.dadosVida ?? []).map(d => ({ ...d, gastos: 0 }));

    await this.update({
      "system.recursos.pv.value": s.recursos.pv.max,
      "system.recursos.pe.value": s.recursos.pe.max,
      "system.recursos.estamina.value": s.recursos.estamina.max,
      "system.dadosVida": pool,
      "system.exaustao": Math.max(0, s.exaustao - 1),
      "system.morte.sucessos": 0,
      "system.morte.falhas": 0
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `🌙 <b>${this.name}</b> realiza um <b>Descanso Longo</b>: PV, PE e Dados de Vida ` +
        `restaurados; falhas nas Portas da Morte removidas` +
        (s.exaustao > 0 ? `; exaustão ${s.exaustao} → ${s.exaustao - 1}` : "") +
        `.`
    });
  }

  /** Ajusta os níveis de exaustão e informa os efeitos acumulados (p. 324). */
  async ajustarExaustao(delta) {
    const s = this.system;
    const novo = Math.clamp(s.exaustao + delta, 0, 6);
    await this.update({ "system.exaustao": novo });

    const efeitos = FNM.exaustao.filter(e => e.nivel <= novo).map(e => `${e.nivel}. ${e.efeito}`);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<b>${this.name}</b> — Exaustão ${s.exaustao} → <b>${novo}</b>.` +
        (efeitos.length ? `<br>${efeitos.join("<br>")}` : " Sem efeitos de exaustão.")
    });
  }
}

/** A CD do diálogo só vira "Defesa do alvo" quando o jogador informa um valor. */
function cdAlvoInformada(cd) {
  return Number.isFinite(cd) && cd > 0;
}
