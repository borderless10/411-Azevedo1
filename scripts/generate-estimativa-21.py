#!/usr/bin/env python3
"""Estimativa 411 — MVP 7 / Robusta 10 → Drive (21 + estimativa / Outubro 2026)."""

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
DAY_NAME = "21"
DAY_FOLDER = "21 + estimativa"

MVP_TOTAL = 7
ROBUSTA_TOTAL = 10

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
        "title": "1- Estabilização e correções da fase de testes",
        "desc": (
            "O Visão já está em uso nos testes com orçamentos, contas, cartões e "
            "planejamento. Este módulo fecha os apontamentos dessa fase para o app "
            "entrar na loja sem os tropeços que hoje ainda aparecem no uso diário."
        ),
        "bullets": [
            "Correção dos apontamentos dos testes nos fluxos de contas, cartões, orçamentos e planejamento",
            "Conferência dos cálculos e dos saldos nas telas principais",
            "Rodada de regressão nos fluxos mais usados depois de cada correção",
        ],
        "robusta_bullets": [
            "Rodada extra de ajustes finos a partir do retorno do uso real",
            "Polimento das telas tocadas pelas correções",
        ],
        "mvp": 2,
        "robusta": 3,
    },
    {
        "title": "2- Segurança e backend no Firebase",
        "desc": (
            "Publicar e endurecer a parte de servidor do app: Functions, regras de "
            "acesso ao banco e às fotos, e os índices que mantêm as consultas rápidas."
        ),
        "bullets": [
            "Deploy das Functions de gamificação, chat e notificações",
            "Revisão das regras do Firestore e do Storage por perfil (cliente, consultor e admin)",
            "Criação e conferência dos índices das consultas de ranking e das listas principais",
            "Conferência das configurações de produção antes da publicação",
        ],
        "robusta_bullets": [],
        "mvp": 2,
        "robusta": 2,
    },
    {
        "title": "3- Publicação nas lojas e QA final",
        "desc": (
            "Colocar a versão fechada nas mãos dos clientes pelas lojas oficiais, "
            "com a conferência final em aparelhos reais."
        ),
        "bullets": [
            "Builds de produção Android (AAB) e iOS",
            "Envio e publicação no Google Play e na App Store",
            "QA final em aparelhos reais nos fluxos críticos (entrar, lançar, pagar, planejar e conversar)",
            "Conferência da versão publicada nos dois canais",
        ],
        "robusta_bullets": [],
        "mvp": 2,
        "robusta": 2,
    },
    {
        "title": "4- Notificações e alertas financeiros",
        "desc": (
            "Garantir que os avisos importantes cheguem ao celular mesmo com o app "
            "fechado, sem virar ruído para o cliente."
        ),
        "bullets": [
            "Push de conta a vencer, meta em risco e avisos do ciclo de consultoria",
            "Preferências por tipo de alerta nas Configurações",
            "Tratamento de permissão negada e de troca de aparelho ou token",
        ],
        "robusta_bullets": [],
        "mvp": 1,
        "robusta": 1,
    },
    {
        "title": "5- Sugestões novas: relatórios, exportações e metas inteligentes",
        "desc": (
            "Sugestão para a versão Robusta: dar saída aos dados que o cliente já "
            "lança no app e deixar as metas mais ativas no acompanhamento do mês."
        ),
        "bullets": [
            "Exportar lançamentos e o resumo do período (CSV e compartilhar) para uso na consultoria",
            "Relatório planejado x realizado por categoria, com os desvios do mês em destaque",
            "Metas inteligentes: projeção de atingimento e aviso quando o ritmo do mês desvia da meta",
        ],
        "robusta_bullets": [
            "Exportação também a partir da carteira do consultor, por cliente selecionado",
        ],
        "mvp": 0,
        "robusta": 1,
    },
    {
        "title": "6- Sugestões novas: gamificação, acessibilidade e confiança",
        "desc": (
            "Sugestão para a versão Robusta: evoluir o que já diferencia o Visão "
            "(ranking e insígnias) e deixar o app mais confortável e mais seguro de operar."
        ),
        "bullets": [
            "Evolução do ranking e das insígnias: novas conquistas, temporadas e destaque visual de foto e cor do distintivo",
            "Acessibilidade e polimento: contraste, tamanho de fonte, estados vazios e de carregamento mais claros",
            "Observabilidade e backup: registro de erros em produção, backup dos dados e das configurações e alerta de falha nas Functions",
        ],
        "robusta_bullets": [
            "Revisão dessas melhorias nas telas de ranking, perfil e configurações",
        ],
        "mvp": 0,
        "robusta": 1,
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
        ('(Versões ', False),
        ('"MVP"', True),
        (" e ", False),
        ('"Robusta"', True),
        (" — fechamento para publicação e sugestões de evolução do Visão / 411)", False),
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
    assert sum(m["mvp"] for m in modules) == MVP_TOTAL, (
        f"MVP sum {sum(m['mvp'] for m in modules)} != {MVP_TOTAL}"
    )
    assert sum(m["robusta"] for m in modules) == ROBUSTA_TOTAL, (
        f"Robusta sum {sum(m['robusta'] for m in modules)} != {ROBUSTA_TOTAL}"
    )
    assert MVP_TOTAL == 7
    assert ROBUSTA_TOTAL == 10

    shutil.copy(TEMPLATE, out_path)
    doc = Document(out_path)

    set_text(doc.paragraphs[0], "Estimativa em relação ao escopo do projeto", bold=True, size=17)
    set_subtitle(doc.paragraphs[1])
    set_text(doc.paragraphs[4], "1. Visão Geral", bold=True, size=17)
    set_text(
        doc.paragraphs[5],
        "O Visão, app financeiro do projeto 411, já entrega orçamentos, contas, "
        "cartões, planejamento, metas, ranking com gamificação e insígnias, chat "
        "com o consultor e notificações, sobre Firebase (Auth, Firestore, Storage "
        "e Functions). Esta estimativa cobre o que ainda falta para fechar e "
        "publicar com segurança, e, na versão Robusta, sugestões de melhorias e "
        "novas funcionalidades para a fase seguinte.",
        size=15,
    )
    set_label_value(
        doc.paragraphs[6],
        "Estimativa MVP: ",
        f"{MVP_TOTAL} dias úteis — estabilização da fase de testes, backend seguro "
        "no Firebase, notificações e publicação nas lojas.",
    )
    set_label_value(
        doc.paragraphs[7],
        "Estimativa Robusta: ",
        f"{ROBUSTA_TOTAL} dias úteis — tudo do MVP, mais relatórios e exportações, "
        "metas inteligentes, evolução da gamificação e das insígnias, acessibilidade "
        "e observabilidade com backup.",
    )
    set_text(doc.paragraphs[8], "", size=15)
    set_text(doc.paragraphs[10], "2. Módulos do Projeto", bold=True, size=17)

    for start, mod in zip(MODULE_STARTS, modules):
        set_text(doc.paragraphs[start], mod["title"], bold=True, size=17)
        set_text(doc.paragraphs[start + 1], mod["desc"], size=15)
        set_text(doc.paragraphs[start + 2], "• " + "\n• ".join(mod["bullets"]), size=15)
        extra = mod.get("robusta_bullets") or []
        if extra and (mod["robusta"] > mod["mvp"] or mod["mvp"] == 0):
            set_text(
                doc.paragraphs[start + 3],
                "✅ Robusta inclui também:\n" + "\n".join(f"• {b}" for b in extra),
                size=15,
            )
        else:
            set_text(doc.paragraphs[start + 3], "", size=15)
        set_mvp_robusta_lines(doc.paragraphs[start + 4], mod["mvp"], mod["robusta"])
        gap = start + 5
        if gap in (16, 22, 28, 34, 40, 46):
            set_text(doc.paragraphs[gap], "", size=15)

    # Slots não usados do template (módulos 7 e 8 do 433): apagar por completo.
    for i in range(47, RESUMO_HEADER):
        set_text(doc.paragraphs[i], "", size=15)

    set_text(doc.paragraphs[RESUMO_HEADER], "3. Resumo das Estimativas", bold=True, size=17)
    set_text(doc.paragraphs[RESUMO_MVP_TITLE], f"📌 Estimativa MVP: {MVP_TOTAL} dias úteis", size=15)
    set_text(
        doc.paragraphs[RESUMO_MVP_BODY],
        "Fechamento para publicar com segurança: correções da fase de testes, deploy "
        "e segurança do Firebase (Functions, regras e índices), notificações e "
        "publicação no Google Play e na App Store com QA final.",
        size=15,
    )
    set_text(
        doc.paragraphs[RESUMO_ROBUSTA_TITLE],
        f"📌 Estimativa Robusta: {ROBUSTA_TOTAL} dias úteis",
        size=15,
    )
    set_text(
        doc.paragraphs[RESUMO_ROBUSTA_BODY],
        "Tudo do MVP, mais as sugestões de evolução: relatórios e exportações, metas "
        "inteligentes com alertas de desvio, evolução do ranking e das insígnias, "
        "acessibilidade e polimento, e observabilidade com backup.",
        size=15,
    )

    for i in range(RESUMO_ROBUSTA_BODY + 1, DISCLAIMER_START):
        if i < len(doc.paragraphs):
            set_text(doc.paragraphs[i], "", size=15)

    if DISCLAIMER_START < len(doc.paragraphs):
        add_page_break_before(doc.paragraphs[DISCLAIMER_START])
        for i in range(DISCLAIMER_START, min(DISCLAIMER_START + 5, len(doc.paragraphs))):
            keep_together(doc.paragraphs[i])

    full_text = "\n".join(p.text for p in doc.paragraphs)
    assert "MVP: 0" not in full_text
    assert "Robusta: 0" not in full_text
    assert f"Estimativa MVP: {MVP_TOTAL} dias" in full_text
    assert f"Estimativa Robusta: {ROBUSTA_TOTAL} dias" in full_text
    assert f"📌 Estimativa MVP: {MVP_TOTAL} dias" in full_text
    assert f"📌 Estimativa Robusta: {ROBUSTA_TOTAL} dias" in full_text
    # Sem resíduo do template 433
    for residue in ("11 dias", "433", "ALPR", "câmera", "placa", "Placa"):
        assert residue not in full_text, f"resíduo do template: {residue}"
    # Disclaimer verbatim
    disclaimer_block = "\n".join(
        doc.paragraphs[i].text
        for i in range(DISCLAIMER_START, min(DISCLAIMER_START + 5, len(doc.paragraphs)))
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
    print(f"MVP sum={sum(m['mvp'] for m in modules)}, Robusta sum={sum(m['robusta'] for m in modules)}")
    for m in modules:
        print(f"  {m['title']}: MVP {m['mvp']}d / Robusta {m['robusta']}d")


def get_token() -> str:
    out = subprocess.check_output(
        [
            "gdbus", "call", "--session",
            "--dest", "org.gnome.OnlineAccounts",
            "--object-path", "/org/gnome/OnlineAccounts/Accounts/account_1786639014_0",
            "--method", "org.gnome.OnlineAccounts.OAuth2Based.GetAccessToken",
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
    """411 - Azevedo -> (checklist/checklists se existir) -> caminho existente -> dia 21."""
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
        lambda n: n.strip().lower() in ("outubro", "10", "10 - out", "10-outubro"),
        "outubro",
    )
    current = month["id"]
    path.append(month["name"])
    day = drive_find_child(
        current, token, lambda n: n.strip() in (DAY_NAME, DAY_FOLDER), "dia 21"
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
