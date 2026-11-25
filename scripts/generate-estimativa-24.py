#!/usr/bin/env python3
"""Estimativa 411 — MVP 7 / Robusta 14 → Drive (24 + estimativa / Novembro 2026)."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt

PROJECT = 411
PROJECT_FOLDER_ID = "17E8U2ZehEL4S4hyAWAcMJvIZ2xhm-7ge"  # 411 - Azevedo
TEMPLATE = Path("/home/eduardo/Downloads/Estimativa_433.docx")
OUT_PATH = Path(
    "/home/eduardo/workspaces/Borderless/411-Azevedo1/docs/Estimativa-411.docx"
)
DAY_NAME = "24"
DAY_FOLDER = "24 + estimativa"

MVP_TOTAL = 7
ROBUSTA_TOTAL = 14

DISCLAIMER_TEXT = (
    "Disclaimer\n\n"
    "Todos os passos são, claro, estimados, neste planejamento, mas pensando com margens "
    "para resolução de potenciais bugs, dificuldades que podem surgir em cada etapa de "
    "desenvolvimento, pelo fato do desenvolvimento de software em si já ser um serviço complexo. \n\n"
    "Claro, apenas sugestões, pois a decisão sempre será de vocês e seguiremos buscando "
    "agregar o máximo possível dentro dela. \n"
    "Agradecemos a gentileza, e estamos à disposição."
)

MODULES = [
    {
        "title": "1- Tags nos gastos: modelo e lançamento",
        "desc": (
            "Criar o modelo de tags para classificar qualquer gasto do Visão "
            "(consumo, acompanhamento, contas e lançamentos livres), com cadastro "
            "e edição no momento do lançamento."
        ),
        "bullets": [
            "Campo de tags no modelo de gasto (Firestore) e nas telas de adicionar/editar",
            "Criar, editar e remover tags do cliente, com sugestões das já usadas",
            "Validação e persistência sem quebrar os lançamentos atuais",
        ],
        "robusta_bullets": [
            "Sugestão automática de tag com base no histórico do título e da categoria",
        ],
        "mvp": 3,
        "robusta": 3,
    },
    {
        "title": "2- Tags em todas as telas e filtros",
        "desc": (
            "Levar as tags para as listas e resumos do app, para o cliente filtrar "
            "e enxergar o gasto pelo que importa no dia a dia."
        ),
        "bullets": [
            "Exibir tags em listas de gasto, consumo moderado, gastos acompanhados e contas",
            "Filtro e busca por tag nas telas principais de gasto",
            "Ajuste dos totais e dos gráficos para respeitar o filtro por tag",
        ],
        "robusta_bullets": [
            "Visão do consultor com filtro por tag no painel do cliente",
        ],
        "mvp": 2,
        "robusta": 3,
    },
    {
        "title": "3- Refinamentos funcionais pós-loja",
        "desc": (
            "Rodada de melhorias e correções finas depois da publicação: fluxos "
            "que o cliente já usa (home, contas, calendário, ordem dos dias e "
            "modais) e o que ainda atrapalhar no uso real."
        ),
        "bullets": [
            "Correções e polimento nos fluxos de conta, data, listas por dia e home",
            "Ajustes de usabilidade apontados no uso real após a publicação",
            "Regressão rápida nos caminhos críticos (lançar, pagar, acompanhar)",
        ],
        "robusta_bullets": [
            "Passada extra de UX nas telas tocadas pelas tags e pelos filtros",
        ],
        "mvp": 2,
        "robusta": 2,
    },
    {
        "title": "4- Integração com API bancária (Open Finance)",
        "desc": (
            "Conectar o Visão a uma API bancária / Open Finance para o cliente "
            "autorizar a conta e o app receber os movimentos sem digitar na mão."
        ),
        "bullets": [
            "Escolha e contrato do provedor (Open Finance / agregador)",
            "Fluxo de consentimento e vínculo da conta do cliente",
            "Importação segura dos movimentos (leitura) para o ambiente do Visão",
            "Tela de status da conexão e revogação do consentimento",
        ],
        "robusta_bullets": [],
        "mvp": 0,
        "robusta": 4,
    },
    {
        "title": "5- Pagamento caindo sem registrar na mão",
        "desc": (
            "Usar os movimentos da API para sugerir ou lançar o gasto/pagamento "
            "no Visão, reduzindo o trabalho de registrar o que já saiu na conta."
        ),
        "bullets": [
            "Matching de pagamento de conta e de gasto com o movimento bancário",
            "Confirmação do cliente (aceitar, editar ou ignorar) antes de gravar",
            "Atualização automática do status da conta a pagar quando houver match",
            "Histórico do que veio do banco versus o que foi lançado no app",
        ],
        "robusta_bullets": [],
        "mvp": 0,
        "robusta": 2,
    },
]

MODULE_STARTS = [11, 17, 23, 29, 35, 41]
RESUMO_HEADER = 57
RESUMO_MVP_TITLE = 58
RESUMO_MVP_BODY = 59
RESUMO_ROBUSTA_TITLE = 60
RESUMO_ROBUSTA_BODY = 61
DISCLAIMER_START = 98


def set_text(p, text: str, bold: bool = False, size: int | None = 15):
    p.text = text
    for run in p.runs:
        run.bold = bold
        if size:
            run.font.size = Pt(size)


def set_label_value(p, label: str, value: str, size: int = 15):
    p.text = ""
    r1 = p.add_run(label)
    r1.bold = True
    r1.font.size = Pt(size)
    r2 = p.add_run(value)
    r2.bold = False
    r2.font.size = Pt(size)


def set_subtitle(p):
    p.text = ""
    parts = [
        ("(Versões ", False),
        ('"MVP"', True),
        (" e ", False),
        ('"Robusta"', True),
        (
            " — tags em todos os gastos, refinamentos e integração bancária / 411)",
            False,
        ),
    ]
    for text, bold in parts:
        r = p.add_run(text)
        r.bold = bold
        r.font.size = Pt(15)


def set_mvp_robusta_lines(p, mvp: int, robusta: int, size: int = 15):
    p.text = ""
    lines = []
    if mvp > 0:
        lines.append(("☑️ MVP: ", f"{mvp} dia(s)"))
    if robusta > 0:
        lines.append(("✅ Robusta: ", f"{robusta} dia(s)"))
    for i, (lab, val) in enumerate(lines):
        if i:
            p.add_run("\n")
        r1 = p.add_run(lab)
        r1.bold = True
        r1.font.size = Pt(size)
        r2 = p.add_run(val)
        r2.bold = False
        r2.font.size = Pt(size)


def add_page_break_before(p):
    r = OxmlElement("w:r")
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    r.append(br)
    pPr = p._p.find(qn("w:pPr"))
    if pPr is not None:
        pPr.addnext(r)
    else:
        p._p.insert(0, r)


def keep_together(p):
    pPr = p._p.get_or_add_pPr()
    for tag in ("w:keepNext", "w:keepLines"):
        el = pPr.find(qn(tag))
        if el is None:
            pPr.append(OxmlElement(tag))


def build_estimativa(out_path: Path):
    modules = [m for m in MODULES if m["mvp"] > 0 or m["robusta"] > 0]
    assert all(m["mvp"] > 0 or m["robusta"] > 0 for m in modules)
    assert all(m["mvp"] >= 0 and m["robusta"] >= 0 for m in modules)
    assert sum(m["mvp"] for m in modules) == MVP_TOTAL
    assert sum(m["robusta"] for m in modules) == ROBUSTA_TOTAL

    shutil.copy(TEMPLATE, out_path)
    doc = Document(out_path)

    set_text(
        doc.paragraphs[0],
        "Estimativa em relação ao escopo do projeto",
        bold=True,
        size=17,
    )
    set_subtitle(doc.paragraphs[1])
    set_text(doc.paragraphs[4], "1. Visão Geral", bold=True, size=17)
    set_text(
        doc.paragraphs[5],
        "O Visão (411) já está publicado nas lojas com orçamentos, contas, cartões, "
        "planejamento, ranking, chat e notificações. Esta estimativa cobre a próxima "
        "fase: no MVP, tags em todos os gastos e refinamentos funcionais; na Robusta, "
        "integração com API bancária para o pagamento cair no app sem o cliente "
        "registrar na mão.",
        size=15,
    )
    set_label_value(
        doc.paragraphs[6],
        "Estimativa MVP: ",
        f"{MVP_TOTAL} dias úteis — tags em todos os gastos (modelo, telas e filtros) "
        "e refinamentos funcionais pós-publicação.",
    )
    set_label_value(
        doc.paragraphs[7],
        "Estimativa Robusta: ",
        f"{ROBUSTA_TOTAL} dias úteis — tudo do MVP, mais Open Finance / API bancária "
        "e conciliação para o pagamento cair sem registrar manualmente.",
    )
    set_text(doc.paragraphs[8], "", size=15)
    set_text(doc.paragraphs[10], "2. Módulos do Projeto", bold=True, size=17)

    for start, mod in zip(MODULE_STARTS, modules):
        set_text(doc.paragraphs[start], mod["title"], bold=True, size=17)
        set_text(doc.paragraphs[start + 1], mod["desc"], size=15)
        set_text(
            doc.paragraphs[start + 2],
            "• " + "\n• ".join(mod["bullets"]),
            size=15,
        )
        extra = mod.get("robusta_bullets") or []
        if extra and (mod["robusta"] > mod["mvp"] or mod["mvp"] == 0):
            set_text(
                doc.paragraphs[start + 3],
                "✅ Robusta inclui também:\n"
                + "\n".join(f"• {b}" for b in extra),
                size=15,
            )
        else:
            set_text(doc.paragraphs[start + 3], "", size=15)
        set_mvp_robusta_lines(
            doc.paragraphs[start + 4], mod["mvp"], mod["robusta"]
        )
        gap = start + 5
        if gap in (16, 22, 28, 34, 40, 46):
            set_text(doc.paragraphs[gap], "", size=15)

    # Limpa slots não usados do template (módulo 6+ do 433, ex.: ALPR).
    used_ends = {start + 5 for start in MODULE_STARTS[: len(modules)]}
    clear_from = max(used_ends) if used_ends else 41
    for i in range(clear_from, RESUMO_HEADER):
        if i < len(doc.paragraphs):
            set_text(doc.paragraphs[i], "", size=15)

    set_text(
        doc.paragraphs[RESUMO_HEADER],
        "3. Resumo das Estimativas",
        bold=True,
        size=17,
    )
    set_text(
        doc.paragraphs[RESUMO_MVP_TITLE],
        f"📌 Estimativa MVP: {MVP_TOTAL} dias úteis",
        size=15,
    )
    set_text(
        doc.paragraphs[RESUMO_MVP_BODY],
        "Tags em todos os gastos (cadastro, listas e filtros) e refinamentos "
        "funcionais depois da publicação nas lojas.",
        size=15,
    )
    set_text(
        doc.paragraphs[RESUMO_ROBUSTA_TITLE],
        f"📌 Estimativa Robusta: {ROBUSTA_TOTAL} dias úteis",
        size=15,
    )
    set_text(
        doc.paragraphs[RESUMO_ROBUSTA_BODY],
        "Tudo do MVP, mais integração com API bancária (Open Finance) e "
        "conciliação para o pagamento cair no Visão sem registrar na mão.",
        size=15,
    )

    for i in range(RESUMO_ROBUSTA_BODY + 1, DISCLAIMER_START):
        if i < len(doc.paragraphs):
            set_text(doc.paragraphs[i], "", size=15)

    if DISCLAIMER_START < len(doc.paragraphs):
        add_page_break_before(doc.paragraphs[DISCLAIMER_START])
        for i in range(
            DISCLAIMER_START, min(DISCLAIMER_START + 5, len(doc.paragraphs))
        ):
            keep_together(doc.paragraphs[i])

    full_text = "\n".join(p.text for p in doc.paragraphs)
    assert "MVP: 0" not in full_text
    assert "Robusta: 0" not in full_text
    assert f"Estimativa MVP: {MVP_TOTAL} dias" in full_text
    assert f"Estimativa Robusta: {ROBUSTA_TOTAL} dias" in full_text
    assert f"📌 Estimativa MVP: {MVP_TOTAL} dias" in full_text
    assert f"📌 Estimativa Robusta: {ROBUSTA_TOTAL} dias" in full_text
    for residue in ("11 dias", "433", "ALPR", "câmera", "placa", "Placa"):
        assert residue not in full_text, f"resíduo do template: {residue}"
    disclaimer_block = "\n".join(
        doc.paragraphs[i].text
        for i in range(
            DISCLAIMER_START, min(DISCLAIMER_START + 5, len(doc.paragraphs))
        )
    )
    for snippet in (
        "Disclaimer",
        "Todos os passos são, claro, estimados, neste planejamento, mas pensando com margens",
        "Claro, apenas sugestões, pois a decisão sempre será de vocês",
        "Agradecemos a gentileza, e estamos à disposição.",
    ):
        assert snippet in disclaimer_block, f"disclaimer alterado: {snippet}"

    doc.save(out_path)
    print(f"Saved {out_path}")
    print(
        f"MVP sum={sum(m['mvp'] for m in modules)}, "
        f"Robusta sum={sum(m['robusta'] for m in modules)}"
    )
    for m in modules:
        print(f"  {m['title']}: MVP {m['mvp']}d / Robusta {m['robusta']}d")


def get_token() -> str:
    out = subprocess.check_output(
        [
            "gdbus",
            "call",
            "--session",
            "--dest",
            "org.gnome.OnlineAccounts",
            "--object-path",
            "/org/gnome/OnlineAccounts/Accounts/account_1786639014_0",
            "--method",
            "org.gnome.OnlineAccounts.OAuth2Based.GetAccessToken",
        ],
        text=True,
    )
    return re.search(r"'(ya29\.[^']+)'", out).group(1)


def drive_request(method, url, token, data=None, headers=None):
    h = {"Authorization": f"Bearer {token}"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        return json.loads(body) if body else {}


def drive_list(parent_id, token):
    q = f"'{parent_id}' in parents and trashed=false"
    url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(
        {
            "q": q,
            "fields": "files(id,name,mimeType)",
            "pageSize": 200,
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
    )
    return drive_request("GET", url, token).get("files", [])


def drive_find_child(parent_id, token, predicate, label):
    for f in drive_list(parent_id, token):
        if predicate(f["name"]):
            return f
    raise SystemExit(f"Pasta não encontrada no Drive: {label}")


def drive_rename(file_id, name, token):
    drive_request(
        "PATCH",
        f"https://www.googleapis.com/drive/v3/files/{file_id}?supportsAllDrives=true&fields=id,name",
        token,
        data=json.dumps({"name": name}).encode(),
        headers={"Content-Type": "application/json"},
    )


def drive_trash_by_id(file_id: str, token: str):
    drive_request(
        "PATCH",
        f"https://www.googleapis.com/drive/v3/files/{file_id}?supportsAllDrives=true",
        token,
        data=json.dumps({"trashed": True}).encode(),
        headers={"Content-Type": "application/json"},
    )


def drive_upload(parent_id, local_path: Path, drive_name: str, token: str):
    boundary = "borderless_upload_boundary"
    meta = json.dumps({"name": drive_name, "parents": [parent_id]})
    file_bytes = local_path.read_bytes()
    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    body = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n"
        f"--{boundary}\r\nContent-Type: {mime}\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
    return drive_request(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
        token,
        data=body,
        headers={"Content-Type": f"multipart/related; boundary={boundary}"},
    )


def resolve_day_folder(token: str) -> str:
    """411 - Azevedo -> 2026 -> 9- novembro -> 24 (+ estimativa)."""
    root_children = drive_list(PROJECT_FOLDER_ID, token)
    print("Filhos de 411 - Azevedo:", [f["name"] for f in root_children])
    current = PROJECT_FOLDER_ID
    path = ["411 - Azevedo"]
    for f in root_children:
        if f["name"].strip().lower() in ("checklist", "checklists"):
            current = f["id"]
            path.append(f["name"])
            break
    year = drive_find_child(current, token, lambda n: n.strip() == "2026", "2026")
    current = year["id"]
    path.append(year["name"])
    month = drive_find_child(
        current,
        token,
        lambda n: (
            "nov" in n.strip().lower()
            or n.strip() in ("11", "11 - Nov", "9- novembro", "9-novembro")
        ),
        "novembro",
    )
    current = month["id"]
    path.append(month["name"])
    day = drive_find_child(
        current,
        token,
        lambda n: n.strip() in (DAY_NAME, DAY_FOLDER, "24/11", "24-11"),
        "dia 24",
    )
    if day["name"] != DAY_FOLDER:
        drive_rename(day["id"], DAY_FOLDER, token)
        print(f"Pasta do dia renomeada: {day['name']} -> {DAY_FOLDER}")
    path.append(DAY_FOLDER)
    print("Caminho no Drive:", " / ".join(path))
    return day["id"]


def upload(token: str):
    day_id = resolve_day_folder(token)
    for f in drive_list(day_id, token):
        if f["name"] in (f"Estimativa {PROJECT}", f"Estimativa {PROJECT}.docx"):
            drive_trash_by_id(f["id"], token)
            print(f"Trashed versão antiga: {f['name']} ({f['id']})")
    up = drive_upload(day_id, OUT_PATH, f"Estimativa {PROJECT}", token)
    print(f"Uploaded: Estimativa {PROJECT} na pasta do dia {DAY_FOLDER} ({day_id})")
    if isinstance(up, dict) and up.get("id"):
        print(f"https://drive.google.com/file/d/{up['id']}/view")
    print("Conteúdo final da pasta do dia:")
    for f in drive_list(day_id, token):
        print(f"  {f['name']} ({f['id']})")


if __name__ == "__main__":
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    build_estimativa(OUT_PATH)
    upload(get_token())
