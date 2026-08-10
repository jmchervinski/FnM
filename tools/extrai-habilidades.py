# -*- coding: utf-8 -*-
"""
Extrai as Habilidades de Especializacao do capitulo 4 do Livro de Regras v2.5.2
e grava tools/dados/habilidades-especializacao.json, que alimenta o compendio.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-habilidades.py fnm.txt

O capitulo mistura dois formatos:
  1. Habilidades base, em texto corrido:
       "No nivel X, voce recebe a habilidade NOME:"  seguido de  "NOME. descricao"
  2. Habilidades escolhidas, em paginas de DUAS colunas, agrupadas por
       "HABILIDADES DE X NIVEL", com cada habilidade comecando por um titulo
       em CAIXA ALTA.

As faixas de pagina em ESPECIALIZACOES sao as do PDF v2.5.2; se a paginacao
mudar em uma versao futura, ajuste-as.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, colunas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "fnm.txt"))

# Faixas de paginas (indice do pdftotext) de cada especializacao
ESPECIALIZACOES = [
    ("lutador", "Lutador", 48, 61),
    ("especialistaCombate", "Especialista em Combate", 62, 76),
    ("especialistaTecnica", "Especialista em Tecnica", 77, 88),
    ("controlador", "Controlador", 89, 100),
    ("suporte", "Suporte", 101, 112),
    ("restringido", "Restringido", 113, 127),
]

TIER = re.compile(r"^HABILIDADES\s+(?:DE\s+)?(\d+)\s*[°º]?\s*N[IÍ]VEL", re.I)
# Onde comeca a lista de habilidades escolhidas de cada especializacao
INICIO_ESCOLHIDAS = re.compile(r"^\s*HABILIDADES\s+D[OA]S?\s+\w", re.M)

ORDINAIS = {
    "primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4, "quinto": 5,
    "sexto": 6, "setimo": 7, "sétimo": 7, "oitavo": 8, "nono": 9,
    "decimo": 10, "décimo": 10,
}
# "No primeiro nivel, voce recebe a habilidade X:" / "No nivel 4, ..." / "No 4 nivel, ..."
INTRO_BASE = re.compile(
    r"[Nn]o\s+(?:(\w+)\s+n[ií]vel|n[ií]vel\s+(\d+)|(\d+)\s*[°º]\s*n[ií]vel)"
    # Trecho opcional entre o nivel e o verbo ("de Lutador", "e a cada 4 niveis").
    # Nao pode conter ponto nem virgula, senao o casamento atravessa a frase
    # anterior e captura o nivel errado.
    r"(?:[^,.]{0,25},)?\s*voc[eê]\s+(?:tamb[ée]m\s+)?recebe\s+a\s+habilidade"
    r"\s+([^:]{3,60}):"
)


def titulo_de_habilidade(linha):
    """Titulo de habilidade: exclui os cabecalhos de faixa de nivel e de tabela."""
    t = linha.strip()
    if TIER.match(t) or re.search(r"N[IÍ]VEL DA", t):
        return False
    return eh_titulo(linha)


def nivel_do_intro(m):
    if m.group(2):
        return int(m.group(2))
    if m.group(3):
        return int(m.group(3))
    palavra = (m.group(1) or "").lower()
    return int(palavra) if palavra.isdigit() else ORDINAIS.get(palavra, 1)


def extrai_base(ini, fim_base):
    """Habilidades base: texto corrido, antes da lista de habilidades escolhidas."""
    texto = re.sub(r"\s+", " ", " ".join(PAGINAS[ini:fim_base + 1]))
    intros = list(INTRO_BASE.finditer(texto))
    saida = []
    for i, m in enumerate(intros):
        hab = m.group(4).strip()
        # A descricao comeca no "NOME." logo apos a introducao e vai ate a
        # proxima introducao.
        fim = intros[i + 1].start() if i + 1 < len(intros) else len(texto)
        trecho = texto[m.end():fim]
        marca = re.search(re.escape(hab) + r"\s*\.\s*", trecho)
        desc = trecho[marca.end():] if marca else trecho
        # A tabela de niveis encerra o texto corrido das habilidades base
        corte = re.search(r"TABELA DE N[IÍ]VEL", desc)
        if corte:
            desc = desc[:corte.start()]
        desc = junta([desc])
        if len(desc) > 30:
            saida.append({"nome": hab, "nivel": nivel_do_intro(m), "descricao": desc})
    return saida


def parse(chave, nome, ini, fim):
    # Onde a lista de habilidades escolhidas comeca
    fim_base = fim
    for p in range(ini, fim + 1):
        if INICIO_ESCOLHIDAS.search(PAGINAS[p]):
            fim_base = p - 1
            break
    base = extrai_base(ini, fim_base)

    escolhidas = []
    nivel_tier = None
    for p in range(ini, fim + 1):
        for coluna in colunas(PAGINAS[p]):
            atual = None
            for linha in coluna.split("\n"):
                t = linha.strip()
                m = TIER.match(t)
                if m:
                    nivel_tier = int(m.group(1))
                    atual = None
                    continue
                if not t:
                    continue
                if titulo_de_habilidade(linha) and nivel_tier:
                    atual = {"nivel": nivel_tier, "nome": titulo_pt(t), "linhas": []}
                    escolhidas.append(atual)
                elif atual is not None:
                    atual["linhas"].append(t)

    saida = []
    nomes_base = {b["nome"].lower() for b in base}
    for e in escolhidas:
        desc = junta(e["linhas"])
        if len(desc) < 40:
            continue
        # Uma habilidade base nao deve reaparecer como escolhida
        if e["nome"].lower() in nomes_base:
            continue
        item = {"nivel": e["nivel"], "nome": e["nome"], "descricao": desc}
        # Blocos muito longos sao as secoes de referencia do fim do capitulo
        # (as oito posturas, as artes do combate, as Dadivas do Ceu), e nao
        # habilidades do ultimo nivel visto.
        if len(desc) > 2000:
            item["secao"] = True
            item["nivel"] = 1
        saida.append(item)

    return {"chave": chave, "nome": nome, "base": base, "escolhidas": saida}


def normaliza(esp):
    """Ordena por nivel e desambigua nomes repetidos dentro da especializacao."""
    contagem = collections.Counter(h["nome"] for h in esp["base"] + esp["escolhidas"])
    lista = ([{**h, "base": True} for h in esp["base"]] +
             [{**h, "base": False} for h in esp["escolhidas"]])
    lista.sort(key=lambda h: (h["nivel"], not h["base"], h["nome"]))

    vistos, itens = set(), []
    for h in lista:
        nome = h["nome"]
        # Um nome repetido dentro da especializacao e a habilidade e a secao de
        # opcoes dela, no fim do capitulo. Desambigua em vez de fundir, para
        # nao perder nem embaralhar texto.
        if contagem[nome] > 1:
            if nome in vistos:
                nome = ("%s (referência)" % nome if h.get("secao")
                        else "%s (nível %d)" % (nome, h["nivel"]))
            vistos.add(h["nome"])
        elif h.get("secao"):
            nome = "%s (referência)" % nome
        itens.append({"nome": nome, "nivel": h["nivel"], "base": h["base"],
                      "descricao": para_html(h["descricao"])})
    return {"chave": esp["chave"], "nome": esp["nome"], "habilidades": itens}


if __name__ == "__main__":
    saida = [normaliza(parse(*e)) for e in ESPECIALIZACOES]

    for esp in saida:
        repetidos = [n for n, v in collections.Counter(
            h["nome"] for h in esp["habilidades"]).items() if v > 1]
        assert not repetidos, "%s: nomes repetidos %r" % (esp["nome"], repetidos)

    destino = os.path.join(BASE, "dados", "habilidades-especializacao.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(saida, ensure_ascii=False, indent=2) + "\n")

    total = 0
    for esp in saida:
        base = sum(1 for h in esp["habilidades"] if h["base"])
        total += len(esp["habilidades"])
        print("%-24s %3d habilidades (%d base, %d escolhidas)" % (
            esp["nome"], len(esp["habilidades"]), base, len(esp["habilidades"]) - base))
    print("TOTAL: %d  ->  %s" % (total, destino))
