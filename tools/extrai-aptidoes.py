# -*- coding: utf-8 -*-
"""
Extrai as Aptidoes Amaldicoadas do capitulo 8 do Livro de Regras v2.5.2 e grava
tools/dados/aptidoes.json, que alimenta o compendio.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-aptidoes.py fnm.txt

O capitulo e diagramado em duas colunas. As aptidoes vem agrupadas por area
("APTIDOES DE AURA", "APTIDOES DE DOMINIO", ...), e entre os grupos ha secoes
de regra (confronto de dominios, regras sobre barreiras) que NAO sao aptidoes.

As faixas de pagina sao as do PDF v2.5.2; se a paginacao mudar, ajuste-as.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, colunas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "fnm.txt"))

PRIMEIRA, ULTIMA = 171, 194

# Cabecalho de grupo -> categoria usada no sistema
CATEGORIAS = [
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+AURA\b", re.I), "Aura", "au"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+CONTROLE\s+E\s+LEITURA\b", re.I), "Controle e Leitura", "cl"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+DOM[ÍI]NIO\b", re.I), "Domínio", "dom"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+BARREIRA\b", re.I), "Barreira", "bar"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+ENERGIA\s+REVERSA\b", re.I), "Energia Reversa", "er"),
    (re.compile(r"^APTID[ÕO]ES\s+ESPECIAIS\b", re.I), "Especial", ""),
]

# Titulos que abrem secoes de regra, nao verbetes de aptidao
SECAO_REGRA = re.compile(
    r"^(APTID[ÕO]ES|N[ÍI]VEIS\s+DE\s+APTID[ÃA]O|REGRAS\s+SOBRE|CONFRONTO\s+DE|"
    r"CONTESTA[ÇC][ÃA]O\s+DE|EXAUST[ÃA]O\s+DE\s+T[ÉE]CNICA|"
    r"RESIST[ÊE]NCIA\s+DE\s+EXPANS)", re.I)

PRE_REQ = re.compile(r"\[\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*(.+?)\s*\]\s*$", re.I)
ROTULO = re.compile(r"^\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*", re.I)

# Exigencia de Nivel de Aptidao no pre-requisito. O livro usa tanto a sigla
# ("com ER 1", "BAR 3") quanto o nome por extenso.
SIGLAS = {"au": "au", "cl": "cl", "bar": "bar", "dom": "dom", "er": "er"}
NIVEL_SIGLA = re.compile(r"\b(AU|CL|BAR|DOM|ER)\s*(\d)\b")
NIVEL_NOME = re.compile(
    r"N[íi]vel\s+de\s+Aptid[ãa]o\s+(?:em\s+)?"
    r"(Aura|Controle\s+e\s+Leitura|Barreira|Dom[íi]nio|Energia\s+Reversa)\s*(\d)", re.I)
NOME_PARA_AREA = {
    "aura": "au", "controle e leitura": "cl", "barreira": "bar",
    "domínio": "dom", "dominio": "dom", "energia reversa": "er",
}

# Custo em PE citado no texto, quando declarado de forma direta
CUSTO = re.compile(r"\bgastar?\s+(\d+)\s*(?:ponto|pontos)?\s*(?:de\s+energia|PE)\b", re.I)


def extrai():
    aptidoes = []
    categoria = area_padrao = None

    for p in range(PRIMEIRA, ULTIMA + 1):
        for coluna in colunas(PAGINAS[p]):
            # Cada coluna recomeca: um paragrafo de largura total fatiado pela
            # divisao de colunas nao pode se colar ao ultimo verbete.
            atual = None
            for linha in coluna.split("\n"):
                t = linha.strip()
                if not t:
                    continue

                grupo = next((c for c in CATEGORIAS if c[0].match(t)), None)
                if grupo:
                    categoria, area_padrao = grupo[1], grupo[2]
                    atual = None
                    continue

                if eh_titulo(linha):
                    # Secoes de regra encerram o verbete corrente sem abrir outro
                    if SECAO_REGRA.match(t) or not categoria:
                        atual = None
                        continue
                    atual = {"nome": titulo_pt(t), "categoria": categoria,
                             "area": area_padrao, "linhas": []}
                    aptidoes.append(atual)
                elif atual is not None:
                    atual["linhas"].append(t)

    return aptidoes


def nivel_exigido(prerequisito, area_padrao):
    """
    Le as exigencias de Nivel de Aptidao do pre-requisito.

    Uma aptidao pode exigir mais de uma area (Revestimento de Dominio pede
    CL 3 e DOM 1). Como o item guarda um unico par area/nivel, prevalece o da
    area do proprio grupo; o texto completo do pre-requisito fica preservado.
    """
    achados = []
    for m in NIVEL_NOME.finditer(prerequisito):
        chave = re.sub(r"\s+", " ", m.group(1).strip().lower())
        achados.append((NOME_PARA_AREA.get(chave, area_padrao), int(m.group(2))))
    for m in NIVEL_SIGLA.finditer(prerequisito):
        achados.append((SIGLAS[m.group(1).lower()], int(m.group(2))))
    if not achados:
        return area_padrao, 0
    return next((a for a in achados if a[0] == area_padrao), achados[0])


def normaliza(brutos):
    saida = []
    for a in brutos:
        texto = junta(a["linhas"])
        if len(texto) < 60:
            continue

        prerequisito = ""
        m = PRE_REQ.search(texto)
        if m:
            prerequisito = ROTULO.sub("", m.group(1)).strip()
            texto = texto[: m.start()].strip()

        area, nivel = nivel_exigido(prerequisito, a["area"])
        custo = CUSTO.search(texto)

        saida.append({
            "nome": a["nome"],
            "categoria": a["categoria"],
            "areaAptidao": area or "",
            "nivelAptidao": nivel,
            "prerequisito": prerequisito,
            "custoPE": int(custo.group(1)) if custo else 0,
            "descricao": para_html(texto),
        })
    saida.sort(key=lambda x: ([c[1] for c in CATEGORIAS].index(x["categoria"]), x["nome"]))
    return saida


if __name__ == "__main__":
    aptidoes = normaliza(extrai())

    repetidos = [n for n, v in collections.Counter(
        a["nome"] for a in aptidoes).items() if v > 1]
    assert not repetidos, "nomes repetidos: %r" % repetidos

    destino = os.path.join(BASE, "dados", "aptidoes.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(aptidoes, ensure_ascii=False, indent=2) + "\n")

    por_cat = collections.Counter(a["categoria"] for a in aptidoes)
    for cat in [c[1] for c in CATEGORIAS]:
        print("  %-20s %2d" % (cat, por_cat.get(cat, 0)))
    com_pre = sum(1 for a in aptidoes if a["prerequisito"])
    com_nivel = sum(1 for a in aptidoes if a["nivelAptidao"])
    print("TOTAL: %d aptidoes (%d com pre-requisito, %d exigem Nivel de Aptidao)"
          % (len(aptidoes), com_pre, com_nivel))
    print("-> %s" % destino)
