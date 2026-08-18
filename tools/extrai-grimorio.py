# -*- coding: utf-8 -*-
"""
Extrai a Galeria do Grimorio das Maldicoes (Versao 1, F&M 2.5) e grava
tools/dados/grimorio.json, que alimenta os compendios de inimigos.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -fixed 4 -enc UTF-8 "Grimorio das Maldicoes.pdf" tools/grimorio.txt
    python tools/extrai-grimorio.py tools/grimorio.txt

O `-fixed 4` NAO e opcional. A calha entre as duas colunas do Grimorio tem dois
espacos com o `-layout` puro, estreita demais para livro_texto.colunas() achar;
com `-fixed 4` ela abre para uma dezena de espacos e as 16 paginas da Galeria se
separam todas.

A Galeria tem tres listas, cada uma com sua faixa de paginas do PDF v1:

    61-62  Treinamentos de inimigo (o Passo 4 da criacao)
    65-71  Aptidoes para Inimigos (os "Dotes Amaldicoados" da p. 20)
    72-76  Caracteristicas para Inimigos, em Gerais e Especiais
    77-80  Dotes Gerais

Entre os verbetes ha tabelas (Efeitos de Aura, Efeitos de Marca, ...). Elas nao
sao verbetes e nem fazem parte do texto do verbete anterior: sao cortadas aqui e
reanexadas por TABELAS, transcritas a mao.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from livro_texto import carrega_paginas, colunas, eh_titulo, junta, para_html, titulo_pt

PAGINAS = carrega_paginas(os.path.join(BASE, "grimorio.txt"))

# As paginas 63 e 64 ficam de fora: a 63 e uma divisoria e a 64 e so a
# introducao da Galeria, sem verbete nenhum.
FAIXAS = [(61, 62), (65, 80)]

# Cabecalho de secao -> (lista de destino, categoria, area de Nivel de Aptidao).
# O cabecalho vale ate o proximo: a p. 70 nao tem cabecalho e continua nas
# Aptidoes Especiais aberta na p. 69, e a p. 73 continua nas Gerais da p. 72.
SECOES = [
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+AURA\b", re.I), "dotesAmaldicoados", "Aura", "au"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+CONTROLE\s+E\s+LEITURA\b", re.I), "dotesAmaldicoados", "Controle e Leitura", "cl"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+DOM[ÍI]NIO\b", re.I), "dotesAmaldicoados", "Domínio", "dom"),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+BARREIRA\b", re.I), "dotesAmaldicoados", "Barreira", "bar"),
    (re.compile(r"^APTID[ÕO]ES\s+ESPECIAIS\b", re.I), "dotesAmaldicoados", "Especial", ""),
    (re.compile(r"^APTID[ÕO]ES\s+DE\s+ANATOMIA\b", re.I), "dotesAmaldicoados", "Anatomia", ""),
    (re.compile(r"^CARACTER[ÍI]STICAS\s+GERAIS\b", re.I), "caracteristicas", "Geral", ""),
    (re.compile(r"^CARACTER[ÍI]STICAS\s+ESPECIAIS\b", re.I), "caracteristicas", "Especial", ""),
    (re.compile(r"^DOTES\s+GERAIS\b", re.I), "dotesGerais", "Geral", ""),
    (re.compile(r"^TREINAMENTOS\s*$", re.I), "treinamentos", "Geral", ""),
]

# Titulos que abrem uma tabela ou a introducao de um capitulo, nao um verbete
NAO_E_VERBETE = re.compile(
    r"^(EFEITOS\s+DE\s+(AURA|MARCA)|CARACTER[ÍI]STICAS\s+PARA\s+INIMIGOS|"
    r"APTID[ÕO]ES\s+PARA\s+INIMIGOS|GALERIA|PASSO\s+\d)", re.I)

# Primeira linha de uma tabela solta no meio da coluna: encerra o verbete
# corrente sem abrir outro, para os numeros nao entrarem na descricao.
LINHA_DE_TABELA = re.compile(
    r"^(B[ôo]nus\s+de\s+Treinamento|Patamar\b|Grau\s+(Dano|Acerto)|Condi[çc][õo]es\s*$|"
    r"Treinamento\s+\+\d|\d+[ºo]\s+Grau\b|Grau\s+Esp\.|N[ãa]o\s+Recebe\s*$|"
    r"Nenhuma\s*$|\d+\s+Fraca)", re.I)

PRE_REQ = re.compile(r"\[\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*(.+?)\s*\]\s*$", re.I)
ROTULO = re.compile(r"^\s*Pr[ée]\s*-?\s*Requisitos?\s*:\s*", re.I)

# Verbetes cujo colchete final NAO e o pre-requisito do verbete. Em Assumir
# Postura o "[Pre-Requisito: ND 10]" fecha o marcador da Postura da Tempestade,
# a segunda das duas posturas — quem tem o dote destrava a Postura da Fortuna
# sem ND minimo. O colchete fica no texto e o campo do item fica vazio.
PRE_REQ_DO_MARCADOR = {"Assumir Postura"}

# titulo_pt() minusculiza artigos e preposicoes internos, mas nao conhece "as"
# com crase nem sabe que uma barra abre outra palavra.
POS_BARRA = re.compile(r"/(\w)")


def nome_pt(titulo):
    nome = titulo_pt(titulo).replace(" Às ", " às ")
    return POS_BARRA.sub(lambda m: "/" + m.group(1).upper(), nome)

# Exigencia de Nivel de Aptidao no pre-requisito, pela sigla ou por extenso
NIVEL_SIGLA = re.compile(r"\b(AU|CL|BAR|DOM|ER)\s*(\d)\b")
NIVEL_NOME = re.compile(
    r"N[íi]vel\s+de\s+Aptid[ãa]o\s+(?:em\s+)?"
    r"(Aura|Controle\s+e\s+Leitura|Barreira|Dom[íi]nio|Energia\s+Reversa)\s*(\d)", re.I)
NOME_PARA_AREA = {
    "aura": "au", "controle e leitura": "cl", "barreira": "bar",
    "domínio": "dom", "dominio": "dom", "energia reversa": "er",
}

# Nivel de Desafio minimo citado no pre-requisito ("ND 10 Desafio")
ND_MINIMO = re.compile(r"\bND\s*(\d+)\b", re.I)

# Custo em PE declarado de forma direta no texto do verbete
CUSTO = re.compile(
    r"\b(?:gastar?|custo\s+de|ao\s+custo\s+de|custa)\s+(\d+)\s*"
    r"(?:PE\b|pontos?\s+de\s+energia)", re.I)


def tabela(titulo, cabecalho, linhas):
    ths = "".join("<th>%s</th>" % c for c in cabecalho)
    trs = "".join(
        "<tr>%s</tr>" % "".join("<td>%s</td>" % c for c in linha) for linha in linhas)
    return ("<p><strong>%s</strong></p><table><thead><tr>%s</tr></thead>"
            "<tbody>%s</tbody></table>" % (titulo, ths, trs))


# As tabelas cortadas por LINHA_DE_TABELA, transcritas a mao do PDF e devolvidas
# ao verbete a que pertencem. Sao as unicas linhas deste arquivo que nao saem da
# extracao: confira-as contra o livro antes de usar em mesa.
TABELAS = {
    # p. 72, sob a caracteristica Aura
    "Aura": tabela(
        "Efeitos de Aura",
        ["Grau", "Acerto", "Defesa", "TR", "Perícia", "Crítico", "Terreno"],
        [["4º Grau", "0", "0", "0", "0", "0", "0"],
         ["3º Grau", "0", "0", "0", "0", "0", "1,5 m"],
         ["2º Grau", "-1", "-1", "-1", "-1", "+1", "3 m"],
         ["1º Grau", "-2", "-2", "-2", "-2", "+2", "4,5 m"],
         ["Grau Esp.", "-3", "-3", "-3", "-3", "+3", "6 m"]]),
    # p. 73, sob a caracteristica Marca
    "Marca": tabela(
        "Efeitos de Marca",
        ["Grau", "Dano Fixo", "Prejuízos", "Condições"],
        [["4º Grau", "+1", "-1", "Nenhuma"],
         ["3º Grau", "+2", "-2", "Nenhuma"],
         ["2º Grau", "+3", "-3", "1 Fraca"],
         ["1º Grau", "+4", "-4", "1 Fraca"],
         ["Grau Esp.", "+5", "-5", "2 Fracas"]]),
    # p. 73, sob a caracteristica Rastro Amaldicoado
    "Rastro Amaldiçoado": tabela(
        "Dano de Terreno",
        ["Bônus de Treinamento", "Dano de Terreno"],
        [["+2", "1d4+1"], ["+3", "2d4+3"], ["+4", "3d4+5"],
         ["+5", "3d6+8"], ["+6", "4d6+10"]]),
    # p. 69, sob a aptidao Tecnica Maxima
    "Técnica Máxima": tabela(
        "Técnica Máxima por Patamar",
        ["Patamar", "Técnica Máxima"],
        [["Lacaio", "Não Recebe Nada"],
         ["Capanga", "Não Recebe Nada"],
         ["Comum", "Não Recebe Nada"],
         ["Desafio", "Recebe +5 Dados de Dano no dano Padrão da Técnica"],
         ["Calamidade", "Recebe +7 Dados de Dano no dano Padrão da Técnica"]]),
}

# Texto que a divisao em colunas orfana: a p. 70 abre a coluna da direita no
# meio do verbete Energia Reversa, e sem titulo acima ele seria descartado.
COMPLEMENTOS = {
    "Energia Reversa":
        "<p>Curar é uma ação “Rápida” ou “Comum” para uma criatura; "
        "para cada vez que ela se curar, ela deve pagar 2 pontos de energia "
        "amaldiçoada.</p>"
        "<p>Para “Regenerar um Membro” deve ser pago 10 pontos de energia por "
        "“Membro”, ou 8 pontos de energia para “Ferida Interna”.</p>"
        "<p><em>A tabela de cura por Patamar e Bônus de Treinamento está na p. 70 do "
        "Grimório: as células dela têm duas linhas cada e se embaralham na extração "
        "de texto, por isso não foram transcritas aqui.</em></p>",
}


def extrai():
    """Percorre a Galeria pagina a pagina e devolve os verbetes crus."""
    listas = {"dotesAmaldicoados": [], "caracteristicas": [], "dotesGerais": [],
              "treinamentos": []}
    destino = categoria = area = None

    for p in (n for inicio, fim in FAIXAS for n in range(inicio, fim + 1)):
        for coluna in colunas(PAGINAS[p - 1]):
            # Cada coluna recomeca: o verbete da coluna anterior nao continua
            # aqui, e o texto no alto desta e cauda do que ficou la em cima.
            atual = None
            for linha in coluna.split("\n"):
                t = linha.strip()
                if not t:
                    continue

                secao = next((s for s in SECOES if s[0].match(t)), None)
                if secao:
                    _, destino, categoria, area = secao
                    atual = None
                    continue

                if LINHA_DE_TABELA.match(t):
                    atual = None
                    continue

                if eh_titulo(linha):
                    if NAO_E_VERBETE.match(t) or not destino:
                        atual = None
                        continue
                    atual = {"nome": nome_pt(t), "categoria": categoria,
                             "area": area, "linhas": []}
                    listas[destino].append(atual)
                elif atual is not None:
                    atual["linhas"].append(t)

    return listas


def nivel_exigido(prerequisito, area_padrao):
    """
    Le as exigencias de Nivel de Aptidao do pre-requisito.

    Um verbete pode exigir mais de uma area (Acerto Garantido pede BAR e DOM 4).
    Como o item guarda um unico par area/nivel, prevalece o da area do proprio
    grupo; o texto completo do pre-requisito fica preservado.
    """
    achados = []
    for m in NIVEL_NOME.finditer(prerequisito):
        chave = re.sub(r"\s+", " ", m.group(1).strip().lower())
        achados.append((NOME_PARA_AREA.get(chave, area_padrao), int(m.group(2))))
    for m in NIVEL_SIGLA.finditer(prerequisito):
        achados.append((m.group(1).lower(), int(m.group(2))))
    if not achados:
        return area_padrao, 0
    return next((a for a in achados if a[0] == area_padrao), achados[0])


def normaliza(brutos, minimo=50):
    saida = []
    for v in brutos:
        texto = junta(v["linhas"])
        if len(texto) < minimo:
            continue

        prerequisito = ""
        m = None if v["nome"] in PRE_REQ_DO_MARCADOR else PRE_REQ.search(texto)
        if m:
            prerequisito = ROTULO.sub("", m.group(1)).strip()
            texto = texto[: m.start()].strip()

        area, nivel = nivel_exigido(prerequisito, v["area"])
        custo = CUSTO.search(texto)
        nd = ND_MINIMO.search(prerequisito)

        descricao = para_html(texto)
        for extra in (COMPLEMENTOS.get(v["nome"]), TABELAS.get(v["nome"])):
            if extra:
                descricao += extra

        saida.append({
            "nome": v["nome"],
            "categoria": v["categoria"],
            "areaAptidao": area or "",
            "nivelAptidao": nivel,
            "ndMinimo": int(nd.group(1)) if nd else 0,
            "prerequisito": prerequisito,
            "custoPE": int(custo.group(1)) if custo else 0,
            "descricao": descricao,
        })
    return saida


ORDEM_CATEGORIA = {
    "dotesAmaldicoados": ["Aura", "Controle e Leitura", "Domínio", "Barreira",
                          "Especial", "Anatomia"],
    "caracteristicas": ["Geral", "Especial"],
    "dotesGerais": ["Geral"],
    "treinamentos": ["Geral"],
}

if __name__ == "__main__":
    listas = extrai()
    saida = {}
    for chave, brutos in listas.items():
        itens = normaliza(brutos)
        ordem = ORDEM_CATEGORIA[chave]
        itens.sort(key=lambda x: (ordem.index(x["categoria"]), x["nome"]))
        saida[chave] = itens

        repetidos = [n for n, v in collections.Counter(
            i["nome"] for i in itens).items() if v > 1]
        assert not repetidos, "nomes repetidos em %s: %r" % (chave, repetidos)

    destino = os.path.join(BASE, "dados", "grimorio.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    io.open(destino, "w", encoding="utf-8", newline="\n").write(
        json.dumps(saida, ensure_ascii=False, indent=2) + "\n")

    for chave in ("dotesAmaldicoados", "caracteristicas", "dotesGerais", "treinamentos"):
        por_cat = collections.Counter(i["categoria"] for i in saida[chave])
        print("%s: %d" % (chave, len(saida[chave])))
        for cat in ORDEM_CATEGORIA[chave]:
            if por_cat.get(cat):
                print("  %-20s %2d" % (cat, por_cat[cat]))
    print("-> %s" % destino)
