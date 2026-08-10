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
import { FNM } from "../module/config.mjs";

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
/*  Armas Simples (p. 132)                      */
/* -------------------------------------------- */

/**
 * Transcrição da Tabela de Armas Simples. A tabela do PDF tem os nomes em uma
 * coluna e os valores em outra: a correspondência abaixo segue a ordem das
 * linhas. Confira contra o livro antes de usar em mesa.
 */
const ARMAS = [
  { nome: "Adaga", cat: "Simples", dano: "1d6", tipo: "perfurante", crit: 18, esp: 1, custo: 1, grupo: "faca", fineza: true, props: "Apunhaladora, arremessável [6/18m], fineza, leve, marcial, modular Ct" },
  { nome: "Bastão", cat: "Simples", dano: "1d6", vers: "1d8", tipo: "impacto", crit: 19, esp: 2, custo: 1, grupo: "bastao", props: "Amplo, dupla, marcial, versátil" },
  { nome: "Clava", cat: "Simples", dano: "1d8", vers: "1d10", tipo: "impacto", crit: 20, esp: 1, custo: 1, grupo: "bastao", props: "Versátil" },
  { nome: "Espada Curta", cat: "Simples", dano: "1d6", tipo: "cortante", crit: 19, esp: 1, custo: 1, grupo: "espada", fineza: true, props: "Fineza, leve, marcial, modular Pf" },
  { nome: "Faixas", cat: "Simples", dano: "—", tipo: "", crit: 20, esp: 1, custo: 1, grupo: "pugilato", props: "Especial" },
  { nome: "Foice", cat: "Simples", dano: "1d6", tipo: "cortante", crit: 19, esp: 1, custo: 1, grupo: "haste", fineza: true, props: "Fineza, leve, marcial" },
  { nome: "Lança", cat: "Simples", dano: "1d6", vers: "1d8", tipo: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "haste", props: "Arremessável [6/18m], estendida, versátil" },
  { nome: "Leque", cat: "Simples", dano: "1d6", tipo: "impacto", crit: 18, esp: 1, custo: 1, grupo: "", fineza: true, props: "Fineza, enérgica, leve, especial" },
  { nome: "Machado", cat: "Simples", dano: "1d8", vers: "1d10", tipo: "cortante", crit: 20, esp: 1, custo: 1, grupo: "machado", props: "Versátil" },
  { nome: "Mangual", cat: "Simples", dano: "1d8", tipo: "impacto", crit: 20, esp: 1, custo: 1, grupo: "chicote", props: "Ampla, enérgica" },
  { nome: "Manoplas", cat: "Simples", dano: "Especial", tipo: "impacto", crit: 20, esp: 1, custo: 2, grupo: "pugilato", props: "Aparar, duas mãos, dupla, especial, pesado [16]" },
  { nome: "Martelo", cat: "Simples", dano: "1d8", vers: "1d10", tipo: "impacto", crit: 20, esp: 1, custo: 1, grupo: "martelo", props: "Versátil" },
  { nome: "Soco Inglês", cat: "Simples", dano: "Especial", tipo: "impacto", crit: 20, esp: 1, custo: 2, grupo: "pugilato", fineza: true, props: "Enérgica, especial, fineza, marcial" },
  { nome: "Tridente", cat: "Simples", dano: "1d6", vers: "1d8", tipo: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "haste", props: "Arremessável [6/18m], estendida, versátil" },

  { nome: "Arco Curto", cat: "A Distância", dano: "1d6", tipo: "perfurante", crit: 19, esp: 2, custo: 1, grupo: "arco", alcance: "24/48m", props: "Duas mãos, mortal d10, alcance [24/48m]" },
  { nome: "Besta Leve", cat: "A Distância", dano: "1d8", tipo: "perfurante", crit: 19, esp: 1, custo: 1, grupo: "arco", alcance: "24/48m", props: "Mortal d10, leve, alcance [24/48m], recarga [1]" },
  { nome: "Pistola", cat: "A Distância", dano: "1d10", tipo: "perfurante", crit: 20, esp: 1, custo: 2, grupo: "tiro", alcance: "36/72m", props: "Alcance [36/72m], emperrar, leve, recarga [12]" },

  { nome: "Azagaia", cat: "De Arremesso", dano: "1d6", tipo: "perfurante", crit: 20, esp: 1, custo: 1, grupo: "dardo", alcance: "12/24m", props: "Leve, alcance [12/24m]" },
  { nome: "Dardo", cat: "De Arremesso", dano: "1d4", tipo: "perfurante", crit: 18, esp: 1, custo: 1, grupo: "dardo", alcance: "12/24m", props: "Leve, alcance [12/24m], especial" },
  { nome: "Faca de Arremesso", cat: "De Arremesso", dano: "1d6", tipo: "perfurante", crit: 20, esp: 1, custo: 1, grupo: "faca", alcance: "12/24m", props: "Leve, alcance [12/24m], modular Ct" }
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
    folders: [],
    items: ARMAS.map(a => ({
      _id: id(`arma-${a.nome}`),
      name: a.nome,
      type: "arma",
      img: "icons/svg/sword.svg",
      system: {
        description: `<p>Arma ${a.cat.toLowerCase()} do grupo ${a.grupo || "—"}.
          Transcrita da tabela de armas do Livro de Regras v2.5.2 (p. 132).</p>`,
        categoria: a.cat,
        grupo: a.grupo ?? "",
        dano: a.dano,
        danoVersatil: a.vers ?? "",
        tipoDano: a.tipo ?? "",
        critico: a.crit,
        propriedades: a.props,
        alcance: a.alcance ?? "",
        espacos: a.esp,
        custo: a.custo,
        grau: "",
        fineza: a.fineza === true,
        treinado: true,
        equipada: false,
        bonusAtaque: 0,
        bonusDano: 0,
        quantidade: 1,
        ajustes: { ...semAjustes }
      }
    }))
  }
};

/* -------------------------------------------- */
/*  Referência de regras (JournalEntry)         */
/* -------------------------------------------- */

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
    secoes +
    `<p><i>Livro de Regras v2.5.2, p. 317-319.</i></p>`
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
