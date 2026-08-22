# Feiticeiros & Maldições — Sistema Não-Oficial para Foundry VTT

Sistema **não-oficial**, feito por fã, para jogar **Feiticeiros & Maldições** no
[Foundry VTT](https://foundryvtt.com/). Baseado no **Livro de Regras v2.5.2** e no
**Grimório das Maldições (Versão 1)**.

> **Feiticeiros & Maldições** é um projeto criado de fãs para fãs, gratuito e sem fins lucrativos,
> ambientado no universo de **Jujutsu Kaisen**, obra de **Gege Akutami**.
> Desenvolvimento: Setsugiri e Parker · Diagramação e Edição: Setsugiri e Jou ·
> Revisão: Jou, Kame e Parker · Artes originais: Konatsuu e Strabey.
> Grimório das Maldições — Desenvolvimento: Setsugiri, Parker, Jou, Justoneblock, Camelo,
> Kamisori, Bianco, A1rtur Butler e Afty · Diagramação e Edição: Setsugiri.
>
> Este sistema não é afiliado, endossado nem patrocinado pelos autores de Feiticeiros & Maldições
> ou pelos detentores dos direitos de Jujutsu Kaisen. Todos os créditos da obra original são de
> Gege Akutami. O sistema implementa as **mecânicas** para uso em mesa; ele **não** reproduz o
> livro — use-o junto do PDF oficial, que continua sendo a referência.

Construído sobre a mesma arquitetura do [sistema de ETMOS](https://github.com/jmchervinski/etmos):
Foundry v13+, `ApplicationV2`, `TypeDataModel` e compêndios gerados pela CLI oficial.

---

## Instalação

**Via manifesto** (quando houver release publicada):

```
https://github.com/jmchervinski/FnM/releases/latest/download/system.json
```

**Manualmente:** copie esta pasta para `Data/systems/fnm` no seu diretório de dados do Foundry.

## Requisitos

- Foundry VTT **v13** ou superior (verificado na v14)
- Node.js 18+ apenas para reconstruir os compêndios

---

## O que o sistema faz

### Tipos de ator

| Tipo | Uso |
| --- | --- |
| **Personagem** | Feiticeiro jogável, com sete abas espelhando as páginas do Modelo de Ficha oficial v2.5 (Ficha Pessoal, Perícias, Perfil Amaldiçoado, Feitiços, Registro e Inventário, Progressão, Treinamentos) |
| **NPC / Maldição** | Antagonistas, com PV e Defesa fixos por padrão, imunidades, resistências e vulnerabilidades, uma aba de **Ações** separando ataques de efeitos por Teste de Resistência — e o **orçamento de criação do Grimório**: Patamar, ND, Tamanho e os tetos de atributo, perícia, imunidade e característica que o Patamar concede |
| **Invocação** | Shikigamis, corpos amaldiçoados, marionetes e maldições domadas, com Vida, Defesa, testes e custo derivados do grau e do invocador |

### Tipos de item

Origem · Especialização · Habilidade de Especialização · Talento · Aptidão Amaldiçoada ·
Técnica Amaldiçoada · Feitiço · Arma · Equipamento · Voto de Restrição · Ação de Invocação ·
**Dote de Inimigo** · **Característica de Inimigo**.

### Regras automatizadas

Tudo abaixo é calculado ou executado pelo sistema, com a página do livro anotada no código:

- **Modificadores de atributo** e **Bônus de Treinamento** (+2, subindo nos níveis 5, 9, 13 e 17)
- **Perícias e Testes de Resistência**: atributo + metade do nível + proficiência
  (Treinado = BT, Mestre = 1,5x BT) + outros. Perícias que exigem treinamento são sinalizadas
- **Defesa**, **Atenção**, **Iniciativa** e **Deslocamento** derivados
- **CD Amaldiçoada** e **CD de Especialização**
- **PV, PE e Estamina** somados a partir dos itens de Especialização, incluindo **Multiclasse**
  (o 1º nível de uma nova especialização usa o valor de níveis subsequentes). Especialista em
  Técnica, Controlador e Suporte somam ao máximo de PE o modificador do **atributo-chave escolhido
  no item da especialização** — uma única vez, e só pela especialização principal (p. 21, 44 e 47)
- **Dados de Vida** por tamanho, gastos no Descanso Curto
- **Rolagens d20** com vantagem/desvantagem, bônus situacional e CD, com grau de sucesso na carta
- **Sucesso crítico em TR** apenas para quem é Mestre no teste; 20 natural eleva o grau de sucesso
- **Jogadas de Ataque** com um diálogo próprio, que reúne o que a situação decide: atributo
  (Fineza e armas de arremesso), empunhadura de arma versátil, Defesa do alvo — já preenchida a
  partir do token alvejado — **cobertura**, **camuflagem** e faixa de **alcance**. Os modificadores
  aparecem item a item antes de rolar, e o total se refaz ao trocar o atributo ou o situacional
- **Veredito do ataque** na carta do chat: crítico pelo limiar da arma (com o acerto garantido só
  no 20 natural), desastre no 1, o d10 da camuflagem e a Defesa já somada à cobertura. A carta abre
  o mesmo detalhamento do diálogo e traz os botões de **dano**, que já sabem do crítico, do atributo
  usado e da empunhadura escolhida
- **Dano** com dados dobrados no crítico (modificadores somados depois, uma vez só) e com o bônus
  do grau da Ferramenta Amaldiçoada
- **Conjuração de Feitiços**: gasta PE, avisa quando o nível está fora do seu acesso, aplica o
  acréscimo de custo do Estado da Alma e resolve por TR ou pelo mesmo fluxo de ataque das armas
- **Efeitos por Teste de Resistência** saem numa carta própria, que não resolve nada sozinha: quem
  rola é o alvo. A carta **guarda quem estava marcado como alvo na hora em que o efeito saiu**, e o
  botão de **rolar o TR** rola para eles, com a CD já preenchida — é isso que faz o botão funcionar
  para o jogador do alvo, que não marcou ninguém e talvez nem tenha o próprio token selecionado. A
  carta mostra de quem ela está falando. O botão de **dano** aparece quando o efeito causa
- **Aplicar o dano** nos alvos pela própria carta, em **cheio**, **metade** (sucesso no TR) ou
  **dobro** (vulnerabilidade), além de um botão para devolver o valor como **cura**. A Redução de
  Dano de cada alvo é descontada na aplicação
- **A Defesa do alvo é do Narrador.** Com um alvo marcado, o jogador rola sem ver o número — o
  diálogo esconde o campo e a carta mostra só o veredito. O Narrador vê o valor nos dois lugares
- **Custo de Feitiço** derivado do nível, com Marca Registrada e afins reduzindo até o mínimo de 1
- **Integridade da Alma** e seus quatro **Estados** (penalidade em rolagens, custo extra e condições)
- **Dano na Alma**: ignora RD e PV temporários, reduz a vida máxima junto da atual
- **Portas da Morte** completas, incluindo dano massivo, morte instantânea e aviso de Ferimento Complexo
- **Exaustão** de 0 a 6, com penalidade progressiva e perda de deslocamento
- **Carregamento**: limite de 8 espaços + o dobro do modificador de Força, com a **sobrecarga**
  cobrando -5 na Defesa e -4,5 m de Deslocamento, e aviso ao passar do dobro do limite
- **Uniformes e escudos** equipados lançam o bônus na Defesa e a Redução de Dano na ficha, e a
  penalidade deles — cumulativa entre os dois — pesa só nas perícias de Destreza
- **Ferramentas Amaldiçoadas**: o grau da ferramenta define o bônus de dano da arma, a RD do
  escudo e quantos Encantamentos ela acumula
- **Invocações** montadas pelo grau: Vida, Defesa, custo em PE e o bônus de todo teste saem das
  fórmulas do capítulo 10, usando o nível e o Bônus de Treinamento do **invocador**. A ficha mostra
  o orçamento da criação — pontos de atributo, perícias treinadas, Ações/Características e Ações
  com Custo — e destaca o que passou do limite
- **Ações e Características de Invocação** como itens próprios, com as tabelas de dano, cura,
  bônus e RD do grau à mão na ficha
- **Inimigos montados pelo Patamar** (Grimório, p. 8-22): a ficha de NPC mostra o orçamento do
  Patamar escolhido — pontos de atributo e o teto por atributo, perícias treinadas, imunidades,
  resistências, vulnerabilidades, imunidades a condição, características recomendadas e as ações
  do turno — e destaca o que passou do limite. O **Bônus de Treinamento por ND** satura em +6
- **Descanso Curto e Longo**
- As **28 condições** do livro registradas como efeitos de status do Foundry

### Campos vindos do Modelo de Ficha oficial v2.5

A ficha do sistema segue o layout do arquivo oficial, campo a campo:

- **PV, PE e Integridade** no formato **Atuais / Perdidos / Máximos**, com PV e PE temporários.
  A coluna *Perdidos* é o que o Dano na Alma consome e o que o descanso longo **não** cura
- Quadro **PV Extra** com as fontes da ficha: Kamo, Robustez, Desconto de Exaustão, Vigor Infinito e Outros
- **Defesa** decomposta em Base 10 + Equip. + Destreza + Nível/2 + Outros
- **Redução de Dano** geral e por tipo de dano, na grade de siglas da ficha
- As três linhas de **Jogadas de Ataque** (Corpo a Corpo, A Distância, Amaldiçoado), cada uma
  com atributo, treinamento e outros bônus, e cada uma rolável
- **CD Técnica** e **CD Amaldiçoada** como caixas separadas, cada uma com seus próprios bônus
- **Três linhas de Ofício**, cada uma com sua subcategoria e rolagem própria
- **Habilidades, Talentos e Aptidões** com contador de usos *Atual / Máx.* e custo
- **Expansão de Domínio** e **Técnica Máxima** com nome, tipo e descrição
- **Aparência** completa (altura, peso, gênero, cabelos, olhos, pele, roupas, marca)
- **Inventário** com quantidade, peso, preço e Espaços Ocupados contra o Limite de Espaços
- Página de **Treinamentos**: os 11 treinamentos com 4 etapas cada e o texto do Treinamento Completo

### Compêndios

| Compêndio | Conteúdo |
| --- | --- |
| **Origens** | As 7 origens e as 4 heranças de clã |
| **Especializações** | As 6 especializações, com PV, PE, treinamentos e habilidades base |
| **Habilidades de Especialização** | As 368 habilidades do capítulo 4, em uma pasta por especialização, com o nível de cada uma |
| **Talentos** | Os 51 talentos do capítulo 7 em duas pastas: 43 Gerais e 8 de Origem, com pré-requisitos em campo próprio |
| **Aptidões Amaldiçoadas** | As 64 aptidões do capítulo 8, em uma pasta por área (Aura, Controle e Leitura, Domínio, Barreira, Energia Reversa e Especiais) |
| **Armas** | As 52 armas dos capítulos 5, em duas pastas: 20 Simples e 32 Complexas, com o efeito de crítico do grupo e o traço especial de cada uma na descrição |
| **Equipamentos** | 117 itens: 5 uniformes, 4 escudos, 7 kits de ferramentas, os 48 itens especiais (em pastas por custo) e os 53 encantamentos de ferramenta amaldiçoada |
| **Dotes de Inimigo** | Os 65 Dotes do Grimório das Maldições em 8 pastas: 22 Gerais, 29 Amaldiçoados (por categoria, incluindo a de **Anatomia**, que não existe no livro básico) e os 14 Treinamentos do Passo 4 |
| **Características de Inimigo** | As 47 Características do Grimório em duas pastas: 13 Gerais e 34 Especiais, com as tabelas de Efeitos de Aura, Efeitos de Marca e Dano de Terreno junto do verbete a que pertencem |
| **Guia de Criação de Inimigos** | Diário do Narrador com os quatro passos da criação, os graus e Patamares, as origens de inimigo, o preenchimento da ficha e as regras de ações, condições e alma |
| **Referência de Regras** | Diário com testes e CDs, ações em combate, condições, tipos de dano, tabelas de criação de Feitiços, equipamentos e carregamento, ferramentas amaldiçoadas, invocações, alma, morte, exaustão e descansos |
| **Macros** | Teste rápido, iniciativa do grupo, aplicar dano em massa, descanso longo do grupo |

---

## O Grimório das Maldições

Além do Livro de Regras, o sistema traz o **Grimório das Maldições (Versão 1, F&M 2.5)**, o
livro de inimigos. Ele é outro PDF, com outra paginação: as páginas citadas no código e nos
compêndios do Grimório são as dele, e não as do livro básico.

**O Grimório não tem fichas prontas.** A introdução do capítulo promete que "você encontrará
diversas fichas já prontas de inimigos", mas a Versão 1 tem 80 páginas e nenhuma delas é um
bloco de estatísticas: o que o livro entrega é o **guia para montar** as fichas, mais a
**Galeria** de coisas para pendurar nelas. É isso que está no sistema — não há um bestiário
para importar porque não há bestiário no PDF.

O que entrou:

- **112 verbetes da Galeria** como itens, nos dois compêndios novos: 29 Dotes Amaldiçoados,
  22 Dotes Gerais, 14 Treinamentos e 47 Características
- A **ficha de NPC** ganhou Patamar, ND, Tamanho, Origem de Inimigo e o quadro de **Criação do
  Inimigo**, que mostra o orçamento do Patamar — pontos de atributo e seu teto por atributo,
  perícias treinadas, imunidades/resistências/vulnerabilidades, imunidades a condição,
  características recomendadas e as ações do turno — marcando em vermelho o que estourou
- Os recursos de sobrevivência do capítulo: **RD Irredutível**, **Ignorar RD**, **Vida
  Temporária por Ataque**, **Guarda Inabalável**, **Resistência Parcial** e **Total**
- O **Bônus de Treinamento por ND**, que satura em +6 (a tabela do Grimório para em "17 ou
  superior") — diferente da progressão aberta do personagem
- O **diário do Guia de Criação**, só para o Narrador, com os quatro passos, graus e Patamares,
  origens de inimigo, preenchimento da ficha e as regras de ações, condições e alma

Nada disso limita a ficha: o Grimório é um guia para o Narrador, e uma criatura autoral pode
estourar qualquer linha de propósito. O sistema só aponta onde ela estourou.

### Importar uma ficha pronta de um construtor

A ficha de NPC tem um botão **Importar JSON** no cabeçalho, que preenche a ficha a partir de um
arquivo exportado por um construtor de criaturas de F&M 2.5 (o formato `version: "2.0"`, com a
lista `creatures`). É um **atalho, não um modo**: nada é importado sozinho, a ficha continua
editável à mão antes e depois, e o Narrador vê um resumo do que será escrito antes de confirmar.

- Um arquivo com várias criaturas abre um seletor
- Os poderes viram itens: `features`, `caracteristicas` e `artimanhas` viram **Características**;
  `dotes`, `aptidoesEspeciais` e `treinamentos` viram **Dotes** do tipo correspondente (a
  categoria de um Dote Amaldiçoado sai do rótulo da Galeria: "Aptidões de Anatomia" → Anatomia)
- As **Ações** se dividem pelo tipo de resolução, e as duas metades caem na aba **Ações** da
  ficha — agrupadas pela ação que consomem no turno (Comum, Rápida, Bônus, Movimento, Reação) e
  roláveis: as de **acerto** viram **Armas** (o bônus próprio da ação vira o `bonusAtaque`,
  e a margem de crítico vem do arquivo); as por **Teste de Resistência** viram **Feitiços**, que é
  o item que já resolve por TR — com resistência, área, dano e custo em PE. Nos dois casos a
  descrição carrega o bloco inteiro: acerto, CD, TR, alcance, área, dano, dano médio, custo e
  condição aplicada
- A **Integridade da Alma** entra sempre cheia. O construtor exporta a integridade numa escala de
  0 a 100, que não é a daqui — e deixar o padrão contra um PV alto colocaria a criatura em estado
  de alma **Crítico** já na importação, com −8 em tudo e os totais aparecendo errados
- O **nome** vai para o ator e para o token protótipo (que não acompanha o ator sozinho depois que
  ele já existe)
- Por padrão os poderes do arquivo se **somam** aos que já estão na ficha; há uma caixa para
  apagar os Dotes e Características antigos antes. O resto da ficha nunca é apagado: o que o
  arquivo não trouxer fica como estava
- O que o sistema não tem onde guardar (condições ativas, log de combate, chaves internas do
  construtor) vira **aviso** na confirmação, em vez de sumir em silêncio

**Por que a importação liga "Valores manuais".** O construtor exporta os totais já fechados —
Defesa 30, TRs 23, CD 28 — calculados pelas tabelas por ND do Grimório, que este sistema não
transcreve. Esses totais não teriam como sair das fórmulas do livro básico, então eles entram em
campos próprios (**Totais fechados**, na aba Principal) que substituem a fórmula quando
preenchidos — inclusive os totais de **perícia**, que no construtor saem das tabelas de perícia
por ND e não da soma atributo + metade do nível + proficiência. Um campo vazio ali continua saindo do cálculo normal, e **desligar "Valores
manuais" devolve tudo para as fórmulas sem apagar os números importados**. A penalidade de
Exaustão e de Estado da Alma continua entrando por cima do total, como em qualquer ficha.

Os diálogos da importação e o de ataque abrem com **largura relativa à janela** e seguram o
conteúdo em uma fração da altura da tela, rolando o excedente: um `DialogV2` cresce junto com o
conteúdo e, num monitor baixo, o resumo empurrava os botões de confirmar para fora da área
visível — e o diálogo é modal, então não dava nem para fugir dele. Todos são redimensionáveis.

Para macros, a API está em `game.fnm.importar` (`lerArquivo`, `mapearInimigo`, `aplicarNoAtor`,
`importarDeArquivo`). `mapearInimigo` é uma função pura, e `npm run check` roda ela contra todo
`tools/dados/exemplo-inimigo*.json` conferindo cada caminho que ela produz contra o schema do
NPC — um caminho errado seria descartado em silêncio pelo Foundry, e o teste pega isso. Ao
encontrar um arquivo que a importação erre, salve-o como mais um `exemplo-inimigo-*.json`: ele
entra na verificação sozinho.

### O que do Grimório não entrou

- **As tabelas numéricas por ND** (p. 23-52): vida, RD, defesa, acerto, dano médio, dado de
  dano e CD, para cada um dos cinco Patamares e nas três colunas de dificuldade. São trinta
  páginas de tabelas com células de várias linhas, que a extração de texto embaralha coluna a
  coluna. Transcrevê-las à mão colocaria números possivelmente errados dentro do sistema, então
  elas ficam no PDF — que continua sendo a referência na hora de montar a ficha
- **A tabela de cura por Patamar × Bônus de Treinamento** da aptidão Energia Reversa (p. 70),
  pelo mesmo motivo. O verbete no compêndio traz a prosa e aponta a página
- Os **Dotes Especiais de Restritos Celestes**: a p. 77 promete que eles estarão "ao final dos
  Dotes Gerais", e a lista termina na p. 80 sem eles. O mesmo vale para a aptidão **Regeneração
  Corporal**, citada como pré-requisito de Cura de Exaustão e de Fluxo Imparável mas não
  descrita em lugar nenhum do PDF

### Leituras do Grimório

**A tabela de Patamares** (p. 8) tem as colunas desalinhadas na diagramação: as cinco
dificuldades e os cinco números de jogadores aparecem deslocados em relação aos nomes dos
Patamares. O sistema lê a correspondência na ordem impressa — Lacaio/Muito Fácil/1,
Capanga/Fácil/1, Comum/Média/2, Desafio/Difícil/4, Calamidade/Experiente/6 — que é a única
leitura em que a dificuldade sobe junto com o Patamar. Confira contra o PDF.

**As aptidões da Galeria não são as do capítulo 8.** Vários verbetes têm nome novo para efeito
parecido (Aura de Restrição e Aura de Contenção, Aura do General e Aura do Comandante, Aura
Nefasta e Aura Macabra), e a Galeria traz uma categoria que o livro básico não tem:
**Anatomia**, exclusiva de maldições e fetos amaldiçoados. Por isso os Dotes ficam em um
compêndio próprio, sem se misturar com as 64 Aptidões Amaldiçoadas do livro básico.

**Energia Reversa, Cura de Exaustão e Fluxo Imparável** ficam em *Aptidões Especiais*. A p. 64
lista "Aptidões de Energia Reversa" como uma categoria, mas a Galeria não imprime esse cabeçalho:
os três verbetes vêm logo depois do cabeçalho de Especiais, na p. 70. O sistema segue o que está
impresso.

**Assumir Postura** (p. 77) fecha com `[Pré-Requisito: ND 10]`, mas o colchete está dentro do
marcador da *Postura da Tempestade*, a segunda das duas posturas — quem pega o dote destrava a
Postura da Fortuna sem ND mínimo. O campo de pré-requisito do item fica vazio e o colchete
permanece no texto, junto da postura a que pertence.

---

## Escopo: o que ainda não está aqui

O livro tem 369 páginas. O **motor de regras está completo** para o uso de mesa, mas os
compêndios são uma semente. Ainda não foram transcritos:

- Os **exemplos de Voto de Restrição** (capítulo 14)
- Os guias em prosa de **Criação de Técnica** (capítulo 9). As tabelas de custo, dano,
  alcance e área já estão no diário de referência
- A **Clarificação de Regras** do apêndice

As **técnicas prontas** de Jujutsu Kaisen não estão aqui porque não estão neste livro: o
próprio texto remete a elas no livro **Enciclopédia Amaldiçoada**, que é outra obra. O mesmo vale
para duas coisas que o capítulo 10 promete e não entrega: a **lista de Características** de
Invocação ("no final deste capítulo") e a seção de **domar maldições** não existem no PDF v2.5.2,
e o próprio texto aponta a Enciclopédia como a lista maior. Por isso o sistema entrega as tabelas
de criação, e não um catálogo de invocações prontas.

Também vale registrar **até onde vai a automação**. Habilidades, talentos, origens, aptidões,
Dotes e Características entram na ficha como texto: o sistema não usa Active Effects, e as
condições não são aplicadas automaticamente pelas rolagens.

O que um item **consegue** mexer sozinho é o bloco **Ajustes no dono**, que toda ficha de item
tem: PV máximo, PE máximo, Defesa, Deslocamento e Redução de Dano. Enquanto o dono possuir o
item, os cinco entram na conta — Armas e Equipamentos só quando **equipados**, Votos só quando
**ativos**. Um Dote que dá "+10 PV" precisa ter esse +10 lançado ali; a descrição sozinha não
mexe em nada. O resto (uma aptidão que concede +2 na CD, por exemplo) vai nos campos "Outros"
da ficha.

Isso é verificado: `npm run check` roda `tools/testa-automacao.mjs`, que monta atores de mentira,
executa a derivação real dos DataModels e confere que os ajustes de item chegam ao ator, que os
totais fechados substituem as fórmulas (e que a Exaustão ainda pesa em cima deles), que o
orçamento do Patamar conta os pontos gastos acima da base de 10, e que uma ficha importada
reproduz exatamente os números do arquivo depois de derivada.

Nada disso bloqueia o jogo: todos esses elementos podem ser criados à mão como itens, e as
fichas já têm os campos para eles. Para incluí-los nos compêndios, adicione as entradas em
`tools/pack-data.mjs` e rode o build.

**Um aviso sobre as tabelas de equipamento:** as tabelas do PDF têm nomes e valores em colunas
separadas, e a extração de texto os desalinha. As Tabelas de Armas Simples e Complexas, as
modificações de uniforme e os escudos foram remontados à mão, linha a linha, em
`tools/pack-data.mjs` — confira contra o livro antes de usar em mesa. O resto do capítulo é lista
corrida e sai do extrator (`tools/extrai-equipamentos.py`).

**Uma leitura do livro:** o Chicote Espinhento e a Kusarigama aparecem na tabela com dois dados
(`1d6/1d6`), no mesmo lugar em que as armas versáteis trazem o dano de uma e de duas mãos. Pelas
Propriedades Especiais (p. 136-137) não é versatilidade: são dois golpes de tipos diferentes no
mesmo ataque. O sistema os registra como `1d6 + 1d6`, sem dano versátil.

**Uma ambiguidade do livro:** na p. 49, o dano desarmado do Lutador é descrito como "1d8; nos
níveis 5, 9, 13 e 17 aumenta para 1d10, 1d12, e 2d12" — quatro níveis para três valores. O sistema
adota a leitura conservadora e mantém 1d12 também no nível 13.

---

## Desenvolvimento

```bash
npm install
npm run check        # valida as fichas e a automação
npm run build:packs  # gera os compêndios
```

### Publicar uma release

O Foundry decide se há atualização comparando o campo **`version` do manifesto publicado** com o
da cópia instalada. O nome da tag do git **não entra nessa conta**: uma release cujo `system.json`
repete a versão anterior é invisível — o Foundry busca o manifesto, vê o mesmo número e conclui
que já está em dia. Foi o que aconteceu da v0.0.3 à v0.2.0, quatro tags publicadas com
`version: "0.1.0"` dentro.

Por isso o número é carimbado por script, e nunca digitado à mão:

```bash
npm run release -- 0.3.0
npm run build:packs && npm run check
git commit -am "Versão 0.3.0" && git push
git tag v0.3.0 && git push origin v0.3.0
```

O `npm run release` recusa uma versão que não seja maior que a atual, aponta `download` para o zip
daquela versão e mantém `manifest` na release *latest* — que é o endereço fixo que o Foundry
consulta para saber se saiu coisa nova.

O push da tag dispara `.github/workflows/release.yml`, que **bloqueia o build se a tag e o
`system.json` discordarem**, gera os compêndios, roda a validação, monta o `system.zip` e publica
a release com os dois arquivos. O erro que causou o problema original virou falha de build.

### `npm run check` — por que ele existe

Todas as PARTS de uma `ApplicationV2` são renderizadas dentro do **mesmo `<form>`**, e o
Foundry valida o submit inteiro de uma vez. Um único campo inválido faz ele descartar
**todas** as alterações, e a ficha passa a "não aceitar nada" sem erro visível.

`tools/check-fichas.mjs` pega as duas causas desse sintoma:

1. um `name=` que não existe no schema do DataModel;
2. o mesmo `name=` repetido em duas partes — o `FormDataExtended` devolve um array em vez
   de um escalar e a validação reprova.

Ele valida ainda mais duas coisas:

- os **nomes de ícone** contra a lista do Font Awesome 6 Free — um ícone exclusivo do Pro,
  renomeado ou digitado errado renderiza como quadrado vazio na ficha;
- a **ausência de emoji** no código, nos templates e no CSS. O sistema não usa emoji:
  ícones vêm do Font Awesome e a ênfase vem de `<b>`. Emoji dependem da fonte do sistema
  operacional e viram quadrado vazio quando a pilha de fontes não tem um fallback colorido.

Rode-o sempre que mexer em templates, schemas ou ícones.

`tools/build-packs.mjs` lê `tools/pack-data.mjs` e gera os compêndios LevelDB em `packs/`
usando a CLI oficial do Foundry.

As Habilidades de Especialização, os Talentos, as Aptidões, os Equipamentos e a Galeria do
Grimório vêm de arquivos em `tools/dados/`, gerados a partir do texto dos PDFs. Os JSONs são
versionados, então o build não depende deles — só é preciso rodar os extratores para atualizar
as regras:

```bash
pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" tools/fnm.txt
python tools/extrai-habilidades.py tools/fnm.txt
python tools/extrai-talentos.py tools/fnm.txt
python tools/extrai-aptidoes.py tools/fnm.txt
python tools/extrai-equipamentos.py tools/fnm.txt
npm run build:packs
```

O Grimório das Maldições é um PDF separado e tem seu próprio extrator. O `-fixed 4` **não é
opcional**: a calha entre as duas colunas do Grimório tem dois espaços com o `-layout` puro,
estreita demais para o detector de colunas achar; com `-fixed 4` ela abre para uma dezena de
espaços e as páginas da Galeria se separam todas.

```bash
pdftotext -layout -fixed 4 -enc UTF-8 "Grimorio das Maldicoes.pdf" tools/grimorio.txt
python tools/extrai-grimorio.py tools/grimorio.txt
npm run build:packs
```

Os capítulos 4, 7 e 8 são diagramados em duas colunas. `tools/livro_texto.py` concentra a
leitura desse layout: ele detecta a calha vertical de espaços entre as colunas e separa o
texto. Os capítulos 5 e 6 são listas de marcadores em coluna única, e o extrator de
equipamentos usa o recuo pendente da lista para saber onde um verbete termina. As faixas de
página ficam no topo de cada extrator; se a paginação mudar em uma versão futura do livro,
ajuste-as. Os `_id` são derivados do nome por hash, então permanecem estáveis entre builds —
links de compêndio nos mundos não quebram.

```
module/
  fnm.mjs            entrada do sistema: registra documentos, models, sheets e condições
  config.mjs         toda a tabela de regras (atributos, perícias, feitiços, condições…)
  data-models.mjs    schemas e derivações de atores e itens
  chat.mjs           cartas de ataque e de dano, e os botões delas
  importar-inimigo.mjs  leitura do JSON de construtores externos para a ficha de NPC
  documents/         Actor e Item: execução das rolagens
  sheets/            fichas ApplicationV2
templates/
  actors/, items/    Handlebars das fichas
  chat/              diálogo de ataque e cartas do chat
styles/fnm.css       tema
tools/
  build-packs.mjs    geração dos compêndios
  check-fichas.mjs   validação estática das fichas e dos compêndios
  testa-automacao.mjs  roda a derivação real dos modelos e confere o que ela produz
  preparar-release.mjs carimba a versão da release no system.json
  livro_texto.py     leitura do layout de duas colunas, comum aos extratores
  extrai-*.py        transcrição dos capítulos do PDF para tools/dados/
  dados/             JSONs versionados dos extratores, e o exemplo de importação
```

### Estrutura de dados úteis para macros

```js
game.fnm.config                      // toda a tabela de regras
game.fnm.utils.modificador(16)       // +3
game.fnm.utils.bonusTreinamento(9)   // +4

ator.rolarPericia("feiticaria");
ator.rolarResistencia("vontade");
ator.conjurarFeitico(item);
ator.aplicarDano(30, { tipo: "alma" });
ator.rolarTesteDeMorte();
ator.descansoLongo();
```

## Licença

Código sob a licença em [LICENSE](LICENSE). O conteúdo de regras pertence aos autores de
Feiticeiros & Maldições; o universo, personagens e sistema de poder pertencem a Gege Akutami.
