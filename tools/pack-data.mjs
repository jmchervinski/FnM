/**
 * Conteúdo dos compêndios de Feiticeiros & Maldições (não-oficial).
 *
 * Todo o texto é transcrito do Livro de Regras v2.5.2 e serve como referência
 * de jogo dentro do Foundry. Os compêndios são uma SEMENTE, não o livro
 * inteiro: veja o README para o que já está incluído e o que falta.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { FNM, linhaDeEfeito } from "../module/config.mjs";

/**
 * Habilidades de Especialização, transcritas do capítulo 4 do Livro de Regras
 * v2.5.2 por tools/extrai-habilidades.py. Cada entrada traz o nível em que a
 * habilidade fica disponível e se ela é uma Habilidade Base (recebida
 * automaticamente) ou uma habilidade escolhida da lista da especialização.
 */
const HABILIDADES_ESPEC = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "dados/habilidades-especializacao.json"),
    "utf8"
  )
);

/**
 * Talentos do capítulo 7, transcritos por tools/extrai-talentos.py. Talentos
 * podem ser obtidos no lugar de uma habilidade de especialização, ou vir de
 * origens e treinamentos (p. 163). Os de categoria "Origem" só estão
 * disponíveis para a origem indicada no pré-requisito.
 */
const TALENTOS = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "dados/talentos.json"), "utf8")
);

/**
 * Aptidões Amaldiçoadas do capítulo 8, transcritas por tools/extrai-aptidoes.py.
 * Um personagem recebe uma aptidão por nível, exceto Restringidos (p. 172).
 */
const APTIDOES = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "dados/aptidoes.json"), "utf8")
);

/**
 * Itens Especiais, Kits de Ferramentas, Encantamentos e as propriedades de arma
 * dos capítulos 5 e 6, transcritos por tools/extrai-equipamentos.py. As tabelas
 * desses capítulos (armas, uniformes e escudos) não saem de lá: estão
 * transcritas à mão mais abaixo.
 */
const EQUIPAMENTOS = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "dados/equipamentos.json"), "utf8")
);

/**
 * A Galeria do **Grimório das Maldições (Versão 1)**, transcrita por
 * tools/extrai-grimorio.py. É outro PDF, com outra paginação: as páginas
 * citadas nos itens do Grimório são as dele, não as do Livro de Regras.
 *
 * São três listas: os Dotes Amaldiçoados (as "Aptidões para Inimigos" da
 * p. 64-71), as Características de p. 72-76 e os Dotes Gerais de p. 77-80.
 */
const GRIMORIO = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "dados/grimorio.json"), "utf8")
);

/**
 * IDs determinísticos derivados do nome: o mesmo item mantém o mesmo _id entre
 * builds, o que preserva os links de compêndio já usados nos mundos.
 */
const ALFABETO = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function id(chave) {
  const hash = crypto.createHash("sha256").update(chave).digest();
  let out = "";
  for (let i = 0; i < 16; i++) out += ALFABETO[hash[i] % ALFABETO.length];
  return out;
}

/** Ajustes zerados — o formato que todo item do sistema espera. */
const semAjustes = { pv: 0, pe: 0, defesa: 0, deslocamento: 0, reducaoDano: 0 };

/** Campos comuns a todo equipamento; cada família sobrescreve o que lhe importa. */
/**
 * Os efeitos que o livro dá a um item, completados com os campos que o schema
 * espera. A curadoria mora em FNM.efeitosPorItem, para o compêndio e o reparo
 * de mundos antigos lerem exatamente a mesma tabela.
 */
const efeitos = nome => (FNM.efeitosPorItem[nome] ?? []).map(linhaDeEfeito);

const equipamentoBase = () => ({
  categoria: "",
  grau: "",
  encantamentos: "",
  espacos: 1,
  custo: 1,
  quantidade: 1,
  equipado: false,
  defesa: 0,
  reducaoDano: 0,
  penalidade: 0,
  dano: "",
  alvo: "",
  prerequisito: "",
  acao: "",
  consumivel: false,
  usos: { value: 0, max: 0 },
  peso: 0,
  preco: "",
  ajustes: { ...semAjustes },
  efeitos: []
});

const ALVOS_ENCANTAMENTO = ["Arma", "Escudo", "Uniforme"];

/** Um ícone por categoria de Item Especial (p. 144). */
const ICONE_ITEM = {
  Acessório: "icons/svg/aura.svg",
  Espiritual: "icons/svg/sun.svg",
  Fármaco: "icons/svg/pill.svg",
  Mistura: "icons/svg/poison.svg",
  Talismã: "icons/svg/hanging-sign.svg"
};

/**
 * O traço "especial" de uma arma é descrito em Propriedades Especiais
 * (p. 136-137), longe da tabela. Aqui ele volta para junto da arma.
 */
function propriedadeEspecial(nome) {
  const texto = EQUIPAMENTOS.propriedadesEspeciais[nome];
  return texto ? `<p><b>Especial.</b> ${texto}</p>` : "";
}

/* -------------------------------------------- */
/*  Origens                                     */
/* -------------------------------------------- */

const ORIGENS = [
  {
    nome: "Inato",
    origem: "inato",
    bonus: "+2 em um atributo e +1 em outro",
    texto: `<p>Nasceu com a afinidade para usar energia amaldiçoada e com uma técnica própria,
      que costuma se manifestar aos cinco ou seis anos. Por ser única no mundo, sua técnica é
      imprevisível e tem potencial para se inovar cada vez mais.</p>
      <h3>Características de Origem</h3>
      <p><b>Bônus em Atributo.</b> Aumenta o valor de um atributo em 2 pontos e o de outro em 1.</p>
      <p><b>Talento Natural.</b> Você recebe um Talento à sua escolha no 1° nível. Além disso, uma
      única vez a partir do 4° nível, pode escolher receber um talento adicional ao subir de nível.</p>
      <p><b>Marca Registrada.</b> Você recebe um Feitiço adicional, cujo custo é reduzido em 1 PE.</p>`
  },
  {
    nome: "Herdado",
    origem: "herdado",
    bonus: "Definido pelo clã escolhido",
    texto: `<p>Feiticeiros cuja capacidade e técnica vêm da linhagem sanguínea, formando os
      herdeiros dos clãs. As técnicas passadas adiante costumam ser poderosas e vêm com um
      "manual de uso", facilitando o aprendizado — mas outros grupos também podem conhecer
      suas fraquezas.</p>
      <h3>Características de Origem</h3>
      <p><b>Bônus em Atributo.</b> Aumentos definidos pelo clã escolhido.</p>
      <p><b>Treinamentos de Clã.</b> Cada clã concede treinamento ou maestria em perícias específicas.</p>
      <p><b>Herança de Clã.</b> Técnicas e capacidades herdadas da linhagem, conforme o clã.</p>
      <p>Ao escolher ser um Herdado, escolha também seu clã: Gojo, Inumaki, Kamo ou Zenin.</p>`
  },
  {
    nome: "Derivado",
    origem: "derivado",
    bonus: "Consulte o livro (p. 32)",
    texto: `<p>Origem rara: a fonte de poder foi adquirida, e não herdada nem inata. Um exemplo é o
      personagem que era Sem Técnica e consumiu um objeto amaldiçoado, tornando-se um Derivado.</p>
      <p><i>Transcrição resumida — consulte o Livro de Regras v2.5.2, p. 32, para as características
      completas desta origem.</i></p>`
  },
  {
    nome: "Restringido",
    origem: "restringido",
    bonus: "Consulte o livro (p. 33)",
    texto: `<p>Não possuem energia amaldiçoada. Em troca, os céus concedem um físico anormal e um
      desenvolvimento físico absurdo. Precisam dominar artes marciais, armas e aproveitar ao máximo
      o corpo especial que possuem.</p>
      <p>Esta origem está vinculada diretamente à Especialização Restringido, que só pode ser
      acessada por quem tem esta origem. Restringidos não podem realizar Multiclasse.</p>
      <p><i>Transcrição resumida — consulte o Livro de Regras v2.5.2, p. 33.</i></p>`
  },
  {
    nome: "Feto Amaldiçoado Híbrido",
    origem: "fetoHibrido",
    bonus: "Consulte o livro (p. 34)",
    texto: `<p>Origem rara, resultado do cruzamento entre humano e maldição.</p>
      <p><i>Transcrição resumida — consulte o Livro de Regras v2.5.2, p. 34.</i></p>`
  },
  {
    nome: "Sem Técnica",
    origem: "semTecnica",
    bonus: "Consulte o livro (p. 37)",
    texto: `<p>Feiticeiros que nasceram sem uma técnica amaldiçoada, mas que ainda manipulam energia
      amaldiçoada e se apoiam em ferramentas amaldiçoadas e no domínio bruto da energia.</p>
      <p><i>Transcrição resumida — consulte o Livro de Regras v2.5.2, p. 37.</i></p>`
  },
  {
    nome: "Corpo Amaldiçoado Mutante",
    origem: "corpoMutante",
    bonus: "Consulte o livro (p. 39)",
    texto: `<p>Corpo amaldiçoado artificial capaz de produzir sua própria energia amaldiçoada e ser
      completamente senciente, através de uma mutação complexa. O exemplo canônico é o Panda,
      criado por Masamichi Yaga.</p>
      <p><i>Transcrição resumida — consulte o Livro de Regras v2.5.2, p. 39.</i></p>`
  }
];

const CLAES = [
  {
    nome: "Clã Gojo",
    cla: "gojo",
    bonus: "+2 em Inteligência ou Sabedoria, +1 no outro",
    texto: `<p>Descende do lendário feiticeiro Michizane Sugawara e tem como técnicas herdadas o
      Ilimitado e os Seis Olhos.</p>
      <h3>Características de Clã</h3>
      <p><b>Bônus em Atributo.</b> Aumenta em 2 a Inteligência ou Sabedoria, e em 1 o que não foi escolhido.</p>
      <p><b>Treinamentos de Clã.</b> Torna-se treinado em 2 perícias entre Feitiçaria, Percepção e
      Intuição. Em vez de duas perícias, pode se tornar especialista em uma.</p>
      <p><b>Potencial Lendário.</b> Em todo nível par você recebe 1 ponto de energia amaldiçoada
      adicional. Recebe também 1 Feitiço adicional no primeiro nível e mais um nos níveis 5, 10, 15 e 20.</p>`
  },
  {
    nome: "Clã Inumaki",
    cla: "inumaki",
    bonus: "+2 em Inteligência ou Presença, +1 no outro",
    texto: `<p>Uma das famílias menores, mas cuja técnica amaldiçoada — Fala Amaldiçoada — é bem
      respeitada. Possuem um sigilo característico: os emblemas ao redor da boca.</p>
      <h3>Características de Clã</h3>
      <p><b>Bônus em Atributo.</b> Aumenta em 2 a Inteligência ou Presença, e em 1 o que não foi escolhido.</p>
      <p><b>Treinamentos de Clã.</b> Torna-se treinado em 2 perícias entre Feitiçaria, Percepção e
      Intuição. Em vez de duas perícias, pode se tornar especialista em uma.</p>
      <p><b>Olhos de Cobra e Presas.</b> Uma quantidade de vezes igual ao seu bônus de treinamento,
      você pode dar o comando de uma ação bônus para um aliado, que pode realizá-la como uma reação.
      Recupera os usos após um descanso longo.</p>`
  },
  {
    nome: "Clã Kamo",
    cla: "kamo",
    bonus: "+2 em Constituição ou Sabedoria, +1 no outro",
    texto: `<p>Valoriza grandemente os laços de sangue. Sua técnica herdada é a Manipulação de Sangue.</p>
      <h3>Características de Clã</h3>
      <p><b>Bônus em Atributo.</b> Aumenta em 2 a Constituição ou Sabedoria, e em 1 o que não foi escolhido.</p>
      <p><b>Treinamentos de Clã.</b> Torna-se treinado em 2 perícias entre Atletismo, Medicina e
      Persuasão. Em vez de duas perícias, pode se tornar especialista em uma.</p>
      <p><b>Valor do Sangue.</b> Sempre que subir de nível, sua vida máxima aumenta em 1 ponto
      adicional. A partir do nível 10, você soma o seu modificador de Constituição ao seu total de vida.
      Ao rolar para aumentar a vida máxima, se o valor obtido for menor que a média, pode rolar
      novamente e ficar com o maior valor.</p>`
  },
  {
    nome: "Clã Zenin",
    cla: "zenin",
    bonus: "+2 em um atributo e +1 em outro",
    texto: `<p>Incorpora os valores nobres de um clã maior, acreditando que técnicas amaldiçoadas
      poderosas são mais importantes do que tudo. Possuem várias técnicas herdadas, com grande
      variedade.</p>
      <h3>Características de Clã</h3>
      <p><b>Bônus em Atributo.</b> Aumenta o valor de um atributo em 2 pontos e o de outro em 1.</p>
      <p><b>Treinamentos de Clã.</b> Torna-se treinado em 2 perícias quaisquer. Em vez de duas
      perícias, pode se tornar especialista em uma.</p>
      <p><b>Foco no Poder.</b> No primeiro nível, escolha um Feitiço para ser um Feitiço Focado. Um
      Feitiço Focado pode: causar um dado de dano a mais, curar um dado de vida a mais, ter o dobro
      do alcance ou ter a dificuldade do teste para resistir aumentada em um valor igual ao seu bônus
      de treinamento. Nos níveis 5, 10, 15 e 20 você pode escolher outro Feitiço Focado.</p>`
  }
];

/* -------------------------------------------- */
/*  Especializações                             */
/* -------------------------------------------- */

const ESPECIALIZACOES = [
  {
    nome: "Lutador",
    especializacao: "lutador",
    atributoChave: "forca",
    texto: `<p>Especialista no combate físico, dedicando-se a armas marciais ou a transformar o
      próprio corpo na arma. Rápidos, destruidores e resistentes.</p>
      <p><i>Exemplos:</i> Yuuji Itadori, Kinji Hakari e Hajime Kashimo.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 12 + modificador de Constituição no 1° nível; 1d10 (ou 6) +
      modificador de Constituição nos níveis seguintes.</p>
      <p><b>Treinamentos.</b> Armas Simples, Armas Marciais e Escudo Leve. Um Teste de Resistência
      entre Fortitude ou Reflexos. Uma perícia de Ofício, Atletismo ou Acrobacia e outras três quaisquer.</p>
      <p><b>Pontos de Energia Amaldiçoada.</b> 4 por nível.</p>
      <p><b>Atributos Chave.</b> Força ou Destreza.</p>
      <p><b>Requisitos para Multiclasse.</b> Força ou Destreza 16.</p>
      <h3>Habilidades Base</h3>
      <p><b>Corpo Treinado (1° nível).</b> Ao realizar um ataque desarmado ou com arma marcial, você
      pode realizar um ataque desarmado como ação bônus. Seu dano desarmado se torna 1d8, aumentando
      nos níveis 5, 9, 13 e 17. Você pode usar Força ou Destreza nos ataques desarmados e com armas
      marciais.</p>
      <p><b>Empolgação (1° nível).</b> Você começa um combate com Nível de Empolgação 1 e sobe um
      nível (até 5) sempre que acertar um ataque ou manobra no seu turno. O Dado de Empolgação é
      1d4 no nível 2, 1d6 no 3, 2d4 no 4 e 2d6 no 5. Você aprende duas manobras, e mais outras nos
      níveis 6, 12 e 18.</p>`
  },
  {
    nome: "Especialista em Combate",
    especializacao: "especialistaCombate",
    atributoChave: "destreza",
    texto: `<p>Trata o combate como uma arte a se desenvolver e dominar, focando em manuseio complexo
      de armas, versatilidade, estratégia e domínio do campo de batalha.</p>
      <p><i>Exemplos:</i> Kento Nanami, Yuta Okkotsu e Atsuya Kusakabe.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 12 + Constituição no 1° nível; 1d10 (ou 6) + Constituição nos seguintes.</p>
      <p><b>Treinamentos.</b> Todas as armas e escudos. Um Teste de Resistência entre Fortitude ou
      Reflexos. Duas perícias de Ofício, Atletismo ou Acrobacia e três outras quaisquer.</p>
      <p><b>Pontos de Energia Amaldiçoada.</b> 4 por nível.</p>
      <p><b>Atributos Chave.</b> Força, Destreza ou Sabedoria.</p>
      <p><b>Requisitos para Multiclasse.</b> Força ou Destreza 16.</p>
      <h3>Habilidades Base</h3>
      <p><b>Repertório do Especialista (1° nível).</b> Você escolhe um estilo principal: Defensivo,
      do Arremessador, do Duelista, do Interceptador e outros listados no livro (p. 63).</p>`
  },
  {
    nome: "Especialista em Técnica",
    especializacao: "especialistaTecnica",
    atributoChave: "inteligencia",
    texto: `<p>Dedica-se completamente a maximizar o potencial da sua energia amaldiçoada e da sua
      técnica, potencializando e otimizando todos os seus Feitiços. Estratégicos, imponentes e
      imprevisíveis.</p>
      <p><i>Exemplos:</i> Satoru Gojo e Ryomen Sukuna.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 10 + Constituição no 1° nível; 1d8 (ou 5) + Constituição nos seguintes.</p>
      <p><b>Treinamentos.</b> Armas Simples e Armas a Distância. Um Teste de Resistência entre Astúcia
      ou Vontade. Duas perícias de Ofício, Feitiçaria, Ocultismo e duas outras quaisquer.</p>
      <p><b>Pontos de Energia Amaldiçoada.</b> 6 por nível. Soma o modificador do atributo de técnica
      uma vez ao máximo de energia amaldiçoada.</p>
      <p><b>Atributos Chave.</b> Inteligência ou Sabedoria.</p>
      <p><b>Requisitos para Multiclasse.</b> Inteligência ou Sabedoria 16.</p>
      <h3>Habilidades Base</h3>
      <p><b>Domínio dos Fundamentos (1° nível).</b> Você aprende duas Mudanças de Fundamento (e uma
      adicional no nível 12): Feitiço Cruel, Feitiço Distante, Feitiço Duplicado, Feitiço Expansivo e
      outras listadas no livro (p. 78).</p>`
  },
  {
    nome: "Controlador",
    especializacao: "controlador",
    atributoChave: "sabedoria",
    texto: `<p>Controla invocações, desenvolvendo-as e extraindo todo o potencial de shikigamis ou
      corpos amaldiçoados. Dominantes, criativos e impactantes no campo de batalha.</p>
      <p><i>Exemplos:</i> Megumi Fushiguro, Kokichi Muta e Suguru Geto.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 10 + Constituição no 1° nível; 1d8 (ou 5) + Constituição nos seguintes.</p>
      <p><b>Treinamentos.</b> Armas Simples e Armas a Distância. Um Teste de Resistência entre Astúcia
      ou Vontade. Uma perícia de Ofício, Percepção, Persuasão e outras duas quaisquer.</p>
      <p><b>Pontos de Energia Amaldiçoada.</b> 5 por nível. Soma o modificador do atributo de técnica
      uma vez ao máximo de energia amaldiçoada.</p>
      <p><b>Atributos Chave.</b> Presença ou Sabedoria.</p>
      <p><b>Requisitos para Multiclasse.</b> Presença ou Sabedoria 16.</p>
      <h3>Habilidades Base</h3>
      <p><b>Treinamento em Controle (1° nível).</b> Recebe duas Invocações iniciais (shikigamis ou
      corpos amaldiçoados), com uma adicional nos níveis 3, 6, 9, 10, 12, 15 e 18. A quantidade de
      Invocações ativas em campo aumenta em 1. Nos níveis 6, 12 e 18, a quantidade de comandos por
      Ação Comum e Bônus aumenta em um.</p>`
  },
  {
    nome: "Suporte",
    especializacao: "suporte",
    atributoChave: "presenca",
    texto: `<p>Focado em auxiliar aliados no campo de batalha, curando-os e ampliando suas
      capacidades. Mestres da energia reversa, que também é letal para as maldições.</p>
      <p><i>Exemplos:</i> Shoko Ieiri, Hana Kurusu e Kirara Hoshi.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 10 + Constituição no 1° nível; 1d8 (ou 5) + Constituição nos seguintes.</p>
      <p><b>Treinamentos.</b> Armas Simples e Escudos. Um Teste de Resistência entre Astúcia ou
      Vontade. Duas perícias de Ofício, Medicina, Prestidigitação e outras três quaisquer.</p>
      <p><b>Pontos de Energia Amaldiçoada.</b> 5 por nível. Soma o modificador do atributo de técnica
      uma vez ao máximo de energia amaldiçoada.</p>
      <p><b>Atributos Chave.</b> Presença ou Sabedoria.</p>
      <p><b>Requisitos para Multiclasse.</b> Presença ou Sabedoria 16.</p>
      <h3>Habilidades Base</h3>
      <p><b>Suporte em Combate (1° nível).</b> Pode usar Apoiar como ação bônus. Como ação bônus,
      pode curar uma criatura em alcance de toque em 2d6 + modificador de Presença ou Sabedoria, um
      número de vezes igual a esse modificador, por descanso. A cura vira 2d12 no nível 4, 3d12 no 8,
      6d8 no 12 e 6d10 no 16.</p>
      <p><b>Presença Inspiradora (3° nível).</b> Por 2 PE, durante uma cena, todo aliado a 9 metros
      fica inspirado, recebendo +1 em toda rolagem de perícia. Gastando PE adicional igual a metade do
      seu modificador de Presença, o bônus aumenta em +1 por PE.</p>`
  },
  {
    nome: "Restringido",
    especializacao: "restringido",
    atributoChave: "forca",
    texto: `<p>O mais único tipo de feiticeiro: não possuem energia amaldiçoada. Precisam se virar
      dominando artes marciais, armas e aproveitando ao máximo o corpo especial que possuem.
      A Especialização Restringido está limitada à origem de mesmo nome.</p>
      <p><i>Exemplos:</i> Toji Fushiguro e Maki Zenin.</p>
      <h3>Características de Especialização</h3>
      <p><b>Pontos de Vida.</b> 16 + Constituição no 1° nível; 1d12 (ou 7) + Constituição nos seguintes.</p>
      <p><b>Treinamentos.</b> Todas as armas e escudos. Testes de Resistência de Fortitude e Reflexos.
      Uma perícia de Ofício e outras quatro quaisquer, exceto Feitiçaria.</p>
      <p><b>Pontos de Estamina.</b> Inicia com 4 e recebe mais 4 a cada nível. Recupera tudo em um
      descanso longo, ou metade em um curto.</p>
      <p><b>Atributos Chave.</b> Qualquer atributo.</p>
      <p><b>Requisitos para Multiclasse.</b> Restringidos não podem realizar Multiclasse, e não é
      possível fazer Multiclasse para Restringido.</p>
      <h3>Habilidades Base</h3>
      <p><b>Restrito pelos Céus (1° nível).</b> Pode adicionar o modificador de Força ou Constituição
      à Defesa, limitado pelo seu nível. Começa com uma ferramenta amaldiçoada de quarto grau e um
      meio de ver maldições. A partir do 2° nível recebe acesso ao Arsenal Amaldiçoado; no 4° nível, e
      a cada 4 níveis, recebe uma Dádiva do Céu. Possui um Estilo Marcial.</p>`
  }
];

/* -------------------------------------------- */
/*  Armas (p. 132-134)                          */
/* -------------------------------------------- */

/**
 * Transcrição das Tabelas de Armas Simples e Complexas. As tabelas do PDF têm
 * os nomes em uma coluna e os valores em outra, e o extrator não consegue
 * recasá-los: a correspondência abaixo foi conferida linha a linha contra o
 * livro. Confira de novo antes de usar em mesa.
 *
 * `cat` é a tabela em que a arma aparece e `tipo`, como ela é manejada — os
 * dois eixos são independentes (uma Katana é Complexa e corpo a corpo).
 */
const CORPO = "Corpo a Corpo";
const DISTANCIA = "A Distância";
const ARREMESSO = "De Arremesso";

const ARMAS = [
  // Tabela de Armas Simples (p. 132)
  { nome: "Adaga", cat: "Simples", tipo: CORPO, dano: "1d6", tipoDano: "perfurante", crit: 18, esp: 1, custo: 1, grupo: "faca", fineza: true, props: "Apunhaladora, arremessável [6/18m], fineza, leve, marcial, modular Ct" },
  { nome: "Bastão", cat: "Simples", tipo: CORPO, dano: "1d6", vers: "1d8", tipoDano: "impacto", crit: 19, esp: 2, custo: 1, grupo: "bastao", props: "Amplo, dupla, marcial, versátil" },
  { nome: "Clava", cat: "Simples", tipo: CORPO, dano: "1d8", vers: "1d10", tipoDano: "impacto", crit: 20, esp: 1, custo: 1, grupo: "bastao", props: "Versátil" },
  { nome: "Espada Curta", cat: "Simples", tipo: CORPO, dano: "1d6", tipoDano: "cortante", crit: 19, esp: 1, custo: 1, grupo: "espada", fineza: true, props: "Fineza, leve, marcial, modular Pf" },
  { nome: "Faixas", cat: "Simples", tipo: CORPO, dano: "—", tipoDano: "", crit: 20, esp: 1, custo: 1, grupo: "pugilato", props: "Especial" },
  { nome: "Foice", cat: "Simples", tipo: CORPO, dano: "1d6", tipoDano: "cortante", crit: 19, esp: 1, custo: 1, grupo: "haste", fineza: true, props: "Fineza, leve, marcial" },
  { nome: "Lança", cat: "Simples", tipo: CORPO, dano: "1d6", vers: "1d8", tipoDano: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "haste", props: "Arremessável [6/18m], estendida, versátil" },
  { nome: "Leque", cat: "Simples", tipo: CORPO, dano: "1d6", tipoDano: "impacto", crit: 18, esp: 1, custo: 1, grupo: "", fineza: true, props: "Fineza, enérgica, leve, especial" },
  { nome: "Machado", cat: "Simples", tipo: CORPO, dano: "1d8", vers: "1d10", tipoDano: "cortante", crit: 20, esp: 1, custo: 1, grupo: "machado", props: "Versátil" },
  { nome: "Mangual", cat: "Simples", tipo: CORPO, dano: "1d8", tipoDano: "impacto", crit: 20, esp: 1, custo: 1, grupo: "chicote", props: "Ampla, enérgica" },
  { nome: "Manoplas", cat: "Simples", tipo: CORPO, dano: "Especial", tipoDano: "impacto", crit: 20, esp: 1, custo: 2, grupo: "pugilato", props: "Aparar, duas mãos, dupla, especial, pesado [16]" },
  { nome: "Martelo", cat: "Simples", tipo: CORPO, dano: "1d8", vers: "1d10", tipoDano: "impacto", crit: 20, esp: 1, custo: 1, grupo: "martelo", props: "Versátil" },
  { nome: "Soco Inglês", cat: "Simples", tipo: CORPO, dano: "Especial", tipoDano: "impacto", crit: 20, esp: 1, custo: 2, grupo: "pugilato", fineza: true, props: "Enérgica, especial, fineza, marcial" },
  { nome: "Tridente", cat: "Simples", tipo: CORPO, dano: "1d6", vers: "1d8", tipoDano: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "haste", props: "Arremessável [6/18m], estendida, versátil" },

  { nome: "Arco Curto", cat: "Simples", tipo: DISTANCIA, dano: "1d6", tipoDano: "perfurante", crit: 19, esp: 2, custo: 1, grupo: "arco", alcance: "24/48m", props: "Duas mãos, mortal d10, alcance [24/48m]" },
  { nome: "Besta Leve", cat: "Simples", tipo: DISTANCIA, dano: "1d8", tipoDano: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "arco", alcance: "24/48m", props: "Mortal d10, leve, alcance [24/48m], recarga [1]" },
  { nome: "Pistola", cat: "Simples", tipo: DISTANCIA, dano: "1d10", tipoDano: "perfurante", crit: 20, esp: 1, custo: 2, grupo: "tiro", alcance: "36/72m", props: "Alcance [36/72m], emperrar, leve, recarga [12]" },

  { nome: "Azagaia", cat: "Simples", tipo: ARREMESSO, dano: "1d6", tipoDano: "perfurante", crit: 20, esp: 1, custo: 1, grupo: "dardo", alcance: "12/24m", props: "Leve, alcance [12/24m]" },
  { nome: "Dardo", cat: "Simples", tipo: ARREMESSO, dano: "1d4", tipoDano: "perfurante", crit: 18, esp: 1, custo: 1, grupo: "dardo", alcance: "12/24m", props: "Leve, alcance [12/24m], especial" },
  { nome: "Faca de Arremesso", cat: "Simples", tipo: ARREMESSO, dano: "1d6", tipoDano: "perfurante", crit: 20, esp: 1, custo: 1, grupo: "faca", alcance: "12/24m", props: "Leve, alcance [12/24m], modular Ct" },

  // Tabela de Armas Complexas (p. 133-134)
  { nome: "Adagas Duplas", cat: "Complexa", tipo: CORPO, dano: "2d4", tipoDano: "perfurante", crit: 18, esp: 2, custo: 2, grupo: "faca", fineza: true, props: "Apunhaladora, duas mãos, fineza, leve, marcial, modular Ct, especial" },
  { nome: "Adaga de Aparar", cat: "Complexa", tipo: CORPO, dano: "1d4", tipoDano: "perfurante", crit: 18, esp: 1, custo: 1, grupo: "faca", fineza: true, props: "Aparar, apunhaladora, fineza, leve, marcial, modular Ct" },
  { nome: "Alabarda", cat: "Complexa", tipo: CORPO, dano: "1d10", tipoDano: "cortante", crit: 20, esp: 2, custo: 2, grupo: "haste", props: "Duas mãos, estendida, modular Pf, pesada [14], especial" },
  { nome: "Chicote", cat: "Complexa", tipo: CORPO, dano: "1d4", tipoDano: "cortante", crit: 19, esp: 1, custo: 1, grupo: "chicote", fineza: true, props: "Estendida, fineza, leve, especial" },
  { nome: "Chicote de Corrente", cat: "Complexa", tipo: CORPO, dano: "1d6", vers: "1d8", tipoDano: "impacto", crit: 19, esp: 2, custo: 2, grupo: "chicote", props: "Estendida, pesada [14], versátil, especial" },
  // Os dois dados do Chicote Espinhento e da Kusarigama não são versatilidade:
  // são golpes de tipos diferentes, somados no mesmo ataque (p. 136-137)
  { nome: "Chicote Espinhento", cat: "Complexa", tipo: CORPO, dano: "1d6 + 1d6", tipoDano: "cortante", crit: 19, esp: 1, custo: 3, grupo: "chicote", fineza: true, props: "Estendida, fineza, leve, especial" },
  { nome: "Clava Pesada", cat: "Complexa", tipo: CORPO, dano: "2d6", tipoDano: "impacto", crit: 20, esp: 2, custo: 2, grupo: "bastao", props: "Duas mãos, pesada [16], oscilante" },
  { nome: "Corrente de Aço", cat: "Complexa", tipo: CORPO, dano: "2d4", vers: "2d6", tipoDano: "impacto", crit: 20, esp: 2, custo: 1, grupo: "chicote", props: "Estendida, enérgica, pesada [14], versátil" },
  { nome: "Espada de Gancho", cat: "Complexa", tipo: CORPO, dano: "1d8", tipoDano: "cortante", crit: 20, esp: 1, custo: 2, grupo: "espada", fineza: true, props: "Fineza, leve, marcial, especial" },
  { nome: "Espada Longa", cat: "Complexa", tipo: CORPO, dano: "1d8", vers: "1d10", tipoDano: "cortante", crit: 20, esp: 1, custo: 1, grupo: "espada", props: "Modular Pf, versátil" },
  { nome: "Katana", cat: "Complexa", tipo: CORPO, dano: "1d6", vers: "1d8", tipoDano: "cortante", crit: 19, esp: 1, custo: 1, grupo: "espada", fineza: true, props: "Versátil, fatal d10, fineza" },
  { nome: "Espada Grande", cat: "Complexa", tipo: CORPO, dano: "1d12", tipoDano: "cortante", crit: 20, esp: 2, custo: 2, grupo: "espada", props: "Ampla, duas mãos, modular Pf, pesada [14]" },
  { nome: "Espada Colossal", cat: "Complexa", tipo: CORPO, dano: "2d8", tipoDano: "cortante", crit: 20, esp: 4, custo: 3, grupo: "espada", props: "Ampla, duas mãos, modular Im, pesada [20], especial" },
  { nome: "Foice Grande", cat: "Complexa", tipo: CORPO, dano: "1d8", vers: "1d10", tipoDano: "cortante", crit: 20, esp: 2, custo: 2, grupo: "haste", props: "Ampla, versátil" },
  { nome: "Kusarigama", cat: "Complexa", tipo: CORPO, dano: "1d6 + 1d6", tipoDano: "cortante", crit: 19, esp: 1, custo: 2, grupo: "haste", props: "Duas mãos, dupla, especial, estendida, enérgica" },
  { nome: "Lança Grande", cat: "Complexa", tipo: CORPO, dano: "1d12", tipoDano: "perfurante", crit: 20, esp: 2, custo: 1, grupo: "haste", props: "Duas mãos, enérgica, estendida, pesada [14]" },
  { nome: "Machado Grande", cat: "Complexa", tipo: CORPO, dano: "1d10", tipoDano: "cortante", crit: 20, esp: 2, custo: 1, grupo: "machado", props: "Ampla, duas mãos, pesada [16]" },
  { nome: "Martelo Grande", cat: "Complexa", tipo: CORPO, dano: "1d12", tipoDano: "impacto", crit: 20, esp: 2, custo: 1, grupo: "martelo", props: "Duas mãos, pesada [16]" },
  { nome: "Nunchaku", cat: "Complexa", tipo: CORPO, dano: "1d8", tipoDano: "impacto", crit: 19, esp: 1, custo: 1, grupo: "bastao", fineza: true, props: "Dupla, enérgica, fineza, marcial" },
  { nome: "Nunchaku Pesado", cat: "Complexa", tipo: CORPO, dano: "2d6", tipoDano: "impacto", crit: 20, esp: 2, custo: 2, grupo: "bastao", props: "Duas mãos, dupla, estendida, marcial, pesada [14], enérgica" },
  { nome: "Rapieira", cat: "Complexa", tipo: CORPO, dano: "1d8", tipoDano: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "espada", fineza: true, props: "Fineza, mortal d10" },

  { nome: "Arco Longo", cat: "Complexa", tipo: DISTANCIA, dano: "1d10", tipoDano: "perfurante", crit: 19, esp: 2, custo: 1, grupo: "arco", alcance: "30/60m", props: "Duas mãos, mortal d12, alcance [30/60m]" },
  { nome: "Bazuca", cat: "Complexa", tipo: DISTANCIA, dano: "3d12", tipoDano: "impacto", crit: 19, esp: 4, custo: 4, grupo: "tiro", alcance: "9/18m", props: "Alcance [9/18m], duas mãos, emperrar, recarga [1], especial, pesada [16]" },
  { nome: "Besta Pesada", cat: "Complexa", tipo: DISTANCIA, dano: "1d12", tipoDano: "perfurante", crit: 20, esp: 2, custo: 1, grupo: "besta", alcance: "45/90m", props: "Pesada [14], alcance [45/90m], recarga [1], mortal d12" },
  { nome: "Escopeta", cat: "Complexa", tipo: DISTANCIA, dano: "2d6", tipoDano: "perfurante", crit: 20, esp: 2, custo: 2, grupo: "tiro", alcance: "9/18m", props: "Alcance [9/18m], duas mãos, emperrar, especial, recarga [2]" },
  { nome: "Metralhadora", cat: "Complexa", tipo: DISTANCIA, dano: "1d12", tipoDano: "perfurante", crit: 19, esp: 4, custo: 3, grupo: "tiro", alcance: "30/60m", props: "Alcance [30/60m], duas mãos, emperrar, especial, recarga [30]" },
  { nome: "Rifle", cat: "Complexa", tipo: DISTANCIA, dano: "2d8", tipoDano: "perfurante", crit: 20, esp: 2, custo: 2, grupo: "tiro", alcance: "60/120m", props: "Alcance [60/120m], duas mãos, emperrar, recarga [20]" },
  { nome: "Rifle de Precisão", cat: "Complexa", tipo: DISTANCIA, dano: "2d10", tipoDano: "perfurante", crit: 19, esp: 4, custo: 3, grupo: "tiro", alcance: "120/240m", props: "Alcance [120/240m], duas mãos, emperrar, recarga [5]" },

  { nome: "Chakram", cat: "Complexa", tipo: ARREMESSO, dano: "2d4", tipoDano: "cortante", crit: 20, esp: 1, custo: 1, grupo: "faca", alcance: "12/24m", props: "Arremessável [12/24m], especial, leve" },
  { nome: "Kunai", cat: "Complexa", tipo: ARREMESSO, dano: "1d6", tipoDano: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "dardo", alcance: "9/18m", fineza: true, props: "Apunhaladora, arremessável [9/18m], fineza, leve" },
  { nome: "Rede", cat: "Complexa", tipo: ARREMESSO, dano: "—", tipoDano: "", crit: 20, esp: 1, custo: 2, grupo: "", alcance: "9/27m", props: "Alcance [9/27m], especial" },
  { nome: "Shuriken", cat: "Complexa", tipo: ARREMESSO, dano: "1d4", tipoDano: "cortante", crit: 18, esp: 1, custo: 1, grupo: "dardo", alcance: "12/24m", props: "Arremessável [12/24m], mortal d8, leve" }
];

/* -------------------------------------------- */
/*  Uniformes e Escudos (p. 140-141)            */
/* -------------------------------------------- */

/**
 * Um uniforme só pode ter uma modificação, que substitui a forma e a base dele.
 * Os espaços seguem a regra de carregamento (p. 129): uniformes sem
 * revestimento, com Revestimento Leve ou Sob Medida não ocupam espaço;
 * Revestimento Médio ocupa dois e Revestimento Robusto, quatro.
 */
const UNIFORMES = [
  { nome: "Uniforme Comum", defesa: 0, penalidade: 0, custo: 0, espacos: 0,
    texto: `Todo personagem inicia com um uniforme comum. Ele não altera a Defesa, que fica no
      valor padrão do sistema, mas pode receber uma modificação para reforçá-la.` },
  { nome: "Uniforme com Revestimento Leve", defesa: 2, penalidade: 0, custo: 1, espacos: 0,
    texto: `Um revestimento leve é colocado no uniforme, concedendo-o um leve reforço defensivo.` },
  { nome: "Uniforme com Revestimento Médio", defesa: 4, penalidade: -2, custo: 2, espacos: 2,
    texto: `O uniforme tem uma quantidade demorada de revestimentos colocados, através de algumas
      placas e camadas adicionais, o que dá um peso considerável ao uniforme.` },
  { nome: "Uniforme com Revestimento Robusto", defesa: 6, penalidade: -4, custo: 3, espacos: 4,
    texto: `Um revestimento pesado é implementado no uniforme, com placas fortes, camadas densas e a
      adição de peças que se assemelham a armaduras ou coletes, o que o dá um peso equivalente.` },
  { nome: "Uniforme Sob Medida", defesa: 1, penalidade: 0, custo: 2, espacos: 0,
    texto: `O uniforme é feito sob medida, encaixando-se perfeitamente no corpo do feiticeiro,
      beneficiando-o em acrobacias e destacando a sua agilidade. Enquanto estiver usando um uniforme
      sob medida, você recebe +2 em testes de Acrobacia e Furtividade.` }
];

/**
 * Escudos ocupam dois espaços, como os demais itens mais pesados (p. 129). O
 * dano entre parênteses no livro é o do escudo usado para atacar — e atacar com
 * ele suspende a RD até o início do seu próximo turno.
 */
const ESCUDOS = [
  { nome: "Escudo Pequeno", dano: "1d3", rd: 2, penalidade: 0, custo: 2,
    texto: `Um escudo pequeno, otimizado para ser preso ao braço, mantendo uma mão livre enquanto dá
      um impulso na guarda. O escudo pequeno não ocupa uma das suas mãos.` },
  { nome: "Escudo Leve", dano: "1d4", rd: 2, penalidade: -1, custo: 1,
    texto: `Um pequeno escudo, leve em peso e capaz de auxiliar na defesa de golpes mais simples.` },
  { nome: "Escudo Médio", dano: "1d6", rd: 4, penalidade: -2, custo: 2,
    texto: `Um escudo de porte médio, equilibrando uma boa defesa com um sacrifício mediano de sua
      agilidade.` },
  { nome: "Escudo Pesado", dano: "1d8", rd: 6, penalidade: -4, custo: 3,
    texto: `Um escudo maior e pesado, cobrindo uma parte considerável do corpo, em troca de uma certa
      dificuldade no seu manejo.` }
];

/* -------------------------------------------- */
/*  Montagem dos packs                          */
/* -------------------------------------------- */

const pastaOrigens = id("pasta-origens");
const pastaClaes = id("pasta-claes");

export const PACKS = {
  "fnm-origens": {
    folders: [
      { _id: pastaOrigens, name: "Origens", sort: 100 },
      { _id: pastaClaes, name: "Heranças de Clã", sort: 200 }
    ],
    items: [
      ...ORIGENS.map(o => ({
        _id: id(`origem-${o.nome}`),
        name: o.nome,
        type: "origem",
        img: "icons/svg/aura.svg",
        folder: pastaOrigens,
        system: {
          description: o.texto,
          origem: o.origem,
          cla: "",
          bonusAtributos: o.bonus,
          ajustes: { ...semAjustes }
        }
      })),
      ...CLAES.map(c => ({
        _id: id(`cla-${c.nome}`),
        name: c.nome,
        type: "origem",
        img: "icons/svg/holy-shield.svg",
        folder: pastaClaes,
        system: {
          description: c.texto,
          origem: "herdado",
          cla: c.cla,
          bonusAtributos: c.bonus,
          ajustes: { ...semAjustes }
        }
      }))
    ]
  },

  "fnm-especializacoes": {
    folders: [],
    items: ESPECIALIZACOES.map(e => ({
      _id: id(`espec-${e.nome}`),
      name: e.nome,
      type: "especializacao",
      img: "icons/svg/upgrade.svg",
      system: {
        description: e.texto,
        especializacao: e.especializacao,
        niveis: 1,
        atributoChave: e.atributoChave,
        ajustes: { ...semAjustes }
      }
    }))
  },

  "fnm-aptidoes": {
    // Uma pasta por área de aptidão, na ordem em que o livro as apresenta
    folders: [...new Set(APTIDOES.map(a => a.categoria))].map((cat, i) => ({
      _id: id(`pasta-aptidao-${cat}`),
      name: cat === "Especial" ? "Aptidões Especiais" : `Aptidões de ${cat}`,
      sort: (i + 1) * 100
    })),
    items: APTIDOES.map(a => ({
      _id: id(`aptidao-${a.nome}`),
      name: a.nome,
      type: "aptidao",
      img: "icons/svg/explosion.svg",
      folder: id(`pasta-aptidao-${a.categoria}`),
      system: {
        description:
          (a.prerequisito ? `<p><b>Pré-Requisito:</b> ${a.prerequisito}</p>` : "") +
          a.descricao,
        categoria: a.categoria,
        areaAptidao: a.areaAptidao,
        nivelAptidao: a.nivelAptidao,
        prerequisito: a.prerequisito,
        custoPE: a.custoPE,
        acao: "",
        ajustes: { ...semAjustes }
      }
    }))
  },

  /**
   * Dotes de inimigo (Grimório, p. 64-71 e 77-80). Os Gerais ficam em uma pasta
   * só; os Amaldiçoados, em uma pasta por categoria, como no livro.
   */
  "fnm-dotes": {
    folders: [
      { _id: id("pasta-dote-geral"), name: "Dotes Gerais", sort: 100 },
      ...FNM.categoriasDoteAmaldicoado.map((cat, i) => ({
        _id: id(`pasta-dote-am-${cat}`),
        name: cat === "Especial" ? "Amaldiçoados: Especiais" : `Amaldiçoados: ${cat}`,
        sort: (i + 2) * 100
      })),
      { _id: id("pasta-dote-treino"), name: "Treinamentos", sort: 900 }
    ],
    items: [
      ...GRIMORIO.dotesGerais.map(d => ({
        _id: id(`dote-geral-${d.nome}`),
        name: d.nome,
        type: "dote",
        img: "icons/svg/upgrade.svg",
        folder: id("pasta-dote-geral"),
        system: {
          description:
            (d.prerequisito ? `<p><b>Pré-Requisito:</b> ${d.prerequisito}</p>` : "") +
            d.descricao +
            `<p><i>Grimório das Maldições v1, p. 77-80.</i></p>`,
          tipoDote: "Geral",
          categoria: "",
          areaAptidao: "",
          nivelAptidao: 0,
          ndMinimo: d.ndMinimo,
          prerequisito: d.prerequisito,
          custoPE: d.custoPE,
          acao: "",
          ajustes: { ...semAjustes }
        }
      })),
      ...GRIMORIO.dotesAmaldicoados.map(d => ({
        _id: id(`dote-amaldicoado-${d.nome}`),
        name: d.nome,
        type: "dote",
        img: "icons/svg/explosion.svg",
        folder: id(`pasta-dote-am-${d.categoria}`),
        system: {
          description:
            (d.prerequisito ? `<p><b>Pré-Requisito:</b> ${d.prerequisito}</p>` : "") +
            d.descricao +
            `<p><i>Grimório das Maldições v1, p. 64-71.</i></p>`,
          tipoDote: "Amaldiçoado",
          categoria: d.categoria,
          areaAptidao: d.areaAptidao,
          nivelAptidao: d.nivelAptidao,
          ndMinimo: d.ndMinimo,
          prerequisito: d.prerequisito,
          custoPE: d.custoPE,
          acao: "",
          ajustes: { ...semAjustes }
        }
      })),
      ...GRIMORIO.treinamentos.map(t => ({
        _id: id(`dote-treino-${t.nome}`),
        name: t.nome,
        type: "dote",
        img: "icons/svg/target.svg",
        folder: id("pasta-dote-treino"),
        system: {
          description:
            (t.prerequisito ? `<p><b>Pré-Requisito:</b> ${t.prerequisito}</p>` : "") +
            t.descricao +
            `<p><i>Grimório das Maldições v1, p. 61-62. Uma criatura recebe 1 ponto de treinamento + 1 para cada grau.</i></p>`,
          tipoDote: "Treinamento",
          categoria: "",
          areaAptidao: "",
          nivelAptidao: 0,
          ndMinimo: t.ndMinimo,
          prerequisito: t.prerequisito,
          custoPE: t.custoPE,
          acao: "",
          ajustes: { ...semAjustes }
        }
      }))
    ]
  },

  /** Características de inimigo (Grimório, p. 72-76), em Gerais e Especiais. */
  "fnm-caracteristicas": {
    folders: FNM.categoriasCaracteristica.map((cat, i) => ({
      _id: id(`pasta-caract-${cat}`),
      name: cat === "Geral" ? "Características Gerais" : "Características Especiais",
      sort: (i + 1) * 100
    })),
    items: GRIMORIO.caracteristicas.map(c => ({
      _id: id(`caracteristica-${c.nome}`),
      name: c.nome,
      type: "caracteristica",
      img: c.categoria === "Geral" ? "icons/svg/shield.svg" : "icons/svg/eye.svg",
      folder: id(`pasta-caract-${c.categoria}`),
      system: {
        description:
          (c.prerequisito ? `<p><b>Pré-Requisito:</b> ${c.prerequisito}</p>` : "") +
          c.descricao +
          `<p><i>Grimório das Maldições v1, p. 72-76.</i></p>`,
        categoria: c.categoria,
        prerequisito: c.prerequisito,
        custoPE: c.custoPE,
        acao: "",
        ajustes: { ...semAjustes }
      }
    }))
  },

  "fnm-habilidades": {
    // Uma pasta por especialização, para navegar as 364 habilidades
    folders: HABILIDADES_ESPEC.map((e, i) => ({
      _id: id(`pasta-hab-${e.chave}`),
      name: e.nome,
      sort: (i + 1) * 100
    })),
    items: HABILIDADES_ESPEC.flatMap(e =>
      e.habilidades.map(h => ({
        _id: id(`hab-${e.chave}-${h.nome}`),
        name: h.nome,
        type: "habilidade",
        img: h.base ? "icons/svg/upgrade.svg" : "icons/svg/book.svg",
        folder: id(`pasta-hab-${e.chave}`),
        system: {
          description:
            `<p><i>${e.nome} — ${h.base ? "Habilidade Base" : "Habilidade de Especialização"}` +
            `, ${h.nivel}º nível.</i></p>` +
            h.descricao,
          especializacao: e.nome,
          nivelRequerido: h.nivel,
          custoPE: 0,
          acao: "",
          usos: { value: 0, max: 0 },
          ajustes: { ...semAjustes }
        }
      }))
    )
  },

  "fnm-talentos": {
    folders: [
      { _id: id("pasta-talentos-gerais"), name: "Talentos Gerais", sort: 100 },
      { _id: id("pasta-talentos-origem"), name: "Talentos de Origem", sort: 200 }
    ],
    items: TALENTOS.map(t => ({
      _id: id(`talento-${t.categoria}-${t.nome}`),
      name: t.nome,
      type: "talento",
      img: t.categoria === "Origem" ? "icons/svg/aura.svg" : "icons/svg/statue.svg",
      folder: id(
        t.categoria === "Origem" ? "pasta-talentos-origem" : "pasta-talentos-gerais"
      ),
      system: {
        description:
          (t.origem ? `<p><i>Talento de Origem — ${t.origem}.</i></p>` : "") +
          (t.prerequisito ? `<p><b>Pré-Requisito:</b> ${t.prerequisito}</p>` : "") +
          t.descricao,
        categoria: t.categoria,
        prerequisito: t.prerequisito,
        custoPE: 0,
        usos: { value: 0, max: 0 },
        ajustes: { ...semAjustes }
      }
    }))
  },

  "fnm-armas": {
    folders: [
      { _id: id("pasta-armas-simples"), name: "Armas Simples", sort: 100 },
      { _id: id("pasta-armas-complexas"), name: "Armas Complexas", sort: 200 }
    ],
    items: ARMAS.map(a => ({
      _id: id(`arma-${a.nome}`),
      name: a.nome,
      type: "arma",
      img: a.tipo === CORPO ? "icons/svg/sword.svg" : "icons/svg/thrust.svg",
      folder: id(a.cat === "Complexa" ? "pasta-armas-complexas" : "pasta-armas-simples"),
      system: {
        description:
          `<p><i>Arma ${a.cat.toLowerCase()} ${a.tipo === CORPO ? "corpo a corpo" : a.tipo.toLowerCase()}` +
          `${a.grupo ? `, do grupo ${FNM.gruposArma[a.grupo].nome}` : ""}. ` +
          `Transcrita das tabelas de armas do Livro de Regras v2.5.2 (p. 132-134).</i></p>` +
          (a.grupo ? `<p><b>Crítico do grupo.</b> ${FNM.gruposArma[a.grupo].critico}</p>` : "") +
          propriedadeEspecial(a.nome),
        categoria: a.cat,
        tipo: a.tipo,
        grupo: a.grupo ?? "",
        dano: a.dano,
        danoVersatil: a.vers ?? "",
        tipoDano: a.tipoDano ?? "",
        critico: a.crit,
        propriedades: a.props,
        alcance: a.alcance ?? "",
        espacos: a.esp,
        custo: a.custo,
        grau: "",
        encantamentos: "",
        fineza: a.fineza === true,
        treinado: true,
        equipada: false,
        bonusAtaque: 0,
        bonusDano: 0,
        quantidade: 1,
        ajustes: { ...semAjustes }
      }
    }))
  },

  "fnm-equipamentos": {
    folders: [
      { _id: id("pasta-uniformes"), name: "Uniformes", sort: 100 },
      { _id: id("pasta-escudos"), name: "Escudos", sort: 200 },
      { _id: id("pasta-kits"), name: "Kits de Ferramentas", sort: 300 },
      { _id: id("pasta-itens"), name: "Itens Especiais", sort: 400 },
      ...[1, 2, 3, 4].map(c => ({
        _id: id(`pasta-itens-${c}`),
        name: `Custo ${c}`,
        folder: id("pasta-itens"),
        sort: c * 100
      })),
      { _id: id("pasta-encantamentos"), name: "Encantamentos", sort: 500 },
      ...ALVOS_ENCANTAMENTO.map((alvo, i) => ({
        _id: id(`pasta-encantamentos-${alvo}`),
        name: `Para ${alvo}s`,
        folder: id("pasta-encantamentos"),
        sort: (i + 1) * 100
      }))
    ],
    items: [
      ...UNIFORMES.map(u => ({
        _id: id(`uniforme-${u.nome}`),
        name: u.nome,
        type: "equipamento",
        img: "icons/svg/mage-shield.svg",
        folder: id("pasta-uniformes"),
        system: {
          ...equipamentoBase(),
          description:
            `<p>${u.texto}</p>` +
            `<p><i>Modificação de uniforme, Livro de Regras v2.5.2, p. 140.</i></p>`,
          tipo: "Uniforme",
          defesa: u.defesa,
          penalidade: u.penalidade,
          custo: u.custo,
          espacos: u.espacos,
          efeitos: efeitos(u.nome)
        }
      })),

      ...ESCUDOS.map(e => ({
        _id: id(`escudo-${e.nome}`),
        name: e.nome,
        type: "equipamento",
        img: "icons/svg/shield.svg",
        folder: id("pasta-escudos"),
        system: {
          ...equipamentoBase(),
          description:
            `<p>${e.texto}</p>` +
            `<p>Fornece a Redução de Dano enquanto empunhado. Se você atacar com o escudo, ele deixa
             de fornecer RD até o início do seu próximo turno. As penalidades de escudo e de uniforme
             são cumulativas.</p>` +
            `<p><i>Livro de Regras v2.5.2, p. 141.</i></p>`,
          tipo: "Escudo",
          dano: e.dano,
          reducaoDano: e.rd,
          penalidade: e.penalidade,
          custo: e.custo,
          // Escudos entram entre os itens mais pesados, de dois espaços (p. 129)
          espacos: 2
        }
      })),

      ...EQUIPAMENTOS.kits.map(k => ({
        _id: id(`kit-${k.nome}`),
        name: k.nome,
        type: "equipamento",
        img: "icons/svg/clockwork.svg",
        folder: id("pasta-kits"),
        system: {
          ...equipamentoBase(),
          description: k.descricao + `<p><i>Livro de Regras v2.5.2, p. 141-143.</i></p>`,
          tipo: "Kit de Ferramentas",
          custo: k.custo,
          espacos: k.espacos
        }
      })),

      ...EQUIPAMENTOS.itensEspeciais.map(i => ({
        _id: id(`item-${i.nome}`),
        name: i.nome,
        type: "equipamento",
        img: ICONE_ITEM[i.categoria],
        folder: id(`pasta-itens-${i.custo}`),
        system: {
          ...equipamentoBase(),
          description:
            `<p><i>Item Especial de custo ${i.custo} — ${i.categoria}` +
            `${i.acao ? `, ${i.acao}` : ""}.</i></p>` +
            i.descricao,
          tipo: "Item Especial",
          // Acessórios sempre ativos entram automatizados; o resto fica no texto
          efeitos: efeitos(i.nome),
          categoria: i.categoria,
          acao: i.acao,
          consumivel: i.consumivel,
          // Um consumível gasto sai do inventário: uma carga por unidade
          usos: i.consumivel ? { value: 1, max: 1 } : { value: 0, max: 0 },
          custo: i.custo,
          espacos: i.espacos
        }
      })),

      ...EQUIPAMENTOS.encantamentos.map(e => ({
        _id: id(`encantamento-${e.alvo}-${e.nome}`),
        name: e.nome,
        type: "equipamento",
        img: "icons/svg/upgrade.svg",
        folder: id(`pasta-encantamentos-${e.alvo}`),
        system: {
          ...equipamentoBase(),
          description:
            `<p><i>Encantamento de Ferramenta Amaldiçoada, para ${e.alvo.toLowerCase()}s.</i></p>` +
            (e.prerequisito ? `<p><b>Pré-Requisito:</b> ${e.prerequisito}</p>` : "") +
            e.descricao +
            `<p><i>Livro de Regras v2.5.2, p. 155-159.</i></p>`,
          tipo: "Encantamento",
          alvo: e.alvo,
          prerequisito: e.prerequisito,
          // Um Encantamento não é carregado: ele já está na ferramenta
          custo: 0,
          espacos: 0
        }
      }))
    ]
  }
};

/* -------------------------------------------- */
/*  Referência de regras (JournalEntry)         */
/* -------------------------------------------- */

/**
 * Equipamentos: as regras do capítulo 5 que não cabem em um item — quanto se
 * carrega, com o que se começa e o que cada propriedade de arma faz.
 */
function paginaEquipamentos() {
  const propriedades = EQUIPAMENTOS.propriedadesArma
    .map(p => `<li><b>${p.nome}.</b> ${p.descricao}</li>`)
    .join("");
  const uniformes = UNIFORMES.filter(u => u.defesa > 0)
    .map(
      u =>
        `<tr><td>${u.nome.replace("Uniforme com ", "").replace("Uniforme ", "")}</td>` +
        `<td>+${u.defesa}</td><td>${u.penalidade || "—"}</td><td>${u.custo}</td>` +
        `<td>${u.espacos}</td></tr>`
    )
    .join("");
  const escudos = ESCUDOS.map(
    e =>
      `<tr><td>${e.nome} (${e.dano})</td><td>${e.rd}</td>` +
      `<td>${e.penalidade || "—"}</td><td>${e.custo}</td></tr>`
  ).join("");

  return (
    `<h2>Inventário e Carregamento</h2>
     <p>A carga é medida em <b>espaços de itens</b>. Por padrão um item ocupa um espaço, com
     exceções: uniformes sem revestimento, com Revestimento Leve ou Sob Medida não ocupam espaço;
     consumíveis como talismãs e misturas ocupam meio; armas de duas mãos, uniformes com
     Revestimento Médio, escudos e outros itens pesados ocupam dois; armas massivas e uniformes com
     Revestimento Robusto ocupam quatro.</p>
     <p>O limite é de <b>8 espaços + o dobro do modificador de Força</b>. Acima dele o personagem
     fica <b>sobrecarregado</b>: −5 na Defesa e −4,5 m de Deslocamento. É impossível carregar mais
     do que o dobro do limite. Equipamentos continuam ocupando espaço mesmo quando vestidos ou
     empunhados; a mochila e os recipientes que só servem para carregar não ocupam.</p>
     <h2>Equipamento Inicial</h2>
     <p>Todo personagem começa com dois equipamentos de custo 1 (arma, escudo ou item especial), um
     uniforme comum e um kit de ferramentas à sua escolha.</p>
     <h3>Ganho de equipamentos por grau</h3>
     <ul>
       <li><b>Quarto Grau.</b> Dois itens de custo 1.</li>
       <li><b>Terceiro Grau.</b> Três itens de custo 1 e um de custo 2.</li>
       <li><b>Segundo Grau.</b> Três de custo 1, dois de custo 2 e um de custo 3.</li>
       <li><b>Primeiro Grau.</b> Três de custo 1, três de custo 2, dois de custo 3 e um de custo 4.</li>
       <li><b>Grau Especial.</b> Itens de custo 1 ilimitados, quatro de custo 2, três de custo 3 e
       dois de custo 4.</li>
     </ul>
     <p>Esse conjunto é recebido gratuitamente no começo de cada missão. Escolher uma arma,
     uniforme, escudo ou acessório reduz o conjunto de forma permanente enquanto o personagem
     estiver com ele.</p>
     <h2>Propriedades de Armas</h2>
     <ul>${propriedades}</ul>
     <p>O traço <b>especial</b> de cada arma está na descrição da própria arma, no compêndio.</p>
     <h2>Modificações de Uniforme</h2>
     <p>Um uniforme só pode ter uma modificação, que é uma alteração completa da sua forma e base.
     A penalidade incide sobre testes de perícia que usem Destreza.</p>
     <table><thead><tr><th>Modificação</th><th>Defesa</th><th>Penalidade</th><th>Custo</th>
     <th>Espaços</th></tr></thead><tbody>${uniformes}</tbody></table>
     <h2>Escudos</h2>
     <p>O escudo fornece Redução de Dano enquanto empunhado; atacar com ele suspende a RD até o
     início do seu próximo turno. As penalidades de escudo e uniforme são cumulativas.</p>
     <table><thead><tr><th>Escudo (dano)</th><th>RD</th><th>Penalidade</th><th>Custo</th>
     </tr></thead><tbody>${escudos}</tbody></table>
     <h2>Criação de Itens</h2>
     <p>Kits de ferramenta são usados em descansos e interlúdios. Um personagem só usa o kit em que
     tem treinamento — ser treinado em um Ofício também treina no kit correspondente. Os limites de
     criação por nível são: 1 a 5, itens de custo 1; 6 a 10, até custo 2; 11 a 16, até custo 3;
     17 a 20, até custo 4.</p>
     <h2>Regras de Veneno</h2>
     <p>Venenos são de <b>contato</b> (aplicados em uma arma como ação bônus, durando até acertar um
     ataque ou até o fim do combate), <b>inalação</b> (frasco arremessado a 9 m, liberando o veneno
     em 3 m de raio) ou <b>ingestão</b>. O exposto faz um TR de Fortitude cuja CD vem do custo:
     custo 1 é CD 15, custo 2 é CD 25, custo 3 é CD 35 e custo 4 é CD 45. Maldições e Fetos
     Amaldiçoados Híbridos recebem +2 nesse TR e Corpos Amaldiçoados são imunes.</p>
     <p><i>Livro de Regras v2.5.2, p. 128-149.</i></p>`
  );
}

/** Ferramentas Amaldiçoadas: o que cada grau concede (capítulo 6). */
function paginaFerramentas() {
  const linhas = Object.values(FNM.grausFerramenta)
    .map(
      g =>
        `<tr><td>${g.nome}</td><td>+${g.bonusArma}</td><td>${g.rdEscudo}</td>` +
        `<td>${g.encantamentos.arma}</td><td>${g.encantamentos.escudo}</td>` +
        `<td>${g.encantamentos.uniforme}</td></tr>`
    )
    .join("");

  return (
    `<p>Ferramentas Amaldiçoadas são equipamentos infundidos com energia amaldiçoada. Qualquer
     pessoa consegue manejá-las e assim ferir espíritos amaldiçoados, mesmo sem ter energia.</p>
     <p>Não existem ferramentas pré-definidas, exceto as de grau especial: toda arma, uniforme ou
     escudo comum pode virar uma. O que a define é o <b>grau</b>, que dá um bônus fixo, e os
     <b>Encantamentos</b>, escolhidos na lista do tipo de equipamento — e esses estão no compêndio
     de Equipamentos.</p>
     <h2>Benefícios por grau</h2>
     <p>O bônus de arma e a RD do escudo são os do grau atual e <b>não</b> se acumulam com os
     anteriores. Os Encantamentos, sim: a coluna traz o total acumulado.</p>
     <table><thead><tr><th>Grau</th><th>Bônus de arma</th><th>RD do escudo</th>
     <th>Encant. (arma)</th><th>Encant. (escudo)</th><th>Encant. (uniforme)</th>
     </tr></thead><tbody>${linhas}</tbody></table>
     <p>Ao chegar ao grau especial, a ferramenta ganha também uma <b>habilidade única</b>, criada
     pelo jogador junto do Narrador.</p>
     <h2>Criando uma ferramenta</h2>
     <p>É preciso o talento geral Artesão Amaldiçoado e treinamento em Ferramentas de Canalizador ou
     de Ferreiro. Não são necessários materiais. O processo exige dois testes, um de Ofício
     (Ferreiro) e outro de Ofício (Canalizador), ambos com sucesso. As falhas se acumulam contra o
     equipamento — trocar o artesão não zera a contagem.</p>
     <ul>
       <li><b>Quarto Grau.</b> Bônus de Treinamento +2, CD 20.</li>
       <li><b>Terceiro Grau.</b> Bônus de Treinamento +3, CD 25.</li>
       <li><b>Segundo Grau.</b> Bônus de Treinamento +4, CD 30.</li>
       <li><b>Primeiro Grau.</b> Bônus de Treinamento +5, CD 35.</li>
       <li><b>Grau Especial.</b> Bônus de Treinamento +6, CD 45.</li>
     </ul>
     <h2>Identificando uma ferramenta</h2>
     <p>Treinado em Feitiçaria, você pode analisar um item amaldiçoado com um teste de CD 20, +5
     para cada grau acima do quarto, descobrindo o nome e os Encantamentos. Em combate isso é uma
     Ação Bônus. Para a habilidade única de uma ferramenta de grau especial, a CD sobe 10 e é
     preciso já tê-la visto em uso.</p>
     <h2>Cargas de Encantamento</h2>
     <p>Um item com cargas tem um número delas igual ao Bônus de Treinamento do portador,
     compartilhado por todos os Encantamentos que usem cargas. Uma carga gasta só volta depois de um
     descanso longo do portador e do item.</p>
     <p><i>Livro de Regras v2.5.2, p. 151-161.</i></p>`
  );
}

/**
 * Invocações: o capítulo é quase todo tabela, e todas elas são indexadas pelo
 * grau. A página monta as linhas a partir de FNM.grausInvocacao, então o que a
 * ficha calcula e o que o diário mostra não podem divergir.
 */
function paginaInvocacoes() {
  const graus = Object.values(FNM.grausInvocacao);
  const linha = celulas => `<tr>${celulas.map(c => `<td>${c}</td>`).join("")}</tr>`;
  const tabela = (cabecalhos, linhas) =>
    `<table><thead><tr>${cabecalhos.map(c => `<th>${c}</th>`).join("")}</tr></thead>` +
    `<tbody>${linhas.join("")}</tbody></table>`;
  const ou = v => v || "—";
  // O livro usa vírgula decimal: 4.5 vira "4,5"
  const num = v => String(v).replace(".", ",");

  const criacao = tabela(
    ["Grau", "Custo", "Pontos de atributo", "Máximo por atributo", "Perícias extras", "Ações/Caract.", "Ações com custo"],
    graus.map(g =>
      linha([g.nome, `${g.custo} PE`, g.pontosAtributo, g.maximoAtributo, g.periciasExtras, g.acoes, g.acoesComCusto])
    )
  );

  const vidaDefesa = tabela(
    ["Grau", "Pontos de Vida", "Defesa"],
    graus.map(g =>
      linha([
        g.nome,
        `${g.pv.base} + ${g.pv.con === 0.5 ? "metade da" : "a"} Constituição + ` +
          `${num(g.pv.nivel)}x o nível do usuário`,
        `${g.defesa} + mod. de Destreza + Bônus de Treinamento do usuário`
      ])
    )
  );

  const dano = tabela(
    ["Grau", "Ataque, alvo único", "TR, alvo único", "Alvos múltiplos", "Área", "Alcance", "Área padrão"],
    graus.map(g =>
      linha([
        g.nome,
        g.dano.ataque,
        g.dano.resistencia,
        ou(g.dano.multiplos),
        ou(g.dano.area),
        `${num(g.alcance)} m`,
        g.area ? `${num(g.area)} m` : "—"
      ])
    )
  );

  const auxilio = tabela(
    ["Grau", "Cura, alvo único", "Cura, múltiplos", "Bônus na Defesa", "Bônus em acerto", "Dano adicional", "Redução de Dano"],
    graus.map(g =>
      linha([
        g.nome,
        g.cura.unico,
        ou(g.cura.multiplos),
        `+${g.auxilio.defesa}`,
        `+${g.auxilio.acerto}`,
        g.auxilio.danoAdicional,
        g.auxilio.reducaoDano
      ])
    )
  );

  const caracteristicas = tabela(
    ["Grau", "Vida adicional", "Bônus em teste", "Redução de Dano", "Tamanho"],
    graus.map(g =>
      linha([
        g.nome,
        `${g.caracteristica.vida} PV`,
        `+${g.caracteristica.bonusTeste}`,
        g.caracteristica.reducaoDano,
        `${g.caracteristica.tamanhoMin} a ${g.caracteristica.tamanhoMax}`
      ])
    )
  );

  const acesso = tabela(
    ["Nível de Controlador", "Graus disponíveis"],
    Object.entries(FNM.nivelParaGrauInvocacao).map(([id, nivel]) => {
      const ate = Object.entries(FNM.nivelParaGrauInvocacao)
        .filter(([, n]) => n <= nivel)
        .map(([chave]) => FNM.grausInvocacao[chave].nome)
        .join(", ");
      return linha([`Nível ${nivel}${id === "Especial" ? " ou superior" : ""}`, ate]);
    })
  );

  return (
    `<p>Invocações são criaturas ou construtos controlados por um personagem: Corpos Amaldiçoados,
     Maldições Domadas, Marionetes e Shikigamis. São o recurso central do Controlador e um auxílio
     opcional para as demais especializações.</p>
     <h2>Obtendo e controlando</h2>
     <ul>
       <li>Um Controlador começa com duas Invocações no 1º nível e recebe mais uma a cada 3 níveis.
       Fora dele, elas são criadas em Interlúdios ou obtidas domando maldições.</li>
       <li>Trazer ao campo usa a ação <b>Invocar</b>, que traz duas por padrão. Dissipar é uma Ação
       Livre, e não pode ser feito na mesma rodada em que foram invocadas.</li>
       <li>O limite padrão é <b>1 Invocação em campo</b>, ampliado pela habilidade Treinamento em
       Controle.</li>
       <li>Uma Ação Comum do dono comanda uma <b>Ação Complexa</b>; uma Ação Bônus comanda uma
       <b>Ação Simples</b>. Mover é Ação Livre, uma vez por rodada. Cada Invocação tem a própria
       Reação, recuperada no turno do dono.</li>
       <li>Invocações não têm valor de Atenção: só procuram algo quando comandadas, com Percepção.</li>
     </ul>
     <p>A 0 PV, um shikigami é <b>dissipado</b> e uma marionete, <b>desativada</b> — voltam no próximo
     turno, pagando o custo de novo e com metade dos PV máximos até um descanso. Com dano excedente
     acima do máximo de vida, são <b>exorcizados</b> ou <b>destruídos</b>, e a perda é permanente.</p>
     <h2>Intermediários</h2>
     <p>Toda Invocação é ligada a um Intermediário, que ocupa meio espaço no inventário: shikigamis
     usam <b>talismãs</b> e Corpos Amaldiçoados são <b>o próprio dispositivo</b>. Certas técnicas
     inatas dispensam o talismã, como a Dez Sombras.</p>
     <h2>Acesso por nível de Controlador</h2>
     ${acesso}
     <h2>Criação</h2>
     <p>Toda Invocação começa com os seis atributos em 8 e distribui os pontos do grau. Reduzir um
     atributo, até o mínimo de 6, devolve a diferença em pontos.</p>
     ${criacao}
     <h2>Vida e Defesa</h2>
     <p>A Constituição entra pelo <b>valor</b> do atributo, não pelo modificador. O Deslocamento
     padrão é de 9 metros.</p>
     ${vidaDefesa}
     <h2>Treinamentos e perícias</h2>
     <p>Escolha uma Jogada de Ataque (corpo a corpo ou a distância) e um Teste de Resistência para a
     Invocação ser treinada — Integridade fica de fora. Depois, treine
     <b>1 + metade do modificador de Inteligência ou Sabedoria</b> perícias comuns, mais as extras do
     grau. Ofício está fora do alcance de uma Invocação.</p>
     <p>Todo teste dela usa a mesma fórmula: <b>modificador do atributo-chave + Bônus de Treinamento
     do usuário + metade do nível do Controlador</b>. Sem treinamento na perícia, o Bônus de
     Treinamento não entra.</p>
     <h2>Ações de Ataque</h2>
     <p>Uma Ação de Ataque é obrigatoriamente Complexa e se resolve por jogada de ataque ou por TR
     imposto, com CD igual a <b>10 + metade do nível do usuário (mínimo 1) + modificador do atributo
     relevante</b>. Os valores abaixo são de ataque a distância: em corpo a corpo, aumente o dano em
     3 níveis. Uma área em linha é dobrada. No Grau Especial o bônus é o dobro do modificador.</p>
     ${dano}
     <h2>Ações de Auxílio</h2>
     <p>Os valores são os de uma Ação Simples. Como Ação Complexa, os bônus fixos aumentam 1,5 vez e
     o dano adicional sobe 3 níveis. Curar PV custa 2 PE, e sem Energia Reversa a cura vira PV
     temporários. Cada Ação de Auxílio repetida na mesma rodada sofre o <b>Prejuízo por Múltiplos
     Auxílios</b> descrito na tabela de origem do benefício.</p>
     ${auxilio}
     <h2>Características</h2>
     <p>São os aspectos passivos. Duas Características não podem conceder o mesmo efeito, e elas não
     dão ações, dados extras, imunidades, técnicas, habilidades de especialização nem teleporte —
     salvo maldições domadas e shikigamis de técnica, nos casos que o livro abre. Em Jogadas de
     Ataque e TRs, o bônus em teste vale pela metade e exige um gatilho.</p>
     ${caracteristicas}
     <h2>Ações com Custo</h2>
     <p>Uma Ação com Custo é sempre Complexa, gasta de 1 PE até 2 por grau e só pode ser usada uma
     vez por rodada. Cada PE investido compra: +6 m de alcance, +3 m de área, +1 na jogada de ataque
     ou na CD, ou 2 níveis de dano ou cura por 1 PE. Aplicar uma Condição por 1 rodada custa 2 (Fraca),
     4 (Média) ou 6 (Forte).</p>
     <h2>Hordas</h2>
     <p>Um Controlador pode transformar Invocações em Horda, com um líder de primeiro grau ou inferior
     e membros de grau inferior ao dele. Cada membro soma metade dos próprios PV ao líder, aumenta os
     efeitos das ações e, a cada dois membros, sobe uma categoria de tamanho. A Horda conta como uma
     Invocação só, tanto para o limite em campo quanto como alvo. A metade dos PV máximos ela perde
     metade dos membros, começando pelos de menor grau.</p>
     <p><i>Livro de Regras v2.5.2, p. 255-272.</i></p>`
  );
}

/** Monta a página de condições a partir da configuração do sistema. */
function paginaCondicoes() {
  const grupos = {};
  for (const c of FNM.condicoes) (grupos[c.grupo] ??= []).push(c);
  const secoes = Object.entries(grupos)
    .map(
      ([grupo, lista]) =>
        `<h2>${grupo}</h2><ul>` +
        lista
          .map(c => `<li><b>${c.nome} (${c.nivel}).</b> ${c.efeito}</li>`)
          .join("") +
        `</ul>`
    )
    .join("");
  return (
    `<p>Condições com os mesmos efeitos não se acumulam; aplique apenas os mais severos. Por
     exemplo, um personagem enredado e caído sofre −3 na Defesa, não −5.</p>` +
    `<p>Certas condições aplicam outras condições. Ser imune a uma condição não o torna imune às
     demais citadas dentro dela.</p>` +
    `<p><b>No sistema.</b> Cada condição é um efeito com ícone no token: ligue pelo HUD, pelo botão
     <i>+</i> da faixa de Condições da ficha, ou arraste a condição de uma carta do chat até o token
     ou a ficha. As penalidades entram sozinhas em Defesa, perícias, Testes de Resistência, jogadas
     de ataque, Iniciativa, Redução de Dano e deslocamento — inclusive as das condições que vêm por
     consequência de outra, que a ficha mostra apagadas e sem botão de remover.</p>` +
    secoes +
    `<p><i>Livro de Regras v2.5.2, p. 317-319.</i></p>`
  );
}

/** As tabelas do capítulo de criação que governam a aplicação de condições. */
function paginaAplicandoCondicoes() {
  const niveis = FNM.niveisCondicao;
  const cabecalho = `<tr><th>Nível do Feitiço</th>${niveis
    .map(n => `<th>${n}</th>`)
    .join("")}</tr>`;
  const linhas = Object.entries(FNM.duracaoCondicao)
    .map(([nivel, tabela]) => {
      const rotulo = nivel === "max" ? "Técnica Máxima" : `Nível ${nivel}`;
      const celulas = niveis
        .map(n => {
          const v = tabela[n];
          if (v === -1) return "<td>Cena</td>";
          if (!v) return "<td>—</td>";
          return `<td>${v} ${v === 1 ? "rodada" : "rodadas"}</td>`;
        })
        .join("");
      return `<tr><td><b>${rotulo}</b></td>${celulas}</tr>`;
    })
    .join("");

  const custo = niveis
    .map(n => `<li><b>Condição ${n}.</b> Reduz o dano em ${FNM.reducaoDadosPorCondicao[n]} dado(s).</li>`)
    .join("");
  const sangramento = niveis
    .map(n => `<li><b>Sangramento ${n}.</b> ${FNM.sangramentoPorNivel[n]} de perda de vida.</li>`)
    .join("");

  const porNivel = {};
  for (const c of FNM.condicoes) {
    if (!niveis.includes(c.nivel)) continue;
    (porNivel[c.nivel] ??= []).push(c.nome);
  }
  const classificacao = niveis
    .map(n => `<li><b>${n}s.</b> ${(porNivel[n] ?? []).join(", ")}.</li>`)
    .join("");

  return (
    `<p>Um Feitiço de Dano pode aplicar condições em troca de dados de dano. Um efeito aplica no
     máximo tantas condições quanto o próprio nível, e condições mais fortes exigem níveis maiores:
     nível 0 não aplica nenhuma, nível 1 aplica Fracas, nível 2 também Médias, nível 3 também Fortes,
     e níveis 4 e 5 aplicam todas.</p>` +
    `<h2>Custo em dados de dano</h2><ul>${custo}</ul>` +
    `<h2>Duração padrão</h2>` +
    `<table><thead>${cabecalho}</thead><tbody>${linhas}</tbody></table>` +
    `<p>A criatura ainda pode se livrar antes: no fim de cada turno dela, repete o Teste de
     Resistência contra a mesma CD e se livra em um sucesso. Caído sai com uma ação de movimento,
     Desorientado acaba quando seu efeito acontece e Sangramento só termina no TR.</p>` +
    `<h2>Feitiço focado em condições</h2>
     <p>Deixa de causar dano, conta como um nível acima para escolher a condição — uma só de nível
     superior por Feitiço — e estende a duração padrão em uma rodada, exceto para as Extremas. Uma
     condição acima do que o nível normalmente alcança dura sempre uma rodada.</p>` +
    `<h2>Infligindo Sangramento</h2><ul>${sangramento}</ul>
     <p>O Sangramento cobra a perda de vida no início do turno e se encerra quando a criatura passa
     no TR. Um Sangramento Extremo exige sucesso crítico para acabar.</p>` +
    `<h2>Nível de cada condição</h2><ul>${classificacao}</ul>` +
    `<h2>No sistema</h2>
     <p>Cada Feitiço, Técnica Marcial, arma, habilidade ou ação tem um quadro <b>Condições
     aplicadas</b> na ficha do item. O que for declarado ali sai na carta do chat como um chip
     clicável: clique para aplicar nos alvos marcados, Shift+clique para aplicar nos tokens
     selecionados, ou arraste até um token ou uma ficha. Um efeito de Teste de Ataque só mostra os
     chips quando o ataque acerta, porque é aí que o alvo faz o TR.</p>
     <p>Quando a condição chega com CD, o fim do turno do alvo publica sozinho a carta do novo teste;
     um sucesso apaga a condição. Sangramento cobra a perda de vida no início do turno sem perguntar,
     e durações em rodadas se esgotam sozinhas — a contagem só corre dentro de um combate, porque é
     ele que tem rodadas.</p>
     <p>Para mexer no prazo, clique na condição na faixa da ficha: o ajuste abre com o que resta e
     aceita o valor digitado mesmo que encurte (0 tira o prazo, -1 dura a cena). Já receber a mesma
     condição de novo nunca encurta o que está valendo: fica a duração mais longa entre a nova e o
     que ainda resta da antiga.</p>` +
    `<p><i>Livro de Regras v2.5.2, p. 207-210 e 317-319.</i></p>`
  );
}

function paginaTiposDano() {
  const grupos = {};
  for (const [chave, t] of Object.entries(FNM.tiposDano)) (grupos[t.categoria] ??= []).push(t.nome);
  const secoes = Object.entries(grupos)
    .map(([cat, nomes]) => `<h2>${cat}s</h2><p>${nomes.join(" · ")}</p>`)
    .join("");
  return (
    `<p>Existem quinze tipos de dano, divididos entre físicos, elementais, etéreos e biológicos.</p>` +
    secoes +
    `<h2>Imunidade, Resistência e Vulnerabilidade</h2>
     <ul>
       <li><b>Imunidade.</b> Todo o dano é anulado.</li>
       <li><b>Redução de Dano.</b> O dano diminui em um valor igual à redução.</li>
       <li><b>Resistência.</b> O dano é reduzido pela metade.</li>
       <li><b>Vulnerabilidade.</b> O dano aumenta em metade do total (1,5x). A Redução de Dano ainda
       é aplicada sobre o valor final.</li>
     </ul>
     <h2>Perda de Vida</h2>
     <p>Alguns efeitos não causam dano, mas perda de vida: reduzem os PV atuais e não são afetados
     por redução de dano ou resistências.</p>
     <p><i>Livro de Regras v2.5.2, p. 315-316 e 309.</i></p>`
  );
}

function paginaFeiticos() {
  const linhas = FNM.niveisFeitico
    .map(
      n =>
        `<tr><td>${n.nome}</td><td>${n.custo} PE</td><td>${n.alcance} m</td>` +
        `<td>${n.danoTR || "—"}</td><td>${n.danoAtaque || "—"}</td>` +
        `<td>${n.danoArea || "—"}</td><td>${n.area || "—"}</td></tr>`
    )
    .join("");
  return (
    `<h2>Tabela mestre dos Feitiços</h2>
     <table><thead><tr>
       <th>Nível</th><th>Custo</th><th>Alcance</th>
       <th>Dano (alvo, TR)</th><th>Dano (alvo, ataque)</th>
       <th>Dano (área)</th><th>Área</th>
     </tr></thead><tbody>${linhas}</tbody></table>
     <p>Todo Feitiço tem custo mínimo de 1 PE, exceto os de nível 0.</p>
     <h2>Acesso por nível de personagem</h2>
     <ul>
       <li>Níveis 1 a 4: Feitiços de nível 0 e 1</li>
       <li>Níveis 5 a 8: até nível 2</li>
       <li>Níveis 9 a 12: até nível 3</li>
       <li>Níveis 13 a 16: até nível 4</li>
       <li>Níveis 17 a 20: até nível 5</li>
     </ul>
     <h2>Ganho de Feitiços</h2>
     <p>Todo personagem com técnica inicia com dois Feitiços e recebe um novo em todo nível par,
     além de um adicional nos níveis 10 e 20. Ao subir de nível, você pode alterar até uma
     quantidade de Feitiços igual ao seu Bônus de Treinamento.</p>
     <h2>Durações</h2>
     <ul>
       <li><b>Imediato.</b> O efeito ocorre e o Feitiço se encerra.</li>
       <li><b>Duradouro.</b> Dura uma quantidade específica de tempo.</li>
       <li><b>Sustentado.</b> Exige gasto constante: 1 PE por rodada nos níveis 0 a 2 e 2 PE nos níveis 3 a 5.</li>
       <li><b>Concentrado.</b> Dura enquanto a concentração for mantida.</li>
       <li><b>Variável.</b> Depende de condições específicas do Feitiço.</li>
     </ul>
     <p><i>Livro de Regras v2.5.2, p. 199-206.</i></p>`
  );
}

export const JOURNAL_PACKS = {
  "fnm-regras": {
    entries: [
      {
        _id: id("journal-referencia"),
        name: "Referência Rápida de Regras",
        pages: [
          {
            _id: id("pagina-testes"),
            name: "Testes, CDs e Proficiência",
            content: `<h2>Estrutura de um teste</h2>
              <ol>
                <li>Role um d20 e aplique todos os bônus e modificadores aplicáveis.</li>
                <li>Calcule o resultado total.</li>
                <li>Compare com a Classe de Dificuldade (CD).</li>
                <li>O grau de sucesso é definido.</li>
              </ol>
              <h2>Fórmulas</h2>
              <p><b>Perícia / Resistência</b> = modificador do atributo-chave + metade do nível +
              Bônus de Treinamento (se treinado) + outros bônus. Mestre soma 1,5x o Bônus de Treinamento.</p>
              <p><b>Ataque corpo a corpo</b> = d20 + Força (ou Destreza com Fineza) + metade do nível +
              Bônus de Treinamento (se treinado com a arma) + outros − penalidades.</p>
              <p><b>Ataque a distância</b> = d20 + Destreza + metade do nível + Bônus de Treinamento + outros.</p>
              <p><b>Ataque Amaldiçoado</b> = d20 + atributo da técnica + metade do nível + Bônus de
              Treinamento (você é sempre treinado) + outros.</p>
              <p><b>CD de habilidade</b> = 10 + metade do nível + modificador de atributo + Bônus de
              Treinamento + outros valores.</p>
              <p><b>Defesa</b> = 10 + Destreza + metade do nível + outros bônus.</p>
              <p><b>Atenção</b> = 10 + bônus na perícia Percepção + outros bônus.</p>
              <p><b>Iniciativa</b> = modificador de Destreza + outros bônus.</p>
              <h2>Bônus de Treinamento</h2>
              <p>Inicia em +2 e aumenta em +1 nos níveis 5, 9, 13 e 17.</p>
              <h2>Dificuldade da tarefa</h2>
              <table><thead><tr><th>Dificuldade</th><th>CD base</th></tr></thead><tbody>
                ${FNM.dificuldades.map(d => `<tr><td>${d.nome}</td><td>${d.cd}</td></tr>`).join("")}
              </tbody></table>
              <h2>Vantagem e desvantagem</h2>
              <p>Vantagem: role um dado a mais e use o maior. Desvantagem: role um a mais e use o menor.
              Elas não acumulam e se anulam entre si.</p>
              <h2>Testes de Resistência</h2>
              <p>Astúcia (Inteligência), Fortitude (Constituição), Integridade (Constituição),
              Reflexos (Destreza) e Vontade (Sabedoria).</p>
              <p>Contra efeitos com dano: sucesso reduz o dano à metade. Sucesso crítico (ultrapassar a
              CD em 10 ou mais) ignora completamente dano e condições — mas exige ser <b>mestre</b> no
              teste. Um 20 natural eleva o nível de sucesso em um.</p>
              <p><i>Livro de Regras v2.5.2, p. 276-282.</i></p>`
          },
          {
            _id: id("pagina-acoes"),
            name: "Ações em Combate",
            content: `<p>Todo personagem tem, por turno, uma ação comum, uma ação bônus, uma reação,
              uma ação de movimento e ações livres. A <b>ação completa</b> é a junção da ação comum com
              a ação bônus.</p>
              <h2>Hierarquia de Ações</h2>
              <p>Ação Comum → Ação Bônus → Ação de Movimento. Você pode converter uma ação de valor
              maior em uma de menor valor: a bônus pode virar movimento, e a comum pode virar movimento
              ou bônus.</p>
              <h2>Ações Comuns</h2>
              <ul>
                <li><b>Agarrar.</b> Atletismo contra Atletismo ou Acrobacia do alvo; em um sucesso, o alvo fica Agarrado.</li>
                <li><b>Apoiar.</b> Concede vantagem no próximo teste do aliado, ou na primeira jogada de ataque dele contra um alvo a até 1,5 m de você.</li>
                <li><b>Atacar.</b> Realiza uma jogada de ataque com uma arma.</li>
                <li><b>Derrubar.</b> Atletismo contra Atletismo ou Acrobacia; em um sucesso, o alvo fica Caído.</li>
                <li><b>Desarmar.</b> Atletismo ou Acrobacia contra a mesma perícia do alvo.</li>
                <li><b>Desengajar.</b> Não recebe ataques de oportunidade até o fim do seu turno.</li>
                <li><b>Empurrar.</b> Atletismo contra Atletismo ou Acrobacia; empurra 1,5 m, +1,5 m para cada 5 pontos de diferença.</li>
                <li><b>Esconder.</b> Teste de Furtividade.</li>
                <li><b>Furtar.</b> Prestidigitação contra a Atenção do alvo.</li>
                <li><b>Preparar.</b> Prepara uma ação com um gatilho, usando sua reação.</li>
              </ul>
              <h2>Ações Bônus</h2>
              <ul>
                <li><b>Fintar.</b> Enganação contra Reflexos; deixa o alvo Desprevenido contra seus ataques até o fim do turno.</li>
                <li><b>Invocar.</b> Invoca ou ativa até duas invocações.</li>
                <li><b>Ler Intenções.</b> Intuição ou Percepção contra Enganação ou Intuição; concede +1d4 nos seus TR contra a criatura e −1d4 nos ataques dela contra você.</li>
                <li><b>Mirar.</b> Seu próximo ataque a distância contra o alvo recebe vantagem.</li>
                <li><b>Provocar.</b> Intimidação contra Intimidação ou Intuição; o alvo ganha vantagem para atacar você e desvantagem contra os outros.</li>
              </ul>
              <h2>Ações de Movimento</h2>
              <p><b>Andar</b> (deslocamento completo), <b>Esgueirar</b> (metade), <b>Levantar</b>,
              <b>Pular</b> e <b>Sacar</b> (dois itens).</p>
              <h2>Ação Completa</h2>
              <p><b>Investida.</b> Avança até o dobro do movimento em linha reta e faz um ataque corpo a
              corpo: +2 no ataque e −2 na Defesa até o próximo turno. Não pode ser feita em terreno difícil.</p>
              <h2>Sequência de ataques</h2>
              <p>A cada 2 ataques feitos contra o mesmo alvo em turnos subsequentes, a Defesa dele cai 1,
              até o limite de −5. A sequência termina quando o turno do alvo chega.</p>
              <h2>Críticos e desastres</h2>
              <p>Um 20 na jogada de ataque é um crítico: sempre acerta e todos os dados de dano são
              rolados duas vezes (modificadores somam depois). Um 1 é um desastre: sempre erra, e o alvo
              pode atacá-lo como reação.</p>
              <p><i>Livro de Regras v2.5.2, p. 300-310.</i></p>`
          },
          {
            _id: id("pagina-condicoes"),
            name: "Condições",
            content: paginaCondicoes()
          },
          {
            _id: id("pagina-aplicando-condicoes"),
            name: "Aplicando Condições",
            content: paginaAplicandoCondicoes()
          },
          {
            _id: id("pagina-dano"),
            name: "Tipos de Dano",
            content: paginaTiposDano()
          },
          {
            _id: id("pagina-feiticos"),
            name: "Criação de Feitiços — Tabelas",
            content: paginaFeiticos()
          },
          {
            _id: id("pagina-equipamentos"),
            name: "Equipamentos e Carregamento",
            content: paginaEquipamentos()
          },
          {
            _id: id("pagina-ferramentas"),
            name: "Ferramentas Amaldiçoadas",
            content: paginaFerramentas()
          },
          {
            _id: id("pagina-invocacoes"),
            name: "Invocações",
            content: paginaInvocacoes()
          },
          {
            _id: id("pagina-alma"),
            name: "A Alma, Morte e Exaustão",
            content: `<h2>Integridade da Alma</h2>
              <p>Todo personagem tem Integridade da Alma igual ao seu máximo de Pontos de Vida. Sempre
              que sofrer Dano na Alma, faça um teste de resistência de Integridade: um sucesso reduz o
              dano pela metade e um sucesso crítico o anula.</p>
              <h2>Estados da Alma</h2>
              <ul>
                <li><b>Estável (acima de 75%).</b> Sem prejuízos.</li>
                <li><b>Danificado (abaixo de 75%).</b> −3 em todos os testes e rolagens; custo em energia/estamina aumentado em 2.</li>
                <li><b>Instável (abaixo de 50%).</b> −6 em todos os testes e rolagens; custo aumentado em 3; fica Exposto.</li>
                <li><b>Crítico (abaixo de 25%).</b> −8 e desvantagem em todos os testes e rolagens; custo aumentado em 5; fica Exposto e Fragilizado.</li>
                <li><b>0 de Integridade.</b> O personagem está morto.</li>
              </ul>
              <h2>As Portas da Morte</h2>
              <p>Quando a vida chega a 0, no começo de cada turno role 1d20:</p>
              <ul>
                <li>1: duas falhas</li>
                <li>2 a 9: uma falha</li>
                <li>10 a 19: um sucesso</li>
                <li>20: dois sucessos</li>
              </ul>
              <p>Três sucessos estabilizam (o personagem volta com 1 PV); três falhas matam. Receber
              dano enquanto morrendo adiciona uma falha. Um aliado pode estabilizar com um teste de
              Medicina (ação comum, a até 1,5 m): CD 15, +1 para cada 5 pontos de vida negativos.</p>
              <p>Dano que leve a vida além do negativo do máximo mata imediatamente, sem Portas da Morte.
              Receber, em um único ataque, metade da vida máxima ou mais (mínimo 50) causa um
              Ferimento Complexo.</p>
              <h2>Exaustão</h2>
              <p>Cada nível reduz 1,5 m de deslocamento, com efeitos cumulativos:</p>
              <ul>
                ${FNM.exaustao.map(e => `<li><b>Nível ${e.nivel}.</b> ${e.efeito}</li>`).join("")}
              </ul>
              <p>Um descanso longo recupera apenas um nível de exaustão.</p>
              <h2>Descansos</h2>
              <p><b>Curto (2 a 4 horas).</b> Pode gastar Dados de Vida para curar (somando Constituição
              a cada dado) e recupera metade do máximo de energia amaldiçoada.</p>
              <p><b>Longo (cerca de 8 horas).</b> Recupera todos os PV, todos os Dados de Vida e toda a
              energia amaldiçoada.</p>
              <p><i>Livro de Regras v2.5.2, p. 311-313, 324 e 335.</i></p>`
          }
        ]
      }
    ]
  },

  /**
   * O Guia de Criação de Inimigos do Grimório das Maldições (Versão 1).
   *
   * Todas as páginas citadas nestas entradas são do Grimório, não do Livro de
   * Regras. O compêndio é só do Narrador: a ownership do pack em system.json
   * deixa os jogadores de fora.
   */
  "fnm-grimorio": {
    entries: [
      {
        _id: id("journal-grimorio"),
        name: "Guia de Criação de Inimigos",
        pages: [
          {
            _id: id("pagina-grimorio-passos"),
            name: "Os Quatro Passos",
            content: `<p><i>Grimório das Maldições, Versão 1 (F&amp;M 2.5). Desenvolvimento:
              Setsugiri, Parker, Jou, Justoneblock, Camelo, Kamisori, Bianco, A1rtur Butler e Afty.</i></p>
              <h2>Passo 1 — O conceito</h2>
              <p>Antes da ficha, três perguntas (p. 6):</p>
              <ul>
                <li><b>O que define a criatura como uma ameaça?</b> Quais são as "armas" e os riscos
                que ela oferece — destruir os outros, ou fortalecer outros inimigos e ser uma ameaça
                indireta.</li>
                <li><b>Quão poderoso o inimigo é?</b> Descartável, vindo em quantidade para encher o
                campo, ou individualmente poderoso e capaz de segurar vários oponentes? A resposta
                encaixa o inimigo em um Patamar e em uma ND.</li>
                <li><b>Qual sua estratégia em combate?</b> A abordagem define quais ações e
                características a ficha precisa ter para executá-la.</li>
              </ul>
              <h2>Passo 2 — Montando a ficha</h2>
              <p>Define-se o Grau, a ND e o Patamar, e a partir deles preenchem-se os valores pelas
              tabelas do capítulo. A ficha de inimigo do livro tem: tipo e grau (ND), Bônus de
              Treinamento, PV, Defesa, PE, Tamanho, Deslocamento, os seis atributos, os Níveis de
              Aptidão, os cinco Testes de Resistência, Iniciativa, Atenção, Perícias, Resistências,
              Imunidades, as Ações e as Características (p. 7).</p>
              <h2>Passo 3 — Ações e Características</h2>
              <p>As ações ofensivas e defensivas saem do conceito e da origem. O conceito não
              concede bônus: ele é narrativo (p. 53).</p>
              <h2>Passo 4 — Detalhes finais</h2>
              <p>Os <b>Treinamentos</b> são o toque final. Uma criatura recebe <b>1 ponto de
              treinamento + 1 ponto para cada grau</b> (p. 61). Os 14 treinamentos estão no
              compêndio de Dotes de Inimigo, na pasta Treinamentos.</p>
              <p><i>Grimório das Maldições v1, p. 6-7, 53 e 61.</i></p>`
          },
          {
            _id: id("pagina-grimorio-grau"),
            name: "Grau, ND e Patamar",
            content: `<h2>Os graus</h2>
              <p>A hierarquia de graus define o nível de ameaça, o tipo de resposta necessária e a
              probabilidade de sobrevivência de quem os enfrenta — não só força bruta, mas também
              inteligência, habilidade amaldiçoada, resistência e potencial de massacre.</p>
              <ul>
                <li><b>4º Grau.</b> Fraca, facilmente exorcizada por estudantes iniciantes. Maldições
                menores que parasitam pessoas comuns; humanos com pouco conhecimento jujutsu.</li>
                <li><b>3º Grau.</b> Podem matar civis, mas feiticeiros experientes lidam com
                facilidade. Maldições de lugares assombrados; membros de organizações jujutsu.</li>
                <li><b>2º Grau.</b> Exigem técnica jujutsu sólida e oferecem risco moderado.
                Espíritos em locais densamente povoados; líderes de organizações pequenas e médias.</li>
                <li><b>1º Grau.</b> Altamente perigosas; só feiticeiros de 1º grau as enfrentam.
                Espíritos com inteligência e técnica amaldiçoada; feiticeiros experientes.</li>
                <li><b>Grau Especial.</b> Extremamente raras e devastadoras, rivalizam com feiticeiros
                lendários. Sukuna, Mahito, Suguru Geto, Satoru Gojo, Yuki Tsukumo.</li>
              </ul>
              <h2>Nível de Desafio</h2>
              <p>A ND é a representação numérica da criatura em relação ao nível do jogador:
              <b>ND 2 é a mesma coisa que um personagem de nível 2</b>.</p>
              <table><thead><tr><th>Nível de Desafio</th><th>Bônus de Treinamento</th></tr></thead>
                <tbody>
                  <tr><td>1 ao 4</td><td>+2</td></tr>
                  <tr><td>5 ao 8</td><td>+3</td></tr>
                  <tr><td>9 ao 12</td><td>+4</td></tr>
                  <tr><td>13 ao 16</td><td>+5</td></tr>
                  <tr><td>17 ou superior</td><td>+6</td></tr>
                </tbody></table>
              <h2>Patamar</h2>
              <p>O Patamar define a dificuldade e a quantidade recomendada de jogadores. Menos
              jogadores que o especificado sobem a dificuldade em um passo; mais jogadores a descem
              em um passo.</p>
              <table><thead><tr><th>Patamar</th><th>Dificuldade</th><th>Jogadores</th>
                <th>Pontos de atributo</th><th>Teto por atributo</th><th>Características</th></tr></thead>
                <tbody>
                  ${FNM.patamares
                    .map(
                      p =>
                        `<tr><td>${p.nome}</td><td>${p.dificuldade}</td><td>${p.jogadores}</td>` +
                        `<td>${p.formulaAtributos}</td><td>${p.limiteAtributo}</td>` +
                        `<td>${p.caracteristicas}</td></tr>`
                    )
                    .join("")}
                </tbody></table>
              <h2>Ações por turno</h2>
              <table><thead><tr><th>Patamar</th><th>Total de ações</th></tr></thead><tbody>
                ${FNM.patamares.map(p => `<tr><td>${p.nome}</td><td>${p.acoes}</td></tr>`).join("")}
              </tbody></table>
              <h2>As três colunas das tabelas</h2>
              <ul>
                <li><b>Iniciantes.</b> Gama menor de força, para criaturas mais fracas e para uma
                primeira experiência mais divertida no sistema.</li>
                <li><b>Intermediárias.</b> Para jogadores casuais, que conhecem o sistema mas não
                otimizam a ficha por completo.</li>
                <li><b>Experientes.</b> Para quem otimiza muito e quer combates difíceis — a forma
                mais poderosa de criação de criaturas do Grimório.</li>
              </ul>
              <p><i>Grimório das Maldições v1, p. 8, 16 e 60. As tabelas numéricas por ND (vida,
              defesa, acerto, dano médio e CD de cada Patamar) estão nas p. 23-52 do PDF e não foram
              transcritas: veja a nota de escopo no README.</i></p>`
          },
          {
            _id: id("pagina-grimorio-origens"),
            name: "Origens de Inimigo",
            content: `<p>A Origem representa que tipo de existência o inimigo é, e concede
              características e limitações próprias (p. 9-15).</p>
              <h2>Espíritos Amaldiçoados</h2>
              <p>Seres que surgem puramente da negatividade, formando-se onde o medo se acumula, o
              ódio se perpetua e a dor ecoa por gerações. São manifestações do inconsciente, de
              emoções, lendas, traumas e pecados.</p>
              <ul>
                <li><b>Comuns.</b> Não têm ninho nem local de fortalecimento; vagam atrás de pessoas
                emocionalmente instáveis para se alimentar e parasitar seus corpos.</li>
                <li><b>De Medo.</b> Originam-se de medos e fobias humanas, já nascem poderosos e
                crescem conforme cresce o medo que os formou.</li>
                <li><b>Vingativos.</b> Formados quando um humano morre e se torna espírito
                amaldiçoado; têm força impressionante e aumentam com as emoções que sentem.</li>
                <li><b>Vingativos Imaginários.</b> Nascidos de mitos e lendas que assustam a
                humanidade. Funcionam como uma quimera dos vingativos e dos de medo.</li>
                <li><b>Enfermos.</b> Formados da energia amaldiçoada de humanos enfermos; já nascem
                com o feitiço inato, uma propagação amaldiçoada da própria doença.</li>
              </ul>
              <p><b>Imaterialidade.</b> Como ser imaterial, uma maldição atravessa estruturas sem
              energia, não precisa respirar e não pode ser vista nem percebida por humanos que não
              enxergam o mundo amaldiçoado.</p>
              <h2>Feiticeiros e Caçadores</h2>
              <p>Humanos capazes de manipular e controlar energia amaldiçoada, os únicos capazes de
              exorcizar e de enxergar maldições.</p>
              <h2>Não-Feiticeiros</h2>
              <p><b>Artimanhas.</b> Sem o poder do jujutsu, compensa-se com truques: recebe uma
              quantidade de Artimanhas igual ao seu Bônus de Treinamento.</p>
              <p><b>Necessidade de Agir.</b> Diante de um gatilho ou vislumbre do mundo amaldiçoado,
              agir se torna uma necessidade.</p>
              <h2>Restritos Celestes</h2>
              <p>Humanos que passaram por um voto congênito com o jujutsu ao nascer: pouca ou nenhuma
              energia amaldiçoada em troca de um físico capaz de rivalizar com feiticeiros. A
              Restrição de <b>corpo por energia</b> é a mais trágica e ao mesmo tempo a mais poderosa
              da obra.</p>
              <h2>Corpos Amaldiçoados</h2>
              <p>Objetos inanimados envolvidos em energia amaldiçoada ou em um feitiço para que
              ganhem vida. Por base não possuem consciência.</p>
              <p><i>Grimório das Maldições v1, p. 9-15.</i></p>`
          },
          {
            _id: id("pagina-grimorio-ficha"),
            name: "Preenchendo a Ficha",
            content: `<h2>Tamanho</h2>
              <table><thead><tr><th>Tamanho</th><th>Espaço e alcance CaC</th>
                <th>Manobra / Furtividade</th><th>Deslocamento padrão</th><th>Exemplo</th></tr></thead>
                <tbody>
                  ${Object.entries(FNM.tamanhosCriatura)
                    .map(
                      ([nome, t]) =>
                        `<tr><td>${nome}</td><td>${t.espaco} m</td>` +
                        `<td>${t.manobra >= 0 ? "+" : ""}${t.manobra} / ${t.furtividade >= 0 ? "+" : ""}${t.furtividade}</td>` +
                        `<td>${t.deslocamento} m</td><td>${t.exemplo}</td></tr>`
                    )
                    .join("")}
                </tbody></table>
              <h2>Pontos de Vida e de Energia</h2>
              <p>O cálculo de vida foi feito para a criatura aguentar <b>3 rodadas inteiras</b> contra
              os jogadores. Para mais rodadas, dobre a vida ou some
              <code>Valor de Constituição × (Treinamento × 2) × Quantidade de jogadores</code>.</p>
              <p>Os Pontos de Energia seguem a mesma lógica de 3 rodadas; para esticar, multiplique o
              total por 1,5. Nem todo inimigo tem PE especificados.</p>
              <h2>Perícias</h2>
              <p>Uma criatura pode ter uma quantidade de perícias igual ao seu <b>maior modificador de
              atributo mental</b>. Usar uma perícia é uma Ação Comum.</p>
              <h2>Recursos de defesa e sobrevivência</h2>
              <ul>
                <li><b>Redução de Dano Geral.</b> Pode ser remanejada entre tipos — tirar de físico
                para pôr em elemental, por exemplo.</li>
                <li><b>RD Irredutível.</b> O limite que não pode ser diminuído da RD geral. <b>Não
                acumula</b> com ela: com RD 50 e irredutível 30, um jogador que reduza 25 leva a RD a
                30, e não abaixo disso.</li>
                <li><b>Ignorar RD.</b> Ignora as reduções de dano do alvo, seja qual for o tipo.</li>
                <li><b>Vida Temporária por Ataque.</b> Ganha a cada ataque sofrido no mesmo turno.
                Não acumula nem soma com a anterior.</li>
                <li><b>Guarda Inabalável.</b> Vida temporária recebida todo início de rodada.</li>
                <li><b>Resistência Parcial.</b> Sobe o resultado de um teste de resistência em um
                passo: falha crítica vira falha, falha vira sucesso, sucesso vira sucesso crítico.</li>
                <li><b>Resistência Total.</b> Recebe automaticamente sucesso crítico no lugar do
                sucesso.</li>
                <li><b>Desafiando a Morte.</b> Último recurso: a criatura perde metade de suas ações
                (arredondando para cima) e, todo turno, faz um teste de Fortitude com CD
                <b>25 + 1 para cada 50 de vida negativa</b>. Em uma falha fica suscetível à
                finalização, que custa uma ação completa. Toda cura dela cai pela metade.</li>
              </ul>
              <h2>Imunidades, resistências e vulnerabilidades</h2>
              <p>Para cada imunidade recebida, a criatura deve receber uma vulnerabilidade condizente.
              Aplicar resistência não interfere nas imunidades nem nas vulnerabilidades.</p>
              <table><thead><tr><th>Patamar</th><th>Imunidade</th><th>Resistência</th>
                <th>Vulnerabilidade</th><th>Imunidades a condição</th></tr></thead><tbody>
                  ${FNM.patamares
                    .map(p => {
                      const v = n => (n ? `Até ${n}` : "Não recebe nada");
                      return (
                        `<tr><td>${p.nome}</td><td>${v(p.imunidades)}</td>` +
                        `<td>${v(p.resistencias)}</td><td>${v(p.vulnerabilidades)}</td>` +
                        `<td>${p.imunidadesCondicao || "Não recebe nada"}</td></tr>`
                      );
                    })
                    .join("")}
                </tbody></table>
              <p>Não é possível ser imune a <b>manobras</b>, a <b>desmembramentos</b> e ao <b>acerto
              garantido</b> de expansão de domínio. As imunidades a condição se distribuem pela
              métrica: Extrema = 1, Forte = 2, Média e Fraca = quantas quiser.</p>
              <p><i>Grimório das Maldições v1, p. 17-22.</i></p>`
          },
          {
            _id: id("pagina-grimorio-acoes"),
            name: "Criando Ações e Condições",
            content: `<h2>Parâmetros de alcance e área</h2>
              <table><thead><tr><th>Treinamento</th><th>Alcance máximo</th><th>Área máxima</th>
                <th>Redução para corpo a corpo</th></tr></thead><tbody>
                  <tr><td>+2</td><td>12 m</td><td>4,5 m</td><td>1 dado</td></tr>
                  <tr><td>+3</td><td>18 m</td><td>6 m</td><td>1 dado</td></tr>
                  <tr><td>+4</td><td>24 m</td><td>9 m</td><td>2 dados</td></tr>
                  <tr><td>+5</td><td>30 m</td><td>12 m</td><td>2 dados</td></tr>
                  <tr><td>+6</td><td>48 m</td><td>18 m</td><td>3 dados</td></tr>
                </tbody></table>
              <p>Para reduzir o alcance e ganhar mais dano, acerto ou CD, reduza-o diretamente para
              corpo a corpo e converta: <b>1 dado de dano = +2 de acerto = +1 de CD</b>.</p>
              <h2>Tipo de ataque</h2>
              <ul>
                <li><b>Teste de Acerto.</b> Leva o valor cheio da tabela de dano.</li>
                <li><b>Teste de Resistência individual.</b> Tem o valor reduzido em 1 nível de desafio;
                em uma Calamidade 5, reduza o dano em 4 de dano fixo.</li>
                <li><b>Teste de Resistência em área.</b> Tem o valor reduzido pela metade.</li>
              </ul>
              <p>Ataque com arma mantém o dano normal; ataque de narrativa física (soco, chute,
              mordida) reduz em 2 dados de dano.</p>
              <h2>Aplicando condições</h2>
              <p>Para adicionar uma condição à técnica é preciso reduzir o dano conforme o nível da
              condição, <b>ou</b> pagar o valor em pontos de energia — nunca misturando os dois.</p>
              <table><thead><tr><th>Bônus de Treinamento</th><th>Nível de condição</th>
                <th>Pontos de Energia</th><th>Níveis de ND</th></tr></thead><tbody>
                  <tr><td>+2</td><td>Fraca</td><td>2 PE</td><td>1 nível de ND</td></tr>
                  <tr><td>+3</td><td>Média</td><td>5 PE</td><td>2 níveis de ND</td></tr>
                  <tr><td>+4</td><td>Forte</td><td>8 PE</td><td>3 níveis de ND</td></tr>
                  <tr><td>+5</td><td>Extrema</td><td>10 PE</td><td>4 níveis de ND</td></tr>
                </tbody></table>
              <h3>Níveis das condições</h3>
              <p><b>Fracas.</b> Abalado, Caído, Desarmar, Desorientado, Desprevenido, Empurrar,
              Sangramento, Sofrendo.</p>
              <p><b>Médias.</b> Agarrado, Amedrontado, Condenado, Confuso, Enfeitiçado, Engasgando,
              Enjoado, Enredado, Envenenado, Lento, Surdo.</p>
              <p><b>Fortes.</b> Aterrorizado, Cego, Exposto, Imóvel, Invisível, Surpreso.</p>
              <p><b>Extremas.</b> Atordoado, Desmembramento, Fragilizado, Fragmentado, Inconsciente,
              Paralisado.</p>
              <p>O texto de cada condição está no compêndio de Referência de Regras e nos efeitos de
              status do Foundry.</p>
              <h2>Versatilidade</h2>
              <p>Abrindo mão de 1 ação comum para uma mesma habilidade, a criatura recebe um benefício
              de ritual: Ajuste de Alvos, Aumento de Alcance, Aumento de Dano, Aumento de Precisão,
              Conversão de Sustento, Expansão de Área ou Potencialização de Dificuldade.</p>
              <h2>Alma</h2>
              <p>Mexer com alma e sanidade pode matar jogadores sem que eles tenham chance de se
              defender — use em situações específicas e com criaturas escolhidas a dedo. Para dano na
              alma, role o dano normal das tabelas e <b>divida o total por 3</b>.</p>
              <p><i>Grimório das Maldições v1, p. 53-59.</i></p>`
          }
        ]
      }
    ]
  }
};

/* -------------------------------------------- */
/*  Macros                                      */
/* -------------------------------------------- */

export const MACRO_PACKS = {
  "fnm-macros": {
    macros: [
      {
        _id: id("macro-teste-rapido"),
        name: "Teste Rápido (d20)",
        img: "icons/svg/d20.svg",
        command: `// Rola um d20 simples com bônus e CD informados, para o ator selecionado.
const ator = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (!ator) return ui.notifications.warn("Selecione um token ou defina seu personagem.");
await ator.executarTeste({ label: "Teste", bonus: 0, cd: 15, situacional: 0 });`
      },
      {
        _id: id("macro-iniciativa-grupo"),
        name: "Rolar Iniciativa do Grupo",
        img: "icons/svg/clockwork.svg",
        command: `// Rola iniciativa para todos os combatentes que ainda não rolaram.
if (!game.combat) return ui.notifications.warn("Nenhum combate ativo.");
const pendentes = game.combat.combatants.filter(c => c.initiative === null).map(c => c.id);
if (!pendentes.length) return ui.notifications.info("Todos já rolaram iniciativa.");
await game.combat.rollInitiative(pendentes);`
      },
      {
        _id: id("macro-aplicar-dano"),
        name: "Aplicar Dano nos Tokens Selecionados",
        img: "icons/svg/blood.svg",
        command: `// Aplica a mesma quantidade de dano em todos os tokens selecionados.
const alvos = canvas.tokens.controlled.map(t => t.actor).filter(Boolean);
if (!alvos.length) return ui.notifications.warn("Selecione ao menos um token.");

const tipos = Object.entries(game.fnm.config.tiposDano)
  .map(([id, t]) => \`<option value="\${id}">\${t.nome}</option>\`).join("");

const dados = await foundry.applications.api.DialogV2.prompt({
  window: { title: \`Aplicar dano em \${alvos.length} alvo(s)\` },
  content: \`<div class="form-group"><label>Quantidade</label>
      <input type="number" name="qtd" value="0" min="0" autofocus /></div>
    <div class="form-group"><label>Tipo</label>
      <select name="tipo"><option value="">—</option>\${tipos}</select></div>\`,
  rejectClose: false,
  ok: {
    label: "Aplicar",
    callback: (e, b) => ({
      qtd: Number(b.form.elements.qtd?.value ?? 0) || 0,
      tipo: b.form.elements.tipo?.value ?? ""
    })
  }
});
if (!dados) return;
for (const ator of alvos) await ator.aplicarDano(dados.qtd, { tipo: dados.tipo });`
      },
      {
        _id: id("macro-descanso-longo"),
        name: "Descanso Longo do Grupo",
        img: "icons/svg/sleep.svg",
        command: `// Realiza um descanso longo em todos os personagens dos jogadores.
const personagens = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
if (!personagens.length) return ui.notifications.warn("Nenhum personagem de jogador encontrado.");
for (const ator of personagens) await ator.descansoLongo();`
      }
    ]
  }
};
