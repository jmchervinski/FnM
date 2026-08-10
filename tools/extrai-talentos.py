# -*- coding: utf-8 -*-
"""
Extrai os Talentos Gerais do capitulo 7 do Livro de Regras v2.5.2 e grava
tools/dados/talentos-gerais.json, que alimenta o compendio.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-talentos.py fnm.txt

O capitulo e diagramado em duas colunas, com cada talento comecando por um
titulo em CAIXA ALTA. Os pre-requisitos vem no fim do texto, entre colchetes.

As faixas de pagina sao as do PDF v2.5.2; se a paginacao mudar, ajuste-as.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, colunas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "fnm.txt"))

# Capitulo 7. Os Talentos Gerais vao do inicio do capitulo ate o titulo
# "TALENTOS DE ORIGEM", que abre a outra metade do capitulo.
PRIMEIRA, ULTIMA = 162, 168
INICIO = re.compile(r"^\s*TALENTOS\s+GERAIS\b", re.M)
FIM = re.compile(r"^\s*TALENTOS\s+DE\s+ORIGEM\b", re.M)

# "[Pre-Requisito: Treinado em Intimidacao]" no fim do verbete
PRE_REQ = re.compile(r"\[\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*(.+?)\s*\]\s*$", re.I)
# O rotulo as vezes vem quebrado entre linhas no PDF e sobra dentro do valor
ROTULO = re.compile(r"^\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*", re.I)
# Titulos de secao que nao sao talentos
NAO_TALENTO = re.compile(r"^(TALENTOS|TALENTO)\b", re.I)


def extrai():
    talentos = []
    atual = None
    coletando = False

    for p in range(PRIMEIRA, ULTIMA + 1):
        for coluna in colunas(PAGINAS[p]):
            for linha in coluna.split("\n"):
                t = linha.strip()

                if INICIO.match(t):
                    coletando = True
                    atual = None
                    continue
                if FIM.match(t):
                    # Os Talentos de Origem sao outra secao; param aqui
                    return talentos
                if not coletando or not t:
                    continue

                if eh_titulo(linha):
                    if NAO_TALENTO.match(t):
                        atual = None
                        continue
                    atual = {"nome": titulo_pt(t), "linhas": []}
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
        prerequisito = ""
        m = PRE_REQ.search(texto)
        if m:
            prerequisito = ROTULO.sub("", m.group(1)).strip()
            texto = texto[: m.start()].strip()
        saida.append({
            "nome": t["nome"],
            "prerequisito": prerequisito,
            "descricao": para_html(texto),
        })
    saida.sort(key=lambda x: x["nome"])
    return saida


if __name__ == "__main__":
    talentos = normaliza(extrai())

    repetidos = [n for n, v in collections.Counter(
        t["nome"] for t in talentos).items() if v > 1]
    assert not repetidos, "nomes repetidos: %r" % repetidos

    destino = os.path.join(BASE, "dados", "talentos-gerais.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(talentos, ensure_ascii=False, indent=2) + "\n")

    com_pre = sum(1 for t in talentos if t["prerequisito"])
    print("%d talentos gerais (%d com pre-requisito)  ->  %s"
          % (len(talentos), com_pre, destino))
