# Feiticeiros & Maldições — Sistema Não-Oficial para Foundry VTT

Sistema **não-oficial**, feito por fã, para jogar **Feiticeiros & Maldições** no
[Foundry VTT](https://foundryvtt.com/). Baseado no **Livro de Regras v2.5.2**.

> **Feiticeiros & Maldições** é um projeto criado de fãs para fãs, gratuito e sem fins lucrativos,
> ambientado no universo de **Jujutsu Kaisen**, obra de **Gege Akutami**.
> Desenvolvimento: Setsugiri e Parker · Diagramação e Edição: Setsugiri e Jou ·
> Revisão: Jou, Kame e Parker · Artes originais: Konatsuu e Strabey.
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
| **NPC / Maldição** | Antagonistas, com PV e Defesa fixos por padrão, além de imunidades, resistências e vulnerabilidades |
| **Invocação** | Shikigamis, corpos amaldiçoados e marionetes, vinculados a um invocador |

### Tipos de item

Origem · Especialização · Habilidade de Especialização · Talento · Aptidão Amaldiçoada ·
Técnica Amaldiçoada · Feitiço · Arma · Equipamento · Voto de Restrição.

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
- **Ataques**: escolha automática entre Força e Destreza (Fineza, armas a distância e de arremesso),
  penalidade por falta de treinamento, crítico pelo limiar da arma com o **efeito de crítico do
  grupo** e desastre no 1 natural
- **Dano** com dados dobrados no crítico (modificadores somados depois) e opção versátil
- **Conjuração de Feitiços**: gasta PE, avisa quando o nível está fora do seu acesso, aplica o
  acréscimo de custo do Estado da Alma, resolve por ataque ou por TR e rola o dano
- **Custo de Feitiço** derivado do nível, com Marca Registrada e afins reduzindo até o mínimo de 1
- **Integridade da Alma** e seus quatro **Estados** (penalidade em rolagens, custo extra e condições)
- **Dano na Alma**: ignora RD e PV temporários, reduz a vida máxima junto da atual
- **Portas da Morte** completas, incluindo dano massivo, morte instantânea e aviso de Ferimento Complexo
- **Exaustão** de 0 a 6, com penalidade progressiva e perda de deslocamento
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
| **Aptidões Amaldiçoadas** | Amostra transcrita das Aptidões de Aura |
| **Armas e Equipamentos** | A tabela completa de Armas Simples, a Distância e de Arremesso |
| **Referência de Regras** | Diário com testes e CDs, ações em combate, condições, tipos de dano, tabelas de criação de Feitiços, alma, morte, exaustão e descansos |
| **Macros** | Teste rápido, iniciativa do grupo, aplicar dano em massa, descanso longo do grupo |

---

## Escopo: o que ainda não está aqui

O livro tem 369 páginas. O **motor de regras está completo** para o uso de mesa, mas os
compêndios são uma semente. Ainda não foram transcritos:

- As **habilidades de especialização** nível a nível (capítulo 4, p. 49-128)
- A maior parte das **Aptidões Amaldiçoadas** — só as de Aura foram transcritas (capítulo 8)
- Os **Talentos** gerais e de origem (capítulo 7)
- As tabelas de **Armas Complexas**, uniformes, escudos e kits de ferramentas (capítulos 5 e 6)
- As **técnicas prontas** da Enciclopédia Amaldiçoada
- Os **exemplos de Voto de Restrição** da obra (capítulo 14)

Nada disso bloqueia o jogo: todos esses elementos podem ser criados à mão como itens, e as
fichas já têm os campos para eles. Para incluí-los nos compêndios, adicione as entradas em
`tools/pack-data.mjs` e rode o build.

**Um aviso sobre a tabela de armas:** as tabelas do PDF têm nomes e valores em colunas separadas,
e a extração de texto os desalinha. A Tabela de Armas Simples foi remontada seguindo a ordem das
linhas — confira contra o livro antes de usar em mesa.

**Uma ambiguidade do livro:** na p. 49, o dano desarmado do Lutador é descrito como "1d8; nos
níveis 5, 9, 13 e 17 aumenta para 1d10, 1d12, e 2d12" — quatro níveis para três valores. O sistema
adota a leitura conservadora e mantém 1d12 também no nível 13.

---

## Desenvolvimento

```bash
npm install
npm run check        # valida as fichas contra os schemas
npm run build:packs  # gera os compêndios
```

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
usando a CLI oficial do Foundry. Os `_id` são derivados do nome por hash, então permanecem
estáveis entre builds — links de compêndio nos mundos não quebram.

```
module/
  fnm.mjs            entrada do sistema: registra documentos, models, sheets e condições
  config.mjs         toda a tabela de regras (atributos, perícias, feitiços, condições…)
  data-models.mjs    schemas e derivações de atores e itens
  documents/         Actor e Item: execução das rolagens
  sheets/            fichas ApplicationV2
templates/           Handlebars das fichas
styles/fnm.css       tema
tools/
  build-packs.mjs    geração dos compêndios
  check-fichas.mjs   validação estática das fichas
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
