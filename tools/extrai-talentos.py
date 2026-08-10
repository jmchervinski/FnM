# -*- coding: utf-8 -*-
"""
Extrai os Talentos do capitulo 7 do Livro de Regras v2.5.2 e grava
tools/dados/talentos.json, que alimenta o compendio.

O capitulo tem duas secoes:
  - TALENTOS GERAIS, disponiveis a qualquer personagem;
  - TALENTOS DE ORIGEM, limitados a uma origem, indicada no pre-requisito
    ("[Pre-Requisito: Origem Inato, Nivel 12]").

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-talentos.py fnm.txt

Ambas as secoes sao diagramadas em duas colunas, com cada talento comecando por
um titulo em CAIXA ALTA e os pre-requisitos no fim do texto, entre colchetes.

As faixas de pagina sao as do PDF v2.5.2; se a paginacao mudar, ajuste-as.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, colunas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "fnm.txt"))

# Capitulo 7 inteiro: os Talentos Gerais abrem o capitulo e os Talentos de
# Origem comecam no titulo proprio, indo ate o fim do capitulo.
PRIMEIRA, ULTIMA = 162, 170
INICIO_GERAIS = re.compile(r"^\s*TALENTOS\s+GERAIS\b", re.M)
INICIO_ORIGEM = re.compile(r"^\s*TALENTOS\s+DE\s+ORIGEM\b", re.M)

# "[Pre-Requisito: Treinado em Intimidacao]" no fim do verbete
PRE_REQ = re.compile(r"\[\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*(.+?)\s*\]\s*$", re.I)
# O rotulo as vezes vem quebrado entre linhas no PDF e sobra dentro do valor
ROTULO = re.compile(r"^\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*", re.I)
# "Origem Inato, Nivel 12" -> a origem exigida pelo talento
ORIGEM = re.compile(r"Origem\s+([^,\]]+?)\s*(?:,|$)", re.I)
# Titulos de secao que nao sao talentos
NAO_TALENTO = re.compile(r"^TALENTOS?\b", re.I)


def extrai():
    """Percorre o capitulo marcando a secao corrente de cada talento."""
    talentos = []
    atual = None
    secao = None

    for p in range(PRIMEIRA, ULTIMA + 1):
        for coluna in colunas(PAGINAS[p]):
            # Cada coluna recomeca do zero. Um paragrafo de largura total (a
            # introducao de uma secao) e fatiado pela divisao de colunas, e sem
            # este reinicio a metade direita dele se cola ao ultimo talento da
            # metade esquerda.
            atual = None
            for linha in coluna.split("\n"):
                t = linha.strip()

                if INICIO_ORIGEM.match(t):
                    secao, atual = "Origem", None
                    continue
                if INICIO_GERAIS.match(t):
                    secao, atual = "Geral", None
                    continue
                if not secao or not t:
                    continue

                if eh_titulo(linha):
                    if NAO_TALENTO.match(t):
                        atual = None
                        continue
                    atual = {"nome": titulo_pt(t), "categoria": secao, "linhas": []}
                    talentos.append(atual)
                elif atual is not None:
                    atual["linhas"].append(t)

    return talentos


def normaliza(brutos):
    saida = []
    for t in brutos:
        texto = junta(t["linhas"])
        if len(texto) < 40:
            continue

        prerequisito, origem = "", ""
        m = PRE_REQ.search(texto)
        if m:
            prerequisito = ROTULO.sub("", m.group(1)).strip()
            texto = texto[: m.start()].strip()
            # Nos Talentos de Origem, a origem exigida vem no pre-requisito
            mo = ORIGEM.search(prerequisito)
            if mo:
                origem = mo.group(1).strip()

        saida.append({
            "nome": t["nome"],
            "categoria": t["categoria"],
            "origem": origem,
            "prerequisito": prerequisito,
            "descricao": para_html(texto),
        })
    # Gerais primeiro, cada grupo em ordem alfabetica
    saida.sort(key=lambda x: (x["categoria"] != "Geral", x["nome"]))
    return saida


if __name__ == "__main__":
    talentos = normaliza(extrai())

    repetidos = [n for n, v in collections.Counter(
        t["nome"] for t in talentos).items() if v > 1]
    assert not repetidos, "nomes repetidos: %r" % repetidos

    de_origem = [t for t in talentos if t["categoria"] == "Origem"]
    sem_origem = [t["nome"] for t in de_origem if not t["origem"]]
    assert not sem_origem, "talento de origem sem origem identificada: %r" % sem_origem

    destino = os.path.join(BASE, "dados", "talentos.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(talentos, ensure_ascii=False, indent=2) + "\n")

    gerais = len(talentos) - len(de_origem)
    com_pre = sum(1 for t in talentos if t["prerequisito"])
    print("%d talentos: %d gerais, %d de origem (%d com pre-requisito)"
          % (len(talentos), gerais, len(de_origem), com_pre))
    for t in de_origem:
        print("   [%s] %s" % (t["origem"], t["nome"]))
    print("-> %s" % destino)
