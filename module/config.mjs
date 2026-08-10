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

/** Tempo de conjuração — as ações que um Feitiço pode consumir (p. 300-304). */
FNM.conjuracoes = ["Ação Comum", "Ação Bônus", "Reação", "Ação Completa", "Ação Livre", "Ação de Movimento"];

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

FNM.condicoes = [
  // Físicas
  { id: "condenado", nome: "Condenado", grupo: "Física", nivel: "Média", icone: "icons/svg/skull.svg", efeito: "O custo em PE de todas as suas habilidades aumenta em 1." },
  { id: "engasgando", nome: "Engasgando", grupo: "Física", nivel: "Média", icone: "icons/svg/silenced.svg", efeito: "Fica mudo e precisa segurar o ar." },
  { id: "enjoado", nome: "Enjoado", grupo: "Física", nivel: "Média", icone: "icons/svg/acid.svg", efeito: "Não pode converter ações dentro da Hierarquia de Ações." },
  { id: "envenenado", nome: "Envenenado", grupo: "Física", nivel: "Média", icone: "icons/svg/poison.svg", efeito: "-2 em jogadas de ataque, testes de resistência e testes de perícia." },
  { id: "sangramento", nome: "Sangramento", grupo: "Física", nivel: "Variável", icone: "icons/svg/blood.svg", efeito: "Perda de vida no início do turno; TR de Fortitude no fim do turno encerra a condição em um sucesso." },
  { id: "sofrendo", nome: "Sofrendo", grupo: "Física", nivel: "Leve", icone: "icons/svg/degen.svg", efeito: "-5 em testes de concentração e de Prestidigitação para rituais; perde 3 metros de movimento." },
  // Incapacitação
  { id: "atordoado", nome: "Atordoado", grupo: "Incapacitação", nivel: "Extrema", icone: "icons/svg/daze.svg", efeito: "Fica desprevenido e não pode realizar ações ou reações." },
  { id: "inconsciente", nome: "Inconsciente", grupo: "Incapacitação", nivel: "Extrema", icone: "icons/svg/unconscious.svg", efeito: "Não age nem reage, fica caído, larga o que segura. Falha automaticamente em TR de Reflexos; todo ataque contra ela acerta e é crítico." },
  { id: "paralisado", nome: "Paralisado", grupo: "Incapacitação", nivel: "Extrema", icone: "icons/svg/paralysis.svg", efeito: "Só age mentalmente. -10 de Defesa, falha automaticamente em TR de Reflexos e todo ataque corpo a corpo que acerte é crítico." },
  { id: "indefeso", nome: "Indefeso", grupo: "Incapacitação", nivel: "Especial", icone: "icons/svg/net.svg", efeito: "Fica Imóvel e Atordoado. Pode ser morta ou receber um Ferimento Complexo com uma ação completa em alcance de toque." },
  // Mentais
  { id: "abalado", nome: "Abalado", grupo: "Mental", nivel: "Fraca", icone: "icons/svg/terror.svg", efeito: "-1 em jogadas de ataque e testes de perícia." },
  { id: "amedrontado", nome: "Amedrontado", grupo: "Mental", nivel: "Média", icone: "icons/svg/terror.svg", efeito: "-3 em jogadas de ataque e testes de perícia (evolução de Abalado; não acumulam)." },
  { id: "aterrorizado", nome: "Aterrorizado", grupo: "Mental", nivel: "Forte", icone: "icons/svg/terror.svg", efeito: "Não pode se aproximar voluntariamente da criatura que infligiu a condição." },
  { id: "confuso", nome: "Confuso", grupo: "Mental", nivel: "Média", icone: "icons/svg/stoned.svg", efeito: "Comporta-se aleatoriamente. -4 em Fortitude e Atletismo para se manter de pé; move-se em direção aleatória a cada 1,5 m." },
  { id: "enfeiticado", nome: "Enfeitiçado", grupo: "Mental", nivel: "Média", icone: "icons/svg/eye.svg", efeito: "-2 em todos os testes contra quem a enfeitiçou." },
  // Movimento
  { id: "agarrado", nome: "Agarrado", grupo: "Movimento", nivel: "Média", icone: "icons/svg/net.svg", efeito: "Fica Desprevenido e Imóvel. Ataques a distância contra o agarrão têm 50% de chance de acertar o alvo errado." },
  { id: "caido", nome: "Caído", grupo: "Movimento", nivel: "Fraca", icone: "icons/svg/falling.svg", efeito: "-3 em ataques corpo a corpo, move-se só 4,5 m rastejando. -3 de Defesa contra corpo a corpo e +3 contra ataques a distância." },
  { id: "enredado", nome: "Enredado", grupo: "Movimento", nivel: "Média", icone: "icons/svg/net.svg", efeito: "Deslocamento reduzido à metade; -2 na Defesa e em rolagens de ataque." },
  { id: "imovel", nome: "Imóvel", grupo: "Movimento", nivel: "Forte", icone: "icons/svg/paralysis.svg", efeito: "Não pode usar Andar, Esgueirar, Levantar nem Pular, e não pode receber Deslocamento de nenhuma fonte." },
  { id: "lento", nome: "Lento", grupo: "Movimento", nivel: "Média", icone: "icons/svg/downgrade.svg", efeito: "Toda forma de movimento é reduzida pela metade." },
  // Sensoriais
  { id: "cego", nome: "Cego", grupo: "Sensorial", nivel: "Forte", icone: "icons/svg/blind.svg", efeito: "Fica Surpreso e Lento, falha em testes de visão e sofre -5 em Percepção. Seus alvos recebem Camuflagem Total." },
  { id: "desorientado", nome: "Desorientado", grupo: "Sensorial", nivel: "Fraca", icone: "icons/svg/daze.svg", efeito: "Não pode usar reações contra a próxima ação ofensiva contra você nem ataques de oportunidade." },
  { id: "desprevenido", nome: "Desprevenido", grupo: "Sensorial", nivel: "Fraca", icone: "icons/svg/downgrade.svg", efeito: "-3 na Defesa e em Testes de Resistência de Reflexos." },
  { id: "invisivel", nome: "Invisível", grupo: "Sensorial", nivel: "Especial", icone: "icons/svg/invisible.svg", efeito: "Não pode ser visto, +10 em Furtividade e pode usar Esconder como Ação Livre." },
  { id: "surdo", nome: "Surdo", grupo: "Sensorial", nivel: "Média", icone: "icons/svg/deaf.svg", efeito: "Falha em testes de audição e sofre -5 em Iniciativa (também no valor atual, se já em combate)." },
  { id: "surpreso", nome: "Surpreso", grupo: "Sensorial", nivel: "Especial", icone: "icons/svg/eye.svg", efeito: "Fica Desprevenido e não pode reagir contra a criatura que o surpreendeu." },
  // Vulnerabilidade
  { id: "exposto", nome: "Exposto", grupo: "Vulnerabilidade", nivel: "Forte", icone: "icons/svg/target.svg", efeito: "Ataques contra a criatura recebem +4 e causam dano adicional igual ao nível do atacante." },
  { id: "fragilizado", nome: "Fragilizado", grupo: "Vulnerabilidade", nivel: "Forte", icone: "icons/svg/degen.svg", efeito: "Redução de Dano zerada e resistências anuladas (imunidades permanecem)." }
];

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
/*  Votos de Restrição (p. 351-357)             */
/* -------------------------------------------- */

FNM.pesosVoto = ["Leve", "Médio", "Pesado", "Extremo", "Emergencial", "Contratual", "Restrição Congênita"];

/* -------------------------------------------- */
/*  Invocações (p. 256-263)                     */
/* -------------------------------------------- */

FNM.tiposInvocacao = ["Shikigami", "Corpo Amaldiçoado", "Marionete", "Outro"];

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
