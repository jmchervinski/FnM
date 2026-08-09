/**
 * Data Models do sistema Feiticeiros & Maldições (não-oficial), seguindo o
 * padrão recomendado em https://foundryvtt.com/article/system-data-models/
 *
 * Regras conforme o Livro de Regras v2.5.2.
 */
import {
  FNM,
  modificador,
  bonusTreinamento,
  metadeNivel,
  bonusProficiencia,
  estadoDaAlma,
  danoDesarmado,
  danoDesarmadoLutador,
  feiticosAcessiveis
} from "./config.mjs";

const { HTMLField, NumberField, SchemaField, StringField, BooleanField, ArrayField } =
  foundry.data.fields;

/* -------------------------------------------- */
/*  Helpers de schema                           */
/* -------------------------------------------- */

/** Atributo: valor de 1 a 30 (máximo natural 20, superável por habilidades). */
const atributo = (initial = 10) =>
  new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 1, max: 30, initial })
  });

/**
 * Recurso no formato da ficha oficial: ATUAIS / PERDIDOS / MÁXIMOS.
 * `perdidos` reduz o máximo (é o que o Dano na Alma e a Exaustão consomem) e
 * `ajuste` é o campo livre de homebrew somado à fórmula.
 */
const recurso = (max = 0) =>
  new SchemaField({
    value: new NumberField({ required: true, integer: true, initial: max }),
    perdidos: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    max: new NumberField({ required: true, integer: true, min: 0, initial: max }),
    ajuste: new NumberField({ required: true, integer: true, initial: 0 })
  });

/** Grade de Redução de Dano por tipo, como na ficha oficial. */
const rdSchema = () => {
  const campos = { geral: new NumberField({ required: true, integer: true, initial: 0 }) };
  for (const tipo of FNM.tiposComRD) {
    campos[tipo] = new NumberField({ required: true, integer: true, initial: 0 });
  }
  return new SchemaField(campos);
};

/** As três linhas de Jogadas de Ataque da ficha (corpo a corpo, distância, amaldiçoado). */
const ataquesSchema = () => {
  const campos = {};
  for (const [id, cfg] of Object.entries(FNM.tiposAtaque)) {
    campos[id] = new SchemaField({
      treinado: new BooleanField({ required: true, initial: cfg.sempreTreinado === true }),
      outros: new NumberField({ required: true, integer: true, initial: 0 }),
      atributo: new StringField({
        required: true,
        blank: true,
        initial: cfg.atributo,
        choices: ["", ...Object.keys(FNM.atributos)]
      })
    });
  }
  return new SchemaField(campos);
};

/** Proficiência de perícia/resistência: treinado, mestre e bônus avulsos. */
const proficiencia = () =>
  new SchemaField({
    treinado: new BooleanField({ required: true, initial: false }),
    mestre: new BooleanField({ required: true, initial: false }),
    outros: new NumberField({ required: true, integer: true, initial: 0 })
  });

/** Bloco de perícias: uma entrada por perícia do capítulo 11. */
const periciasSchema = () => {
  const campos = {};
  for (const id of Object.keys(FNM.pericias)) {
    campos[id] = new SchemaField({
      treinado: new BooleanField({ required: true, initial: false }),
      mestre: new BooleanField({ required: true, initial: false }),
      outros: new NumberField({ required: true, integer: true, initial: 0 }),
      // Ofício exige escolher uma subcategoria (Ferreiro, Alfaiate, etc.)
      especialidade: new StringField({ required: true, blank: true })
    });
  }
  return new SchemaField(campos);
};

/** Bloco dos cinco Testes de Resistência. */
const resistenciasSchema = () => {
  const campos = {};
  for (const id of Object.keys(FNM.resistencias)) campos[id] = proficiencia();
  return new SchemaField(campos);
};

/** Etapas concluídas (0 a 4) de cada um dos onze treinamentos. */
const treinamentosSchema = () => {
  const campos = {};
  for (const t of FNM.treinamentos) {
    campos[t.id] = new NumberField({ required: true, integer: true, min: 0, max: 4, initial: 0 });
  }
  return new SchemaField(campos);
};

/** Níveis de Aptidão (AU, CL, BAR, DOM, ER), de 0 a 5. */
const aptidoesSchema = () => {
  const campos = {};
  for (const id of Object.keys(FNM.niveisAptidao)) {
    campos[id] = new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 });
  }
  return new SchemaField(campos);
};

/* -------------------------------------------- */
/*  Base comum a todos os atores                */
/* -------------------------------------------- */

class BaseActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      atributos: new SchemaField({
        forca: atributo(),
        destreza: atributo(),
        constituicao: atributo(),
        inteligencia: atributo(),
        sabedoria: atributo(),
        presenca: atributo()
      }),
      recursos: new SchemaField({
        pv: recurso(10),
        pvTemporario: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        pe: recurso(0),
        peTemporario: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        estamina: recurso(0),
        integridade: recurso(10)
      }),
      pericias: periciasSchema(),
      resistencias: resistenciasSchema(),
      combate: new SchemaField({
        // Decomposição da Defesa como na ficha: Base 10 + Equip. + Destreza + Nível/2 + Outros
        defesaEquip: new NumberField({ required: true, integer: true, initial: 0 }),
        defesaOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        // NPCs de livro trazem Defesa fixa; quando > 0 e valoresManuais estiver
        // ligado, este valor substitui a fórmula 10 + DES + metade do nível.
        defesaManual: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        iniciativaOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        atencaoOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        deslocamento: new NumberField({ required: true, min: 0, initial: 9 }),
        deslocamentoExtra: new StringField({ required: true, blank: true }),
        rd: rdSchema()
      }),
      ataques: ataquesSchema(),
      // Exaustão de 0 a 6 (p. 324). O nível 6 é morte.
      exaustao: new NumberField({ required: true, integer: true, min: 0, max: 6, initial: 0 }),
      // Portas da Morte (p. 313)
      morte: new SchemaField({
        sucessos: new NumberField({ required: true, integer: true, min: 0, max: 3, initial: 0 }),
        falhas: new NumberField({ required: true, integer: true, min: 0, max: 3, initial: 0 })
      }),
      biografia: new HTMLField({ required: true, blank: true })
    };
  }

  /** Nível de personagem — sobrescrito por cada tipo de ator. */
  get nivel() {
    return 1;
  }

  /**
   * Soma os ajustes mecânicos de todos os itens do ator (Origens, Talentos,
   * Uniformes, Escudos etc.). Equipamentos e armas só contam quando equipados.
   */
  _ajustesDeItens() {
    const total = { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0 };
    for (const item of this.parent?.items ?? []) {
      const aj = item.system?.ajustes;
      if (!aj) continue;
      // Itens vestíveis só valem enquanto equipados
      const vestivel = item.type === "arma" || item.type === "equipamento";
      if (vestivel && !(item.system.equipada || item.system.equipado)) continue;
      // Votos desativados não concedem seus benefícios
      if (item.type === "voto" && item.system.ativo === false) continue;
      for (const chave of Object.keys(total)) total[chave] += aj[chave] ?? 0;
    }
    return total;
  }

  /** Modificadores derivados dos seis atributos. */
  _prepararModificadores() {
    for (const chave of Object.keys(FNM.atributos)) {
      const attr = this.atributos[chave];
      attr.mod = modificador(attr.value);
      attr.label = FNM.atributos[chave].nome;
      attr.abrev = FNM.atributos[chave].abrev;
    }
  }

  /**
   * Perícias e Resistências: modificador do atributo-chave + metade do nível +
   * proficiência (Treinado = BT, Mestre = 1,5x BT) + outros bônus (p. 278/280).
   */
  _prepararTestes() {
    const nivel = this.nivel;
    const metade = metadeNivel(nivel);

    for (const [id, cfg] of Object.entries(FNM.pericias)) {
      const p = this.pericias[id];
      p.nome = cfg.nome;
      p.atributo = cfg.atributo;
      p.exigeTreino = cfg.exigeTreino === true;
      p.complementar = cfg.complementar === true;
      p.temSubcategoria = cfg.subcategoria === true;
      p.total =
        this.atributos[cfg.atributo].mod +
        metade +
        bonusProficiencia(nivel, p) +
        p.outros +
        this.penalidadeGlobal;
      // Perícias que exigem treino ficam inutilizáveis sem ele (salvo exceções da mesa)
      p.bloqueada = p.exigeTreino && !p.treinado && !p.mestre;
    }

    for (const [id, cfg] of Object.entries(FNM.resistencias)) {
      const r = this.resistencias[id];
      r.nome = cfg.nome;
      r.atributo = cfg.atributo;
      r.total =
        this.atributos[cfg.atributo].mod +
        metade +
        bonusProficiencia(nivel, r) +
        r.outros +
        this.penalidadeGlobal;
    }
  }

  /** Defesa, Atenção, Iniciativa e Deslocamento (p. 19-20, 282). */
  _prepararCombate() {
    const c = this.combate;
    const nivel = this.nivel;
    const itens = this.ajustesItens ?? { defesa: 0, deslocamento: 0, reducaoDano: 0 };

    c.defesa =
      10 +
      this.atributos.destreza.mod +
      metadeNivel(nivel) +
      c.defesaEquip +
      c.defesaOutros +
      itens.defesa +
      this.penalidadeGlobal;

    // Atenção é uma percepção passiva: 10 + bônus de Percepção (p. 19)
    c.atencao = 10 + (this.pericias.percepcao?.total ?? 0) + c.atencaoOutros;

    c.iniciativa = this.atributos.destreza.mod + c.iniciativaOutros + this.penalidadeGlobal;

    // RD geral (somando equipamentos) e a grade por tipo de dano
    c.reducaoDanoTotal = c.rd.geral + itens.reducaoDano;
    c.rdPorTipo = {};
    for (const tipo of FNM.tiposComRD) {
      c.rdPorTipo[tipo] = c.reducaoDanoTotal + (c.rd[tipo] ?? 0);
    }

    // Cada nível de exaustão reduz 1,5 m de deslocamento (p. 324)
    c.deslocamentoAtual = Math.max(
      0,
      c.deslocamento + itens.deslocamento - this.exaustao * 1.5
    );
  }

  /**
   * As três Jogadas de Ataque da ficha: atributo + metade do nível +
   * Bônus de Treinamento (se treinado) + outros (p. 279).
   */
  _prepararAtaques() {
    const metade = metadeNivel(this.nivel);
    const bt = bonusTreinamento(this.nivel);
    this.ataquesView = {};
    for (const [id, cfg] of Object.entries(FNM.tiposAtaque)) {
      const a = this.ataques[id];
      // O Ataque Amaldiçoado segue o atributo da técnica, salvo escolha explícita
      const padrao =
        id === "amaldicoado" ? this.jujutsu?.atributoTecnica || cfg.atributo : cfg.atributo;
      const chave = a.atributo || padrao;
      const mod = this.atributos[chave]?.mod ?? 0;
      a.nome = cfg.nome;
      a.modAtributo = mod;
      a.total = mod + metade + (a.treinado ? bt : 0) + a.outros + this.penalidadeGlobal;
      this.ataquesView[id] = a;
    }
  }

  /**
   * Estado da Alma derivado da Integridade (p. 312). A Integridade máxima é
   * sempre igual ao máximo de Pontos de Vida.
   */
  _prepararAlma() {
    // Integridade máxima acompanha o máximo de PV (p. 19), descontando o que
    // tiver sido perdido só na alma.
    this.recursos.integridade.max = Math.max(
      0,
      this.recursos.pv.max - this.recursos.integridade.perdidos
    );
    const estado = estadoDaAlma(this.recursos.integridade.value, this.recursos.integridade.max);
    this.alma = {
      estado: estado.nome,
      id: estado.id,
      penalidade: estado.penalidade,
      custoExtra: estado.custoExtra,
      condicoes: estado.condicoes
    };
  }

  /** Penalidade acumulada de Exaustão e Estado da Alma, aplicada às rolagens. */
  _prepararPenalidades() {
    // Exaustão 1 dá -1, aumentando -1 por nível (p. 324)
    this.penalidadeExaustao = this.exaustao > 0 ? -this.exaustao : 0;
    this.penalidadeAlma = this.alma?.penalidade ?? 0;
    this.penalidadeGlobal = this.penalidadeExaustao + this.penalidadeAlma;
  }

  /** Estado de consciência derivado dos Pontos de Vida (p. 313). */
  _prepararEstado() {
    const pv = this.recursos.pv;
    if (this.exaustao >= 6) this.estado = "Morto (Exaustão 6)";
    else if (this.recursos.integridade.max && this.recursos.integridade.value <= 0)
      this.estado = "Morto (Alma destruída)";
    else if (this.morte.falhas >= 3) this.estado = "Morto";
    else if (pv.value <= -pv.max) this.estado = "Morto (dano massivo)";
    else if (pv.value <= 0) this.estado = "Morrendo";
    else this.estado = "Consciente";
    this.morrendo = this.estado === "Morrendo";
  }

  prepareBaseData() {
    super.prepareBaseData();
    // Precisam existir antes de qualquer cálculo que as consulte
    this.penalidadeExaustao = 0;
    this.penalidadeAlma = 0;
    this.penalidadeGlobal = 0;
    this.alma = { estado: "Estável", penalidade: 0, custoExtra: 0, condicoes: [] };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.ajustesItens = this._ajustesDeItens();
    this._prepararModificadores();
    this._prepararAlma();
    this._prepararPenalidades();
    // Percepção precisa estar pronta antes da Atenção
    this._prepararTestes();
    this._prepararCombate();
    this._prepararAtaques();
    this._prepararEstado();

    // Valores que todas as fichas exibem, inclusive as que não têm jujutsu
    this.bonusTreinamento = bonusTreinamento(this.nivel);
    this.metadeNivel = metadeNivel(this.nivel);
    this.danoDesarmado = danoDesarmado(this.nivel);
  }

  /** Dados expostos a fórmulas de rolagem (@atributos.forca.mod, @bt, etc.). */
  getRollData() {
    return {
      ...this.atributos,
      atributos: this.atributos,
      pericias: this.pericias,
      resistencias: this.resistencias,
      nivel: this.nivel,
      bt: bonusTreinamento(this.nivel),
      metadeNivel: metadeNivel(this.nivel),
      defesa: this.combate.defesa,
      iniciativa: this.combate.iniciativa,
      penalidade: this.penalidadeGlobal
    };
  }
}

/* -------------------------------------------- */
/*  Personagem (Feiticeiro)                     */
/* -------------------------------------------- */

export class CharacterDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      detalhes: new SchemaField({
        nivel: new NumberField({ required: true, integer: true, min: 1, max: 20, initial: 1 }),
        experiencia: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        grau: new StringField({ required: true, blank: true, initial: "Grau 4" }),
        origem: new StringField({ required: true, blank: true }),
        cla: new StringField({ required: true, blank: true }),
        idade: new NumberField({ required: true, integer: true, min: 0, initial: 16 }),
        escola: new StringField({ required: true, blank: true }),
        campanha: new StringField({ required: true, blank: true }),
        jogador: new StringField({ required: true, blank: true }),
        // Atributo escolhido na criação para ganhar perícias extras (p. 283)
        atributoPericias: new StringField({
          required: true,
          blank: true,
          initial: "inteligencia",
          choices: ["", "inteligencia", "sabedoria"]
        })
      }),
      // Perfil Amaldiçoado: técnica, atributo de jujutsu e níveis de aptidão
      jujutsu: new SchemaField({
        atributoTecnica: new StringField({
          required: true,
          blank: true,
          initial: "inteligencia",
          choices: ["", ...Object.keys(FNM.atributos)]
        }),
        atributoEspecializacao: new StringField({
          required: true,
          blank: true,
          initial: "forca",
          choices: ["", ...Object.keys(FNM.atributos)]
        }),
        // A ficha traz duas caixas de CD com a mesma fórmula, permitindo bônus
        // distintos: CD Técnica (Feitiços) e CD Amaldiçoada (Aptidões).
        cdTecnicaOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        cdOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        aptidoes: aptidoesSchema(),
        // Expansão de Domínio e Técnica Máxima, da página Perfil Amaldiçoado
        expansao: new SchemaField({
          nome: new StringField({ required: true, blank: true }),
          tipo: new StringField({ required: true, blank: true }),
          descricao: new HTMLField({ required: true, blank: true })
        }),
        tecnicaMaxima: new SchemaField({
          nome: new StringField({ required: true, blank: true }),
          descricao: new HTMLField({ required: true, blank: true })
        })
      }),
      // Fontes de PV extra listadas na ficha oficial (quadro "EXTRA")
      pvExtra: new SchemaField({
        kamo: new NumberField({ required: true, integer: true, initial: 0 }),
        robustez: new NumberField({ required: true, integer: true, initial: 0 }),
        descontoExaustao: new NumberField({ required: true, integer: true, initial: 0 }),
        vigorInfinito: new NumberField({ required: true, integer: true, initial: 0 }),
        outros: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      // A ficha traz três linhas de Ofício, cada uma com sua subcategoria
      oficios: new ArrayField(
        new SchemaField({
          especialidade: new StringField({ required: true, blank: true }),
          treinado: new BooleanField({ required: true, initial: false }),
          mestre: new BooleanField({ required: true, initial: false }),
          outros: new NumberField({ required: true, integer: true, initial: 0 })
        }),
        { required: true, initial: [] }
      ),
      // Página "Treinamentos": 4 etapas por treinamento
      treinamentos: treinamentosSchema(),
      // Dados de Vida gastos/disponíveis por tamanho de dado (p. 20, 335)
      dadosVida: new ArrayField(
        new SchemaField({
          dado: new StringField({ required: true, initial: "d8" }),
          total: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          gastos: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
        }),
        { required: true, initial: [] }
      ),
      // Aspectos Pessoais (p. 15-16)
      aspectos: new SchemaField({
        personalidade: new StringField({ required: true, blank: true }),
        ideais: new StringField({ required: true, blank: true }),
        ligacoes: new StringField({ required: true, blank: true }),
        complicacoes: new StringField({ required: true, blank: true }),
        dominioInato: new HTMLField({ required: true, blank: true })
      }),
      // Bloco "Aparência" da página Registro e Inventário
      aparencia: new SchemaField({
        altura: new StringField({ required: true, blank: true }),
        peso: new StringField({ required: true, blank: true }),
        genero: new StringField({ required: true, blank: true }),
        cabelos: new StringField({ required: true, blank: true }),
        olhos: new StringField({ required: true, blank: true }),
        pele: new StringField({ required: true, blank: true }),
        roupas: new StringField({ required: true, blank: true }),
        marca: new StringField({ required: true, blank: true }),
        descricao: new HTMLField({ required: true, blank: true })
      }),
      inventario: new SchemaField({
        // A ficha oficial parte de um Limite de Espaços igual a 8
        limiteEspacos: new NumberField({ required: true, integer: true, min: 0, initial: 8 })
      }),
      anotacoes: new HTMLField({ required: true, blank: true })
    };
  }

  get nivel() {
    return this.detalhes.nivel;
  }

  /**
   * Soma os PV/PE concedidos pelos itens de Especialização do ator. Cada item
   * carrega quantos níveis o personagem tem naquela especialização, o que
   * também cobre Multiclasse (p. 47).
   */
  _somarEspecializacoes() {
    const especs = (this.parent?.items ?? []).filter(i => i.type === "especializacao");
    const modCon = this.atributos.constituicao.mod;
    const modTecnica = this.atributos[this.jujutsu.atributoTecnica]?.mod ?? 0;

    let pvBase = 0;
    let peBase = 0;
    let estaminaBase = 0;
    let niveisTotais = 0;
    let primeira = true;
    let ehRestringido = false;
    let ehLutador = false;

    // A especialização com mais níveis é tratada como a principal (1º nível)
    const ordenadas = [...especs].sort((a, b) => (b.system.niveis ?? 0) - (a.system.niveis ?? 0));

    for (const item of ordenadas) {
      const cfg = FNM.especializacoes.find(e => e.id === item.system.especializacao);
      const niveis = Math.max(0, item.system.niveis ?? 0);
      if (!cfg || !niveis) continue;
      niveisTotais += niveis;
      if (cfg.id === "restringido") ehRestringido = true;
      if (cfg.id === "lutador") ehLutador = true;

      // 1º nível da especialização principal usa o valor fixo; os demais, o valor
      // de níveis subsequentes. Em Multiclasse, o 1º nível da nova especialização
      // já conta como subsequente (p. 47).
      if (primeira) {
        pvBase += cfg.pvPrimeiro + (niveis - 1) * cfg.pvFixo;
        primeira = false;
      } else {
        pvBase += niveis * cfg.pvFixo;
      }

      peBase += niveis * cfg.pe;
      estaminaBase += niveis * (cfg.estamina ?? 0);
      // Especializações de técnica somam o modificador uma única vez (p. 21)
      if (cfg.somaAtributo) peBase += modTecnica;
    }

    this.especializacaoPrincipal = ordenadas[0]?.system?.especializacao ?? "";
    this.niveisEspecializacao = niveisTotais;
    this.ehRestringido = ehRestringido;
    this.ehLutador = ehLutador;

    return {
      // O modificador de Constituição é somado uma vez por nível (p. 20)
      pv: pvBase + modCon * Math.max(1, niveisTotais || this.nivel),
      pe: peBase,
      estamina: estaminaBase
    };
  }

  prepareDerivedData() {
    // Ordem importa: PV/PE dependem dos itens; Integridade depende do PV.
    this.ajustesItens = this._ajustesDeItens();
    this._prepararModificadores();

    const totais = this._somarEspecializacoes();
    const aj = this.ajustesItens;

    // Quadro "EXTRA" da ficha: fontes avulsas de PV máximo
    const extra = Object.values(this.pvExtra).reduce((n, v) => n + v, 0);
    this.pvExtraTotal = extra;

    // MÁXIMOS = derivado + extras + ajuste − PERDIDOS (coluna da ficha oficial)
    this.recursos.pv.max = Math.max(
      1,
      totais.pv + extra + aj.pv + this.recursos.pv.ajuste - this.recursos.pv.perdidos
    );
    this.recursos.pe.max = Math.max(
      0,
      totais.pe + aj.pe + this.recursos.pe.ajuste - this.recursos.pe.perdidos
    );
    this.recursos.estamina.max = Math.max(
      0,
      totais.estamina + this.recursos.estamina.ajuste - this.recursos.estamina.perdidos
    );

    this._prepararAlma();
    this._prepararPenalidades();
    this._prepararTestes();
    this._prepararCombate();
    this._prepararAtaques();
    this._prepararEstado();

    // Valores de jujutsu (p. 198): CDs de técnica e de especialização
    const bt = bonusTreinamento(this.nivel);
    const metade = metadeNivel(this.nivel);
    const modTecnica = this.atributos[this.jujutsu.atributoTecnica]?.mod ?? 0;
    const modEspec = this.atributos[this.jujutsu.atributoEspecializacao]?.mod ?? 0;

    this.bonusTreinamento = bt;
    this.metadeNivel = metade;
    // As duas caixas de CD da ficha compartilham a fórmula e diferem só nos "Outros"
    const cdBase = 10 + metade + modTecnica + bt + this.penalidadeGlobal;
    this.cdTecnica = cdBase + this.jujutsu.cdTecnicaOutros;
    this.cdAmaldicoada = cdBase + this.jujutsu.cdOutros;
    this.cdEspecializacao = 10 + metade + modEspec + bt + this.penalidadeGlobal;

    // Ataque Amaldiçoado: sempre treinado (p. 279)
    this.ataqueAmaldicoado = this.ataques.amaldicoado.total;

    this.danoDesarmado = this.ehLutador ? danoDesarmadoLutador(this.nivel) : danoDesarmado(this.nivel);
    this.niveisFeiticoDisponiveis = feiticosAcessiveis(this.nivel);

    // Linhas de Ofício: mesmo cálculo das demais perícias (atributo Inteligência)
    this.oficiosView = (this.oficios ?? []).map((o, idx) => ({
      idx,
      ...o,
      total:
        this.atributos.inteligencia.mod +
        metade +
        bonusProficiencia(this.nivel, o) +
        o.outros +
        this.penalidadeGlobal
    }));

    // Treinamentos: 4 etapas concluídas liberam o Treinamento Completo
    this.treinamentosView = FNM.treinamentos.map(t => ({
      ...t,
      etapas: this.treinamentos?.[t.id] ?? 0,
      concluido: (this.treinamentos?.[t.id] ?? 0) >= 4
    }));

    // Perícias adicionais concedidas pelo atributo escolhido na criação (p. 283)
    this.periciasExtras = Math.max(0, this.atributos[this.detalhes.atributoPericias]?.mod ?? 0);

    // Dados de Vida restantes, somados entre os tamanhos
    this.dadosVidaRestantes = this.dadosVida.reduce(
      (n, d) => n + Math.max(0, d.total - d.gastos),
      0
    );
  }

  getRollData() {
    return {
      ...super.getRollData(),
      cdAmaldicoada: this.cdAmaldicoada,
      cdEspecializacao: this.cdEspecializacao,
      ataqueAmaldicoado: this.ataqueAmaldicoado,
      aptidoes: this.jujutsu.aptidoes
    };
  }
}

/* -------------------------------------------- */
/*  NPC / Maldição                              */
/* -------------------------------------------- */

export class NpcDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      detalhes: new SchemaField({
        nivel: new NumberField({ required: true, integer: true, min: 1, max: 30, initial: 1 }),
        grau: new StringField({ required: true, blank: true, initial: "Grau 4" }),
        tipo: new StringField({
          required: true,
          initial: "Maldição",
          choices: ["Maldição", "Feiticeiro", "Humano", "Corpo Amaldiçoado", "Outro"]
        }),
        // Fichas de NPC costumam trazer PV/Defesa fixos, fora das fórmulas
        valoresManuais: new BooleanField({ required: true, initial: true })
      }),
      jujutsu: new SchemaField({
        atributoTecnica: new StringField({
          required: true,
          blank: true,
          initial: "inteligencia",
          choices: ["", ...Object.keys(FNM.atributos)]
        }),
        cdOutros: new NumberField({ required: true, integer: true, initial: 0 }),
        aptidoes: aptidoesSchema()
      }),
      defesas: new SchemaField({
        imunidades: new StringField({ required: true, blank: true }),
        resistencias: new StringField({ required: true, blank: true }),
        vulnerabilidades: new StringField({ required: true, blank: true })
      }),
      taticas: new HTMLField({ required: true, blank: true })
    };
  }

  get nivel() {
    return this.detalhes.nivel;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const bt = bonusTreinamento(this.nivel);
    const metade = metadeNivel(this.nivel);
    const modTecnica = this.atributos[this.jujutsu.atributoTecnica]?.mod ?? 0;

    this.bonusTreinamento = bt;
    this.metadeNivel = metade;
    this.cdAmaldicoada = 10 + metade + modTecnica + bt + this.jujutsu.cdOutros + this.penalidadeGlobal;
    this.cdEspecializacao = this.cdAmaldicoada;
    this.ataqueAmaldicoado = modTecnica + metade + bt + this.penalidadeGlobal;
    this.danoDesarmado = danoDesarmado(this.nivel);

    // Com valores manuais, a Defesa digitada na ficha prevalece sobre a fórmula
    if (this.detalhes.valoresManuais && this.combate.defesaManual > 0) {
      this.combate.defesa = this.combate.defesaManual + this.penalidadeGlobal;
    }
  }
}

/* -------------------------------------------- */
/*  Invocação (Shikigami / Corpo Amaldiçoado)   */
/* -------------------------------------------- */

export class InvocacaoDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      detalhes: new SchemaField({
        nivel: new NumberField({ required: true, integer: true, min: 1, max: 30, initial: 1 }),
        // id do ator que controla esta invocação
        invocador: new StringField({ required: true, blank: true }),
        tipo: new StringField({
          required: true,
          initial: "Shikigami",
          choices: FNM.tiposInvocacao
        }),
        grau: new StringField({ required: true, blank: true, initial: "Grau 4" }),
        custoInvocacao: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
        ativa: new BooleanField({ required: true, initial: false })
      })
    };
  }

  get nivel() {
    return this.detalhes.nivel;
  }
}

/* -------------------------------------------- */
/*  Base comum aos itens                        */
/* -------------------------------------------- */

/** Contador de usos "Atual / Máx." das listas de habilidades da ficha oficial. */
const usosSchema = () =>
  new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
  });

class BaseItemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, blank: true }),
      // Ajustes aplicados ao dono enquanto ele possuir o item
      ajustes: new SchemaField({
        pv: new NumberField({ required: true, integer: true, initial: 0 }),
        pe: new NumberField({ required: true, integer: true, initial: 0 }),
        defesa: new NumberField({ required: true, integer: true, initial: 0 }),
        deslocamento: new NumberField({ required: true, initial: 0 }),
        reducaoDano: new NumberField({ required: true, integer: true, initial: 0 })
      })
    };
  }
}

export class OrigemDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      origem: new StringField({
        required: true,
        initial: "inato",
        choices: FNM.origens.map(o => o.id)
      }),
      cla: new StringField({ required: true, blank: true }),
      bonusAtributos: new StringField({ required: true, blank: true })
    };
  }
}

export class EspecializacaoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      especializacao: new StringField({
        required: true,
        initial: "lutador",
        choices: FNM.especializacoes.map(e => e.id)
      }),
      // Quantos níveis o personagem tem nesta especialização (Multiclasse)
      niveis: new NumberField({ required: true, integer: true, min: 0, max: 20, initial: 1 }),
      atributoChave: new StringField({
        required: true,
        blank: true,
        initial: "forca",
        choices: ["", ...Object.keys(FNM.atributos)]
      })
    };
  }
}

/** Habilidade de Especialização — os poderes concedidos por nível de classe. */
export class HabilidadeDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      especializacao: new StringField({ required: true, blank: true }),
      nivelRequerido: new NumberField({ required: true, integer: true, min: 1, max: 20, initial: 1 }),
      custoPE: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      acao: new StringField({ required: true, blank: true }),
      // Colunas "Atual / Máx." da lista de Habilidades e Talentos da ficha
      usos: usosSchema()
    };
  }
}

export class TalentoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categoria: new StringField({
        required: true,
        initial: "Geral",
        choices: ["Geral", "Origem"]
      }),
      prerequisito: new StringField({ required: true, blank: true }),
      custoPE: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      usos: usosSchema()
    };
  }
}

export class AptidaoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categoria: new StringField({
        required: true,
        initial: "Aura",
        choices: FNM.categoriasAptidao
      }),
      // Ex.: exige "AU 3" — área e nível mínimo de aptidão
      areaAptidao: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.niveisAptidao)]
      }),
      nivelAptidao: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
      prerequisito: new StringField({ required: true, blank: true }),
      custoPE: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      acao: new StringField({ required: true, blank: true }),
      usos: usosSchema()
    };
  }
}

/** Técnica Amaldiçoada: o Funcionamento Básico do personagem (p. 197-198). */
export class TecnicaDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tipo: new StringField({
        required: true,
        initial: "Inata",
        choices: ["Inata", "Herdada", "Barreira", "Shikigami", "Adquirida", "Outra"]
      }),
      funcionamento: new HTMLField({ required: true, blank: true }),
      atributo: new StringField({
        required: true,
        blank: true,
        initial: "inteligencia",
        choices: ["", ...Object.keys(FNM.atributos)]
      })
    };
  }
}

/** Feitiço: a técnica de extensão, criada pelo jogador (p. 199-235). */
export class FeiticoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      nivel: new StringField({
        required: true,
        initial: "0",
        choices: FNM.niveisFeitico.map(n => n.id)
      }),
      tipo: new StringField({ required: true, initial: "Dano", choices: FNM.tiposFeitico }),
      // Custo em PE. Deixe em -1 para usar o custo padrão do nível (p. 199).
      custoPE: new NumberField({ required: true, integer: true, min: -1, initial: -1 }),
      conjuracao: new StringField({ required: true, initial: "Ação Comum", choices: FNM.conjuracoes }),
      alcance: new StringField({ required: true, blank: true }),
      alvo: new StringField({ required: true, initial: "Criatura", choices: FNM.tiposAlvo }),
      area: new SchemaField({
        formato: new StringField({ required: true, blank: true, choices: ["", ...FNM.formatosArea] }),
        tamanho: new NumberField({ required: true, min: 0, initial: 0 })
      }),
      duracao: new StringField({ required: true, initial: "Imediato", choices: FNM.duracoes }),
      // Como o Feitiço é resolvido: teste de ataque, TR do alvo, ou nenhum
      resolucao: new StringField({
        required: true,
        initial: "ataque",
        choices: ["ataque", "resistencia", "nenhuma"]
      }),
      resistencia: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.resistencias)]
      }),
      dano: new StringField({ required: true, blank: true }),
      tipoDano: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.tiposDano)]
      }),
      // Marca Registrada do Inato e efeitos afins reduzem o custo (p. 27)
      reducaoCusto: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      // Variação de Liberação: aponta para o Feitiço base (p. 200)
      variacaoDe: new StringField({ required: true, blank: true }),
      requisito: new StringField({ required: true, blank: true }),
      preparado: new BooleanField({ required: true, initial: true })
    };
  }

  /**
   * Custo efetivo em PE. O padrão vem da tabela de níveis; reduções nunca
   * levam o custo abaixo de 1, exceto em Feitiços de nível 0 (p. 199).
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const cfg = FNM.niveisFeitico.find(n => n.id === this.nivel) ?? FNM.niveisFeitico[0];
    const base = this.custoPE >= 0 ? this.custoPE : cfg.custo;
    const comReducao = base - this.reducaoCusto;
    this.custoEfetivo = this.nivel === "0" ? Math.max(0, comReducao) : Math.max(1, comReducao);
    this.nivelLabel = cfg.nome;
    this.alcancePadrao = cfg.alcance;
    this.danoPadrao =
      this.alvo === "Área"
        ? cfg.danoArea
        : this.resolucao === "ataque"
          ? cfg.danoAtaque
          : cfg.danoTR;
  }
}

export class ArmaDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categoria: new StringField({ required: true, initial: "Simples", choices: FNM.categoriasArma }),
      grupo: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.gruposArma)]
      }),
      dano: new StringField({ required: true, blank: true, initial: "1d6" }),
      danoVersatil: new StringField({ required: true, blank: true }),
      tipoDano: new StringField({
        required: true,
        blank: true,
        initial: "cortante",
        choices: ["", ...Object.keys(FNM.tiposDano)]
      }),
      // Valor mínimo no d20 para crítico (20 é o padrão; armas afiadas reduzem)
      critico: new NumberField({ required: true, integer: true, min: 15, max: 20, initial: 20 }),
      propriedades: new StringField({ required: true, blank: true }),
      alcance: new StringField({ required: true, blank: true }),
      espacos: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      custo: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      grau: new StringField({ required: true, blank: true }),
      // Fineza permite trocar Força por Destreza no ataque e no dano (p. 279)
      fineza: new BooleanField({ required: true, initial: false }),
      treinado: new BooleanField({ required: true, initial: true }),
      equipada: new BooleanField({ required: true, initial: false }),
      bonusAtaque: new NumberField({ required: true, integer: true, initial: 0 }),
      bonusDano: new NumberField({ required: true, integer: true, initial: 0 }),
      quantidade: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      // Colunas PESO e PREÇO do inventário da ficha oficial
      peso: new NumberField({ required: true, min: 0, initial: 0 }),
      preco: new StringField({ required: true, blank: true })
    };
  }
}

export class EquipamentoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tipo: new StringField({ required: true, initial: "Diverso", choices: FNM.tiposEquipamento }),
      grau: new StringField({ required: true, blank: true }),
      espacos: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      custo: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      quantidade: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      equipado: new BooleanField({ required: true, initial: false }),
      peso: new NumberField({ required: true, min: 0, initial: 0 }),
      preco: new StringField({ required: true, blank: true })
    };
  }
}

/** Voto de Restrição (p. 351-357). */
export class VotoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      peso: new StringField({ required: true, initial: "Leve", choices: FNM.pesosVoto }),
      restricao: new HTMLField({ required: true, blank: true }),
      ativo: new BooleanField({ required: true, initial: true })
    };
  }
}
