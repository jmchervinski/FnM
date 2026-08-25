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
import { alvosMarcados, cartaAtaque, cartaDano, cartaResistencia } from "../chat.mjs";
import { comRolagem, opcoesDeDialogo } from "../dialogos.mjs";
import {
  ajustarCondicao,
  alternarCondicao,
  aplicarCondicao,
  avisosDeAplicacao,
  aplicarCondicoes,
  blocoDeCondicoes,
  condicoesDoAtor,
  condicoesParaFicha,
  efeitoDaCondicao,
  removerCondicao,
  resolverCondicoes
} from "../condicoes.mjs";

/** Os nomes das condições ativas que mexem num campo, para rotular a linha. */
function nomesDeCondicoes(ativas = [], campo = null) {
  const nomes = ativas
    .filter(id => {
      const m = FNM.condicoesPorId[id]?.mecanica;
      return campo ? m?.[campo] : m;
    })
    .map(id => FNM.condicoesPorId[id].nome);
  return nomes.join(", ") || "condições";
}

/** Um número com o sinal sempre visível, para as linhas das cartas. */
function sinalDe(valor) {
  const n = Number(valor) || 0;
  return n >= 0 ? `+${n}` : String(n);
}

/**
 * As Invocações que um ator controla (p. 258).
 *
 * Exportada para tools/testa-automacao.mjs: é a escolha de QUANDO recalcular
 * uma Invocação que estava faltando, e ela merece teste próprio.
 */
export function invocacoesDe(atorId, atores) {
  if (!atorId) return [];
  return [...(atores ?? [])].filter(
    a => a.type === "invocacao" && a.system?.detalhes?.invocador === atorId
  );
}

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
  /*  Condições (p. 317)                        */
  /* ------------------------------------------ */

  /** Os ids das condições ligadas nesta ficha, sem as que vêm por consequência. */
  get condicoesAtivas() {
    return condicoesDoAtor(this);
  }

  /** A criatura está sob esta condição, direta ou por consequência de outra? */
  temCondicao(id) {
    return (this.system.condicoes?.ativas ?? []).includes(id);
  }

  /** As condições no formato que a faixa da ficha desenha. */
  get condicoesDaFicha() {
    return condicoesParaFicha(this);
  }

  /** Aplica uma condição, com a duração e a CD de quem a infligiu. */
  async aplicarCondicao(id, opcoes = {}) {
    return aplicarCondicao(this, id, opcoes);
  }

  /** Aplica de uma vez a lista de condições de um efeito. */
  async aplicarCondicoes(condicoes, opcoes = {}) {
    return aplicarCondicoes(this, condicoes, opcoes);
  }

  /**
   * Reescreve a duração e a CD de uma condição já ativa. Ao contrário de
   * `aplicarCondicao`, aqui o valor dado vale mesmo que encurte o prazo: é a
   * correção à mão, não uma nova aplicação do efeito.
   */
  async ajustarCondicao(id, opcoes = {}) {
    return ajustarCondicao(this, id, opcoes);
  }

  /** Remove uma condição. */
  async removerCondicao(id) {
    return removerCondicao(this, id);
  }

  /** Liga ou desliga uma condição, para os cliques da ficha e do HUD. */
  async alternarCondicao(id, opcoes = {}) {
    return alternarCondicao(this, id, opcoes);
  }

  /** O Active Effect de uma condição, quando ela está ligada. */
  efeitoDaCondicao(id) {
    return efeitoDaCondicao(this, id);
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
    let sucesso = null;
    let critico = false;

    if (cd !== null) {
      sucesso = roll.total >= cd;
      // Sucesso crítico só existe se você for mestre no teste (p. 281)
      critico = ehResistencia && mestre && sucesso && roll.total >= cd + 10;

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

    // `sucesso` é `null` quando não havia CD para comparar: quem chamou precisa
    // saber que o teste não decidiu nada, e não que ele falhou
    return { roll, total: roll.total, natural, sucesso, critico };
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

    // Paralisado e Inconsciente falham automaticamente em Reflexos (p. 317):
    // não há rolagem que resolva, então a carta sai direto com a falha
    if (id === "reflexos" && this.system.condicoes?.falhaReflexos) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content:
          `<div class="fnm-carta"><b>${this.name}</b> falha automaticamente no ` +
          `<b>TR de Reflexos</b> — ${this._condicoesQueFalhamReflexos()} (p. 317).</div>`
      });
      return { roll: null, total: -Infinity, natural: 0, sucesso: false, critico: false };
    }

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

  /** Quais condições ativas estão causando a falha automática em Reflexos. */
  _condicoesQueFalhamReflexos() {
    const nomes = (this.system.condicoes?.ativas ?? [])
      .filter(id => FNM.condicoesPorId[id]?.mecanica?.falhaReflexos)
      .map(id => FNM.condicoesPorId[id].nome);
    return nomes.length ? nomes.join(" e ") : "condição de incapacitação";
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
   * As condições que um item aplica, já resolvidas para a carta: nível
   * efetivo, duração pela tabela do nível (p. 208) e a CD contra a qual o alvo
   * vai testar. A CD é a do efeito que aplicou — a Amaldiçoada de um Feitiço, a
   * de Especialização de uma arma ou Técnica Marcial.
   */
  _condicoesDoItem(item, { cd = null, resistencia = "" } = {}) {
    const lista = item?.system?.condicoes ?? [];
    if (!lista.length) return [];
    return resolverCondicoes(lista, {
      nivelItem: item.system.nivel ?? "",
      foco: item.system.focoEmCondicoes === true,
      cd,
      resistencia
    });
  }

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
      somaAtributoNoDano: true,
      // Condições que a arma inflige — o efeito de crítico do grupo usa a CD
      // de Especialização (p. 308)
      condicoes: this._condicoesDoItem(item, { cd: this.system.cdEspecializacao }),
      cdCondicoes: this.system.cdEspecializacao ?? null
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
      bonusAtaque: sys.bonusAtaque,
      rotuloBonusAtaque: "Bônus do Feitiço",
      critico: 20,
      dano: sys.dano || sys.danoPadrao || "",
      danoVersatil: "",
      tipoDano: sys.tipoDano,
      bonusDano: 0,
      grau: "",
      grupo: "",
      alcance: sys.alcance || `${sys.alcancePadrao} metros`,
      propriedades: "",
      somaAtributoNoDano: false,
      // Feitiço de Teste de Ataque: o alvo faz o TR ao ser acertado (p. 207)
      condicoes: this._condicoesDoItem(item, {
        cd: this.system.cdAmaldicoada,
        resistencia: sys.resistencia
      }),
      cdCondicoes: this.system.cdAmaldicoada ?? null,
      resistenciaCondicoes: sys.resistencia
    };
  }

  /**
   * Descreve uma Ação de Invocação para o mesmo caminho de ataque e dano das
   * armas (p. 263-269).
   *
   * O que muda em relação a uma arma é de onde vêm os números: a Invocação não
   * empunha nada, então o atributo sai da linha de ataque escolhida na ação
   * (Força no corpo a corpo, Destreza a distância), o treinamento é a única
   * jogada em que a Invocação foi treinada (p. 261) e o bônus de dano é o
   * modificador desse mesmo atributo — dobrado no Grau Especial.
   */
  _perfilAcaoInvocacao(item) {
    const sys = item.system;
    const s = this.system;
    const grau = s.grau ?? FNM.grausInvocacao.Quarto;
    const linha = sys.linhaAtaque === "distancia" ? "distancia" : "corpoACorpo";
    const cfg = FNM.tiposAtaque[linha];

    const partes = [sys.tipo];
    if (sys.categoria) partes.push(sys.categoria);
    partes.push(grau.nome);

    const propriedades = [];
    if (sys.alvo) propriedades.push(sys.alvo);
    if (sys.area) {
      propriedades.push(`área de ${sys.area} m${sys.formatoArea ? ` (${sys.formatoArea})` : ""}`);
    }
    if (sys.custoPE) propriedades.push(`${sys.custoPE} PE`);

    // A CD do TR forçado pela ação (p. 263). É montada aqui, e não por
    // `cdDaAcaoInvocacao`, porque aquele método monta o perfil para chegar
    // nela — chamá-lo daqui seria uma volta sem fim
    const atributoDaAcao = s.ataques?.[linha]?.atributo || cfg.atributo;
    const cdDaAcao = (s.cdAcao ?? 10) + (s.atributos[atributoDaAcao]?.mod ?? 0);

    return {
      item,
      nome: item.name,
      img: item.img,
      subtitulo: partes.join(" · "),
      tipo: linha === "distancia" ? "A Distância" : "Corpo a Corpo",
      linhaAtaque: linha,
      atributos: [atributoDaAcao],
      // A Invocação só é treinada na jogada que escolheu na criação (p. 261)
      treinado: s.detalhes?.ataqueTreinado === linha,
      bonusAtaque: sys.bonusAtaque,
      rotuloBonusAtaque: "Bônus da ação",
      critico: 20,
      dano: sys.dano,
      danoVersatil: "",
      tipoDano: sys.tipoDano,
      bonusDano: 0,
      grau: "",
      grupo: "",
      alcance: sys.alcance ? `${sys.alcance} metros` : "",
      propriedades: propriedades.join(" · "),
      // O bônus de dano de uma Ação é o modificador do atributo (p. 263) e no
      // Grau Especial ele conta dobrado
      somaAtributoNoDano: true,
      multiplicadorAtributoNoDano: grau.dobraModificador ? 2 : 1,
      condicoes: this._condicoesDoItem(item, {
        cd: cdDaAcao,
        resistencia: sys.resistencia
      }),
      cdCondicoes: cdDaAcao,
      resistenciaCondicoes: sys.resistencia
    };
  }

  /**
   * Modificadores da jogada de ataque, na ordem da fórmula do livro (p. 279).
   *
   * A mesma lista alimenta o diálogo e o detalhamento da carta: o jogador vê
   * de onde sai cada ponto antes de rolar e depois de rolar.
   */
  _modificadoresAtaque(perfil, atributo, alvo = null) {
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
    if (perfil.bonusAtaque) {
      mods.push({
        rotulo: perfil.rotuloBonusAtaque ?? "Bônus da arma",
        valor: perfil.bonusAtaque
      });
    }
    if (s.penalidadeExaustao) {
      mods.push({ rotulo: `Exaustão ${s.exaustao}`, valor: s.penalidadeExaustao });
    }
    if (s.penalidadeAlma) {
      mods.push({ rotulo: `Alma ${s.alma.estado}`, valor: s.penalidadeAlma });
    }

    // Caído pesa só no corpo a corpo; Abalado, Envenenado e afins, em tudo
    const proprias =
      perfil.linhaAtaque === "corpoACorpo"
        ? s.condicoes.totalAtaqueCorpoACorpo
        : s.condicoes.totalAtaque;
    if (proprias) {
      mods.push({
        rotulo: `Condições (${nomesDeCondicoes(s.condicoes.ativas)})`,
        valor: proprias
      });
    }

    // Exposto: quem ataca a criatura recebe +4 (p. 319). A conta é de quem
    // ataca, então ela só entra quando há um alvo marcado para consultar
    const doAlvo = alvo?.system?.condicoes;
    if (doAlvo?.ataquesContra) {
      mods.push({
        rotulo: `Alvo ${nomesDeCondicoes(doAlvo.ativas, "ataquesContra")}`,
        valor: doAlvo.ataquesContra
      });
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
    const distanciaOuArremesso = perfil.tipo === "A Distância" || perfil.tipo === "De Arremesso";
    // O Caído tem duas Defesas, uma para cada lado do ataque (p. 318): o campo
    // já nasce com a que vale para ESTE ataque
    const defesaDoAlvo = alvo?.system?.combate
      ? (distanciaOuArremesso ? alvo.system.combate.defesaDistancia : alvo.system.combate.defesaCorpoACorpo) ??
        alvo.system.combate.defesa
      : 15;
    const padrao = this._melhorAtributo(perfil.atributos);
    // A primeira linha é sempre o atributo, e é a única que o diálogo refaz
    const mods = this._modificadoresAtaque(perfil, padrao, alvo);

    const conteudo = await foundry.applications.handlebars.renderTemplate(
      "systems/fnm/templates/chat/ataque-dialogo.html",
      {
        perfil,
        // A faixa de alcance é regra de arma (p. 305); Feitiço tem alcance próprio
        distancia: distanciaOuArremesso,
        escolheAtributo: perfil.atributos.length > 1,
        alvo: alvo?.name ?? "",
        defesa: defesaDoAlvo,
        // Condições do alvo que a mesa precisa ver antes de rolar
        condicoesDoAlvo: (alvo?.system?.condicoes?.ativas ?? []).map(id => FNM.condicoesPorId[id]?.nome).filter(Boolean),
        // Com um alvo marcado, só o Narrador vê o número: o jogador precisa
        // saber se acertou, não contra quanto. Sem alvo, o campo continua
        // aberto — não há o que esconder e alguém tem que informar a Defesa.
        defesaOculta: !!alvo && !game.user.isGM,
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

    const escolhas = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${perfil.nome} — ${this.name}`, resizable: true },
      classes: ["fnm-dialogo"],
      // Largura relativa à janela, e não fixa: o diálogo lista um modificador
      // por linha e precisa caber em telas de qualquer tamanho
      ...opcoesDeDialogo({ fracao: 0.34, minimo: 400, maximo: 520 }),
      content: comRolagem(conteudo),
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

    // Quem estava marcado AGORA é quem a carta vai considerar: o Exposto do
    // alvo e a Defesa dele não podem mudar entre o diálogo e a rolagem
    return escolhas ? { ...escolhas, alvoUuid: alvo?.uuid ?? null } : escolhas;
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

    const alvo = escolhas.alvoUuid ? fromUuidSync(escolhas.alvoUuid)?.actor : null;
    const mods = this._modificadoresAtaque(perfil, escolhas.atributo, alvo);
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
    let resultado = vereditoAtaque({
      natural,
      total: roll.total,
      defesa: defesaAlvo,
      limiarCritico: perfil.critico,
      falhouCamuflagem: d10 !== null && d10 <= camuflagem.falha
    });

    // Condições do alvo que decidem o acerto sozinhas (p. 317). Elas entram
    // depois do veredito porque não dependem do d20: o Inconsciente é acertado
    // criticamente qualquer que tenha sido a rolagem, e o Paralisado, sempre
    // que o golpe de corpo a corpo tiver passado.
    const notasDoAlvo = [];
    const condAlvo = alvo?.system?.condicoes;
    const errouPorCamuflagem = resultado === "camuflagem";
    if (condAlvo?.sempreAcertado && !errouPorCamuflagem) {
      resultado = "critico";
      notasDoAlvo.push(
        `<b>${alvo.name}</b> está ${nomesDeCondicoes(condAlvo.ativas, "sempreAcertado")}: ` +
          "todo ataque contra a criatura acerta e é crítico (p. 317)."
      );
    } else if (
      condAlvo?.criticoCorpoACorpo &&
      resultado === "acerto" &&
      perfil.linhaAtaque === "corpoACorpo"
    ) {
      resultado = "critico";
      notasDoAlvo.push(
        `<b>${alvo.name}</b> está ${nomesDeCondicoes(condAlvo.ativas, "criticoCorpoACorpo")}: ` +
          "todo ataque corpo a corpo que acerte é crítico (p. 317)."
      );
    }
    if (condAlvo?.danoExtraPorNivel && (resultado === "acerto" || resultado === "critico")) {
      notasDoAlvo.push(
        `<b>Exposto:</b> o dano recebe ${this.system.nivel ?? 1} pontos a mais, o nível do atacante, ` +
          "em cada rolagem de dano (p. 319)."
      );
    }

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
      versatil: escolhas.versatil,
      notasExtras: notasDoAlvo,
      // Condições que o efeito aplica ao acertar: o alvo ainda faz o TR (p. 207)
      condicoes: perfil.condicoes ?? [],
      cdCondicoes: perfil.cdCondicoes ?? null,
      resistenciaCondicoes: perfil.resistenciaCondicoes ?? ""
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

  /** Rolagem de dano de uma arma, Feitiço, Ação de Invocação, ou desarmado. */
  async rolarDano(item, opcoes = {}) {
    const perfil = !item
      ? this._perfilDesarmado()
      : item.type === "feitico"
        ? this._perfilFeitico(item)
        : item.type === "acaoInvocacao"
          ? this._perfilAcaoInvocacao(item)
          : item.type === "tecnicaMarcial"
            ? this._perfilTecnicaMarcial(item)
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
    // O Grau Especial de uma Invocação conta o modificador dobrado (p. 272)
    const fator = perfil.multiplicadorAtributoNoDano ?? 1;
    const modAttr = perfil.somaAtributoNoDano ? s.atributos[chave].mod * fator : 0;

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
      {
        rotulo: fator > 1 ? `${FNM.atributos[chave].nome} (dobrado)` : FNM.atributos[chave].nome,
        valor: modAttr
      }
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

    // Estados da Alma aumentam o custo de todas as habilidades (p. 312), e a
    // condição Condenado soma mais 1 em cima (p. 317)
    const custoExtraCondicao = s.condicoes?.custoPE ?? 0;
    const custo = sys.custoEfetivo + (s.alma?.custoExtra ?? 0) + custoExtraCondicao;
    if (custo > this.peDisponivel) {
      return ui.notifications.warn(
        `PE insuficiente: ${item.name} custa ${custo} PE e ${this.name} tem ${this.peDisponivel}.`
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

    if (s.alma?.custoExtra) {
      linhas.push(
        `<b>Alma ${s.alma.estado}:</b> +${s.alma.custoExtra} PE no custo (p. 312).`
      );
    }
    if (custoExtraCondicao) {
      linhas.push(`<b>Condenado:</b> +${custoExtraCondicao} PE no custo (p. 317).`);
    }

    // A conferência de PE já passou acima; isto protege quem mexer na ordem
    const extrato = await this.gastarPE(custo);
    if (!extrato) {
      return ui.notifications.warn(`PE insuficiente para conjurar ${item.name}.`);
    }
    linhas.push(...extrato);

    const condicoes = this._condicoesDoItem(item, {
      cd: s.cdAmaldicoada,
      resistencia: sys.resistencia
    });
    linhas.push(...avisosDeAplicacao(condicoes, sys.nivel, sys.focoEmCondicoes));

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
        dano: sys.dano || sys.danoPadrao,
        condicoes
      });
      return true;
    }

    // Com resolução por ataque as condições viajam na carta do ataque, que sabe
    // se o golpe acertou: repeti-las aqui daria dois lugares para clicar
    await this._cartaDeEfeito(item, linhas, sys.resolucao === "ataque" ? [] : condicoes);

    // O Ataque Amaldiçoado é uma das três Jogadas de Ataque (p. 279), então usa
    // o mesmo diálogo e a mesma carta das armas — com botão de dano no fim
    if (sys.resolucao === "ataque") {
      const perfil = this._perfilFeitico(item);
      const escolhas = await this._dialogoAtaque(perfil);
      if (escolhas) await this._executarAtaque(perfil, escolhas);
    }

    return true;
  }

  /**
   * A carta simples de um efeito que não resolve nada sozinho: o resumo
   * mecânico e, quando houver, os chips das condições que ele aplica.
   */
  async _cartaDeEfeito(item, linhas, condicoes = []) {
    const bloco = await blocoDeCondicoes(condicoes);
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<div class="fnm-carta"><h3>${item.name}</h3>` +
        `<p>${linhas.join("<br>")}</p>` +
        (item.system.description ? `<div class="fnm-carta-desc">${item.system.description}</div>` : "") +
        `</div>` +
        bloco,
      flags: {
        fnm: {
          tipo: "efeito",
          atorId: this.id,
          itemId: item.id,
          alvos: alvosMarcados(),
          origemNome: item.name,
          condicoes
        }
      }
    });
  }

  /* ------------------------------------------ */
  /*  Energia Amaldiçoada                       */
  /* ------------------------------------------ */

  /**
   * Quanta Energia Amaldiçoada este ator tem para gastar agora.
   *
   * O PE temporário entra na conta junto do normal: é energia que o
   * personagem tem, e a ficha oficial lhe dá uma caixa própria justamente
   * para ser gasta. Sem isto, uma habilidade que o personagem podia pagar
   * era recusada por caber só no temporário.
   */
  get peDisponivel() {
    const r = this.system.recursos;
    return (r.pe?.value ?? 0) + (r.peTemporario ?? 0);
  }

  /**
   * Gasta PE, consumindo primeiro o temporário — a mesma ordem em que o PV
   * temporário absorve dano antes do PV normal (p. 311).
   *
   * Devolve a linha de extrato para a carta, ou `null` se não houver energia
   * suficiente. Quem chama já deve ter conferido `peDisponivel`.
   */
  async gastarPE(quantidade) {
    const custo = Math.max(0, Math.floor(Number(quantidade) || 0));
    if (!custo) return [];

    const r = this.system.recursos;
    const temporario = r.peTemporario ?? 0;
    if (custo > this.peDisponivel) return null;

    // O temporário sai primeiro; o que sobrar vem do PE normal
    const doTemporario = Math.min(temporario, custo);
    const doNormal = custo - doTemporario;

    const atualizacoes = {};
    if (doTemporario) atualizacoes["system.recursos.peTemporario"] = temporario - doTemporario;
    if (doNormal) atualizacoes["system.recursos.pe.value"] = r.pe.value - doNormal;
    await this.update(atualizacoes);

    const partes = [];
    if (doTemporario) partes.push(`${doTemporario} do temporário`);
    if (doNormal) partes.push(`${doNormal} do normal`);
    return [
      `<b>PE:</b> -${custo}${partes.length > 1 ? ` (${partes.join(" + ")})` : ""}` +
        ` → ${r.pe.value - doNormal}/${r.pe.max}` +
        (temporario - doTemporario > 0 ? ` + ${temporario - doTemporario} temp.` : "")
    ];
  }

  /* ------------------------------------------ */
  /*  Restringido                               */
  /* ------------------------------------------ */

  /**
   * Gasta Pontos de Estamina, a moeda do Restringido (p. 114). Devolve a linha
   * de extrato para a carta, ou `null` se não houver Estamina suficiente.
   */
  async gastarEstamina(quantidade) {
    const custo = Math.max(0, Math.floor(Number(quantidade) || 0));
    if (!custo) return [];

    const est = this.system.recursos.estamina;
    if (custo > est.value) return null;

    await this.update({ "system.recursos.estamina.value": est.value - custo });
    return [`<b>Estamina:</b> -${custo} → ${est.value - custo}/${est.max}`];
  }

  /**
   * Descreve uma Técnica Marcial para o caminho de ataque e dano das armas.
   *
   * A jogada é física: Força no corpo a corpo, Destreza a distância. Um
   * Fundamento Marcial não pode trocar o atributo da jogada (p. 248), então a
   * linha da ficha decide, e o Restringido é treinado em todas as armas.
   */
  _perfilTecnicaMarcial(item) {
    const sys = item.system;
    const linha = sys.linhaAtaque === "distancia" ? "distancia" : "corpoACorpo";
    const cfg = FNM.tiposAtaque[linha];

    return {
      item,
      nome: item.name,
      img: item.img,
      subtitulo: `Técnica Marcial de ${sys.nivelLabel} · ${sys.custoEfetivo} Estamina`,
      tipo: linha === "distancia" ? "A Distância" : "Corpo a Corpo",
      linhaAtaque: linha,
      atributos: [this.system.ataques?.[linha]?.atributo || cfg.atributo],
      // Restringido é treinado em todas as armas e escudos (p. 114)
      treinado: true,
      bonusAtaque: sys.bonusAtaque,
      rotuloBonusAtaque: "Bônus da técnica",
      critico: 20,
      dano: sys.dano || sys.danoPadrao || "",
      danoVersatil: "",
      tipoDano: sys.tipoDano,
      bonusDano: 0,
      grau: "",
      grupo: "",
      alcance: sys.alcance || `${sys.alcancePadrao} metros`,
      propriedades: sys.alvo,
      // O dano de uma Técnica Marcial é o da tabela do nível, como no Feitiço
      somaAtributoNoDano: false,
      // A CD é a de Especialização: o Restringido escolhe o atributo (p. 114)
      condicoes: this._condicoesDoItem(item, {
        cd: this.system.cdEspecializacao,
        resistencia: sys.resistencia
      }),
      cdCondicoes: this.system.cdEspecializacao ?? null,
      resistenciaCondicoes: sys.resistencia
    };
  }

  /**
   * Usa uma Técnica Marcial (p. 124 e 248).
   *
   * É o `conjurarFeitico` do Restringido: mesma resolução, mesma carta, mesma
   * criação — só que pago em Estamina, e sem energia amaldiçoada no meio.
   */
  async usarTecnicaMarcial(item) {
    const sys = item.system;
    const s = this.system;

    if (!s.ehRestringido) {
      return ui.notifications.warn(
        `Técnicas Marciais são exclusivas do Restringido, e ${this.name} não é um (p. 114).`
      );
    }

    const disponiveis = s.restringidoView?.niveisDisponiveis ?? ["1"];
    if (!disponiveis.includes(sys.nivel)) {
      const seguir = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Nível de Técnica Marcial acima do acesso" },
        content: `<p><b>${this.name}</b> (nível ${s.nivel}) ainda não tem acesso a Técnicas
          Marciais de ${sys.nivelLabel} (p. 124). Usar mesmo assim?</p>`,
        rejectClose: false
      });
      if (!seguir) return null;
    }

    if (sys.usos.max > 0 && sys.usos.value <= 0) {
      return ui.notifications.warn(`${item.name} não tem usos restantes.`);
    }

    const custo = sys.custoEfetivo;
    if (custo > s.recursos.estamina.value) {
      return ui.notifications.warn(
        `Estamina insuficiente: ${item.name} custa ${custo} e ` +
          `${this.name} tem ${s.recursos.estamina.value}.`
      );
    }

    const perfil = this._perfilTecnicaMarcial(item);

    // O diálogo do ataque é cancelável, e vem antes do gasto
    let escolhas = null;
    if (sys.resolucao === "ataque") {
      escolhas = await this._dialogoAtaque(perfil);
      if (!escolhas) return null;
    }

    const extrato = await this.gastarEstamina(custo);
    if (!extrato) return ui.notifications.warn(`Estamina insuficiente para ${item.name}.`);

    if (sys.usos.max > 0) {
      await item.update({ "system.usos.value": sys.usos.value - 1 });
    }

    const linhas = [
      `<b>${sys.nivelLabel}</b> · <b>Execução:</b> ${sys.execucao} · <b>Duração:</b> ${sys.duracao}`,
      `<b>Alcance:</b> ${sys.alcance || `${sys.alcancePadrao} metros`} · <b>Alvo:</b> ${sys.alvo}` +
        (sys.area.formato ? ` · <b>Área:</b> ${sys.area.formato} de ${sys.area.tamanho} m` : "")
    ];
    if (sys.requisito) linhas.push(`<b>Requisito:</b> ${sys.requisito}`);
    if (sys.usos.max > 0) linhas.push(`<b>Usos:</b> ${sys.usos.value - 1}/${sys.usos.max}`);
    linhas.push(...extrato);

    const condicoes = perfil.condicoes ?? [];
    linhas.push(...avisosDeAplicacao(condicoes, sys.nivel, sys.focoEmCondicoes));

    if (sys.resolucao === "resistencia") {
      await cartaResistencia({
        ator: this,
        item,
        // A CD é a da especialização: o Restringido escolhe o atributo (p. 114)
        cd: s.cdEspecializacao,
        resistencia: sys.resistencia,
        subtitulo: `Técnica Marcial de ${sys.nivelLabel} · ${sys.custoEfetivo} Estamina`,
        linhas,
        dano: sys.dano || sys.danoPadrao,
        condicoes
      });
      return true;
    }

    await this._cartaDeEfeito(item, linhas, sys.resolucao === "ataque" ? [] : condicoes);

    if (sys.resolucao === "ataque") await this._executarAtaque(perfil, escolhas);
    return true;
  }

  /* ------------------------------------------ */
  /*  Ações de Invocação                        */
  /* ------------------------------------------ */

  /**
   * CD do Teste de Resistência forçado por uma Ação de Ataque (p. 263):
   * 10 + metade do nível do Controlador + o modificador do atributo da ação.
   */
  _cdAcaoInvocacao(perfil) {
    const chave = perfil.atributos[0];
    const base = this.system.cdAcao ?? 10;
    return { chave, base, mod: this.system.atributos[chave]?.mod ?? 0 };
  }

  /**
   * A CD de uma Ação, para a ficha mostrar o mesmo número que a carta publica.
   */
  cdDaAcaoInvocacao(item) {
    const cd = this._cdAcaoInvocacao(this._perfilAcaoInvocacao(item));
    return cd.base + cd.mod;
  }

  /** Rolagem de cura avulsa de uma Ação de Auxílio, sem passar pelo uso. */
  async rolarCuraAcao(item) {
    return this._rolarCura(this._perfilAcaoInvocacao(item));
  }

  /**
   * Cobra em PE o uso de uma Ação com Custo.
   *
   * Uma Invocação não tem energia própria: quem paga é o invocador (p. 269).
   * Sem invocador escolhido não há de quem descontar, e a mesa decide se segue
   * assim mesmo — é o caso de uma Invocação de NPC, que não tem ficha ligada.
   *
   * Devolve `null` quando o uso deve ser abortado.
   */
  async _cobrarCustoAcao(item) {
    const base = item.system.custoPE;
    if (!base) return [];

    const invocador = this.system.invocador;
    // Condenado encarece toda habilidade em 1 PE (p. 317), e quem paga aqui é o
    // invocador: a condição que importa é a dele, não a da Invocação
    const extraCondicao = invocador?.system?.condicoes?.custoPE ?? 0;
    const custo = base + extraCondicao;
    if (!invocador) {
      const seguir = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Sem invocador escolhido" },
        content: `<p><b>${item.name}</b> custa ${custo} PE, mas ${this.name} não tem invocador
          escolhido na ficha — não há de quem descontar. Usar mesmo assim?</p>`,
        rejectClose: false
      });
      return seguir ? [`<b>Custo:</b> ${custo} PE (sem invocador para pagar)`] : null;
    }

    if (custo > invocador.peDisponivel) {
      ui.notifications.warn(
        `PE insuficiente: ${item.name} custa ${custo} PE e ` +
          `${invocador.name} tem ${invocador.peDisponivel}.`
      );
      return null;
    }

    const extrato = await invocador.gastarPE(custo);
    const linhas = extrato.map(l => l.replace("<b>PE:</b>", `<b>PE de ${invocador.name}:</b>`));
    if (extraCondicao) {
      linhas.push(`<b>Condenado:</b> +${extraCondicao} PE no custo de ${invocador.name} (p. 317).`);
    }
    return linhas;
  }

  /**
   * Usa uma Ação ou Característica de Invocação (p. 262-272).
   *
   * É o equivalente de `conjurarFeitico` para o capítulo das Invocações: cobra
   * o custo do invocador, gasta o uso e resolve a ação pelo caminho que ela
   * declara — jogada de ataque contra a Defesa, Teste de Resistência do alvo,
   * ou apenas o dano/cura de um efeito que não depende de acerto.
   *
   * A ordem importa: o que o jogador pode cancelar (o diálogo do ataque) vem
   * ANTES do que é gasto, para uma desistência não custar PE nem uso.
   */
  async usarAcaoInvocacao(item) {
    const sys = item.system;

    // Características são passivas: não há o que resolver, só o que mostrar
    if (sys.tipo === "Característica" || !sys.rolavel) return item.roll();

    if (sys.semUsos) {
      return ui.notifications.warn(`${item.name} não tem usos restantes.`);
    }
    // Erros de criação não impedem o uso na mesa, mas a ficha avisa (p. 262-263)
    if (sys.exigeComplexa) {
      ui.notifications.warn(`${item.name}: uma Ação de Ataque tem de ser Ação Complexa (p. 263).`);
    }
    if (sys.simplesComDano) {
      ui.notifications.warn(`${item.name}: uma Ação Simples não causa dano nem cura (p. 262).`);
    }

    const perfil = this._perfilAcaoInvocacao(item);

    // O diálogo do ataque é a única etapa cancelável, e vem antes do gasto
    let escolhas = null;
    if (sys.ehAtaque) {
      escolhas = await this._dialogoAtaque(perfil);
      if (!escolhas) return null;
    }

    const linhasCusto = await this._cobrarCustoAcao(item);
    if (linhasCusto === null) return null;

    if (!sys.ilimitada) {
      await item.update({ "system.usos.value": sys.usos.value - 1 });
    }

    const linhas = [
      `<b>${perfil.subtitulo}</b>`,
      `<b>Alvo:</b> ${sys.alvo}` +
        (sys.alcance ? ` · <b>Alcance:</b> ${sys.alcance} m` : "") +
        (sys.area ? ` · <b>Área:</b> ${sys.area} m${sys.formatoArea ? ` (${sys.formatoArea})` : ""}` : "")
    ];
    if (sys.prejuizoAuxilio) {
      linhas.push(`<b>Prejuízo por múltiplos auxílios:</b> ${sys.prejuizoAuxilio}`);
    }
    if (!sys.ilimitada) {
      linhas.push(`<b>Usos:</b> ${sys.usos.value - 1}/${sys.usos.max}`);
    }
    linhas.push(...linhasCusto);

    const condicoes = perfil.condicoes ?? [];
    linhas.push(...avisosDeAplicacao(condicoes));

    // Resolução por TR: quem rola é o alvo, então a carta sai só com os botões
    // do teste e do dano — o mesmo caminho de um Feitiço (p. 263)
    if (sys.ehResistencia) {
      const cd = this._cdAcaoInvocacao(perfil);
      linhas.push(
        `<b>CD:</b> ${cd.base} da Invocação ${sinalDe(cd.mod)} de ` +
          `${FNM.atributos[cd.chave].nome} (p. 263)`
      );
      await cartaResistencia({
        ator: this,
        item,
        cd: cd.base + cd.mod,
        resistencia: sys.resistencia,
        subtitulo: perfil.subtitulo,
        // O capítulo 10 não diz o que o sucesso faz, então a carta assume o
        // meio dano dos Feitiços (p. 205) — é o padrão que deixa as duas
        // leituras ao alcance de um clique: metade no botão "Metade", ou nada
        // é só não aplicar. O contrário obrigaria a refazer a conta na mão.
        efeitoDaFalha:
          "Um sucesso no teste reduz o dano à metade — use o botão <b>Metade</b> na carta de dano. " +
          "Se na sua mesa o sucesso anula o efeito, não aplique nada.",
        linhas,
        dano: sys.dano,
        condicoes
      });
      return true;
    }

    await this._cartaDeEfeito(item, linhas, sys.ehAtaque ? [] : condicoes);

    if (sys.ehAtaque) {
      await this._executarAtaque(perfil, escolhas);
    } else if (sys.temDano) {
      // Sem jogada de acerto o dano é automático: sai junto da carta
      await this._rolarDano(perfil);
    }

    if (sys.temCura) await this._rolarCura(perfil);
    return true;
  }

  /**
   * Rolagem de cura de uma Ação de Auxílio (p. 268-269). O bônus é o mesmo do
   * dano — o modificador do atributo da ação, dobrado no Grau Especial.
   */
  async _rolarCura(perfil) {
    const chave = perfil.atributos[0];
    const fator = perfil.multiplicadorAtributoNoDano ?? 1;
    const mod = (this.system.atributos[chave]?.mod ?? 0) * fator;
    const base = perfil.item?.system?.cura;
    if (!base || base === "—") return null;

    const roll = new Roll(`${base} + @mod`, { mod });
    await roll.evaluate();

    await cartaDano({
      ator: this,
      perfil,
      roll,
      critico: false,
      versatil: false,
      cura: true,
      componentes: [
        { rotulo: `Dados de cura: ${base}`, semValor: true },
        {
          rotulo: fator > 1 ? `${FNM.atributos[chave].nome} (dobrado)` : FNM.atributos[chave].nome,
          valor: mod
        }
      ]
    });
    return roll;
  }

  /* ------------------------------------------ */
  /*  Dano, cura e Portas da Morte              */
  /* ------------------------------------------ */

  /**
   * Aplica dano respeitando PV temporários e Redução de Dano. Dano na Alma
   * atravessa tudo e reduz também a vida máxima (p. 311).
   */
  async aplicarDano(quantidade, { tipo = "", ignorarRD = false, perdaDeVida = false } = {}) {
    const s = this.system;
    let dano = Math.max(0, Math.floor(Number(quantidade) || 0));
    const linhas = [];
    const naAlma = tipo === "alma";

    // Perda de vida não é dano: reduz os PV atuais sem passar por Redução de
    // Dano nem por resistências (p. 316). É como o Sangramento cobra o turno.
    if (perdaDeVida) {
      linhas.push("<b>Perda de vida:</b> não é afetada por Redução de Dano nem por resistências (p. 316).");
    }

    // A ficha tem RD geral e RD por tipo de dano; usa-se a do tipo, se houver
    const rdAplicavel = tipo ? (s.combate.rdPorTipo?.[tipo] ?? s.combate.reducaoDanoTotal)
                             : s.combate.reducaoDanoTotal;
    if (!naAlma && !perdaDeVida && !ignorarRD && rdAplicavel > 0) {
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

    if (!naAlma && !perdaDeVida && s.recursos.pvTemporario > 0) {
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
        `<b>${this.name}</b> ${perdaDeVida ? "perde" : "sofre"} <b>${dano}</b> ` +
        (perdaDeVida ? "de vida" : "de dano") +
        (tipo && !perdaDeVida ? ` (${FNM.tiposDano[tipo]?.nome ?? tipo})` : "") +
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

    const atualizacoes = {
      "system.recursos.pv.value": s.recursos.pv.max,
      "system.recursos.pe.value": s.recursos.pe.max,
      "system.recursos.estamina.value": s.recursos.estamina.max,
      "system.dadosVida": pool,
      "system.exaustao": Math.max(0, s.exaustao - 1),
      "system.morte.sucessos": 0,
      "system.morte.falhas": 0
    };

    // Os contadores de uso do Grimório são do NPC, e não de um item (p. 18-19)
    for (const chave of ["guardaInabalavel", "resistenciaParcial", "resistenciaTotal"]) {
      const contador = s.inimigo?.[chave];
      if (contador?.max > 0) atualizacoes[`system.inimigo.${chave}.value`] = contador.max;
    }

    await this.update(atualizacoes);

    // Habilidades, Talentos, Aptidões, Técnicas e Ações voltam com os usos
    // cheios: é justamente no descanso longo que elas se recuperam (p. 335).
    // Sem isto o contador da ficha só subia clicando no "+", um uso por vez.
    const recuperados = this.items.filter(
      i => i.system?.usos?.max > 0 && i.system.usos.value < i.system.usos.max
    );
    if (recuperados.length) {
      await this.updateEmbeddedDocuments(
        "Item",
        recuperados.map(i => ({ _id: i.id, "system.usos.value": i.system.usos.max }))
      );
    }

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content:
        `<b>${this.name}</b> realiza um <b>Descanso Longo</b>: PV, PE e Dados de Vida ` +
        `restaurados; falhas nas Portas da Morte removidas` +
        (recuperados.length ? `; ${recuperados.length} item(ns) com usos restaurados` : "") +
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
