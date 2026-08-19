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
import { cartaAtaque, cartaDano, cartaResistencia } from "../chat.mjs";

/** Constrói a fórmula do d20 conforme vantagem/desvantagem (p. 282). */
function formulaD20(vantagem = 0) {
  if (vantagem > 0) return "2d20kh";
  if (vantagem < 0) return "2d20kl";
  return "1d20";
}

/**
 * Veredito de uma jogada de ataque (p. 307).
 *
 * A ordem importa: desastre e camuflagem erram antes de qualquer comparação
 * com a Defesa. Um 20 natural sempre acerta, mas um limiar de crítico abaixo
 * de 20 só dobra os dados — ainda precisa vencer a Defesa. Sem Defesa
 * informada a carta sai sem veredito, mas o crítico continua sendo crítico.
 */
export function vereditoAtaque({
  natural,
  total,
  defesa = 0,
  limiarCritico = 20,
  falhouCamuflagem = false
}) {
  if (natural === 1) return "desastre";
  if (falhouCamuflagem) return "camuflagem";
  const critico = natural >= limiarCritico;
  if (!defesa) return critico ? "critico" : "indefinido";
  if (natural === 20 || total >= defesa) return critico ? "critico" : "acerto";
  return "erro";
}

/** Bônus assinado, no formato em que a ficha e as cartas mostram. */
const sinal = valor => (valor >= 0 ? `+${valor}` : `${valor}`);

/**
 * Mantém o total do diálogo de ataque em dia. O atributo e o bônus situacional
 * são os dois campos que mexem na soma; o resto do bônus é fixo e vem pronto do
 * template, em `data-fixos`.
 */
function ligarTotalDoAtaque(raiz) {
  const caixaTotal = raiz?.querySelector?.("[data-fnm-mod=total]");
  const linha = raiz?.querySelector?.("[data-fnm-mod=atributo]");
  const total = caixaTotal?.querySelector(".fnm-valor");
  if (!total || !linha) return;

  const fixos = Number(caixaTotal.dataset.fixos) || 0;
  const seletorAtributo = raiz.querySelector("select[name=atributo]");
  const situacional = raiz.querySelector("input[name=situacional]");

  const atualizar = () => {
    const opcao = seletorAtributo?.selectedOptions[0];
    if (opcao) {
      linha.querySelector(".fnm-rotulo").textContent = opcao.dataset.nome;
      linha.querySelector(".fnm-valor").textContent = sinal(Number(opcao.dataset.mod));
    }
    const mod = Number(opcao?.dataset.mod ?? linha.querySelector(".fnm-valor").textContent) || 0;
    total.textContent = sinal(fixos + mod + (Number(situacional?.value) || 0));
  };

  seletorAtributo?.addEventListener("change", atualizar);
  situacional?.addEventListener("input", atualizar);
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
  async _dialogoTeste(titulo, { cd = 15 } = {}) {
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
        <div class="form-group">
          <label>Classe de Dificuldade</label>
          <input type="number" name="cd" value="${cd}" step="1" />
        </div>
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
    mestre = false
  } = {}) {
    const total = bonus + situacional;
    const roll = new Roll(`${formulaD20(vantagem)} + @bonus`, { bonus: total });
    await roll.evaluate();

    const natural = roll.dice[0]?.total ?? 0;
    const linhas = [];
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
        ? "Sucesso Crítico"
        : sucesso
          ? "Sucesso"
          : "Falha";
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

  /**
   * Rola uma das linhas de Ofício da ficha. Ofício exige treinamento e cada
   * linha tem sua própria subcategoria (Ferreiro, Alfaiate, etc. — p. 287).
   */
  async rolarOficio(idx) {
    const oficio = this.system.oficiosView?.[idx];
    if (!oficio) return ui.notifications.error("Linha de Ofício inexistente.");

    const nome = oficio.especialidade ? `Ofício (${oficio.especialidade})` : "Ofício";
    if (!oficio.treinado && !oficio.mestre) {
      const seguir = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${nome} exige treinamento` },
        content: `<p><b>Ofício</b> só pode ser usado por personagens Treinados (p. 287).
          Rolar mesmo assim?</p>`,
        rejectClose: false
      });
      if (!seguir) return null;
    }

    const dados = await this._dialogoTeste(`Teste de ${nome}`);
    if (!dados) return null;
    return this.executarTeste({ label: `Teste de ${nome}`, bonus: oficio.total, ...dados });
  }

  /** Teste de Resistência (p. 280). */
  async rolarResistencia(id, { cd } = {}) {
    const resistencia = this.system.resistencias?.[id];
    if (!resistencia) return ui.notifications.error(`Resistência desconhecida: ${id}`);

    // Vindo do botão de uma carta, a CD já é conhecida e chega preenchida
    const dados = await this._dialogoTeste(
      `TR de ${resistencia.nome}`,
      cd === undefined || cd === null ? {} : { cd }
    );
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
   * Descreve um ataque com arma para o diálogo e para a carta do chat.
   *
   * O perfil existe para que arma, ataque desarmado e as três linhas de Jogada
   * de Ataque da ficha passem pelo mesmo caminho: quem rola só precisa dizer o
   * que está atacando, não como montar a rolagem.
   */
  _perfilArma(item) {
    const sys = item.system;
    const distancia = sys.tipo === "A Distância";
    const arremesso = sys.tipo === "De Arremesso";

    // Armas a distância usam Destreza; as de arremesso podem escolher, e no
    // corpo a corpo a escolha só existe com o traço Fineza (p. 279 e 305)
    const atributos = distancia
      ? ["destreza"]
      : arremesso || sys.fineza
        ? ["forca", "destreza"]
        : ["forca"];

    const grupo = FNM.gruposArma[sys.grupo];
    return {
      item,
      nome: item.name,
      img: item.img,
      subtitulo:
        `Arma ${sys.categoria.toLowerCase()} ${sys.tipo.toLowerCase()}` +
        (grupo ? ` · grupo ${grupo.nome}` : ""),
      tipo: sys.tipo,
      linhaAtaque: distancia || arremesso ? "distancia" : "corpoACorpo",
      atributos,
      treinado: sys.treinado,
      bonusAtaque: sys.bonusAtaque,
      critico: sys.critico,
      dano: sys.dano,
      danoVersatil: sys.danoVersatil,
      tipoDano: sys.tipoDano,
      bonusDano: sys.danoTotal ?? sys.bonusDano,
      grau: sys.grau,
      grupo: sys.grupo,
      alcance: sys.alcance,
      propriedades: sys.propriedades,
      somaAtributoNoDano: true
    };
  }

  /** Ataque desarmado (p. 305): todo personagem é treinado e usa o grupo Pugilato. */
  _perfilDesarmado() {
    const s = this.system;
    return {
      item: null,
      nome: "Ataque Desarmado",
      img: "icons/svg/combat.svg",
      subtitulo: "Corpo a corpo · grupo Pugilato",
      tipo: "Corpo a Corpo",
      linhaAtaque: "corpoACorpo",
      atributos: ["forca"],
      treinado: true,
      bonusAtaque: 0,
      critico: 20,
      dano: s.danoDesarmado,
      danoVersatil: "",
      tipoDano: "impacto",
      bonusDano: 0,
      grau: "",
      grupo: "pugilato",
      alcance: "",
      propriedades: "",
      somaAtributoNoDano: true
    };
  }

  /**
   * Atributo em vigor em uma das linhas de Jogada de Ataque. O Amaldiçoado
   * segue o atributo da técnica do personagem, salvo escolha explícita na ficha.
   */
  _atributoDaLinha(id) {
    const cfg = FNM.tiposAtaque[id];
    const padrao =
      id === "amaldicoado" ? this.system.jujutsu?.atributoTecnica || cfg.atributo : cfg.atributo;
    return this.system.ataques?.[id]?.atributo || padrao;
  }

  /** Uma das três linhas de Jogada de Ataque da ficha, sem arma no meio. */
  _perfilLinha(id) {
    const linha = this.system.ataques?.[id];
    const cfg = FNM.tiposAtaque[id];
    if (!linha || !cfg) return null;
    return {
      item: null,
      nome: `Jogada de Ataque — ${cfg.nome}`,
      img: "icons/svg/target.svg",
      subtitulo: "Linha da ficha, sem arma definida",
      tipo: id === "distancia" ? "A Distância" : id === "amaldicoado" ? "Amaldiçoado" : "Corpo a Corpo",
      linhaAtaque: id,
      atributos: [this._atributoDaLinha(id)],
      treinado: cfg.sempreTreinado === true || linha.treinado === true,
      bonusAtaque: 0,
      critico: 20,
      // Sem arma não há dado de dano: a carta sai sem os botões de dano
      dano: "",
      danoVersatil: "",
      tipoDano: "",
      bonusDano: 0,
      grau: "",
      grupo: "",
      alcance: "",
      propriedades: "",
      somaAtributoNoDano: false
    };
  }

  /**
   * Feitiço resolvido por Ataque Amaldiçoado (p. 279 e 205). O atributo vem da
   * técnica, o personagem é sempre treinado nele e não há grupo de arma, então
   * a carta sai sem efeito de crítico de grupo.
   */
  _perfilFeitico(item) {
    const sys = item.system;
    return {
      item,
      nome: item.name,
      img: item.img,
      subtitulo: `Ataque Amaldiçoado · Feitiço de ${sys.nivelLabel}`,
      tipo: "Amaldiçoado",
      linhaAtaque: "amaldicoado",
      atributos: [this._atributoDaLinha("amaldicoado")],
      treinado: true,
      bonusAtaque: 0,
      critico: 20,
      dano: sys.dano || sys.danoPadrao || "",
      danoVersatil: "",
      tipoDano: sys.tipoDano,
      bonusDano: 0,
      grau: "",
      grupo: "",
      alcance: sys.alcance || `${sys.alcancePadrao} metros`,
      propriedades: "",
      somaAtributoNoDano: false
    };
  }

  /**
   * Modificadores da jogada de ataque, na ordem da fórmula do livro (p. 279).
   *
   * A mesma lista alimenta o diálogo e o detalhamento da carta: o jogador vê
   * de onde sai cada ponto antes de rolar e depois de rolar.
   */
  _modificadoresAtaque(perfil, atributo) {
    const s = this.system;
    const linha = s.ataques?.[perfil.linhaAtaque];
    const mods = [
      { rotulo: FNM.atributos[atributo]?.nome ?? atributo, valor: s.atributos[atributo].mod },
      { rotulo: "Metade do nível", valor: s.metadeNivel }
    ];

    if (perfil.treinado) {
      mods.push({ rotulo: "Bônus de Treinamento", valor: s.bonusTreinamento });
    } else {
      mods.push({
        rotulo: "Sem treinamento",
        valor: 0,
        nota: `não soma o Bônus de Treinamento de +${s.bonusTreinamento} (p. 279)`
      });
    }

    if (linha?.outros) {
      mods.push({
        rotulo: `Outros (${FNM.tiposAtaque[perfil.linhaAtaque].nome})`,
        valor: linha.outros
      });
    }
    if (perfil.bonusAtaque) mods.push({ rotulo: "Bônus da arma", valor: perfil.bonusAtaque });
    if (s.penalidadeExaustao) {
      mods.push({ rotulo: `Exaustão ${s.exaustao}`, valor: s.penalidadeExaustao });
    }
    if (s.penalidadeAlma) {
      mods.push({ rotulo: `Alma ${s.alma.estado}`, valor: s.penalidadeAlma });
    }

    return mods;
  }

  /** O atributo de maior modificador entre os permitidos pela arma. */
  _melhorAtributo(chaves) {
    return chaves.reduce((melhor, chave) =>
      this.system.atributos[chave].mod > this.system.atributos[melhor].mod ? chave : melhor
    );
  }

  /**
   * Diálogo da jogada de ataque. Reúne o que o livro deixa o atacante decidir
   * ou o que depende da situação: atributo (Fineza e arremesso), empunhadura
   * de arma versátil, Defesa do alvo com cobertura (p. 293), camuflagem
   * (p. 294) e faixa de alcance (p. 305).
   */
  async _dialogoAtaque(perfil) {
    const s = this.system;
    // A Defesa já vem preenchida quando há um token alvejado
    const alvo = game.user.targets.first()?.actor;
    const padrao = this._melhorAtributo(perfil.atributos);
    // A primeira linha é sempre o atributo, e é a única que o diálogo refaz
    const mods = this._modificadoresAtaque(perfil, padrao);

    const conteudo = await foundry.applications.handlebars.renderTemplate(
      "systems/fnm/templates/chat/ataque-dialogo.html",
      {
        perfil,
        // A faixa de alcance é regra de arma (p. 305); Feitiço tem alcance próprio
        distancia: perfil.tipo === "A Distância" || perfil.tipo === "De Arremesso",
        escolheAtributo: perfil.atributos.length > 1,
        alvo: alvo?.name ?? "",
        defesa: alvo?.system?.combate?.defesa ?? 15,
        atributos: perfil.atributos.map(id => ({
          id,
          nome: FNM.atributos[id].nome,
          mod: s.atributos[id].mod,
          padrao: id === padrao
        })),
        modificadores: mods,
        // Tudo que não muda com o atributo escolhido, para o total ao vivo
        somaFixa: mods.slice(1).reduce((n, m) => n + m.valor, 0),
        total: mods.reduce((n, m) => n + m.valor, 0),
        cobertura: FNM.cobertura,
        camuflagem: FNM.camuflagem,
        alcances: FNM.alcanceAtaque
      }
    );

    return foundry.applications.api.DialogV2.prompt({
      window: { title: `${perfil.nome} — ${this.name}` },
      classes: ["fnm-dialogo"],
      position: { width: 440 },
      content: conteudo,
      rejectClose: false,
      // O total ao vivo é um extra: se o callback mudar de forma entre versões
      // do Foundry, o diálogo continua funcionando com os valores estáticos
      render: (event, alvo) => ligarTotalDoAtaque(alvo?.element ?? alvo),
      ok: {
        label: "Rolar Ataque",
        icon: "fa-solid fa-dice-d20",
        callback: (event, button) => {
          const campos = button.form.elements;
          const num = (nome, padraoValor = 0) =>
            Number(campos[nome]?.value ?? padraoValor) || padraoValor;
          return {
            atributo: campos.atributo?.value || perfil.atributos[0],
            versatil: campos.empunhadura?.value === "duas",
            situacional: num("situacional"),
            vantagem: num("vantagem"),
            defesa: num("defesa", 0),
            cobertura: campos.cobertura?.value ?? "nenhuma",
            camuflagem: campos.camuflagem?.value ?? "nenhuma",
            alcance: campos.alcance?.value ?? "normal"
          };
        }
      }
    });
  }

  /**
   * Executa a jogada de ataque e publica a carta do chat.
   *
   * Um 20 natural sempre acerta; um limiar de crítico abaixo de 20 dobra os
   * dados mas ainda precisa vencer a Defesa (p. 307). Um 1 natural é desastre
   * e sempre erra. A camuflagem é resolvida por um d10 rolado junto do d20
   * (p. 294) e erra o ataque antes de qualquer comparação com a Defesa.
   */
  async _executarAtaque(perfil, escolhas) {
    const cobertura = FNM.cobertura.find(c => c.id === escolhas.cobertura) ?? FNM.cobertura[0];
    const camuflagem = FNM.camuflagem.find(c => c.id === escolhas.camuflagem) ?? FNM.camuflagem[0];
    const alcance = FNM.alcanceAtaque.find(a => a.id === escolhas.alcance) ?? FNM.alcanceAtaque[0];

    if (cobertura.bloqueia) {
      ui.notifications.warn(
        "Cobertura Total impede que o alvo seja escolhido para ataques ou efeitos (p. 293)."
      );
      return null;
    }
    if (alcance.bloqueia) {
      ui.notifications.warn("Atacar além do alcance máximo da arma é impossível (p. 305).");
      return null;
    }

    const mods = this._modificadoresAtaque(perfil, escolhas.atributo);
    const bonus = mods.reduce((n, m) => n + m.valor, 0) + escolhas.situacional;

    // Vantagem e desvantagem de fontes diferentes se anulam (p. 282): as fontes
    // são somadas e só o sinal do resultado importa
    const vantagem = Math.sign(escolhas.vantagem + (alcance.desvantagem ? -1 : 0));

    const roll = new Roll(`${formulaD20(vantagem)} + @bonus`, { bonus });
    await roll.evaluate();
    const natural = roll.dice[0]?.total ?? 0;

    let d10 = null;
    if (camuflagem.falha > 0) {
      const rolagemCamuflagem = new Roll("1d10");
      await rolagemCamuflagem.evaluate();
      d10 = rolagemCamuflagem.total;
    }

    const defesaAlvo = escolhas.defesa ? escolhas.defesa + cobertura.defesa : 0;
    const resultado = vereditoAtaque({
      natural,
      total: roll.total,
      defesa: defesaAlvo,
      limiarCritico: perfil.critico,
      falhouCamuflagem: d10 !== null && d10 <= camuflagem.falha
    });

    await cartaAtaque({
      ator: this,
      perfil,
      roll,
      natural,
      resultado,
      modificadores: mods,
      situacional: escolhas.situacional,
      vantagem,
      desvantagemAlcance: alcance.desvantagem ? alcance.nome : "",
      defesa: defesaAlvo,
      cobertura,
      camuflagem,
      d10,
      atributo: escolhas.atributo,
      versatil: escolhas.versatil
    });

    return {
      roll,
      natural,
      critico: resultado === "critico",
      acertou: resultado === "acerto" || resultado === "critico",
      ...escolhas
    };
  }

  /** Jogada de ataque com uma arma (p. 279). */
  async rolarAtaqueArma(item) {
    const perfil = this._perfilArma(item);
    const escolhas = await this._dialogoAtaque(perfil);
    if (!escolhas) return null;
    return this._executarAtaque(perfil, escolhas);
  }

  /** Uma das três linhas de Jogadas de Ataque da ficha, sem arma específica. */
  async rolarAtaqueBase(id) {
    const perfil = this._perfilLinha(id);
    if (!perfil) return ui.notifications.error(`Tipo de ataque desconhecido: ${id}`);
    const escolhas = await this._dialogoAtaque(perfil);
    if (!escolhas) return null;
    return this._executarAtaque(perfil, escolhas);
  }

  /** Ataque desarmado (p. 305). */
  async rolarDesarmado() {
    const perfil = this._perfilDesarmado();
    const escolhas = await this._dialogoAtaque(perfil);
    if (!escolhas) return null;
    return this._executarAtaque(perfil, escolhas);
  }

  /** Rolagem de dano de uma arma, de um Feitiço, ou do ataque desarmado sem item. */
  async rolarDano(item, opcoes = {}) {
    const perfil = !item
      ? this._perfilDesarmado()
      : item.type === "feitico"
        ? this._perfilFeitico(item)
        : this._perfilArma(item);
    return this._rolarDano(perfil, opcoes);
  }

  /**
   * Rolagem de dano (p. 306-307). No crítico todos os dados do ataque são
   * jogados duas vezes e os modificadores entram depois, uma vez só.
   */
  async _rolarDano(perfil, { critico = false, versatil = false, atributo = null } = {}) {
    const s = this.system;
    const chave = atributo ?? this._melhorAtributo(perfil.atributos);
    // Só o dano de arma soma o modificador do atributo que a maneja (p. 306);
    // o dano de um Feitiço é o da tabela do nível dele (p. 205)
    const modAttr = perfil.somaAtributoNoDano ? s.atributos[chave].mod : 0;

    const usaVersatil = versatil && !!perfil.danoVersatil;
    const base = (usaVersatil ? perfil.danoVersatil : perfil.dano) || "";
    // Faixas e Rede não causam dano próprio, e a linha da ficha não tem arma
    if (!base || base === "—") {
      return ui.notifications.warn(`${perfil.nome} não tem dado de dano para rolar.`);
    }

    const dados = critico ? `(${base}) + (${base})` : base;
    const roll = new Roll(`${dados} + @mod + @extra`, { mod: modAttr, extra: perfil.bonusDano });
    await roll.evaluate();

    const grau = FNM.grausFerramenta[perfil.grau];
    const componentes = [
      {
        rotulo: critico ? `Dados dobrados: ${base} duas vezes` : `Dados da arma: ${base}`,
        semValor: true
      },
      { rotulo: FNM.atributos[chave].nome, valor: modAttr }
    ];
    if (grau) componentes.push({ rotulo: `Ferramenta de ${grau.nome}`, valor: grau.bonusArma });
    const bonusManual = perfil.bonusDano - (grau?.bonusArma ?? 0);
    if (bonusManual) componentes.push({ rotulo: "Bônus de dano do item", valor: bonusManual });

    await cartaDano({ ator: this, perfil, roll, critico, versatil: usaVersatil, componentes });
    return roll;
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
        `<b>Alma ${s.alma.estado}:</b> +${s.alma.custoExtra} PE no custo (p. 312).`
      );
    }

    await this.update({ "system.recursos.pe.value": pe.value - custoTotal });
    linhas.push(`<b>PE:</b> -${custoTotal} → ${pe.value - custoTotal}/${pe.max}`);

    // Resolução por TR: a carta não resolve nada sozinha. Quem rola o teste é o
    // alvo, e o dano só sai depois — então os dois viram botões, em vez de o
    // dano cair no chat antes de alguém ter resistido (p. 205, 280).
    if (sys.resolucao === "resistencia") {
      await cartaResistencia({
        ator: this,
        item,
        cd: s.cdAmaldicoada,
        resistencia: sys.resistencia,
        linhas,
        dano: sys.dano || sys.danoPadrao
      });
      return true;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<div class="fnm-carta"><h3>${item.name}</h3>` +
        `<p>${linhas.join("<br>")}</p>` +
        (sys.description ? `<div class="fnm-carta-desc">${sys.description}</div>` : "") +
        `</div>`
    });

    // O Ataque Amaldiçoado é uma das três Jogadas de Ataque (p. 279), então usa
    // o mesmo diálogo e a mesma carta das armas — com botão de dano no fim
    if (sys.resolucao === "ataque") {
      const perfil = this._perfilFeitico(item);
      const escolhas = await this._dialogoAtaque(perfil);
      if (escolhas) await this._executarAtaque(perfil, escolhas);
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

    // A ficha tem RD geral e RD por tipo de dano; usa-se a do tipo, se houver
    const rdAplicavel = tipo ? (s.combate.rdPorTipo?.[tipo] ?? s.combate.reducaoDanoTotal)
                             : s.combate.reducaoDanoTotal;
    if (!naAlma && !ignorarRD && rdAplicavel > 0) {
      const rd = Math.min(dano, rdAplicavel);
      dano -= rd;
      linhas.push(
        `Redução de Dano absorveu ${rd}` +
        (tipo && s.combate.rd?.[tipo] ? ` (inclui RD específica de ${FNM.tiposDano[tipo].nome})` : "") +
        "."
      );
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
      // Dano na Alma é perda de vida: reduz a vida máxima junto da atual (p. 311).
      // Vai para a coluna PERDIDOS da ficha, que é o que o descanso longo não cura.
      atualizacoes["system.recursos.pv.perdidos"] = s.recursos.pv.perdidos + restante;
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
      linhas.push("<b>Dano massivo:</b> o alvo recebe um Ferimento Complexo (p. 313-314).");
    }
    // Dano que ultrapassa o máximo de vida em negativo mata na hora (p. 313)
    if (novoPV <= -s.recursos.pv.max) {
      linhas.push("A vida caiu além do negativo do máximo: <b>morte imediata</b>, sem Portas da Morte.");
    } else if (novoPV <= 0 && s.recursos.pv.value > 0) {
      linhas.push("A vida chegou a 0: o personagem entra nas <b>Portas da Morte</b> (p. 313).");
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
      texto += " <b>O personagem morre.</b>";
    } else {
      texto += ` (Sucessos ${sucessos}/3 · Falhas ${falhas}/3)`;
    }

    await this.update(atualizacoes);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<b>Portas da Morte</b> — ${texto}`
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
          flavor: `<b>Dados de Vida</b> (+${modCon} de Constituição por dado)`
        });
      }
    }

    await this.update(atualizacoes);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<b>${this.name}</b> realiza um <b>Descanso Curto</b>.<br>${linhas.join("<br>")}`
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
        `<b>${this.name}</b> realiza um <b>Descanso Longo</b>: PV, PE e Dados de Vida ` +
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
