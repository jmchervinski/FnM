# -*- coding: utf-8 -*-
"""
Extrai as Habilidades de Especializacao do capitulo 4 do Livro de Regras v2.5.2
e grava tools/dados/habilidades-especializacao.json, que alimenta o compendio.

Uso (o PDF nao e versionado; extraia o texto antes):

    pdftotext -layout -enc UTF-8 "Livro de Regras v2.5.2.pdf" fnm.txt
    python tools/extrai-habilidades.py fnm.txt

As faixas de pagina em ESPECIALIZACOES sao as do PDF v2.5.2; se a paginacao
mudar em uma versao futura, ajuste-as.

O capitulo mistura dois formatos:
  1. Habilidades base, em pagina de coluna unica:
       "No nivel X, voce recebe a habilidade NOME:"  seguido de  "NOME. descricao"
  2. Habilidades escolhidas, em paginas de DUAS colunas, agrupadas por
       "HABILIDADES DE X NIVEL", com cada habilidade comecando por um titulo
       em CAIXA ALTA.
"""
import collections, io, json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
TXT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "fnm.txt")
if not os.path.exists(TXT):
    sys.exit("Texto do livro nao encontrado: %s\n"
             "Gere-o com: pdftotext -layout -enc UTF-8 <livro>.pdf fnm.txt" % TXT)
PAGINAS = io.open(TXT, encoding="utf-8").read().split("\f")

# Faixas de paginas (indice do pdftotext) de cada especializacao
ESPECIALIZACOES = [
    ("lutador", "Lutador", 48, 61),
    ("especialistaCombate", "Especialista em Combate", 62, 76),
    ("especialistaTecnica", "Especialista em Tecnica", 77, 88),
    ("controlador", "Controlador", 89, 100),
    ("suporte", "Suporte", 101, 112),
    ("restringido", "Restringido", 113, 127),
]

CAIXA_ALTA = re.compile(r"^[A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ0-9][A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ0-9 ,'\-–—:()/ºª°]*$")
TIER = re.compile(r"^HABILIDADES\s+(?:DE\s+)?(\d+)\s*[°º]?\s*N[IÍ]VEL", re.I)


def colunas(pagina):
    """Divide a pagina em colunas quando ha uma calha vertical de espacos."""
    linhas = [l.rstrip() for l in pagina.split("\n")]
    corpo = [l for l in linhas if l.strip()]
    if len(corpo) < 8:
        return [pagina]
    largura = max(len(l) for l in corpo)
    if largura < 60:
        return [pagina]

    # Uma coluna e "calha" se for espaco em quase toda linha do corpo. O limiar
    # nao pode ser 100%: uma legenda ou titulo largo atravessa a calha de vez em
    # quando, e isso nao descaracteriza o layout de duas colunas.
    calha = []
    for c in range(int(largura * 0.25), int(largura * 0.75)):
        vazios = sum(1 for l in corpo if c >= len(l) or l[c] == " ")
        if vazios >= len(corpo) * 0.90:
            calha.append(c)
    # Precisa de uma faixa contigua larga o suficiente
    faixas, atual = [], []
    for c in calha:
        if atual and c == atual[-1] + 1:
            atual.append(c)
        else:
            if len(atual) >= 3:
                faixas.append(atual)
            atual = [c]
    if len(atual) >= 3:
        faixas.append(atual)
    if not faixas:
        return [pagina]

    # Corta no FIM da calha, nao no inicio: uma linha da coluna esquerda as
    # vezes invade a calha, e cortar no inicio dela decapitaria a ultima
    # palavra da linha (era assim que "voce" virava "v").
    corte = max(faixas, key=len)[-1] + 1
    esq = "\n".join(l[:corte].rstrip() for l in linhas)
    dir_ = "\n".join(l[corte:].rstrip() for l in linhas)
    return [esq, dir_]


MINUSCULAS = {"a", "à", "as", "ao", "aos", "da", "das", "de", "do", "dos",
               "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por",
               "com", "sem", "sob", "the"}


def titulo_pt(t):
    """Title case do portugues: preposicoes e artigos internos em minusculo."""
    palavras = t.lower().split()
    saida = []
    for i, w in enumerate(palavras):
        saida.append(w if (i > 0 and w in MINUSCULAS) else w[:1].upper() + w[1:])
    return " ".join(saida)


def limpa(linha):
    return linha.strip()


def eh_titulo(linha):
    t = limpa(linha)
    if not (3 <= len(t) <= 46):
        return False
    if not CAIXA_ALTA.match(t):
        return False
    # Descarta numeros de pagina soltos e cabecalhos de tabela
    if t.isdigit() or TIER.match(t):
        return False
    # Cabecalho de tabela: duas colunas coladas na mesma linha
    if "  " in t:
        return False
    if re.search(r"(TABELA|CUSTO|N[IÍ]VEL DA|GANHOS)", t):
        return False
    letras = [c for c in t if c.isalpha()]
    return len(letras) >= 3


ORDINAIS = {
    "primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4, "quinto": 5,
    "sexto": 6, "setimo": 7, "sétimo": 7, "oitavo": 8, "nono": 9, "decimo": 10,
    "décimo": 10,
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
# Onde comeca a lista de habilidades escolhidas de cada especializacao
INICIO_ESCOLHIDAS = re.compile(r"^\s*HABILIDADES\s+D[OA]S?\s+\w", re.M)


def nivel_do_intro(m):
    if m.group(2):
        return int(m.group(2))
    if m.group(3):
        return int(m.group(3))
    palavra = (m.group(1) or "").lower()
    if palavra.isdigit():
        return int(palavra)
    return ORDINAIS.get(palavra, 1)


def extrai_base(ini, fim_base):
    """Habilidades base: paginas de coluna unica, antes da lista de escolhidas."""
    texto = re.sub(r"\s+", " ", " ".join(PAGINAS[ini:fim_base + 1]))
    intros = list(INTRO_BASE.finditer(texto))
    saida = []
    for i, m in enumerate(intros):
        hab = m.group(4).strip()
        nivel = nivel_do_intro(m)
        # A descricao comeca no "NOME." logo apos a introducao e vai ate o
        # proximo "No ... nivel, voce recebe a habilidade".
        fim = intros[i + 1].start() if i + 1 < len(intros) else len(texto)
        trecho = texto[m.end():fim]
        marca = re.search(re.escape(hab) + r"\s*\.\s*", trecho)
        desc = trecho[marca.end():] if marca else trecho
        # A tabela de niveis encerra o texto corrido das habilidades base
        corte = re.search(r"TABELA DE N[IÍ]VEL", desc)
        if corte:
            desc = desc[:corte.start()]
        desc = re.sub(r"\s*\d{1,3}\s*$", "", desc).strip()  # numero de pagina no fim
        if len(desc) > 30:
            saida.append({"nome": hab, "nivel": nivel, "descricao": desc})
    return saida


def parse(chave, nome, ini, fim):
    escolhidas = []       # (nivel, nome, descricao)
    nivel_tier = None

    # Onde a lista de habilidades escolhidas comeca
    fim_base = fim
    for p in range(ini, fim + 1):
        if INICIO_ESCOLHIDAS.search(PAGINAS[p]):
            fim_base = p - 1
            break
    base = extrai_base(ini, fim_base)

    for p in range(ini, fim + 1):
        pagina = PAGINAS[p]

        # --- habilidades escolhidas: por coluna ---
        for coluna in colunas(pagina):
            atual = None
            for linha in coluna.split("\n"):
                t = limpa(linha)
                m = TIER.match(t)
                if m:
                    nivel_tier = int(m.group(1))
                    atual = None
                    continue
                if not t:
                    continue
                if eh_titulo(linha) and nivel_tier:
                    atual = {"nivel": nivel_tier, "nome": titulo_pt(t), "linhas": []}
                    escolhidas.append(atual)
                elif atual is not None:
                    atual["linhas"].append(t)

    # Monta descricoes das escolhidas
    saida_escolhidas = []
    nomes_base = {b["nome"].lower() for b in base}
    for e in escolhidas:
        desc = " ".join(e["linhas"]).strip()
        desc = re.sub(r"\s+", " ", desc)
        desc = re.sub(r"\s*\d{1,3}\s*$", "", desc).strip()
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
        saida_escolhidas.append(item)

    return {"chave": chave, "nome": nome, "base": base, "escolhidas": saida_escolhidas}


def para_html(texto):
    """Os marcadores do livro viram uma lista HTML na descricao do item."""
    partes = [p.strip() for p in re.split(r"\s*•\s*", texto.strip()) if p.strip()]
    if len(partes) <= 1:
        return "<p>%s</p>" % texto.strip()
    itens = "".join("<li>%s</li>" % p for p in partes[1:])
    return "<p>%s</p><ul>%s</ul>" % (partes[0], itens)


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
