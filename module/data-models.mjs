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
  bonusTreinamentoND,
  patamarInimigo,
  metadeNivel,
  bonusProficiencia,
  estadoDaAlma,
  danoDesarmado,
  danoDesarmadoLutador,
  feiticosAcessiveis,
  tecnicasMarciaisAcessiveis,
  tecnicasMarciaisConhecidas,
  dadivasRecebidas,
  arsenalDoRestringido
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

/**
 * Um valor que substitui a fórmula quando preenchido. `null` — o campo vazio na
 * ficha — quer dizer "deixa a fórmula calcular", então 0 e negativo continuam
 * sendo valores legítimos (uma Iniciativa -1 é uma Iniciativa -1, não um campo
 * em branco).
 */
const manual = () =>
  new NumberField({ required: false, nullable: true, integer: true, initial: null });

/** Contador de usos "Atual / Máx." das listas de habilidades da ficha oficial. */
const usosSchema = () =>
  new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
  });

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

  /** Um item vestível só vale enquanto estiver equipado. */
  static _equipado(item) {
    if (item.type !== "arma" && item.type !== "equipamento") return true;
    return item.system.equipada === true || item.system.equipado === true;
  }

  /**
   * Soma os ajustes mecânicos de todos os itens do ator (Origens, Talentos,
   * Uniformes, Escudos etc.). Equipamentos e armas só contam quando equipados.
   *
   * Um uniforme lança seu bônus na Defesa e um escudo a sua Redução de Dano
   * pelos campos próprios; `ajustes` continua sendo a saída de emergência para
   * qualquer outro efeito, e os dois se somam.
   */
  _ajustesDeItens() {
    const total = { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0, penalidade: 0 };
    for (const item of this.parent?.items ?? []) {
      if (!BaseActorModel._equipado(item)) continue;
      // Votos desativados não concedem seus benefícios
      if (item.type === "voto" && item.system.ativo === false) continue;

      const aj = item.system?.ajustes;
      if (aj) for (const chave of Object.keys(total)) total[chave] += aj[chave] ?? 0;

      if (item.type === "equipamento") {
        total.defesa += item.system.defesa ?? 0;
        total.reducaoDano += item.system.rdTotal ?? item.system.reducaoDano ?? 0;
        // Penalidades de uniforme e de escudo são cumulativas (p. 141)
        total.penalidade += item.system.penalidade ?? 0;
      }
    }
    return total;
  }

  /**
   * Inventário e Carregamento (p. 129). O limite é 8 espaços + o dobro do
   * modificador de Força; passar dele deixa o personagem sobrecarregado, e o
   * teto absoluto é o dobro do limite.
   */
  _prepararCarga() {
    let ocupados = 0;
    for (const item of this.parent?.items ?? []) {
      if (item.type !== "arma" && item.type !== "equipamento") continue;
      ocupados += (item.system.espacos ?? 0) * (item.system.quantidade ?? 1);
    }

    ocupados = Math.round(ocupados * 2) / 2;

    // Só a ficha de Personagem controla espaços; NPCs e Invocações carregam o
    // que o Narrador quiser, então para eles fica só o total, sem penalidade.
    if (!this.inventario) {
      this.carga = { ocupados, limite: 0, maximo: 0, sobrecarregado: false, excedido: false };
      return;
    }

    const limite = Math.max(0, this.inventario.limiteEspacos + 2 * this.atributos.forca.mod);
    this.carga = {
      ocupados,
      limite,
      maximo: limite * 2,
      sobrecarregado: ocupados > limite,
      excedido: ocupados > limite * 2
    };
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
        this.penalidadeGlobal +
        // Uniformes e escudos pesam só nas perícias de Destreza (p. 140-141)
        (cfg.atributo === "destreza" ? this.penalidadeDestreza : 0);
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
    const sobrecarga = this.carga?.sobrecarregado === true;

    c.defesa =
      10 +
      this.atributos.destreza.mod +
      metadeNivel(nivel) +
      c.defesaEquip +
      c.defesaOutros +
      itens.defesa +
      this.penalidadeGlobal +
      (sobrecarga ? FNM.carga.defesaSobrecarga : 0);

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
      c.deslocamento +
        itens.deslocamento -
        this.exaustao * 1.5 +
        (sobrecarga ? FNM.carga.deslocamentoSobrecarga : 0)
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
    // A do equipamento fica de fora do total global: só pesa em Destreza
    this.penalidadeDestreza = Math.min(0, this.ajustesItens?.penalidade ?? 0);
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
    this.penalidadeDestreza = 0;
    this.carga = { ocupados: 0, limite: 0, maximo: 0, sobrecarregado: false, excedido: false };
    this.alma = { estado: "Estável", penalidade: 0, custoExtra: 0, condicoes: [] };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.ajustesItens = this._ajustesDeItens();
    this._prepararModificadores();
    // Carga depende do modificador de Força e pesa na Defesa e no Deslocamento
    this._prepararCarga();
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
      // Restringido (p. 114-126): o que substitui o Perfil Amaldiçoado de quem
      // não tem energia. Fica fora de `jujutsu` de propósito — é o oposto dele.
      restringido: new SchemaField({
        // Fundamento do Estilo: o equivalente ao Funcionamento Básico (p. 124)
        estiloNome: new StringField({ required: true, blank: true }),
        fundamento: new HTMLField({ required: true, blank: true }),
        // Dádivas do Céu escolhidas, por id (p. 126)
        dadivas: new ArrayField(
          new StringField({ required: true, blank: true, choices: ["", ...FNM.dadivasDoCeu.map(d => d.id)] }),
          { required: true, initial: [] }
        ),
        // "Você pode escolher adicionar também seu modificador de Força ou de
        // Constituição na sua Defesa" — Restrito pelos Céus (p. 114)
        atributoDefesa: new StringField({
          required: true,
          blank: true,
          choices: ["", "forca", "constituicao"]
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
        // Base da ficha oficial; o limite em vigor soma o dobro da Força (p. 129)
        limiteEspacos: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: FNM.carga.base
        })
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

    let pvBase = 0;
    let peBase = 0;
    let estaminaBase = 0;
    let niveisTotais = 0;
    let primeira = true;
    let ehRestringido = false;
    let ehLutador = false;
    let atributoChave = "";
    let bonusAtributoPE = 0;

    // A especialização com mais níveis é tratada como a principal (1º nível)
    const ordenadas = [...especs].sort((a, b) => (b.system.niveis ?? 0) - (a.system.niveis ?? 0));

    for (const item of ordenadas) {
      const cfg = FNM.especializacoes.find(e => e.id === item.system.especializacao);
      const niveis = Math.max(0, item.system.niveis ?? 0);
      if (!cfg || !niveis) continue;
      niveisTotais += niveis;
      if (cfg.id === "restringido") ehRestringido = true;
      if (cfg.id === "lutador") ehLutador = true;

      if (primeira) {
        // 1º nível da especialização principal usa o valor fixo de PV
        pvBase += cfg.pvPrimeiro + (niveis - 1) * cfg.pvFixo;

        // O atributo-chave é escolhido no próprio item da especialização; cada
        // especialização permite um conjunto diferente (Lutador: FOR ou DES;
        // Especialista em Técnica: INT ou SAB; Controlador/Suporte: PRE ou SAB).
        atributoChave =
          item.system.atributoChave || this.jujutsu.atributoEspecializacao || cfg.atributosChave[0];

        // Só a PRIMEIRA especialização soma o modificador ao máximo de PE, e ela
        // soma o do seu atributo-chave — não o da técnica (p. 21 e 44).
        // Multiclasse não concede esse bônus de novo (p. 47).
        if (cfg.somaAtributo) {
          bonusAtributoPE = this.atributos[atributoChave]?.mod ?? 0;
          peBase += bonusAtributoPE;
        }
        primeira = false;
      } else {
        // Em Multiclasse, o 1º nível da nova especialização já conta como subsequente
        pvBase += niveis * cfg.pvFixo;
      }

      peBase += niveis * cfg.pe;
      estaminaBase += niveis * (cfg.estamina ?? 0);
    }

    this.especializacaoPrincipal = ordenadas[0]?.system?.especializacao ?? "";
    // Atributo-chave em vigor: vem do item da especialização, com o campo do
    // Perfil Amaldiçoado como reserva para atores sem item de especialização.
    this.atributoChave = atributoChave || this.jujutsu.atributoEspecializacao;
    this.bonusAtributoPE = bonusAtributoPE;
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
    // Carga depende do modificador de Força e pesa na Defesa e no Deslocamento
    this._prepararCarga();

    const totais = this._somarEspecializacoes();
    const aj = this.ajustesItens;

    // As Dádivas do Céu precisam ser conhecidas ANTES dos máximos: Vigor
    // Infindável mexe em PV e Estamina, e a Integridade máxima acompanha o PV
    this.dadivasEscolhidas = this._dadivasEscolhidas();
    const porDadiva = { pv: 0, estamina: 0 };
    for (const d of this.dadivasEscolhidas) {
      if (d.pvNivel) porDadiva.pv += this.nivel;
      // "a cada 2 níveis, você recebe 1 ponto de estamina máximo adicional"
      if (d.estaminaMetadeNivel) porDadiva.estamina += Math.floor(this.nivel / 2);
    }

    // Quadro "EXTRA" da ficha: fontes avulsas de PV máximo
    const extra = Object.values(this.pvExtra).reduce((n, v) => n + v, 0) + porDadiva.pv;
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
      totais.estamina +
        porDadiva.estamina +
        this.recursos.estamina.ajuste -
        this.recursos.estamina.perdidos
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
    // O atributo-chave vem do item da especialização (definido em _somarEspecializacoes)
    const modEspec = this.atributos[this.atributoChave]?.mod ?? 0;

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
    this._prepararRestringido();

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

  /**
   * Restringido (p. 114-126). Tudo aqui é derivado do nível: o acesso aos
   * níveis de Técnica Marcial, quantas ele conhece, o Arsenal Amaldiçoado em
   * vigor e quantas Dádivas do Céu já recebeu.
   *
   * As Dádivas escolhidas viram bônus reais nas rolagens — as que dão para
   * automatizar. As que dependem de situação (pulo, terreno difícil) ou de
   * escolha (em que perícia virar mestre) ficam como texto na ficha.
   */
  /**
   * As Dádivas do Céu que valem para este personagem. Só um Restringido as
   * recebe: um feiticeiro com o campo preenchido por engano não leva nada.
   */
  _dadivasEscolhidas() {
    if (!this.ehRestringido) return [];
    const ids = (this.restringido?.dadivas ?? []).filter(Boolean);
    return FNM.dadivasDoCeu.filter(d => ids.includes(d.id));
  }

  _prepararRestringido() {
    const nivel = this.nivel;
    const escolhidas = (this.restringido?.dadivas ?? []).filter(Boolean);
    const dadivas = this.dadivasEscolhidas ?? [];

    this.restringidoView = {
      niveisDisponiveis: tecnicasMarciaisAcessiveis(nivel),
      conhecidas: tecnicasMarciaisConhecidas(nivel),
      usadas: (this.parent?.items ?? []).filter(i => i.type === "tecnicaMarcial").length,
      arsenal: arsenalDoRestringido(nivel),
      dadivasTotal: dadivasRecebidas(nivel),
      dadivasUsadas: escolhidas.length,
      dadivas
    };

    if (!this.ehRestringido) return;

    const metade = metadeNivel(nivel);
    for (const d of dadivas) {
      // +2 em testes de perícia e resistência do atributo da Dádiva
      for (const [attr, valor] of Object.entries(d.bonusAtributo ?? {})) {
        for (const [id, cfg] of Object.entries(FNM.pericias)) {
          if (cfg.atributo === attr) this.pericias[id].total += valor;
        }
        for (const [id, cfg] of Object.entries(FNM.resistencias)) {
          if (cfg.atributo === attr) this.resistencias[id].total += valor;
        }
      }
      // Bônus em uma perícia nomeada, por cima do bônus de atributo
      for (const [id, valor] of Object.entries(d.bonusPericia ?? {})) {
        if (this.pericias[id]) this.pericias[id].total += valor;
      }
      if (d.rdMetadeNivel) {
        this.combate.reducaoDanoTotal += metade;
        for (const tipo of FNM.tiposComRD) this.combate.rdPorTipo[tipo] += metade;
      }
      if (d.atencaoMetadeNivel) this.combate.atencao += metade;
      if (d.deslocamento) this.combate.deslocamentoAtual += d.deslocamento;
      // PV e Estamina já entraram antes do cálculo dos máximos, porque a
      // Integridade máxima acompanha o PV máximo
    }

    // Restrito pelos Céus: Força ou Constituição também entram na Defesa,
    // limitado pelo nível (p. 114)
    const attrDefesa = this.restringido?.atributoDefesa;
    if (attrDefesa) {
      this.combate.defesa += Math.min(this.atributos[attrDefesa]?.mod ?? 0, nivel);
    }
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
        // Para um inimigo, o nível É o Nível de Desafio: "ND 2 é a mesma coisa
        // que um personagem de jogador nível 2" (Grimório, p. 8).
        nivel: new NumberField({ required: true, integer: true, min: 1, max: 30, initial: 1 }),
        grau: new StringField({ required: true, blank: true, initial: "Grau 4" }),
        tipo: new StringField({
          required: true,
          initial: "Maldição",
          choices: ["Maldição", "Feiticeiro", "Humano", "Corpo Amaldiçoado", "Outro"]
        }),
        // Patamar de criação (Grimório, p. 8): define a dificuldade, quantos
        // jogadores o encontro pede e todo o orçamento da ficha.
        patamar: new StringField({
          required: true,
          initial: "comum",
          choices: FNM.patamares.map(p => p.id)
        }),
        origemInimigo: new StringField({
          required: true,
          blank: true,
          initial: "",
          choices: ["", ...FNM.origensInimigo]
        }),
        tipoEspirito: new StringField({
          required: true,
          blank: true,
          initial: "",
          choices: ["", ...FNM.tiposEspirito]
        }),
        tamanho: new StringField({
          required: true,
          initial: "Médio",
          choices: FNM.tamanhos
        }),
        // Qual das três colunas de dificuldade das tabelas de criação a ficha
        // foi montada (Grimório, p. 16). Não muda cálculo: é anotação de mesa.
        tabelaCriacao: new StringField({
          required: true,
          initial: "intermediaria",
          choices: FNM.tabelasCriacao.map(t => t.id)
        }),
        // Fichas de NPC costumam trazer PV/Defesa fixos, fora das fórmulas
        valoresManuais: new BooleanField({ required: true, initial: true })
      }),
      // Recursos de sobrevivência do Grimório (p. 18-19 e 22)
      inimigo: new SchemaField({
        rdIrredutivel: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        ignorarRD: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        vidaTempPorAtaque: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        // Vida temporária de todo início de rodada: guarda o gasto e o máximo
        guardaInabalavel: usosSchema(),
        resistenciaParcial: usosSchema(),
        resistenciaTotal: usosSchema(),
        // As cinco linhas da tabela de ações por Patamar (p. 53)
        acoes: new SchemaField({
          comum: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          rapida: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
          bonus: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          movimento: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
          reacao: new NumberField({ required: true, integer: true, min: 0, initial: 1 })
        }),
        // Margem de sucesso crítico, que os Treinamentos do Passo 4 reduzem
        // ("a margem para um crítico em um TR de Reflexos reduz em 2", p. 61)
        margensCritico: new SchemaField({
          ...Object.fromEntries(
            Object.keys(FNM.resistencias).map(id => [
              id,
              new NumberField({ required: true, integer: true, min: 2, max: 20, initial: 20 })
            ])
          ),
          ataque: new NumberField({ required: true, integer: true, min: 2, max: 20, initial: 20 })
        }),
        // Bônus na rolagem de confronto de domínios
        confrontoDominio: new NumberField({ required: true, integer: true, initial: 0 }),
        imunidadesCondicao: new StringField({ required: true, blank: true })
      }),
      /**
       * Valores fechados de uma ficha pronta, que só valem com `valoresManuais`
       * ligado. Uma ficha do Grimório traz o total já calculado pelas tabelas
       * por ND (p. 23-52) — tabelas que este sistema não transcreve — e esses
       * totais não têm como sair das fórmulas do livro básico. Vazio (`null`)
       * significa "usa a fórmula", que é o comportamento normal da ficha.
       *
       * A Defesa não está aqui porque já tinha o seu próprio campo,
       * `combate.defesaManual`, desde antes; ele continua sendo o dela.
       */
      manuais: new SchemaField({
        atencao: manual(),
        iniciativa: manual(),
        cd: manual(),
        acerto: manual(),
        resistencias: new SchemaField(
          Object.fromEntries(Object.keys(FNM.resistencias).map(id => [id, manual()]))
        ),
        pericias: new SchemaField(
          Object.fromEntries(Object.keys(FNM.pericias).map(id => [id, manual()]))
        )
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
    // Os máximos entram antes de super(): a Integridade e, com ela, o Estado da
    // Alma derivam do PV máximo, e `_prepararAlma` roda lá dentro.
    this.ajustesItens = this._ajustesDeItens();
    this._aplicarMaximos();

    super.prepareDerivedData();
    // O Bônus de Treinamento de um inimigo sai da tabela do Grimório (p. 8),
    // que satura em +6 — e não da progressão aberta do personagem.
    const bt = bonusTreinamentoND(this.nivel);
    const metade = metadeNivel(this.nivel);
    const modTecnica = this.atributos[this.jujutsu.atributoTecnica]?.mod ?? 0;

    this.bonusTreinamento = bt;
    this.metadeNivel = metade;
    this.cdAmaldicoada = 10 + metade + modTecnica + bt + this.jujutsu.cdOutros + this.penalidadeGlobal;
    this.cdEspecializacao = this.cdAmaldicoada;
    this.ataqueAmaldicoado = modTecnica + metade + bt + this.penalidadeGlobal;
    this.danoDesarmado = danoDesarmado(this.nivel);

    this.orcamento = this._orcamentoDoPatamar(bt);
    this._aplicarValoresManuais();
  }

  /**
   * Fichas prontas — as do Grimório, as de um construtor externo — trazem os
   * totais já fechados, e não os ingredientes deles. Com `valoresManuais`
   * ligado, cada total preenchido substitui a fórmula correspondente; o que
   * ficar vazio continua saindo do cálculo normal.
   *
   * A penalidade global (Exaustão e Estado da Alma) continua entrando depois:
   * ela é uma condição do momento, não parte do valor de ficha.
   */
  _aplicarValoresManuais() {
    if (!this.detalhes.valoresManuais) return;
    const m = this.manuais;

    if (this.combate.defesaManual > 0) {
      this.combate.defesa = this.combate.defesaManual + this.penalidadeGlobal;
    }
    if (m.atencao !== null) this.combate.atencao = m.atencao;
    if (m.iniciativa !== null) this.combate.iniciativa = m.iniciativa + this.penalidadeGlobal;

    if (m.cd !== null) {
      this.cdAmaldicoada = m.cd + this.penalidadeGlobal;
      this.cdEspecializacao = this.cdAmaldicoada;
    }
    if (m.acerto !== null) {
      this.ataqueAmaldicoado = m.acerto + this.penalidadeGlobal;
      // As três linhas de Jogada de Ataque da ficha passam a valer o mesmo:
      // uma ficha de inimigo traz um acerto só, não um por tipo de ataque.
      for (const a of Object.values(this.ataquesView ?? {})) {
        a.total = m.acerto + this.penalidadeGlobal;
      }
    }

    for (const id of Object.keys(FNM.resistencias)) {
      const valor = m.resistencias[id];
      if (valor !== null) this.resistencias[id].total = valor + this.penalidadeGlobal;
    }
    for (const id of Object.keys(FNM.pericias)) {
      const valor = m.pericias[id];
      if (valor !== null) this.pericias[id].total = valor + this.penalidadeGlobal;
    }

    // A Atenção é 10 + Percepção; se a Percepção virou total fechado e a
    // Atenção não foi declarada, ela precisa acompanhar o valor novo.
    if (m.atencao === null && m.pericias.percepcao !== null) {
      this.combate.atencao = 10 + this.pericias.percepcao.total + this.combate.atencaoOutros;
    }
  }

  /**
   * Máximos de PV e PE de um inimigo.
   *
   * O máximo de uma ficha de inimigo é digitado, e não somado a partir das
   * especializações como o do personagem: é o valor que a tabela por ND deu.
   * Em cima dele entram as mesmas três fontes que a ficha oficial prevê — os
   * ajustes dos itens que o inimigo carrega (um Dote que dá +10 PV precisava
   * dar +10 PV), o ajuste avulso do recurso e a coluna PERDIDOS, que é o que o
   * Dano na Alma consome e o descanso longo não devolve.
   *
   * O valor digitado continua sendo o da fonte; quem soma é a derivação, então
   * a ficha edita a base e mostra o total sem um alimentar o outro.
   */
  _aplicarMaximos() {
    for (const [chave, piso] of [["pv", 1], ["pe", 0]]) {
      const r = this.recursos[chave];
      r.max = Math.max(piso, r.max + this.ajustesItens[chave] + r.ajuste - r.perdidos);
    }
  }

  /**
   * O orçamento de criação do Patamar (Grimório, p. 8, 16-18 e 22), para a
   * ficha mostrar o teto de cada recurso ao lado do que já foi gasto — do mesmo
   * jeito que a ficha de Invocação mostra o orçamento do Grau.
   *
   * Nada aqui limita a ficha: o Grimório é um guia para o Narrador, e uma
   * criatura autoral pode estourar qualquer linha de propósito. O que a ficha
   * faz é apontar onde ela estourou.
   */
  _orcamentoDoPatamar(bt) {
    const patamar = patamarInimigo(this.detalhes.patamar);
    const tamanho = FNM.tamanhosCriatura[this.detalhes.tamanho] ?? FNM.tamanhosCriatura["Médio"];
    const nd = this.nivel;

    // Perícias: "uma criatura pode ter uma quantidade igual ao seu maior
    // modificador de atributo mental" (p. 21)
    const mentais = ["inteligencia", "sabedoria", "presenca"];
    const maiorMental = Math.max(...mentais.map(a => this.atributos[a]?.mod ?? 0));

    // "Todos os atributos começam no 10" (p. 16): o orçamento do Patamar conta
    // os pontos gastos ACIMA dessa base, não a soma dos valores. Baixar um
    // atributo (até 8) devolve pontos, e a subtração já cuida disso sozinha.
    const gastoAtributos = FNM.ordemAtributos.reduce(
      (total, id) => total + (this.atributos[id]?.value ?? 0) - FNM.atributoBaseInimigo,
      0
    );
    const totalAtributos = patamar.atributos(nd, bt);
    const acimaDoLimite = FNM.ordemAtributos.filter(
      id => (this.atributos[id]?.value ?? 0) > patamar.limiteAtributo
    );

    const treinadas = Object.values(this.pericias).filter(p => p.treinado || p.mestre);

    // `patamar` fica de fora do que é devolvido: ele carrega a função que
    // calcula os pontos de atributo, e dado derivado tem que ser serializável.
    return {
      tamanho,
      nome: patamar.nome,
      dificuldade: patamar.dificuldade,
      jogadores: patamar.jogadores,
      atributos: {
        gasto: gastoAtributos,
        total: totalAtributos,
        formula: patamar.formulaAtributos,
        limite: patamar.limiteAtributo,
        excedeu: gastoAtributos > totalAtributos,
        acimaDoLimite: acimaDoLimite.map(id => FNM.atributos[id].abrev)
      },
      pericias: {
        gasto: treinadas.length,
        total: Math.max(0, maiorMental),
        excedeu: treinadas.length > Math.max(0, maiorMental)
      },
      imunidades: patamar.imunidades,
      resistencias: patamar.resistencias,
      vulnerabilidades: patamar.vulnerabilidades,
      imunidadesCondicao: patamar.imunidadesCondicao,
      deslocamentoPadrao: tamanho.deslocamento,
      // Recomendações do Patamar: quantas ações o turno tem (p. 53) e quantas
      // Características o livro sugere (p. 60)
      acoesDoTurno: patamar.acoes,
      caracteristicas: {
        gasto: this.parent?.items?.filter(i => i.type === "caracteristica").length ?? 0,
        total: patamar.caracteristicas
      }
    };
  }
}

/* -------------------------------------------- */
/*  Invocação (Shikigami / Corpo Amaldiçoado)   */
/* -------------------------------------------- */

export class InvocacaoDataModel extends BaseActorModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Uma Invocação não começa em 10 como um personagem: todos os atributos
      // partem de 8 e podem ser baixados até 6, devolvendo pontos (p. 260)
      atributos: new SchemaField(
        Object.fromEntries(
          FNM.ordemAtributos.map(id => [
            id,
            new SchemaField({
              value: new NumberField({
                required: true,
                integer: true,
                min: FNM.invocacao.atributoMinimo,
                max: 30,
                initial: FNM.invocacao.atributoInicial
              })
            })
          ])
        )
      ),
      detalhes: new SchemaField({
        // id do ator que controla esta invocação — é dele que saem o Bônus de
        // Treinamento e o nível usados em todas as fórmulas do capítulo
        invocador: new StringField({ required: true, blank: true }),
        tipo: new StringField({
          required: true,
          initial: "Shikigami",
          choices: FNM.tiposInvocacao
        }),
        grau: new StringField({
          required: true,
          initial: "Quarto",
          choices: Object.keys(FNM.grausInvocacao)
        }),
        tamanho: new StringField({ required: true, initial: "Médio", choices: FNM.tamanhos }),
        // Talismã ou dispositivo que traz a Invocação ao campo (p. 258)
        intermediario: new StringField({ required: true, blank: true }),
        // Jogada de Ataque e TR em que a Invocação é treinada (p. 261)
        ataqueTreinado: new StringField({
          required: true,
          blank: true,
          initial: "corpoACorpo",
          choices: ["", "corpoACorpo", "distancia"]
        }),
        resistenciaTreinada: new StringField({
          required: true,
          blank: true,
          initial: "fortitude",
          // Integridade é a única fora da escolha (p. 261)
          choices: ["", ...Object.keys(FNM.resistencias).filter(r => r !== "integridade")]
        }),
        // Ajustes de mesa sobre o que o grau já concede
        custoExtra: new NumberField({ required: true, integer: true, initial: 0 }),
        acoesExtras: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        ativa: new BooleanField({ required: true, initial: false })
      }),
      // Vida e Defesa saem das fórmulas do grau; este é o espaço da homebrew.
      // O nome evita confusão com o `ajustes` que os ITENS trazem.
      extras: new SchemaField({
        pv: new NumberField({ required: true, integer: true, initial: 0 }),
        defesa: new NumberField({ required: true, integer: true, initial: 0 })
      })
    };
  }

  /** Uma Invocação não tem nível próprio: ela acompanha o do invocador. */
  get nivel() {
    return this.nivelUsuario ?? 1;
  }

  /** O ator que controla esta Invocação, quando ele existe no mundo. */
  get invocador() {
    const id = this.detalhes.invocador;
    return id ? (game.actors?.get(id) ?? null) : null;
  }

  /** A linha da tabela de graus em vigor (p. 258-272). */
  get grau() {
    return FNM.grausInvocacao[this.detalhes.grau] ?? FNM.grausInvocacao.Quarto;
  }

  /**
   * Antes da v0.2 o grau vinha da escala de feiticeiro, que tem semi-graus.
   * Invocações usam os cinco graus do capítulo, então um semi-grau cai no grau
   * cheio abaixo dele.
   */
  static migrateData(source) {
    const antigos = {
      "Grau 4": "Quarto",
      "Grau 3": "Terceiro",
      "Semi-Grau 2": "Terceiro",
      "Grau 2": "Segundo",
      "Semi-Grau 1": "Segundo",
      "Grau 1": "Primeiro",
      "Grau Especial": "Especial"
    };
    if (source.detalhes?.grau in antigos) {
      source.detalhes.grau = antigos[source.detalhes.grau];
    }
    return super.migrateData(source);
  }

  /**
   * Todos os testes de uma Invocação seguem uma fórmula só (p. 261):
   * modificador do atributo-chave + Bônus de Treinamento do usuário + metade do
   * nível do Controlador. Sem treinamento na perícia, o BT não entra.
   */
  _prepararTestes() {
    const bt = this.bonusTreinamentoUsuario;
    const metade = metadeNivel(this.nivel);

    for (const [id, cfg] of Object.entries(FNM.pericias)) {
      const p = this.pericias[id];
      p.nome = cfg.nome;
      p.atributo = cfg.atributo;
      p.exigeTreino = cfg.exigeTreino === true;
      p.complementar = cfg.complementar === true;
      p.temSubcategoria = cfg.subcategoria === true;
      p.total = this.atributos[cfg.atributo].mod + metade + (p.treinado ? bt : 0) + p.outros;
      // Sem treino, a Invocação só usa a perícia dentro de uma ação comandada
      p.bloqueada = !p.treinado && !p.mestre;
    }

    for (const [id, cfg] of Object.entries(FNM.resistencias)) {
      const r = this.resistencias[id];
      r.nome = cfg.nome;
      r.atributo = cfg.atributo;
      const treinado = this.detalhes.resistenciaTreinada === id;
      r.total = this.atributos[cfg.atributo].mod + metade + (treinado ? bt : 0) + r.outros;
    }
  }

  /**
   * Orçamento da criação (p. 260-262): quantos pontos de atributo foram gastos,
   * quantas perícias podem ser treinadas e quantas Ações/Características cabem.
   * A ficha mostra os três lado a lado, com o que já foi usado.
   */
  _prepararOrcamento() {
    const g = this.grau;
    const inicial = FNM.invocacao.atributoInicial;

    // Reduzir um atributo devolve pontos, até o mínimo de 6 (p. 260)
    const gastos = Object.values(this.atributos).reduce((n, a) => n + (a.value - inicial), 0);

    // 1 + metade do modificador de Inteligência ou Sabedoria, o que for melhor
    const mental = Math.max(this.atributos.inteligencia.mod, this.atributos.sabedoria.mod);
    const periciasPermitidas = 1 + Math.floor(mental / 2) + g.periciasExtras;
    const periciasTreinadas = Object.values(this.pericias).filter(p => p.treinado).length;

    const acoes = this.parent?.items?.filter(i => i.type === "acaoInvocacao") ?? [];
    const comCusto = acoes.filter(a => a.system.custoPE > 0).length;

    this.orcamento = {
      pontos: { gastos, total: g.pontosAtributo, maximo: g.maximoAtributo },
      pericias: { usadas: periciasTreinadas, total: periciasPermitidas },
      // Cada grau acima do quarto permite uma Ação/Característica extra paga
      acoes: { usadas: acoes.length, total: g.acoes + this.detalhes.acoesExtras },
      acoesComCusto: { usadas: comCusto, total: g.acoesComCusto }
    };

    // Custo em PE: o do grau, mais o que cada Ação/Característica acrescenta
    const custoAcoes = acoes.reduce((n, a) => n + (FNM.custoAcaoInvocacao[a.system.tipo] ?? 0), 0);
    this.custoInvocacao = Math.max(0, g.custo + custoAcoes + this.detalhes.custoExtra);
    this.custoDetalhado = { grau: g.custo, acoes: custoAcoes, extra: this.detalhes.custoExtra };
  }

  prepareBaseData() {
    super.prepareBaseData();
    // Precisam existir antes de qualquer fórmula que os consulte
    this.nivelUsuario = 1;
    this.bonusTreinamentoUsuario = 0;
  }

  prepareDerivedData() {
    const usuario = this.invocador;
    this.nivelUsuario = usuario?.system?.nivel ?? 1;
    this.bonusTreinamentoUsuario = bonusTreinamento(this.nivelUsuario);

    this.ajustesItens = this._ajustesDeItens();
    this._prepararModificadores();
    this._prepararCarga();

    const g = this.grau;
    const con = this.atributos.constituicao.value;

    // PV = base do grau + fator da Constituição (o VALOR, não o modificador) +
    // fator do nível do usuário (p. 261)
    this.recursos.pv.max = Math.max(
      1,
      Math.floor(g.pv.base + con * g.pv.con + this.nivelUsuario * g.pv.nivel) +
        this.extras.pv +
        this.recursos.pv.ajuste -
        this.recursos.pv.perdidos
    );
    // Invocações não têm energia própria: quem paga o custo é o invocador
    this.recursos.pe.max = 0;

    this._prepararAlma();
    this._prepararPenalidades();
    this._prepararTestes();
    this._prepararCombate();

    // A Defesa não usa a fórmula de personagem: é a base do grau + Destreza da
    // Invocação + Bônus de Treinamento do usuário (p. 261)
    this.combate.defesa =
      g.defesa +
      this.atributos.destreza.mod +
      this.bonusTreinamentoUsuario +
      this.combate.defesaOutros +
      this.extras.defesa +
      this.ajustesItens.defesa;

    // A Invocação é treinada em UMA jogada de ataque (p. 261), escolhida na
    // ficha. As três linhas existem no schema base, mas quem manda aqui é a
    // escolha do grau — sem isto o Bônus de Treinamento nunca entraria.
    for (const id of Object.keys(FNM.tiposAtaque)) {
      this.ataques[id].treinado = this.detalhes.ataqueTreinado === id;
    }

    this._prepararAtaques();
    this._prepararEstado();
    this._prepararOrcamento();

    this.bonusTreinamento = this.bonusTreinamentoUsuario;
    this.metadeNivel = metadeNivel(this.nivel);
    this.danoDesarmado = danoDesarmado(this.nivel);
    // CD dos TRs impostos pelas Ações de Ataque da Invocação (p. 263)
    this.cdAcao = 10 + Math.max(1, metadeNivel(this.nivelUsuario));
  }

  getRollData() {
    return {
      ...super.getRollData(),
      grau: this.detalhes.grau,
      custoInvocacao: this.custoInvocacao,
      cdAcao: this.cdAcao
    };
  }
}

/* -------------------------------------------- */
/*  Base comum aos itens                        */
/* -------------------------------------------- */

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

/**
 * Dote — a habilidade pronta de um inimigo (Grimório, p. 20).
 *
 * O Grimório separa os Dotes em dois tipos, e o livro dá o paralelo exato com
 * o lado dos jogadores: os **Gerais** (p. 77-80) equivalem às Habilidades de
 * Especialização, e os **Amaldiçoados** (p. 64-71) equivalem às Aptidões
 * Amaldiçoadas — por isso só estes últimos têm categoria e Nível de Aptidão.
 *
 * Os **Treinamentos** do Passo 4 (p. 61-62) entram aqui como um terceiro tipo:
 * o livro não os chama de Dote, mas eles funcionam igual — vêm prontos de uma
 * lista fechada e são pagos por um orçamento (1 ponto + 1 por grau, p. 61).
 *
 * `ndMinimo` é o Nível de Desafio mínimo lido do pré-requisito; serve para a
 * ficha avisar quando o dote está acima do ND do inimigo.
 */
export class DoteDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tipoDote: new StringField({
        required: true,
        initial: "Geral",
        choices: ["Geral", "Amaldiçoado", "Treinamento"]
      }),
      categoria: new StringField({
        required: true,
        blank: true,
        initial: "",
        choices: ["", ...FNM.categoriasDoteAmaldicoado]
      }),
      areaAptidao: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.niveisAptidao)]
      }),
      nivelAptidao: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
      ndMinimo: new NumberField({ required: true, integer: true, min: 0, max: 30, initial: 0 }),
      prerequisito: new StringField({ required: true, blank: true }),
      custoPE: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      acao: new StringField({ required: true, blank: true }),
      usos: usosSchema()
    };
  }
}

/**
 * Característica de inimigo (Grimório, p. 72-76).
 *
 * Diferente dos Dotes, as Características são montadas pelo Narrador: as
 * **Gerais** servem de base mecânica e comparação entre criaturas, e as
 * **Especiais** são o traço que quebra ou altera uma regra normal e dá
 * identidade à criatura.
 */
export class CaracteristicaDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categoria: new StringField({
        required: true,
        initial: "Geral",
        choices: FNM.categoriasCaracteristica
      }),
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
      // Bônus na jogada de ataque do Feitiço, para o que a mesa conceder
      bonusAtaque: new NumberField({ required: true, integer: true, initial: 0 }),
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

/**
 * Técnica Marcial: o Feitiço do Restringido (p. 124 e 248).
 *
 * A criação é a mesma dos Feitiços — mesmo capítulo, mesmas tabelas de alcance,
 * dano e área por nível. O que muda é a moeda (Estamina, não PE) e o limite do
 * físico: sem energia amaldiçoada, o dano fica nos tipos físicos, salvo acordo
 * com o Narrador.
 */
export class TecnicaMarcialDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      nivel: new StringField({
        required: true,
        initial: "1",
        choices: FNM.niveisTecnicaMarcial.map(n => n.id)
      }),
      // Deixe em -1 para usar o custo padrão do nível (p. 124)
      custoEstamina: new NumberField({ required: true, integer: true, min: -1, initial: -1 }),
      execucao: new StringField({ required: true, initial: "Ação Comum", choices: FNM.conjuracoes }),
      alcance: new StringField({ required: true, blank: true }),
      alvo: new StringField({ required: true, initial: "Criatura", choices: FNM.tiposAlvo }),
      area: new SchemaField({
        formato: new StringField({ required: true, blank: true, choices: ["", ...FNM.formatosArea] }),
        tamanho: new NumberField({ required: true, min: 0, initial: 0 })
      }),
      duracao: new StringField({ required: true, initial: "Imediato", choices: FNM.duracoes }),
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
      // A jogada é física: Força no corpo a corpo, Destreza a distância. Um
      // Fundamento Marcial não pode trocar o atributo da jogada (p. 248).
      linhaAtaque: new StringField({
        required: true,
        initial: "corpoACorpo",
        choices: ["corpoACorpo", "distancia"]
      }),
      dano: new StringField({ required: true, blank: true }),
      tipoDano: new StringField({
        required: true,
        blank: true,
        initial: "impacto",
        choices: ["", ...Object.keys(FNM.tiposDano)]
      }),
      // Bônus na jogada de ataque da técnica, para o que a mesa conceder —
      // Implemento Celeste, um auxílio, uma ferramenta do arsenal
      bonusAtaque: new NumberField({ required: true, integer: true, initial: 0 }),
      requisito: new StringField({ required: true, blank: true }),
      usos: usosSchema()
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const cfg =
      FNM.niveisTecnicaMarcial.find(n => n.id === this.nivel) ?? FNM.niveisTecnicaMarcial[0];
    this.custoEfetivo = this.custoEstamina >= 0 ? this.custoEstamina : cfg.custo;
    this.nivelLabel = cfg.nome;

    // Alcance, dano e área padrão vêm da tabela de Feitiços do mesmo nível: é
    // o mesmo capítulo de criação (p. 248)
    const tabela = FNM.niveisFeitico.find(n => n.id === this.nivel) ?? FNM.niveisFeitico[1];
    this.alcancePadrao = tabela.alcance;
    this.areaPadrao = tabela.area;
    this.danoPadrao =
      this.alvo === "Área"
        ? tabela.danoArea
        : this.resolucao === "ataque"
          ? tabela.danoAtaque
          : tabela.danoTR;

    // Sem energia amaldiçoada, o dano fica nos tipos físicos (p. 248)
    this.danoNaoFisico =
      !!this.tipoDano && FNM.tiposDano[this.tipoDano]?.categoria !== "Físico";
  }
}

/**
 * Até a v0.1 o grau de uma arma ou equipamento vinha da lista de graus de
 * feiticeiro, que tem semi-graus. Ferramentas Amaldiçoadas só têm os cinco
 * degraus da tabela de benefícios (p. 154), então um semi-grau cai no grau
 * cheio abaixo dele.
 */
const GRAUS_ANTIGOS = {
  "Grau 4": "Quarto",
  "Grau 3": "Terceiro",
  "Semi-Grau 2": "Terceiro",
  "Grau 2": "Segundo",
  "Semi-Grau 1": "Segundo",
  "Grau 1": "Primeiro",
  "Grau Especial": "Especial"
};

function migrarGrauFerramenta(source) {
  if (source.grau in GRAUS_ANTIGOS) source.grau = GRAUS_ANTIGOS[source.grau];
}

export class ArmaDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categoria: new StringField({ required: true, initial: "Simples", choices: FNM.categoriasArma }),
      tipo: new StringField({ required: true, initial: "Corpo a Corpo", choices: FNM.tiposArma }),
      // Qual ação o ataque consome. Para um personagem é quase sempre a Ação
      // Comum; para um inimigo do Grimório é o que separa as ações do turno.
      acao: new StringField({ required: true, initial: "Ação Comum", choices: FNM.conjuracoes }),
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
      // Meio espaço para consumíveis, quatro para armas massivas (p. 129)
      espacos: new NumberField({ required: true, min: 0, initial: 1 }),
      custo: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      grau: new StringField({ required: true, blank: true, choices: ["", ...Object.keys(FNM.grausFerramenta)] }),
      encantamentos: new StringField({ required: true, blank: true }),
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

  /**
   * Antes da v0.2 a categoria misturava os dois eixos da arma, com "A Distância"
   * e "De Arremesso" ocupando o lugar de Simples/Complexa. Repartimos o valor
   * antigo entre `categoria` e `tipo` para não invalidar itens já criados.
   */
  static migrateData(source) {
    if (source.categoria === "A Distância" || source.categoria === "De Arremesso") {
      source.tipo ??= source.categoria;
      source.categoria = "Simples";
    }
    migrarGrauFerramenta(source);
    return super.migrateData(source);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Bônus de dano da Ferramenta Amaldiçoada: vale só o do grau atual (p. 154)
    const grau = FNM.grausFerramenta[this.grau];
    this.bonusFerramenta = grau?.bonusArma ?? 0;
    this.danoTotal = this.bonusFerramenta + this.bonusDano;
    this.encantamentosPermitidos = grau?.encantamentos.arma ?? 0;
    this.habilidadeUnica = grau?.unica === true;
  }
}

export class EquipamentoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tipo: new StringField({ required: true, initial: "Diverso", choices: FNM.tiposEquipamento }),
      // Só os Itens Especiais têm categoria: Acessório, Fármaco, Talismã… (p. 144)
      categoria: new StringField({
        required: true,
        blank: true,
        choices: ["", ...FNM.categoriasItemEspecial]
      }),
      grau: new StringField({ required: true, blank: true, choices: ["", ...Object.keys(FNM.grausFerramenta)] }),
      encantamentos: new StringField({ required: true, blank: true }),
      espacos: new NumberField({ required: true, min: 0, initial: 1 }),
      custo: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      quantidade: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      equipado: new BooleanField({ required: true, initial: false }),
      // Bônus na Defesa do uniforme (p. 140) e RD do escudo empunhado (p. 141)
      defesa: new NumberField({ required: true, integer: true, initial: 0 }),
      reducaoDano: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      // Penalidade em testes de perícia de Destreza; as de uniforme e escudo somam
      penalidade: new NumberField({ required: true, integer: true, max: 0, initial: 0 }),
      // Escudos podem atacar, com o dano entre parênteses no nome (p. 141)
      dano: new StringField({ required: true, blank: true }),
      // Alvo do Encantamento: em qual tipo de ferramenta ele pode ser aplicado
      alvo: new StringField({ required: true, blank: true }),
      prerequisito: new StringField({ required: true, blank: true }),
      acao: new StringField({ required: true, blank: true }),
      consumivel: new BooleanField({ required: true, initial: false }),
      usos: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      peso: new NumberField({ required: true, min: 0, initial: 0 }),
      preco: new StringField({ required: true, blank: true })
    };
  }

  static migrateData(source) {
    migrarGrauFerramenta(source);
    return super.migrateData(source);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Um escudo amaldiçoado usa a RD do próprio grau no lugar da RD comum (p. 154)
    const grau = FNM.grausFerramenta[this.grau];
    this.rdFerramenta = this.tipo === "Escudo" ? (grau?.rdEscudo ?? 0) : 0;
    this.rdTotal = Math.max(this.reducaoDano, this.rdFerramenta);
    const chave = this.tipo === "Escudo" ? "escudo" : "uniforme";
    this.encantamentosPermitidos = grau?.encantamentos[chave] ?? 0;
    this.habilidadeUnica = grau?.unica === true;
  }
}

/**
 * Ação ou Característica de Invocação (p. 262-272).
 *
 * É o que dá identidade a uma Invocação: o grau define quantas cabem na ficha e
 * quanto cada uma pode conceder, mas o conteúdo é criado pelo jogador. Os campos
 * abaixo cobrem as duas famílias do guia — Ações de Ataque (jogada de ataque ou
 * TR imposto) e Ações de Auxílio (defesa, acerto, dano adicional, RD e cura) —
 * mais as Características, que são passivas.
 */
export class AcaoInvocacaoDataModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tipo: new StringField({
        required: true,
        initial: "Ação Complexa",
        choices: FNM.tiposAcaoInvocacao
      }),
      // Ações de Ataque são obrigatoriamente Complexas (p. 263)
      categoria: new StringField({
        required: true,
        blank: true,
        initial: "",
        choices: ["", "Ataque", "Auxílio", "Passiva"]
      }),
      resolucao: new StringField({
        required: true,
        blank: true,
        choices: ["", "ataque", "resistencia"]
      }),
      // Corpo a corpo ou a distância: decide o atributo da jogada (Força ou
      // Destreza), se o treinamento da Invocação entra, e a linha da tabela de
      // dano que a ação segue (p. 263)
      linhaAtaque: new StringField({
        required: true,
        initial: "corpoACorpo",
        choices: ["corpoACorpo", "distancia"]
      }),
      resistencia: new StringField({
        required: true,
        blank: true,
        choices: ["", ...Object.keys(FNM.resistencias).filter(r => r !== "integridade")]
      }),
      alvo: new StringField({
        required: true,
        initial: "Alvo Único",
        choices: ["Alvo Único", "Alvos Múltiplos", "Área", "A própria Invocação", "Aliados"]
      }),
      dano: new StringField({ required: true, blank: true }),
      tipoDano: new StringField({
        required: true,
        blank: true,
        // Energia Reversa e Dano na Alma ficam fora das ações de ataque (p. 263)
        choices: ["", ...Object.keys(FNM.tiposDano).filter(t => !["energiaReversa", "alma"].includes(t))]
      }),
      cura: new StringField({ required: true, blank: true }),
      alcance: new NumberField({ required: true, min: 0, initial: 0 }),
      area: new NumberField({ required: true, min: 0, initial: 0 }),
      formatoArea: new StringField({ required: true, blank: true }),
      // Bônus na jogada de ataque da ação, para o que a mesa conceder: uma
      // característica que melhore o acerto, um auxílio, um item
      bonusAtaque: new NumberField({ required: true, integer: true, initial: 0 }),
      // Ação com Custo: 1 PE no mínimo, 2 por grau no máximo (p. 269)
      custoPE: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      // Prejuízo por Múltiplos Auxílios, que a ficha precisa deixar explícito (p. 269)
      prejuizoAuxilio: new StringField({ required: true, blank: true }),
      usos: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Uma Ação de Ataque não pode ser Simples (p. 263)
    this.exigeComplexa = this.categoria === "Ataque" && this.tipo !== "Ação Complexa";
    // Ação Simples não causa dano nem cura (p. 262)
    this.simplesComDano =
      this.tipo === "Ação Simples" && (!!this.dano || !!this.cura);

    // O que a automação sabe fazer com esta ação, na ordem em que ela resolve:
    // primeiro o acerto (jogada de ataque ou TR do alvo), depois o efeito
    this.ehAtaque = this.resolucao === "ataque";
    this.ehResistencia = this.resolucao === "resistencia";
    this.temDano = !!this.dano && this.dano !== "—";
    this.temCura = !!this.cura && this.cura !== "—";
    // Sem nada disso a ação é só texto, e o botão de usar vira o de mandar ao
    // chat. Uma Característica é passiva: ela nunca é "usada", mesmo quando
    // traz um dado de dano que a mesa queira rolar à parte (p. 262)
    this.rolavel =
      this.tipo !== "Característica" &&
      (this.ehAtaque || this.ehResistencia || this.temDano || this.temCura);
    this.ilimitada = this.usos.max === 0;
    this.semUsos = !this.ilimitada && this.usos.value <= 0;
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
