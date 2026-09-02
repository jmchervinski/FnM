/**
 * Configuração do sistema Feiticeiros & Maldições (não-oficial).
 *
 * Todos os valores aqui vêm do Livro de Regras v2.5.2 (Setsugiri, Parker, Jou,
 * Kame). As páginas citadas nos comentários são as do livro, para conferência.
 */
export const FNM = {};

/* -------------------------------------------- */
/*  Atributos (p. 17)                           */
/* -------------------------------------------- */

FNM.atributos = {
  forca: { nome: "Força", abrev: "FOR" },
  destreza: { nome: "Destreza", abrev: "DES" },
  constituicao: { nome: "Constituição", abrev: "CON" },
  inteligencia: { nome: "Inteligência", abrev: "INT" },
  sabedoria: { nome: "Sabedoria", abrev: "SAB" },
  presenca: { nome: "Presença", abrev: "PRE" }
};

/** Ordem canônica de exibição na ficha. */
FNM.ordemAtributos = ["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "presenca"];

/* -------------------------------------------- */
/*  Perícias (p. 284-288)                       */
/* -------------------------------------------- */

/**
 * Cada perícia declara seu atributo-chave. `exigeTreino` marca as perícias que,
 * de maneira geral, só podem ser usadas se você for Treinado; `complementar`
 * marca as que são opcionais na mesa (podem ser removidas da campanha).
 */
FNM.pericias = {
  acrobacia: { nome: "Acrobacia", atributo: "destreza" },
  atletismo: { nome: "Atletismo", atributo: "forca" },
  direcao: { nome: "Direção", atributo: "sabedoria", complementar: true },
  enganacao: { nome: "Enganação", atributo: "presenca" },
  feiticaria: { nome: "Feitiçaria", atributo: "inteligencia", exigeTreino: true },
  furtividade: { nome: "Furtividade", atributo: "destreza" },
  historia: { nome: "História", atributo: "inteligencia" },
  intimidacao: { nome: "Intimidação", atributo: "presenca" },
  intuicao: { nome: "Intuição", atributo: "sabedoria" },
  investigacao: { nome: "Investigação", atributo: "inteligencia" },
  medicina: { nome: "Medicina", atributo: "sabedoria", exigeTreino: true },
  ocultismo: { nome: "Ocultismo", atributo: "sabedoria" },
  oficio: { nome: "Ofício", atributo: "inteligencia", exigeTreino: true, subcategoria: true },
  percepcao: { nome: "Percepção", atributo: "sabedoria" },
  performance: { nome: "Performance", atributo: "presenca" },
  persuasao: { nome: "Persuasão", atributo: "presenca" },
  prestidigitacao: { nome: "Prestidigitação", atributo: "destreza", exigeTreino: true },
  sobrevivencia: { nome: "Sobrevivência", atributo: "sabedoria" },
  tecnologia: { nome: "Tecnologia", atributo: "inteligencia", complementar: true },
  teologia: { nome: "Teologia", atributo: "inteligencia", complementar: true }
};

/* -------------------------------------------- */
/*  Testes de Resistência (p. 280)              */
/* -------------------------------------------- */

FNM.resistencias = {
  astucia: { nome: "Astúcia", atributo: "inteligencia" },
  fortitude: { nome: "Fortitude", atributo: "constituicao" },
  integridade: { nome: "Integridade", atributo: "constituicao" },
  reflexos: { nome: "Reflexos", atributo: "destreza" },
  vontade: { nome: "Vontade", atributo: "sabedoria" }
};

/* -------------------------------------------- */
/*  Dificuldades (p. 278)                       */
/* -------------------------------------------- */

FNM.dificuldades = [
  { id: "facil", nome: "Fácil", cd: 10 },
  { id: "media", nome: "Média", cd: 15 },
  { id: "dificil", nome: "Difícil", cd: 20 },
  { id: "muitoDificil", nome: "Muito Difícil", cd: 30 },
  { id: "lendario", nome: "Lendário", cd: 40 },
  { id: "quaseImpossivel", nome: "Quase Impossível", cd: 50 }
];

/* -------------------------------------------- */
/*  Origens (p. 26-40)                          */
/* -------------------------------------------- */

FNM.origens = [
  { id: "inato", nome: "Inato" },
  { id: "herdado", nome: "Herdado" },
  { id: "derivado", nome: "Derivado" },
  { id: "restringido", nome: "Restringido" },
  { id: "fetoHibrido", nome: "Feto Amaldiçoado Híbrido" },
  { id: "semTecnica", nome: "Sem Técnica" },
  { id: "corpoMutante", nome: "Corpo Amaldiçoado Mutante" }
];

/** Clãs disponíveis para a origem Herdado (p. 29-31). */
FNM.claes = [
  { id: "gojo", nome: "Clã Gojo", atributos: "Inteligência e Sabedoria", heranca: "Seis Olhos, Ilimitado" },
  { id: "inumaki", nome: "Clã Inumaki", atributos: "Inteligência e Presença", heranca: "Fala Amaldiçoada" },
  { id: "kamo", nome: "Clã Kamo", atributos: "Constituição e Sabedoria", heranca: "Manipulação Sanguínea" },
  { id: "zenin", nome: "Clã Zenin", atributos: "Quaisquer", heranca: "Dez Sombras, Projeção" }
];

/* -------------------------------------------- */
/*  Especializações (p. 44, 49-114)             */
/* -------------------------------------------- */

/**
 * `pvPrimeiro` é o PV do 1º nível (antes de somar Constituição); `dadoVida` é o
 * dado rolado nos níveis seguintes e `pvFixo` a alternativa a rolar. `pe` são os
 * Pontos de Energia por nível — `somaAtributo` indica as especializações que
 * somam uma vez o modificador do atributo de técnica ao máximo de PE.
 */
FNM.especializacoes = [
  {
    id: "lutador",
    nome: "Lutador",
    pvPrimeiro: 12,
    dadoVida: "d10",
    pvFixo: 6,
    pe: 4,
    somaAtributo: false,
    atributosChave: ["forca", "destreza"],
    multiclasse: "Força ou Destreza 16"
  },
  {
    id: "especialistaCombate",
    nome: "Especialista em Combate",
    pvPrimeiro: 12,
    dadoVida: "d10",
    pvFixo: 6,
    pe: 4,
    somaAtributo: false,
    atributosChave: ["forca", "destreza", "sabedoria"],
    multiclasse: "Força ou Destreza 16"
  },
  {
    id: "especialistaTecnica",
    nome: "Especialista em Técnica",
    pvPrimeiro: 10,
    dadoVida: "d8",
    pvFixo: 5,
    pe: 6,
    somaAtributo: true,
    atributosChave: ["inteligencia", "sabedoria"],
    multiclasse: "Inteligência ou Sabedoria 16"
  },
  {
    id: "controlador",
    nome: "Controlador",
    pvPrimeiro: 10,
    dadoVida: "d8",
    pvFixo: 5,
    pe: 5,
    somaAtributo: true,
    atributosChave: ["presenca", "sabedoria"],
    multiclasse: "Presença ou Sabedoria 16"
  },
  {
    id: "suporte",
    nome: "Suporte",
    pvPrimeiro: 10,
    dadoVida: "d8",
    pvFixo: 5,
    pe: 5,
    somaAtributo: true,
    atributosChave: ["presenca", "sabedoria"],
    multiclasse: "Presença ou Sabedoria 16"
  },
  {
    id: "restringido",
    nome: "Restringido",
    pvPrimeiro: 16,
    dadoVida: "d12",
    pvFixo: 7,
    // Restringidos não têm PE: recebem 4 Pontos de Estamina por nível (p. 114).
    pe: 0,
    estamina: 4,
    somaAtributo: false,
    atributosChave: ["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "presenca"],
    multiclasse: "Restringidos não podem realizar Multiclasse"
  }
];

/* -------------------------------------------- */
/*  Restringido (p. 114-126)                    */
/* -------------------------------------------- */

/**
 * Técnicas Marciais (p. 124 e 248). São "equivalentes aos Feitiços que um
 * feiticeiro recebe": mesma criação, mesmos níveis de poder, mas pagas em
 * Pontos de Estamina e limitadas ao físico — sem energia amaldiçoada no meio.
 *
 * Os custos são os do livro; alcance, dano e área saem da tabela de Feitiços do
 * nível correspondente, porque é o mesmo capítulo de criação.
 */
FNM.niveisTecnicaMarcial = [
  { id: "1", nome: "Nível 1", custo: 2 },
  { id: "2", nome: "Nível 2", custo: 5 },
  { id: "3", nome: "Nível 3", custo: 8 },
  { id: "4", nome: "Nível 4", custo: 12 }
];

/** Acesso a níveis de Técnica Marcial por nível de Restringido (p. 124). */
FNM.acessoTecnicaMarcial = [
  { ate: 4, niveis: ["1"] },
  { ate: 8, niveis: ["1", "2"] },
  { ate: 14, niveis: ["1", "2", "3"] },
  { ate: 20, niveis: ["1", "2", "3", "4"] }
];

/**
 * Quantas Técnicas Marciais o Restringido conhece: começa com 2 e recebe mais
 * uma em cada nível ímpar de 3 a 19 (p. 124).
 */
FNM.niveisGanhoTecnicaMarcial = [3, 5, 7, 9, 11, 13, 15, 17, 19];

/**
 * Arsenal Amaldiçoado (p. 125), indexado pelo Bônus de Treinamento. As
 * ferramentas são ATUALIZADAS a cada degrau, e não acumuladas — só o +3
 * acrescenta uma peça ao total.
 */
FNM.arsenalAmaldicoado = {
  2: { texto: "Uma ferramenta de terceiro grau e duas de quarto grau.", pecas: { Terceiro: 1, Quarto: 2 } },
  3: { texto: "Uma ferramenta de segundo grau e três de terceiro grau.", pecas: { Segundo: 1, Terceiro: 3 } },
  4: { texto: "Duas ferramentas de primeiro grau e duas de segundo grau.", pecas: { Primeiro: 2, Segundo: 2 } },
  5: { texto: "Uma ferramenta de grau especial e três de primeiro grau.", pecas: { Especial: 1, Primeiro: 3 } },
  6: { texto: "Duas ferramentas de grau especial e duas de primeiro grau.", pecas: { Especial: 2, Primeiro: 2 } }
};

/**
 * Dádivas do Céu (p. 126): uma a cada 4 níveis. `efeito` é o que a automação
 * aplica sozinha; o resto do texto fica na ficha para o jogador consultar,
 * porque depende de situação (pulo, empurrar, terreno difícil) ou de escolha
 * (em que perícia virar mestre).
 */
FNM.dadivasDoCeu = [
  {
    id: "agilidade",
    nome: "Agilidade Exímia",
    resumo:
      "+2 em testes de perícia e resistência de Destreza, +3 m de deslocamento e ignora terreno difícil.",
    bonusAtributo: { destreza: 2 },
    deslocamento: 3
  },
  {
    id: "robusto",
    nome: "Físico Robusto",
    resumo:
      "Redução de Dano contra todo tipo igual a metade do nível, e +2 em testes de Constituição.",
    bonusAtributo: { constituicao: 2 },
    rdMetadeNivel: true
  },
  {
    id: "forca",
    nome: "Força Devastadora",
    resumo:
      "+2 em perícias de Força. Pulos e saltos +3 m, e a ação Empurrar alcança +4,5 m.",
    bonusAtributo: { forca: 2 }
  },
  {
    id: "indulgente",
    nome: "Indulgente a Feitiçaria",
    resumo:
      "RD contra dano de técnicas e aptidões igual a metade do nível, e +1 em TRs de Vontade contra elas " +
      "(+2 no nível 10; a partir do 15 vale também para Fortitude e Reflexos).",
    // A RD é condicional à fonte do dano, então não entra na grade automática
    manual: true
  },
  {
    id: "mente",
    nome: "Mente Afiada",
    resumo:
      "Treinado em duas perícias adicionais, mestre em uma, e +2 em testes de Inteligência.",
    bonusAtributo: { inteligencia: 2 }
  },
  {
    id: "percepcao",
    nome: "Percepção Aguçada",
    resumo:
      "Atenção aumenta em metade do nível, +3 em rolagens de Percepção e +2 em testes de Sabedoria.",
    bonusAtributo: { sabedoria: 2 },
    atencaoMetadeNivel: true,
    bonusPericia: { percepcao: 3 }
  },
  {
    id: "reposicao",
    nome: "Reposição Sanguinária",
    resumo:
      "Ao matar um inimigo que você feriu, recupera 3 Pontos de Estamina — sem passar do que tinha no início do combate.",
    manual: true
  },
  {
    id: "semblante",
    nome: "Semblante Cativante",
    resumo:
      "Em perícias de Presença, pode tratar um resultado abaixo da metade da Presença como essa metade. " +
      "Mestre em uma perícia de Presença e +2 em testes de Presença.",
    bonusAtributo: { presenca: 2 }
  },
  {
    id: "vigor",
    nome: "Vigor Infindável",
    resumo:
      "PV máximo aumenta em um valor igual ao nível, e a cada 2 níveis ganha +1 de Estamina máxima.",
    pvNivel: true,
    estaminaMetadeNivel: true
  }
];

/* -------------------------------------------- */
/*  Aptidões Amaldiçoadas (p. 172-173)          */
/* -------------------------------------------- */

/** Níveis de Aptidão vão de 0 a 5 e são rastreados por área. */
FNM.niveisAptidao = {
  au: { nome: "Aura", sigla: "AU" },
  cl: { nome: "Controle e Leitura", sigla: "CL" },
  bar: { nome: "Barreira", sigla: "BAR" },
  dom: { nome: "Domínio", sigla: "DOM" },
  er: { nome: "Energia Reversa", sigla: "ER" }
};

FNM.categoriasAptidao = [
  "Aura",
  "Controle e Leitura",
  "Domínio",
  "Barreira",
  "Energia Reversa",
  "Especial"
];

/* -------------------------------------------- */
/*  Feitiços (p. 199-206)                       */
/* -------------------------------------------- */

/**
 * Tabela mestre dos níveis de Feitiço: custo em PE (p. 199), alcance padrão
 * (p. 205), dano em alvo único com TR ou com teste de ataque (p. 205), e
 * dano/área para Feitiços em área ou de alvos múltiplos (p. 206).
 */
FNM.niveisFeitico = [
  { id: "0", nome: "Nível 0", custo: 0, alcance: 9, danoTR: "1d10", danoAtaque: "1d10", danoArea: "", area: 0 },
  { id: "1", nome: "Nível 1", custo: 2, alcance: 12, danoTR: "3d8", danoAtaque: "4d8", danoArea: "2d8", area: 4.5 },
  { id: "2", nome: "Nível 2", custo: 5, alcance: 18, danoTR: "7d8", danoAtaque: "8d8", danoArea: "4d8", area: 6 },
  { id: "3", nome: "Nível 3", custo: 8, alcance: 24, danoTR: "12d8", danoAtaque: "14d8", danoArea: "5d12", area: 9 },
  { id: "4", nome: "Nível 4", custo: 12, alcance: 30, danoTR: "14d10", danoAtaque: "16d10", danoArea: "10d10", area: 12 },
  { id: "5", nome: "Nível 5", custo: 20, alcance: 48, danoTR: "18d12", danoAtaque: "20d12", danoArea: "12d12", area: 18 },
  { id: "max", nome: "Técnica Máxima", custo: 20, alcance: 60, danoTR: "26d12", danoAtaque: "28d12", danoArea: "22d10", area: 24 }
];

/** Acesso a níveis de Feitiço por nível de personagem (p. 199). */
FNM.acessoFeitico = [
  { ate: 4, niveis: ["0", "1"] },
  { ate: 8, niveis: ["0", "1", "2"] },
  { ate: 12, niveis: ["0", "1", "2", "3"] },
  { ate: 16, niveis: ["0", "1", "2", "3", "4"] },
  { ate: 20, niveis: ["0", "1", "2", "3", "4", "5"] }
];

FNM.tiposFeitico = ["Dano", "Auxiliar", "Curativo", "Especial", "Passivo"];

/** Durações de Feitiço (p. 203). */
FNM.duracoes = ["Imediato", "Duradouro", "Sustentado", "Concentrado", "Variável"];

/**
 * Unidades para a duração de um Feitiço Duradouro, que "durará uma quantidade
 * específica de tempo, seja minutos, rodadas ou outra medida" (p. 203).
 *
 * `singular` existe porque a ficha escreve o prazo por extenso: 1 rodada, e não
 * 1 rodadas.
 */
FNM.unidadesDuracao = [
  { id: "rodadas", nome: "rodadas", singular: "rodada" },
  { id: "minutos", nome: "minutos", singular: "minuto" },
  { id: "horas", nome: "horas", singular: "hora" },
  { id: "dias", nome: "dias", singular: "dia" },
  { id: "cena", nome: "cenas", singular: "cena" }
];

/**
 * Tempo de conjuração — as ações que um Feitiço pode consumir (p. 300-304).
 *
 * A "Ação Rápida" não está na hierarquia de ações do livro básico: ela vem da
 * tabela de ações por Patamar do Grimório (p. 53), onde só inimigos a recebem.
 * Fica na mesma lista porque inimigo e personagem usam o mesmo item de Feitiço.
 */
FNM.conjuracoes = [
  "Ação Comum",
  "Ação Rápida",
  "Ação Bônus",
  "Reação",
  "Ação Completa",
  "Ação Livre",
  "Ação de Movimento"
];

/** Tipos de alvo (p. 298). */
FNM.tiposAlvo = ["Pessoal", "Toque", "Aliado", "Criatura", "Objeto", "Estrutura", "Área"];

/** Formatos de área (p. 299 / 202). */
FNM.formatosArea = ["Cilindro", "Cone", "Esfera", "Linha", "Quadrado"];

/**
 * Custo de sustento por rodada para Feitiços Sustentados (p. 203):
 * níveis 0-2 custam 1 PE, níveis 3-5 custam 2 PE.
 */
export function custoSustento(nivelFeitico) {
  return ["3", "4", "5", "max"].includes(String(nivelFeitico)) ? 2 : 1;
}

/* -------------------------------------------- */
/*  Tipos de Dano (p. 315-316)                  */
/* -------------------------------------------- */

FNM.tiposDano = {
  cortante: { nome: "Cortante", abrev: "COR", categoria: "Físico" },
  impacto: { nome: "Impacto", abrev: "IMP", categoria: "Físico" },
  perfurante: { nome: "Perfurante", abrev: "PER", categoria: "Físico" },
  congelante: { nome: "Congelante", abrev: "CON", categoria: "Elemental" },
  queimante: { nome: "Queimante", abrev: "QUE", categoria: "Elemental" },
  chocante: { nome: "Chocante", abrev: "CHO", categoria: "Elemental" },
  sonico: { nome: "Sônico", abrev: "SON", categoria: "Elemental" },
  acido: { nome: "Ácido", abrev: "ÁCI", categoria: "Elemental" },
  energetico: { nome: "Energético", abrev: "ENE", categoria: "Etéreo" },
  psiquico: { nome: "Psíquico", abrev: "PSI", categoria: "Etéreo" },
  radiante: { nome: "Radiante", abrev: "RAD", categoria: "Etéreo" },
  energiaReversa: { nome: "Energia Reversa", abrev: "REV", categoria: "Etéreo" },
  necrotico: { nome: "Necrótico", abrev: "NEC", categoria: "Biológico" },
  venenoso: { nome: "Venenoso", abrev: "VEN", categoria: "Biológico" },
  // Dano na Alma atravessa defesas e resistências, então não tem linha de RD
  alma: { nome: "Dano na Alma", abrev: "ALM", categoria: "Etéreo", semReducao: true }
};

/**
 * Tipos que ganham uma linha própria de Redução de Dano na ficha, na mesma
 * ordem da grade de RDs do Modelo de Ficha oficial v2.5.
 */
FNM.tiposComRD = Object.entries(FNM.tiposDano)
  .filter(([, t]) => !t.semReducao)
  .map(([id]) => id);

/* -------------------------------------------- */
/*  Jogadas de Ataque (p. 279)                  */
/* -------------------------------------------- */

/**
 * As três linhas de "Jogadas de Ataque" da ficha oficial. `atributo` é o padrão
 * do livro; a ficha permite trocá-lo (armas com Fineza, técnicas etc.).
 */
FNM.tiposAtaque = {
  corpoACorpo: { nome: "Corpo a Corpo", atributo: "forca" },
  distancia: { nome: "A Distância", atributo: "destreza" },
  // O Ataque Amaldiçoado usa o atributo da técnica e você é sempre treinado nele
  amaldicoado: { nome: "Amaldiçoado", atributo: "inteligencia", sempreTreinado: true }
};

/**
 * Cobertura (p. 293-294). O bônus vale na Defesa e nos TRs de Reflexos do alvo,
 * e coberturas não se acumulam: vale só a maior. Cobertura Total impede o alvo
 * de ser escolhido.
 */
FNM.cobertura = [
  { id: "nenhuma", nome: "Nenhuma", defesa: 0 },
  { id: "meia", nome: "Meia Cobertura (+2)", defesa: 2 },
  { id: "tresQuartos", nome: "Cobertura 3/4 (+4)", defesa: 4 },
  { id: "total", nome: "Cobertura Total", defesa: 0, bloqueia: true }
];

/**
 * Camuflagem (p. 294). Rola-se 1d10 junto do d20: dentro da faixa de falha o
 * ataque erra, não importa o resultado do d20. Nenhum efeito passa de 50%.
 */
FNM.camuflagem = [
  { id: "nenhuma", nome: "Nenhuma", falha: 0 },
  { id: "leve", nome: "Camuflagem Leve (20%)", falha: 2 },
  { id: "total", nome: "Camuflagem Total (50%)", falha: 5 }
];

/**
 * Alcance de armas a distância e de arremesso (p. 305). O primeiro valor da
 * arma é o alcance normal e o segundo, o máximo; além do máximo o ataque é
 * impossível. Atacar corpo a corpo com elas também dá desvantagem.
 */
FNM.alcanceAtaque = [
  { id: "normal", nome: "Dentro do alcance normal" },
  { id: "longo", nome: "Além do alcance normal", desvantagem: true },
  { id: "adjacente", nome: "Alvo em alcance corpo a corpo", desvantagem: true },
  { id: "impossivel", nome: "Além do alcance máximo", bloqueia: true }
];

/* -------------------------------------------- */
/*  Treinamentos (p. 338)                       */
/* -------------------------------------------- */

/**
 * Os onze treinamentos da página "Treinamentos" do Modelo de Ficha oficial.
 * Cada um tem 4 etapas; concluir as quatro libera o Treinamento Completo,
 * cujo texto está transcrito da própria ficha.
 */
FNM.treinamentos = [
  { id: "agilidade", nome: "Treino de Agilidade", completo: "Com grande velocidade e agilidade, você se torna rápido e capaz de um nível superior de mobilidade e esquivas. Sua margem necessária para conseguir um sucesso crítico em um TR de Reflexos reduz em 2. Seu Deslocamento aumenta em 4,5 metros." },
  { id: "barreiras", nome: "Treino de Barreiras", completo: "Toda parede que você criar com Técnicas de Barreira recebe RD igual ao seu Nível de Aptidão em Barreiras." },
  { id: "compreensao", nome: "Treino de Compreensão", completo: "Você chega muito perto de compreender profundamente a energia amaldiçoada, tornando-se familiar com ela e entendendo melhor uma parte dela. Você aumenta um nível de aptidão a sua escolha em 1." },
  { id: "controleEnergia", nome: "Controle de Energia", completo: "Em uma situação de combate, imerso no fervor da batalha, você consegue gerar energia: durante uma cena de combate, no começo de toda rodada, você ganha PE Temporário igual a metade do seu bônus de maestria." },
  { id: "dominios", nome: "Treino de Domínios", completo: "Você se torna um mestre das expansões, entendo o como conseguir a moldar perfeitamente diante a sua vontade e necessidade do momento. Você recebe a aptidão amaldiçoada Modificação Completa." },
  { id: "energiaReversa", nome: "Energia Reversa", completo: "Você pode usar a aptidão amaldiçoada Regeneração Aprimorada para curar sua exaustão de técnica após usar expansão de domínio, reduzindo em um turno para 2 pontos de energia reversa gastos." },
  { id: "luta", nome: "Treino de Luta", completo: "Você recebe acesso ao efeito de crítico de ataques desarmados (pugilato). Além disso, você pode, uma vez por rodada, escolher realizar uma rolagem de Luta com vantagem, seja ela para um ataque ou para uma manobra." },
  { id: "manejoArma", nome: "Manejo de Arma", completo: "Enquanto estiver manejando a arma escolhida, ela recebe uma propriedade de ferramenta amaldiçoada adicional." },
  { id: "pericia", nome: "Treino de Perícia", completo: "Caso realize um teste da perícia escolhida e obtenha um resultado menor do que 5 no d20, você pode o rolar novamente e manter o melhor resultado." },
  { id: "potencialFisico", nome: "Potencial Físico", completo: "Durante uma cena de combate, no começo de toda rodada, você recupera uma quantidade de pontos de vigor igual a metade do seu bônus de maestria." },
  { id: "resistencia", nome: "Treino de Resistência", completo: "Sua margem necessária para conseguir um sucesso crítico em um TR de Fortitude reduz em 2. Uma vez por cena, você ignora a primeira falha em testes de morte. Seus pontos de vida máximos aumentam em mais 10." }
];

/* -------------------------------------------- */
/*  Condições (p. 317-319)                      */
/* -------------------------------------------- */

/**
 * O catálogo de condições, com a parte que a automação sabe aplicar sozinha.
 *
 * `efeito` é o texto do livro, e continua sendo a palavra final na mesa.
 * `mecanica` é só o pedaço aritmético dele — o que dá para somar em uma ficha
 * sem interpretar nada. O que depende do contexto (de quem enfeitiçou, se o
 * teste envolve visão, para que lado o Confuso anda) fica em `avisos`, que a
 * ficha e as cartas mostram sem tentar decidir por ninguém.
 *
 * Campos de `mecanica`, todos opcionais:
 *   ataque, pericias, resistencias   penalidade nas rolagens correspondentes
 *   ataqueCorpoACorpo                penalidade só na linha de corpo a corpo
 *   defesa                           penalidade na Defesa, em qualquer ataque
 *   defesaCorpoACorpo                ajuste só contra ataques corpo a corpo
 *   defesaDistancia                  ajuste só contra ataques a distância
 *   reflexos                         penalidade extra no TR de Reflexos
 *   iniciativa, percepcao, furtividade
 *   deslocamentoMenos                metros descontados do deslocamento
 *   deslocamentoTeto                 teto absoluto em metros (Caído rasteja)
 *   deslocamentoMetade               reduz toda forma de movimento à metade
 *   custoPE                          soma ao custo de toda habilidade
 *   ataquesContra                    bônus de quem ataca esta criatura
 *
 * Os sinalizadores booleanos descrevem o que a automação não calcula, mas
 * precisa saber: `semAcoes`, `semReacoes`, `falhaReflexos`, `semRD`,
 * `criticoCorpoACorpo`, `sempreAcertado`, `mudo`, `semConversaoDeAcoes`.
 *
 * `implica` são as condições que esta aplica junto (p. 317): ser imune a uma
 * não torna ninguém imune às outras, então elas entram como efeitos próprios.
 */
FNM.condicoes = [
  // Físicas
  {
    id: "condenado",
    nome: "Condenado",
    grupo: "Física",
    nivel: "Média",
    icone: "icons/svg/skull.svg",
    efeito: "O custo em PE de todas as suas habilidades aumenta em 1.",
    mecanica: { custoPE: 1 }
  },
  {
    id: "engasgando",
    nome: "Engasgando",
    grupo: "Física",
    nivel: "Média",
    icone: "icons/svg/silenced.svg",
    efeito: "Fica mudo e precisa segurar o ar.",
    mecanica: { mudo: true },
    avisos: ["Sem voz: nada de encantações, e o personagem está segurando o ar."]
  },
  {
    id: "enjoado",
    nome: "Enjoado",
    grupo: "Física",
    nivel: "Média",
    icone: "icons/svg/acid.svg",
    efeito: "Não pode converter ações dentro da Hierarquia de Ações.",
    mecanica: { semConversaoDeAcoes: true }
  },
  {
    id: "envenenado",
    nome: "Envenenado",
    grupo: "Física",
    nivel: "Média",
    icone: "icons/svg/poison.svg",
    efeito: "-2 em jogadas de ataque, testes de resistência e testes de perícia.",
    mecanica: { ataque: -2, resistencias: -2, pericias: -2 }
  },
  {
    id: "sangramento",
    nome: "Sangramento",
    grupo: "Física",
    nivel: "Variável",
    icone: "icons/svg/blood.svg",
    efeito:
      "Perda de vida no início do turno; TR de Fortitude no fim do turno encerra a condição em um sucesso.",
    // A perda de vida vem do nível escolhido para o sangramento (p. 210)
    perdaDeVida: true,
    resistenciaPadrao: "fortitude",
    duracao: "tr",
    avisos: ["Perda de vida ignora Redução de Dano e resistências (p. 316)."]
  },
  {
    id: "sofrendo",
    nome: "Sofrendo",
    grupo: "Física",
    nivel: "Fraca",
    icone: "icons/svg/degen.svg",
    efeito:
      "-5 em testes de concentração e de Prestidigitação para rituais; perde 3 metros de movimento.",
    mecanica: { deslocamentoMenos: 3 },
    avisos: ["-5 em testes de concentração e em Prestidigitação para conjurar em ritual."]
  },
  // Incapacitação
  {
    id: "atordoado",
    nome: "Atordoado",
    grupo: "Incapacitação",
    nivel: "Extrema",
    icone: "icons/svg/daze.svg",
    efeito: "Fica desprevenido e não pode realizar ações ou reações.",
    implica: ["desprevenido"],
    mecanica: { semAcoes: true, semReacoes: true }
  },
  {
    id: "inconsciente",
    nome: "Inconsciente",
    grupo: "Incapacitação",
    nivel: "Extrema",
    icone: "icons/svg/unconscious.svg",
    efeito:
      "Não age nem reage, fica caído, larga o que segura. Falha automaticamente em TR de Reflexos; todo ataque contra ela acerta e é crítico.",
    implica: ["caido"],
    mecanica: { semAcoes: true, semReacoes: true, falhaReflexos: true, sempreAcertado: true },
    avisos: [
      "Uma criatura inconsciente fora das Portas da Morte acorda ao tomar dano, ou se alguém gastar uma ação comum para chacoalhá-la."
    ]
  },
  {
    id: "paralisado",
    nome: "Paralisado",
    grupo: "Incapacitação",
    nivel: "Extrema",
    icone: "icons/svg/paralysis.svg",
    efeito:
      "Só age mentalmente. -10 de Defesa, falha automaticamente em TR de Reflexos e todo ataque corpo a corpo que acerte é crítico.",
    mecanica: { defesa: -10, falhaReflexos: true, criticoCorpoACorpo: true, semReacoes: true },
    avisos: ["Restam apenas as ações completamente mentais."]
  },
  {
    id: "indefeso",
    nome: "Indefeso",
    grupo: "Incapacitação",
    nivel: "Especial",
    icone: "icons/svg/net.svg",
    efeito:
      "Fica Imóvel e Atordoado. Pode ser morta ou receber um Ferimento Complexo com uma ação completa em alcance de toque.",
    implica: ["imovel", "atordoado"]
  },
  // Mentais
  {
    id: "abalado",
    nome: "Abalado",
    grupo: "Mental",
    nivel: "Fraca",
    icone: "icons/svg/terror.svg",
    efeito: "-1 em jogadas de ataque e testes de perícia.",
    mecanica: { ataque: -1, pericias: -1 }
  },
  {
    id: "amedrontado",
    nome: "Amedrontado",
    grupo: "Mental",
    nivel: "Média",
    icone: "icons/svg/terror.svg",
    efeito: "-3 em jogadas de ataque e testes de perícia (evolução de Abalado; não acumulam).",
    mecanica: { ataque: -3, pericias: -3 }
  },
  {
    id: "aterrorizado",
    nome: "Aterrorizado",
    grupo: "Mental",
    nivel: "Forte",
    icone: "icons/svg/terror.svg",
    efeito: "Não pode se aproximar voluntariamente da criatura que infligiu a condição.",
    avisos: ["Nenhuma aproximação voluntária de quem infligiu a condição."]
  },
  {
    id: "confuso",
    nome: "Confuso",
    grupo: "Mental",
    nivel: "Média",
    icone: "icons/svg/stoned.svg",
    efeito:
      "Comporta-se aleatoriamente. -4 em Fortitude e Atletismo para se manter de pé; move-se em direção aleatória a cada 1,5 m.",
    avisos: [
      "-4 em Fortitude e Atletismo para se manter de pé.",
      "A cada 1,5 m de movimento voluntário, role 1d4 (1 frente, 2 trás, 3 direita, 4 esquerda) e ande 3 m nessa direção — 1d6 se puder subir ou descer."
    ]
  },
  {
    id: "enfeiticado",
    nome: "Enfeitiçado",
    grupo: "Mental",
    nivel: "Média",
    icone: "icons/svg/eye.svg",
    efeito: "-2 em todos os testes contra quem a enfeitiçou.",
    avisos: ["-2 em todo teste feito contra quem enfeitiçou — só contra essa criatura."]
  },
  // Movimento
  {
    id: "agarrado",
    nome: "Agarrado",
    grupo: "Movimento",
    nivel: "Média",
    icone: "icons/svg/net.svg",
    efeito:
      "Fica Desprevenido e Imóvel. Ataques a distância contra o agarrão têm 50% de chance de acertar o alvo errado.",
    implica: ["desprevenido", "imovel"],
    avisos: [
      "Ataque a distância contra quem está no agarrão: 1 a 5 em 1d10 acerta o alvo errado.",
      "Se quem agarra se mover, a criatura agarrada acompanha."
    ]
  },
  {
    id: "caido",
    nome: "Caído",
    grupo: "Movimento",
    nivel: "Fraca",
    icone: "icons/svg/falling.svg",
    efeito:
      "-3 em ataques corpo a corpo, move-se só 4,5 m rastejando. -3 de Defesa contra corpo a corpo e +3 contra ataques a distância.",
    // O -3 de Defesa do Caído é só contra corpo a corpo; contra ataques a
    // distância o livro dá +3, então os dois ficam em campos separados
    mecanica: {
      ataqueCorpoACorpo: -3,
      defesaCorpoACorpo: -3,
      defesaDistancia: 3,
      deslocamentoTeto: 4.5
    },
    duracao: "acao",
    avisos: [
      "Levantar custa uma ação de movimento.",
      "Quem estava voando perde o deslocamento de voo até ficar de pé."
    ]
  },
  {
    id: "enredado",
    nome: "Enredado",
    grupo: "Movimento",
    nivel: "Média",
    icone: "icons/svg/net.svg",
    efeito: "Deslocamento reduzido à metade; -2 na Defesa e em rolagens de ataque.",
    mecanica: { defesa: -2, ataque: -2, deslocamentoMetade: true }
  },
  {
    id: "imovel",
    nome: "Imóvel",
    grupo: "Movimento",
    nivel: "Forte",
    icone: "icons/svg/paralysis.svg",
    efeito:
      "Não pode usar Andar, Esgueirar, Levantar nem Pular, e não pode receber Deslocamento de nenhuma fonte.",
    mecanica: { deslocamentoTeto: 0 },
    avisos: ["Sacar e ações que gastem o movimento sem sair do lugar continuam valendo."]
  },
  {
    id: "lento",
    nome: "Lento",
    grupo: "Movimento",
    nivel: "Média",
    icone: "icons/svg/downgrade.svg",
    efeito: "Toda forma de movimento é reduzida pela metade.",
    mecanica: { deslocamentoMetade: true }
  },
  // Sensoriais
  {
    id: "cego",
    nome: "Cego",
    grupo: "Sensorial",
    nivel: "Forte",
    icone: "icons/svg/blind.svg",
    efeito:
      "Fica Surpreso e Lento, falha em testes de visão e sofre -5 em Percepção. Seus alvos recebem Camuflagem Total.",
    implica: ["surpreso", "lento"],
    mecanica: { percepcao: -5 },
    avisos: [
      "Falha automática em qualquer teste que dependa da visão.",
      "Todos os seus alvos têm Camuflagem Total: 50% de chance de o ataque errar sozinho."
    ]
  },
  {
    id: "desorientado",
    nome: "Desorientado",
    grupo: "Sensorial",
    nivel: "Fraca",
    icone: "icons/svg/daze.svg",
    efeito:
      "Não pode usar reações contra a próxima ação ofensiva contra você nem ataques de oportunidade.",
    mecanica: { semReacoes: true },
    duracao: "efeito"
  },
  {
    id: "desprevenido",
    nome: "Desprevenido",
    grupo: "Sensorial",
    nivel: "Fraca",
    icone: "icons/svg/downgrade.svg",
    efeito: "-3 na Defesa e em Testes de Resistência de Reflexos.",
    mecanica: { defesa: -3, reflexos: -3 }
  },
  {
    id: "invisivel",
    nome: "Invisível",
    grupo: "Sensorial",
    nivel: "Especial",
    icone: "icons/svg/invisible.svg",
    efeito: "Não pode ser visto, +10 em Furtividade e pode usar Esconder como Ação Livre.",
    mecanica: { furtividade: 10 },
    beneficio: true,
    avisos: ["Invisível na rolagem de Iniciativa: ela é feita com vantagem."]
  },
  {
    id: "surdo",
    nome: "Surdo",
    grupo: "Sensorial",
    nivel: "Média",
    icone: "icons/svg/deaf.svg",
    efeito:
      "Falha em testes de audição e sofre -5 em Iniciativa (também no valor atual, se já em combate).",
    mecanica: { iniciativa: -5 },
    avisos: ["Já em combate, o valor atual de Iniciativa também cai 5 e a ordem dos turnos muda."]
  },
  {
    id: "surpreso",
    nome: "Surpreso",
    grupo: "Sensorial",
    nivel: "Especial",
    icone: "icons/svg/eye.svg",
    efeito: "Fica Desprevenido e não pode reagir contra a criatura que o surpreendeu.",
    implica: ["desprevenido"],
    avisos: ["Sem reações contra quem o surpreendeu."]
  },
  // Vulnerabilidade
  {
    id: "exposto",
    nome: "Exposto",
    grupo: "Vulnerabilidade",
    nivel: "Forte",
    icone: "icons/svg/target.svg",
    efeito:
      "Ataques contra a criatura recebem +4 e causam dano adicional igual ao nível do atacante.",
    // Age sobre quem ataca, não sobre a ficha de quem sofre: é o diálogo de
    // ataque que soma o +4 quando o alvo marcado está Exposto
    mecanica: { ataquesContra: 4, danoExtraPorNivel: true }
  },
  {
    id: "fragilizado",
    nome: "Fragilizado",
    grupo: "Vulnerabilidade",
    nivel: "Forte",
    icone: "icons/svg/degen.svg",
    efeito: "Redução de Dano zerada e resistências anuladas (imunidades permanecem).",
    mecanica: { semRD: true },
    avisos: [
      "Enquanto durar, a Redução de Dano não pode ser aumentada nem a criatura ficar resistente a nada."
    ]
  }
];

/** Índice por id, para as buscas que a automação faz a todo momento. */
FNM.condicoesPorId = Object.fromEntries(FNM.condicoes.map(c => [c.id, c]));

/* -------------------------------------------- */
/*  Aplicando Condições (p. 207-210)            */
/* -------------------------------------------- */

/** Níveis de condição na ordem de poder, como o capítulo de criação os usa. */
FNM.niveisCondicao = ["Fraca", "Média", "Forte", "Extrema"];

/** Dados de dano que cada nível de condição custa em um Feitiço de Dano (p. 207). */
FNM.reducaoDadosPorCondicao = { Fraca: 1, Média: 3, Forte: 5, Extrema: 8 };

/**
 * Duração padrão em rodadas, por nível do Feitiço e nível da condição (p. 208).
 * `0` quer dizer que aquele nível de Feitiço não alcança aquele nível de
 * condição; `-1` é a duração de cena da Técnica Máxima, que só termina quando
 * o alvo passa na CD.
 */
FNM.duracaoCondicao = {
  "1": { Fraca: 1, Média: 0, Forte: 0, Extrema: 0 },
  "2": { Fraca: 2, Média: 1, Forte: 0, Extrema: 0 },
  "3": { Fraca: 3, Média: 2, Forte: 1, Extrema: 0 },
  "4": { Fraca: 4, Média: 3, Forte: 2, Extrema: 1 },
  "5": { Fraca: 5, Média: 4, Forte: 3, Extrema: 1 },
  max: { Fraca: -1, Média: 5, Forte: 4, Extrema: 1 }
};

/** Perda de vida do Sangramento, conforme o nível escolhido para ele (p. 210). */
FNM.sangramentoPorNivel = { Fraca: "2d6", Média: "3d8", Forte: "4d10", Extrema: "6d10" };

/* -------------------------------------------- */
/*  Exaustão (p. 324)                           */
/* -------------------------------------------- */

FNM.exaustao = [
  { nivel: 1, efeito: "-1 em todas as rolagens, Defesa e CD (aumenta -1 por nível de exaustão)." },
  { nivel: 2, efeito: "Recebe a condição Desprevenido." },
  { nivel: 3, efeito: "Perde 20 PV máximos ou 1/4 da vida máxima, o que for maior. Recebe a condição Exposto." },
  { nivel: 4, efeito: "Recebe as condições Condenado e Desorientado. Ao entrar em morrendo, já conta duas falhas." },
  { nivel: 5, efeito: "Perde 50 PV máximos ou metade da vida máxima, o que for maior. Recebe a condição Enjoado." },
  { nivel: 6, efeito: "O personagem morre." }
];

/* -------------------------------------------- */
/*  Estados da Alma (p. 312)                    */
/* -------------------------------------------- */

FNM.estadosAlma = [
  { id: "estavel", nome: "Estável", minimo: 0.75, penalidade: 0, custoExtra: 0, condicoes: [] },
  { id: "danificado", nome: "Danificado", minimo: 0.5, penalidade: -3, custoExtra: 2, condicoes: [] },
  { id: "instavel", nome: "Instável", minimo: 0.25, penalidade: -6, custoExtra: 3, condicoes: ["Exposto"] },
  { id: "critico", nome: "Crítico", minimo: 0, penalidade: -8, custoExtra: 5, condicoes: ["Exposto", "Fragilizado"] }
];

/* -------------------------------------------- */
/*  Equipamento                                 */
/* -------------------------------------------- */

/** Grupos de arma, cada um com seu efeito de crítico (p. 308). */
FNM.gruposArma = {
  arco: { nome: "Arco", critico: "O alvo adjacente a uma superfície é preso nela, ficando Imóvel até arrancar o projétil." },
  bastao: { nome: "Bastão", critico: "Você pode empurrar o alvo até 3 metros para longe de você." },
  besta: { nome: "Besta", critico: "O alvo recebe Sangramento (CD de Especialização, Xd8)." },
  chicote: { nome: "Chicote", critico: "O alvo faz um TR de Reflexos contra sua CD de Especialização ou é derrubado." },
  dardo: { nome: "Dardo", critico: "O alvo recebe Sangramento (CD de Especialização, Xd6)." },
  espada: { nome: "Espada", critico: "O alvo recebe Sangramento (CD de Especialização, Xd8)." },
  faca: { nome: "Faca", critico: "O alvo recebe Sangramento (CD de Especialização, Xd6)." },
  haste: { nome: "Haste", critico: "O alvo é movido 3 metros em qualquer direção à sua escolha." },
  machado: { nome: "Machado", critico: "Uma criatura adjacente com Defesa menor que o crítico recebe metade do dano rolado." },
  martelo: { nome: "Martelo", critico: "O alvo faz um TR de Fortitude contra sua CD de Especialização ou é derrubado." },
  pugilato: { nome: "Pugilato", critico: "O alvo faz um TR de Fortitude contra sua CD de Especialização ou fica Desorientado por 1 rodada." },
  tiro: { nome: "Tiro", critico: "O alvo faz um TR de Fortitude contra sua CD de Especialização ou fica Lento por 1 rodada." }
};

/**
 * As armas se cruzam em dois eixos independentes (p. 130-134): a tabela em que
 * a arma aparece — Simples ou Complexa — e como ela é manejada. Uma Katana é
 * Complexa e corpo a corpo; um Rifle é Complexo e a distância.
 */
FNM.categoriasArma = ["Simples", "Complexa"];
FNM.tiposArma = ["Corpo a Corpo", "A Distância", "De Arremesso"];

/**
 * Tipos de equipamento. Uniforme, Escudo, Kit de Ferramentas e Item Especial
 * são as quatro famílias do capítulo 5; Encantamento é a melhoria que uma
 * Ferramenta Amaldiçoada recebe ao subir de grau (p. 155-159).
 */
FNM.tiposEquipamento = [
  "Uniforme",
  "Escudo",
  "Kit de Ferramentas",
  "Item Especial",
  "Encantamento",
  "Ferramenta Amaldiçoada",
  "Acessório",
  "Diverso"
];

/** Categorias de Item Especial (p. 144). */
FNM.categoriasItemEspecial = ["Acessório", "Espiritual", "Fármaco", "Mistura", "Talismã"];

/** Graus de ferramentas amaldiçoadas e de feiticeiros/maldições (p. 10-11). */
FNM.graus = ["Grau 4", "Grau 3", "Semi-Grau 2", "Grau 2", "Semi-Grau 1", "Grau 1", "Grau Especial"];

/**
 * Graus de Ferramenta Amaldiçoada (p. 154). Diferente do grau de um feiticeiro,
 * não há semi-graus: são só os cinco degraus das tabelas de benefícios.
 * `bonusArma` entra nas rolagens de dano da arma e `rdEscudo` na RD do escudo —
 * ambos valem só o do próprio grau, sem acumular com os anteriores.
 * `encantamentos` é cumulativo, pois eles se somam a cada grau.
 */
FNM.grausFerramenta = {
  Quarto: { nome: "Quarto Grau", bonusArma: 1, rdEscudo: 1, encantamentos: { arma: 0, escudo: 0, uniforme: 1 } },
  Terceiro: { nome: "Terceiro Grau", bonusArma: 2, rdEscudo: 2, encantamentos: { arma: 1, escudo: 1, uniforme: 2 } },
  Segundo: { nome: "Segundo Grau", bonusArma: 3, rdEscudo: 3, encantamentos: { arma: 2, escudo: 2, uniforme: 3 } },
  Primeiro: { nome: "Primeiro Grau", bonusArma: 4, rdEscudo: 4, encantamentos: { arma: 4, escudo: 3, uniforme: 4 } },
  Especial: { nome: "Grau Especial", bonusArma: 5, rdEscudo: 5, unica: true, encantamentos: { arma: 4, escudo: 3, uniforme: 4 } }
};

/**
 * Inventário e Carregamento (p. 129). O limite é 8 espaços + o dobro do
 * modificador de Força; passar dele deixa o personagem sobrecarregado, e é
 * impossível carregar mais do que o dobro do limite.
 */
FNM.carga = { base: 8, defesaSobrecarga: -5, deslocamentoSobrecarga: -4.5 };

/* -------------------------------------------- */
/*  Efeitos de item                             */
/* -------------------------------------------- */

/**
 * O que um item pode alterar na ficha de quem o possui.
 *
 * O livro descreve os benefícios em prosa ("os anéis aumentam o valor de
 * Sabedoria do usuário em 2"), e é esta tabela que dá a eles um lugar numérico.
 * Cada linha de `system.efeitos` escolhe um `alvo` daqui e, quando o alvo tem
 * `lista`, uma `chave` dentro dela — a perícia, o atributo ou o tipo de dano.
 *
 * `proficiencia` marca os alvos em que o item pode conceder Treinado ou Mestre
 * no lugar de (ou além de) um bônus numérico, como a Pulseira Magistral.
 */
FNM.alvosEfeito = [
  { id: "atributo", nome: "Atributo", lista: "atributos" },
  { id: "pericia", nome: "Perícia", lista: "pericias", proficiencia: true },
  { id: "resistencia", nome: "Teste de Resistência", lista: "resistencias", proficiencia: true },
  { id: "ataque", nome: "Jogada de Ataque", lista: "ataques" },
  { id: "defesa", nome: "Defesa" },
  { id: "reducaoDano", nome: "Redução de Dano", lista: "tiposDano" },
  { id: "pv", nome: "PV máximo" },
  { id: "pe", nome: "PE máximo" },
  { id: "estamina", nome: "Estamina máxima" },
  { id: "deslocamento", nome: "Deslocamento" },
  { id: "iniciativa", nome: "Iniciativa" },
  { id: "atencao", nome: "Atenção" },
  { id: "cdAmaldicoada", nome: "CD Amaldiçoada" },
  { id: "cdEspecializacao", nome: "CD de Especialização" },
  { id: "cdTecnica", nome: "CD de Técnica" }
];

/** Um atributo pode passar do limite normal por item, até 30 (p. 147-148). */
FNM.maximoAtributoPorItem = 30;

/* -------------------------------------------- */
/*  Grimório das Maldições (Versão 1)           */
/* -------------------------------------------- */

/**
 * As tabelas do Guia de Criação de Inimigos. As páginas citadas daqui até o fim
 * desta seção são as do **Grimório das Maldições (Versão 1, F&M 2.5)**, não as
 * do Livro de Regras — é outro PDF, com outra paginação.
 *
 * O Grimório não traz fichas prontas: ele traz o guia para montá-las. O que o
 * sistema faz com estas tabelas é mostrar, na ficha de NPC, o orçamento de
 * criação do Patamar escolhido — do mesmo jeito que a ficha de Invocação já
 * mostra o orçamento do Grau.
 */

/**
 * "Todos os atributos começam no 10" (p. 16). O orçamento de atributos de um
 * Patamar conta os pontos gastos acima dessa base — e um atributo pode ser
 * baixado até 8 para devolver pontos aos outros.
 */
FNM.atributoBaseInimigo = 10;

/** Categorias das Aptidões para Inimigos, os "Dotes Amaldiçoados" (p. 20, 64-71). */
FNM.categoriasDoteAmaldicoado = [
  "Aura",
  "Controle e Leitura",
  "Domínio",
  "Barreira",
  "Especial",
  "Anatomia"
];

/** Características para Inimigos, divididas em Gerais e Especiais (p. 72-76). */
FNM.categoriasCaracteristica = ["Geral", "Especial"];

/** Como um inimigo existe no mundo; cada origem concede traços próprios (p. 9-15). */
FNM.origensInimigo = [
  "Espírito Amaldiçoado",
  "Feiticeiro",
  "Caçador",
  "Não-Feiticeiro",
  "Restrito Celeste",
  "Corpo Amaldiçoado",
  "Outro"
];

/** Tipos de Espírito Amaldiçoado (p. 9-10). */
FNM.tiposEspirito = [
  "Comum",
  "De Medo",
  "Vingativo",
  "Vingativo Imaginário",
  "Enfermo"
];

/**
 * Patamares (p. 8, 16 e 22).
 *
 * `jogadores` é a quantidade recomendada para enfrentar o inimigo: menos
 * jogadores que isso sobem a dificuldade em um passo, mais jogadores a descem.
 *
 * `atributos` é o total de pontos a distribuir, e `limiteAtributo` o teto de
 * cada atributo individualmente (p. 16). `nd` é o Nível de Desafio e `bt` o
 * Bônus de Treinamento.
 *
 * `imunidades`, `resistencias` e `vulnerabilidades` são os tetos da tabela da
 * p. 22 — e o livro pede uma vulnerabilidade condizente para cada imunidade
 * recebida. `imunidadesCondicao` é o teto da tabela seguinte, distribuído pela
 * métrica Extrema = 1, Forte = 2, Média e Fraca = quantas quiser.
 */
FNM.patamares = [
  {
    id: "lacaio",
    acoes: "1 Ação Comum, 1 Ação Bônus, 1 Ação de Movimento e 1 Reação",
    caracteristicas: 1,
    nome: "Lacaio",
    dificuldade: "Muito Fácil",
    jogadores: 1,
    limiteAtributo: 20,
    atributos: (nd) => 20 + nd,
    formulaAtributos: "20 + ND",
    imunidades: 0,
    resistencias: 0,
    vulnerabilidades: 0,
    imunidadesCondicao: 0
  },
  {
    id: "capanga",
    acoes: "1 Ação Comum, 1 Ação Bônus, 1 Ação de Movimento e 1 Reação",
    caracteristicas: 2,
    nome: "Capanga",
    dificuldade: "Fácil",
    jogadores: 1,
    limiteAtributo: 24,
    atributos: (nd) => 20 + nd,
    formulaAtributos: "20 + ND",
    imunidades: 0,
    resistencias: 0,
    vulnerabilidades: 0,
    imunidadesCondicao: 0
  },
  {
    id: "comum",
    acoes: "1 Ação Comum + 1 a cada 5 níveis, 1 Ação Rápida + 1 a cada 10 níveis, 1 Ação Bônus, 1 Ação de Movimento e 1 Reação",
    caracteristicas: 3,
    nome: "Comum",
    dificuldade: "Média",
    jogadores: 2,
    limiteAtributo: 26,
    atributos: (nd, bt) => 20 + nd + bt,
    formulaAtributos: "20 + ND + Treinamento",
    imunidades: 1,
    resistencias: 2,
    vulnerabilidades: 1,
    imunidadesCondicao: 5
  },
  {
    id: "desafio",
    acoes: "2 Ações Comuns + 1 a cada 8 níveis, 1 Ação Rápida + 1 a cada 8 níveis, 1 Ação Bônus, 1 Ação de Movimento e 1 Reação",
    caracteristicas: 4,
    nome: "Desafio",
    dificuldade: "Difícil",
    jogadores: 4,
    limiteAtributo: 30,
    atributos: (nd, bt) => 25 + 2 * nd + 2 * bt,
    formulaAtributos: "25 + (2 × ND) + (Treinamento × 2)",
    imunidades: 3,
    resistencias: 3,
    vulnerabilidades: 3,
    imunidadesCondicao: 6
  },
  {
    id: "calamidade",
    acoes: "3 Ações Comuns + 1 a cada 10 níveis, 1 Ação Rápida + 1 a cada 10 níveis, 1 Ação Bônus, 1 Ação de Movimento e 1 Reação",
    caracteristicas: 5,
    nome: "Calamidade",
    dificuldade: "Experiente",
    jogadores: 6,
    limiteAtributo: 32,
    atributos: (nd, bt) => 25 + 2 * nd + 2 * bt,
    formulaAtributos: "25 + (2 × ND) + (Treinamento × 2)",
    imunidades: 6,
    resistencias: 4,
    vulnerabilidades: 6,
    imunidadesCondicao: 7
  }
];

/**
 * Tamanho de criatura (p. 17-18). `espaco` é o espaço ocupado e o alcance
 * corpo a corpo, em metros; `manobra` e `furtividade` são os bônus e ônus que
 * o tamanho aplica; `deslocamento` é o valor padrão da tabela da p. 18.
 */
FNM.tamanhosCriatura = {
  "Minúsculo": { espaco: 1.5, manobra: -5, furtividade: 5, deslocamento: 9, exemplo: "Mosca" },
  "Pequeno": { espaco: 1.5, manobra: -2, furtividade: 2, deslocamento: 9, exemplo: "Cachorro" },
  "Médio": { espaco: 1.5, manobra: 0, furtividade: 0, deslocamento: 9, exemplo: "Humano" },
  "Grande": { espaco: 3, manobra: 2, furtividade: -2, deslocamento: 12, exemplo: "Mahoraga" },
  "Enorme": { espaco: 4.5, manobra: 5, furtividade: -5, deslocamento: 13.5, exemplo: "Ganesha" },
  "Colossal": { espaco: 9, manobra: 10, furtividade: -10, deslocamento: 18, exemplo: "Dragão Arco-Íris" }
};

/**
 * As três colunas de dificuldade das tabelas de criação (p. 16). Elas mudam a
 * força dos valores usados na ficha, não as regras.
 */
FNM.tabelasCriacao = [
  { id: "iniciante", nome: "Iniciante" },
  { id: "intermediaria", nome: "Intermediária" },
  { id: "experiente", nome: "Experiente" }
];

/* -------------------------------------------- */
/*  Votos de Restrição (p. 351-357)             */
/* -------------------------------------------- */

FNM.pesosVoto = ["Leve", "Médio", "Pesado", "Extremo", "Emergencial", "Contratual", "Restrição Congênita"];

/* -------------------------------------------- */
/*  Invocações (p. 255-272)                     */
/* -------------------------------------------- */

FNM.tiposInvocacao = ["Shikigami", "Corpo Amaldiçoado", "Marionete", "Maldição Domada", "Outro"];

/** Tamanhos, do menor para o maior, como a tabela de Características os usa (p. 272). */
FNM.tamanhos = ["Minúsculo", "Pequeno", "Médio", "Grande", "Enorme", "Colossal"];

/** Uma Invocação começa com todos os atributos em 8 e pode baixá-los até 6 (p. 260). */
FNM.invocacao = { atributoInicial: 8, atributoMinimo: 6, deslocamentoPadrao: 9 };

/**
 * Tudo que o Grau de uma Invocação define (p. 258-272). O grau é o único botão
 * da criação: ele dita o custo em PE, quantos pontos de atributo distribuir, as
 * fórmulas de Vida e Defesa, quantas Ações e Características cabem na ficha e
 * os valores que cada uma delas pode conceder.
 *
 * `pv` é `base + con x Valor de Constituição + nivel x nível do usuário` — e é o
 * VALOR do atributo, não o modificador (p. 261). `defesa` é a base, somada ao
 * modificador de Destreza da Invocação e ao Bônus de Treinamento do usuário.
 */
FNM.grausInvocacao = {
  Quarto: {
    nome: "Quarto Grau",
    custo: 2,
    pontosAtributo: 10,
    maximoAtributo: 16,
    pv: { base: 10, con: 0.5, nivel: 1 },
    defesa: 10,
    periciasExtras: 1,
    acoes: 2,
    acoesComCusto: 1,
    alcance: 6,
    area: 0,
    dano: { ataque: "1d12", resistencia: "1d8", multiplos: "", area: "" },
    cura: { unico: "1d4", multiplos: "" },
    auxilio: { defesa: 1, acerto: 1, danoAdicional: "1d6", reducaoDano: 2 },
    caracteristica: { vida: 5, bonusTeste: 2, reducaoDano: 2, tamanhoMin: "Médio", tamanhoMax: "Grande" }
  },
  Terceiro: {
    nome: "Terceiro Grau",
    custo: 4,
    pontosAtributo: 15,
    maximoAtributo: 20,
    pv: { base: 25, con: 0.5, nivel: 1 },
    defesa: 12,
    periciasExtras: 1,
    acoes: 2,
    acoesComCusto: 1,
    alcance: 9,
    area: 3,
    dano: { ataque: "1d12 + 1d6", resistencia: "1d12", multiplos: "1d10", area: "1d8" },
    cura: { unico: "1d8", multiplos: "1d4" },
    auxilio: { defesa: 2, acerto: 2, danoAdicional: "1d10", reducaoDano: 4 },
    caracteristica: { vida: 10, bonusTeste: 4, reducaoDano: 4, tamanhoMin: "Médio", tamanhoMax: "Grande" }
  },
  Segundo: {
    nome: "Segundo Grau",
    custo: 6,
    pontosAtributo: 20,
    maximoAtributo: 24,
    pv: { base: 40, con: 1, nivel: 1 },
    defesa: 16,
    periciasExtras: 2,
    acoes: 3,
    acoesComCusto: 2,
    alcance: 15,
    area: 4.5,
    dano: { ataque: "2d12", resistencia: "1d12 + 1d6", multiplos: "1d12", area: "1d10" },
    cura: { unico: "1d12", multiplos: "1d6" },
    auxilio: { defesa: 3, acerto: 3, danoAdicional: "2d6", reducaoDano: 6 },
    caracteristica: { vida: 15, bonusTeste: 6, reducaoDano: 6, tamanhoMin: "Pequeno", tamanhoMax: "Enorme" }
  },
  Primeiro: {
    nome: "Primeiro Grau",
    custo: 8,
    pontosAtributo: 30,
    maximoAtributo: 26,
    pv: { base: 60, con: 1, nivel: 1.5 },
    defesa: 20,
    periciasExtras: 2,
    acoes: 3,
    acoesComCusto: 2,
    alcance: 21,
    area: 6,
    dano: { ataque: "2d12 + 1d6", resistencia: "2d12", multiplos: "1d12 + 1d6", area: "1d12" },
    cura: { unico: "1d12 + 1d8", multiplos: "1d8" },
    auxilio: { defesa: 4, acerto: 4, danoAdicional: "2d8", reducaoDano: 8 },
    caracteristica: { vida: 20, bonusTeste: 8, reducaoDano: 8, tamanhoMin: "Pequeno", tamanhoMax: "Enorme" }
  },
  Especial: {
    nome: "Grau Especial",
    custo: 12,
    pontosAtributo: 40,
    maximoAtributo: 30,
    pv: { base: 80, con: 1, nivel: 2 },
    defesa: 24,
    periciasExtras: 3,
    acoes: 4,
    acoesComCusto: 3,
    alcance: 30,
    area: 7.5,
    // No Grau Especial o bônus de dano e de cura é o dobro do modificador
    dobraModificador: true,
    dano: { ataque: "3d12", resistencia: "2d12 + 1d6", multiplos: "2d12", area: "1d12 + 1d8" },
    cura: { unico: "2d12 + 1d6", multiplos: "1d12 + 1d4" },
    auxilio: { defesa: 5, acerto: 5, danoAdicional: "2d12", reducaoDano: 10 },
    caracteristica: { vida: 30, bonusTeste: 10, reducaoDano: 12, tamanhoMin: "Minúsculo", tamanhoMax: "Colossal" }
  }
};

/** Nível de Controlador exigido para receber uma Invocação de cada grau (p. 259). */
FNM.nivelParaGrauInvocacao = { Quarto: 1, Terceiro: 5, Segundo: 9, Primeiro: 13, Especial: 17 };

/**
 * O que uma Ação ou Característica pode ser (p. 262-263). Ações Simples são a
 * ação bônus da Invocação e não podem causar dano nem curar; as de Ataque são
 * obrigatoriamente Complexas.
 */
FNM.tiposAcaoInvocacao = ["Ação Simples", "Ação Complexa", "Reação", "Característica"];

/** Custo em PE que cada Ação ou Característica acrescenta à Invocação (p. 262). */
FNM.custoAcaoInvocacao = {
  "Ação Simples": 1,
  "Ação Complexa": 2,
  Reação: 1,
  Característica: 1
};


/* -------------------------------------------- */
/*  Funções auxiliares de regra                 */
/* -------------------------------------------- */

/** Modificador de atributo: +1 para cada 2 acima de 10 (p. 19 / 277). */
export function modificador(valor) {
  return Math.floor((Number(valor) - 10) / 2);
}

/** Bônus de Treinamento: +2, subindo +1 nos níveis 5, 9, 13 e 17 (p. 282). */
export function bonusTreinamento(nivel) {
  return 2 + Math.floor((Math.max(1, Number(nivel)) - 1) / 4);
}

/**
 * Bônus de Treinamento de um inimigo, pelo Nível de Desafio (Grimório, p. 8).
 *
 * A progressão é a mesma do personagem, mas a tabela do Grimório para em
 * "17 ou superior — +6": ela não tem o degrau que `bonusTreinamento` daria a
 * partir do 21, então aqui o valor satura em +6.
 */
export function bonusTreinamentoND(nd) {
  return Math.min(6, bonusTreinamento(nd));
}

/** O Patamar de inimigo pelo id, com o Lacaio como padrão (Grimório, p. 8). */
export function patamarInimigo(id) {
  return FNM.patamares.find(p => p.id === id) ?? FNM.patamares[0];
}

/** Metade do nível de personagem, somada em quase todos os testes (p. 278). */
export function metadeNivel(nivel) {
  return Math.floor(Math.max(1, Number(nivel)) / 2);
}

/**
 * Bônus de proficiência aplicado a uma perícia/resistência.
 * Treinado soma o Bônus de Treinamento; Mestre soma 1,5x dele (p. 278).
 */
export function bonusProficiencia(nivel, { treinado = false, mestre = false } = {}) {
  const bt = bonusTreinamento(nivel);
  if (mestre) return bt + Math.floor(bt / 2);
  if (treinado) return bt;
  return 0;
}

/** Níveis de Feitiço acessíveis em um dado nível de personagem (p. 199). */
export function feiticosAcessiveis(nivel) {
  const faixa = FNM.acessoFeitico.find(f => nivel <= f.ate) ?? FNM.acessoFeitico.at(-1);
  return faixa.niveis;
}

/** Níveis de Técnica Marcial acessíveis em um dado nível de Restringido (p. 124). */
export function tecnicasMarciaisAcessiveis(nivel) {
  const faixa = FNM.acessoTecnicaMarcial.find(f => nivel <= f.ate) ?? FNM.acessoTecnicaMarcial.at(-1);
  return faixa.niveis;
}

/**
 * Quantas Técnicas Marciais o Restringido conhece: 2 no primeiro nível, mais
 * uma em cada nível ímpar de 3 a 19 (p. 124).
 */
export function tecnicasMarciaisConhecidas(nivel) {
  return 2 + FNM.niveisGanhoTecnicaMarcial.filter(n => nivel >= n).length;
}

/** Dádivas do Céu recebidas: uma a cada 4 níveis (p. 114). */
export function dadivasRecebidas(nivel) {
  return Math.floor(nivel / 4);
}

/**
 * O Arsenal Amaldiçoado em vigor (p. 125). A tabela é indexada pelo Bônus de
 * Treinamento, que satura em +6.
 */
export function arsenalDoRestringido(nivel) {
  const bt = Math.min(6, bonusTreinamento(nivel));
  return { bt, ...FNM.arsenalAmaldicoado[bt] };
}

/** Estado da Alma a partir da Integridade atual e máxima (p. 312). */
export function estadoDaAlma(valor, max) {
  if (!max) return FNM.estadosAlma[0];
  if (valor <= 0) return { id: "destruida", nome: "Destruída", penalidade: 0, custoExtra: 0, condicoes: [] };
  const razao = valor / max;
  // A tabela é decrescente: procura o primeiro estado cuja faixa a razão alcança.
  return FNM.estadosAlma.find(e => razao >= e.minimo) ?? FNM.estadosAlma.at(-1);
}

/** Dano desarmado básico por nível (p. 305): 1d4, subindo em 5, 9, 13 e 17. */
export function danoDesarmado(nivel) {
  if (nivel >= 17) return "1d12";
  if (nivel >= 13) return "1d10";
  if (nivel >= 9) return "1d8";
  if (nivel >= 5) return "1d6";
  return "1d4";
}

/**
 * Dano desarmado do Lutador (p. 49). O livro diz "1d8; nos níveis 5, 9, 13 e 17
 * aumenta para 1d10, 1d12, e 2d12" — quatro níveis para três valores, então o
 * degrau do nível 13 é ambíguo no texto original. Mantemos 1d12 também no 13
 * (a leitura conservadora) até que o erro seja esclarecido pelos autores.
 */
export function danoDesarmadoLutador(nivel) {
  if (nivel >= 17) return "2d12";
  if (nivel >= 9) return "1d12";
  if (nivel >= 5) return "1d10";
  return "1d8";
}
