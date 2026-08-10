# -*- coding: utf-8 -*-
"""
Extrai do capitulo 5 (Equipamentos) e do capitulo 6 (Ferramentas Amaldicoadas)
do Livro de Regras v2.5.2 as tres listas que sao texto corrido e grava
tools/dados/equipamentos.json, que alimenta o compendio:

  - Propriedades de arma, gerais e especiais;
  - Itens Especiais, agrupados por custo (1 a 4);
  - Kits de Ferramentas;
  - Encantamentos de Ferramenta Amaldicoada, por tipo de equipamento.

As TABELAS do capitulo (armas complexas, uniformes e escudos) NAO saem daqui:
o pdftotext embaralha as colunas delas, entao estao transcritas a mao em
tools/pack-data.mjs.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-equipamentos.py fnm.txt

Diferente dos outros capitulos, aqui os verbetes nao sao titulos em CAIXA ALTA:
sao itens de lista, cada um abrindo com um marcador. O nome vem antes do primeiro
ponto final, e os Itens Especiais ainda trazem a categoria entre colchetes
("Antidoto Simples [Farmaco]. ...").

As faixas de pagina sao as do PDF v2.5.2; se a paginacao mudar, ajuste-as.
"""
import collections, io, json, os, re, sys, unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "fnm.txt"))

# Propriedades de arma (p. 134-137): as gerais valem para toda arma que traga o
# traco; as especiais sao o traco unico de uma arma so, nomeada no verbete.
PROPS_PRIMEIRA, PROPS_ULTIMA = 134, 137
CABECALHO_PROP = re.compile(r"^PROPRIEDADES\s+(GERAIS|ESPECIAIS)\b", re.I)

# Itens Especiais: uma secao por custo, de "custo 1" ate "custo 4" (p. 145-149)
ITENS_PRIMEIRA, ITENS_ULTIMA = 145, 148
CABECALHO_CUSTO = re.compile(r"^ITENS\s+ESPECIAIS\s+DE\s+CUSTO\s+(\d)\b", re.I)

# Kits de Ferramentas (p. 141-143), cada um sob um titulo "FERRAMENTAS DE X"
KITS_PRIMEIRA, KITS_ULTIMA = 141, 143
CABECALHO_KIT = re.compile(r"^FERRAMENTAS\s+DE\s+(.+)$", re.I)
# O livro imprime "FERRAMENTAS DE ALFAITE"; o corpo do verbete escreve alfaiate
CORRECAO_KIT = {"Alfaite": "Alfaiate"}

# Encantamentos de Ferramenta Amaldicoada (p. 155-159)
ENCANT_PRIMEIRA, ENCANT_ULTIMA = 155, 159
CABECALHO_ENCANT = re.compile(r"^ENCANTAMENTOS\s+PARA\s+(ARMAS|ESCUDOS|UNIFORMES)\b", re.I)
ALVO_ENCANT = {"ARMAS": "Arma", "ESCUDOS": "Escudo", "UNIFORMES": "Uniforme"}

MARCADOR = re.compile(r"^\s*[•●·]\s*")
# "Antidoto Simples [Farmaco]. Um simples antidoto..." -> nome, categoria, texto
VERBETE = re.compile(r"^(.{3,60}?)\s*(?:\[([^\]]+)\])?\s*\.\s+(.+)$", re.S)
# "[Pre-Requisito: ...]" fecha o verbete
PRE_REQ = re.compile(r"\[\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*(.+?)\s*\]\s*\.?\s*$", re.I)

# Acao gasta para usar o item, quando o texto a declara de forma direta
# ("como uma acao bonus", "injetar e uma acao bonus;"). O que vem depois precisa
# fechar a expressao: sem isso, "forcar uma reacao regenerativa do corpo" seria
# lido como a acao do Remedio Simples, que na verdade e uma acao comum.
ACAO = re.compile(
    r"\buma\s+(a[çc][ãa]o\s+(?:b[ôo]nus|completa|comum|livre)|rea[çc][ãa]o)"
    r"(?=[,.;:)]|\s+(?:ou|e|a|ao|para|do|da|no|na)\b)", re.I)
NOMES_ACAO = {
    "ação bônus": "Ação Bônus", "ação completa": "Ação Completa",
    "ação comum": "Ação Comum", "ação livre": "Ação Livre", "reação": "Reação",
}

# Categorias de Item Especial (p. 144). Talismas e misturas sao consumiveis e
# ocupam meio espaco (p. 129); acessorios sao vestidos e ocupam um.
CATEGORIAS_ITEM = {"Acessório", "Espiritual", "Fármaco", "Mistura", "Talismã"}
CONSUMIVEIS = {"Espiritual", "Fármaco", "Mistura", "Talismã"}
MEIO_ESPACO = {"Talismã", "Mistura"}


def alfabetica(nome):
    """Ordem alfabetica do portugues: 'Oleo' depois de 'Neve', nao depois de 'Z'."""
    sem_acento = unicodedata.normalize("NFKD", nome)
    return "".join(c for c in sem_acento if not unicodedata.combining(c)).lower()


def paginas_de(primeira, ultima):
    """Linhas das paginas da faixa, sem os numeros de pagina soltos."""
    for p in range(primeira, ultima + 1):
        for linha in PAGINAS[p].split("\n"):
            if linha.strip().isdigit():
                continue
            yield linha


def marcadores(primeira, ultima, cabecalho, cabecalhos_ignorados=()):
    """
    Percorre a faixa devolvendo (secao, texto do verbete) para cada marcador.

    `cabecalho` casa os titulos que trocam a secao corrente; enquanto nenhum
    tiver casado, o texto e introducao de capitulo e e descartado.

    A continuacao de um verbete e sempre mais indentada que o marcador que o
    abriu — e assim que o pdftotext preserva o recuo pendente da lista. Exigir
    isso e o que impede o paragrafo de fechamento de uma secao, que volta a
    margem, de ser colado ao ultimo verbete dela.
    """
    secao, atual, recuo = None, None, 0
    saida = []

    def fecha():
        if secao and atual:
            saida.append((secao, junta(atual)))

    for linha in paginas_de(primeira, ultima):
        t = linha.strip()
        m = cabecalho.match(t)
        if m:
            fecha()
            secao, atual = m.group(1), None
            continue
        if any(c.match(t) for c in cabecalhos_ignorados):
            fecha()
            secao, atual = None, None
            continue
        if not t:
            continue
        if MARCADOR.match(t):
            fecha()
            atual, recuo = [MARCADOR.sub("", t)], len(linha) - len(linha.lstrip())
        elif atual is not None:
            if len(linha) - len(linha.lstrip()) <= recuo:
                fecha()
                atual = None
                continue
            atual.append(t)

    fecha()
    return saida


def separa_verbete(texto):
    """Quebra "Nome [Categoria]. Descricao" em suas tres partes."""
    m = VERBETE.match(texto)
    if not m:
        return None
    nome, categoria, corpo = m.group(1).strip(), (m.group(2) or "").strip(), m.group(3).strip()
    # Um nome com marcas de frase e sinal de que o verbete nao abriu aqui
    if re.search(r"[,;:]| e | de que ", nome) and not categoria:
        return None
    return nome, categoria, corpo


def acao_de(texto):
    """A primeira acao declarada no texto do verbete."""
    m = ACAO.search(texto)
    if not m:
        return ""
    chave = re.sub(r"\s+", " ", m.group(1).strip().lower())
    return NOMES_ACAO.get(chave, "")


def extrai_propriedades():
    """
    As propriedades gerais entram na referencia de regras; as especiais sao
    anexadas a descricao da arma que as tem, e por isso saem indexadas por nome.
    """
    gerais, especiais = [], {}
    for secao, texto in marcadores(PROPS_PRIMEIRA, PROPS_ULTIMA, CABECALHO_PROP):
        partes = separa_verbete(texto)
        if not partes:
            continue
        nome, variavel, corpo = partes
        if secao.upper() == "GERAIS":
            # "Pesada [X]" e "Recarga [X]" trazem o parametro no proprio nome
            gerais.append({
                "nome": titulo_pt(nome) + (" [%s]" % variavel if variavel else ""),
                "descricao": corpo,
            })
        else:
            especiais[titulo_pt(nome)] = corpo
    return gerais, especiais


def extrai_itens_especiais():
    itens = []
    for custo, texto in marcadores(ITENS_PRIMEIRA, ITENS_ULTIMA, CABECALHO_CUSTO):
        partes = separa_verbete(texto)
        if not partes:
            continue
        nome, categoria, corpo = partes
        assert categoria in CATEGORIAS_ITEM, "categoria desconhecida em %r: %r" % (nome, categoria)
        itens.append({
            "nome": titulo_pt(nome),
            "tipo": "Item Especial",
            "categoria": categoria,
            "custo": int(custo),
            "espacos": 0.5 if categoria in MEIO_ESPACO else 1,
            "consumivel": categoria in CONSUMIVEIS,
            "acao": acao_de(corpo),
            "descricao": para_html(corpo),
        })
    return itens


def extrai_encantamentos():
    encantamentos = []
    for secao, texto in marcadores(ENCANT_PRIMEIRA, ENCANT_ULTIMA, CABECALHO_ENCANT):
        partes = separa_verbete(texto)
        if not partes:
            continue
        nome, _, corpo = partes

        prerequisito = ""
        m = PRE_REQ.search(corpo)
        if m:
            prerequisito = m.group(1).strip().rstrip(".")
            corpo = corpo[: m.start()].strip()

        encantamentos.append({
            "nome": titulo_pt(nome),
            "tipo": "Encantamento",
            "alvo": ALVO_ENCANT[secao.upper()],
            "prerequisito": prerequisito,
            "descricao": para_html(corpo),
        })
    return encantamentos


def extrai_kits():
    """
    Os kits sao titulos em CAIXA ALTA seguidos de texto corrido — o mesmo
    formato dos outros capitulos, e nao a lista de marcadores das outras duas
    secoes. "ITENS ESPECIAIS" encerra a secao de kits.
    """
    kits, atual = [], None
    for linha in paginas_de(KITS_PRIMEIRA, KITS_ULTIMA):
        t = linha.strip()
        if re.match(r"^ITENS\s+ESPECIAIS\b", t, re.I):
            break
        if not t:
            continue
        if eh_titulo(linha):
            m = CABECALHO_KIT.match(t)
            if not m:
                atual = None
                continue
            nome = titulo_pt(m.group(1).strip())
            nome = CORRECAO_KIT.get(nome, nome)
            atual = {"nome": "Ferramentas de %s" % nome, "tipo": "Kit de Ferramentas",
                     "custo": 1, "espacos": 1, "linhas": []}
            kits.append(atual)
        elif atual is not None:
            atual["linhas"].append(t)

    return [{
        "nome": k["nome"],
        "tipo": k["tipo"],
        "custo": k["custo"],
        "espacos": k["espacos"],
        "descricao": para_html(junta(k["linhas"])),
    } for k in kits if len(junta(k["linhas"])) > 80]


if __name__ == "__main__":
    propriedades, especiais = extrai_propriedades()
    dados = {
        "propriedadesArma": propriedades,
        "propriedadesEspeciais": dict(sorted(especiais.items(), key=lambda kv: alfabetica(kv[0]))),
        "itensEspeciais": sorted(
            extrai_itens_especiais(), key=lambda i: (i["custo"], alfabetica(i["nome"]))),
        "kits": sorted(extrai_kits(), key=lambda k: alfabetica(k["nome"])),
        "encantamentos": sorted(
            extrai_encantamentos(),
            key=lambda e: (["Arma", "Escudo", "Uniforme"].index(e["alvo"]),
                           alfabetica(e["nome"]))),
    }

    # "Isolante" existe para escudo e para uniforme, entao a chave inclui o alvo
    for chave in ("itensEspeciais", "kits", "encantamentos"):
        lista = dados[chave]
        repetidos = [n for n, v in collections.Counter(
            (i.get("alvo", ""), i["nome"]) for i in lista).items() if v > 1]
        assert not repetidos, "nomes repetidos em %s: %r" % (chave, repetidos)
        # Alguns encantamentos cabem em uma linha ("Reforçado", "Poderosa")
        curtos = [i["nome"] for i in lista if len(i["descricao"]) < 40]
        assert not curtos, "descricao curta demais em %s: %r" % (chave, curtos)

    destino = os.path.join(BASE, "dados", "equipamentos.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(dados, ensure_ascii=False, indent=2) + "\n")

    por_custo = collections.Counter(i["custo"] for i in dados["itensEspeciais"])
    print("%d itens especiais: %s" % (
        len(dados["itensEspeciais"]),
        ", ".join("custo %d: %d" % (c, por_custo[c]) for c in sorted(por_custo))))
    por_alvo = collections.Counter(e["alvo"] for e in dados["encantamentos"])
    print("%d encantamentos: %s" % (
        len(dados["encantamentos"]),
        ", ".join("%s: %d" % (a, por_alvo[a]) for a in ["Arma", "Escudo", "Uniforme"])))
    print("%d kits: %s" % (len(dados["kits"]), ", ".join(k["nome"] for k in dados["kits"])))
    print("%d propriedades gerais, %d especiais"
          % (len(dados["propriedadesArma"]), len(dados["propriedadesEspeciais"])))
    print("-> %s" % destino)
