# -*- coding: utf-8 -*-
"""
Utilidades para ler o texto do Livro de Regras extraido com pdftotext -layout.

Boa parte do livro e diagramada em duas colunas. O pdftotext preserva o
posicionamento com espacos, entao da para separar as colunas detectando a
calha vertical de espacos entre elas.

Uso tipico:

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
"""
import io, os, re, sys

CAIXA_ALTA = re.compile(
    r"^[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ0-9][A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ0-9 ,'\-–—:()/ºª°]*$")

MINUSCULAS = {"a", "à", "as", "ao", "aos", "da", "das", "de", "do", "dos",
              "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por",
              "com", "sem", "sob", "the"}


def carrega_paginas(caminho_padrao):
    """Le o texto do livro; aceita o caminho como primeiro argumento da linha."""
    txt = sys.argv[1] if len(sys.argv) > 1 else caminho_padrao
    if not os.path.exists(txt):
        sys.exit("Texto do livro nao encontrado: %s\n"
                 "Gere-o com: pdftotext -layout -enc UTF-8 <livro>.pdf fnm.txt" % txt)
    return io.open(txt, encoding="utf-8").read().split("\f")


def colunas(pagina):
    """Divide a pagina em colunas quando ha uma calha vertical de espacos."""
    linhas = [l.rstrip() for l in pagina.split("\n")]
    corpo = [l for l in linhas if l.strip()]
    if len(corpo) < 8:
        return [pagina]
    largura = max(len(l) for l in corpo)
    if largura < 60:
        return [pagina]

    # Fracao de linhas do corpo em que cada coluna esta em branco
    branco = [
        sum(1 for l in corpo if c >= len(l) or l[c] == " ") / len(corpo)
        for c in range(largura)
    ]

    def banda(limiar, largura_min):
        """Maior faixa contigua de colunas em branco na regiao central."""
        faixas = []
        atual = []
        for c in range(int(largura * 0.25), int(largura * 0.75)):
            if branco[c] >= limiar:
                atual.append(c)
                continue
            if len(atual) >= largura_min:
                faixas.append(atual)
            atual = []
        if len(atual) >= largura_min:
            faixas.append(atual)
        return max(faixas, key=len) if faixas else None

    # Dois passos. O limiar nao pode ser 100%: um titulo largo atravessa a calha
    # de vez em quando. E paginas que abrem com um paragrafo de largura total
    # (a introducao de um capitulo) diluem tanto a calha que so um limiar mais
    # baixo a encontra — por isso o segundo passo exige uma faixa mais larga,
    # que uma pagina de coluna unica nao tem.
    faixa = banda(0.90, 3) or banda(0.75, 5)
    if not faixa:
        return [pagina]

    # Corta no FIM da calha, nao no inicio: uma linha da coluna esquerda as
    # vezes invade a calha, e cortar no inicio dela decapitaria a ultima
    # palavra da linha (era assim que "voce" virava "v").
    corte = faixa[-1] + 1
    esq = "\n".join(l[:corte].rstrip() for l in linhas)
    dir_ = "\n".join(l[corte:].rstrip() for l in linhas)
    return [esq, dir_]


def titulo_pt(t):
    """Title case do portugues: preposicoes e artigos internos em minusculo."""
    palavras = t.lower().split()
    return " ".join(
        w if (i > 0 and w in MINUSCULAS) else w[:1].upper() + w[1:]
        for i, w in enumerate(palavras))


def eh_titulo(linha, maximo=46):
    """Um titulo de verbete: linha curta, toda em caixa alta, sem colunas coladas."""
    t = linha.strip()
    if not (3 <= len(t) <= maximo):
        return False
    if not CAIXA_ALTA.match(t):
        return False
    if t.isdigit():
        return False
    # Duas colunas coladas na mesma linha, ou cabecalho de tabela
    if "  " in t:
        return False
    if re.search(r"(TABELA|CUSTO|GANHOS)", t):
        return False
    return len([c for c in t if c.isalpha()]) >= 3


def junta(linhas):
    """Junta as linhas de um verbete em um paragrafo unico e limpo."""
    texto = re.sub(r"\s+", " ", " ".join(linhas)).strip()
    # Numero de pagina solto no fim do bloco
    return re.sub(r"\s*\d{1,3}\s*$", "", texto).strip()


def para_html(texto):
    """Os marcadores do livro viram uma lista HTML na descricao do item."""
    partes = [p.strip() for p in re.split(r"\s*•\s*", texto.strip()) if p.strip()]
    if len(partes) <= 1:
        return "<p>%s</p>" % texto.strip()
    itens = "".join("<li>%s</li>" % p for p in partes[1:])
    return "<p>%s</p><ul>%s</ul>" % (partes[0], itens)
