#!/usr/bin/env python3
"""Checklists 411 — Novembro 19, 23 e 24 (só tópicos de desenvolvimento).

Substitui o dia 19 (que tinha pasta/Drive/homologação) e cria 23/24 com o
trabalho feito depois do checklist 18: chat de consultoria, Dev Tools e
Painel de Acompanhamento.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import shutil
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = Path("/home/eduardo/workspaces/Borderless/411-Azevedo1")
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

spec = importlib.util.spec_from_file_location(
    "cl14", SCRIPTS / "build-checklist-14-outubro.py"
)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PROJECT = 411
MONTH_ID = "1l2Hb-2Ksqkh6mpqPmaoHH9sNcq6jE5fp"  # 9- novembro
APP = "https://planejecomvisao.com.br/login"
LEGAL = "https://visao-cce8f.web.app"
OUT_DIR = ROOT / "docs/checklists-411"
# Doc Google nativo que estava com o conteúdo errado do dia 19
BAD_DOC_ID = "1h6rmae_YSO185Qz_E5lCBsRdIqh6XG0J"

base.LEGAL = LEGAL
base.LOGINS = [
    f"App: {APP}",
    f"Legal / Privacidade: {LEGAL}",
    f"Exclusão de conta: {LEGAL}/exclusao-conta",
    "consultor@gmail.com · gustavo@gmail.com · consultor2@gmail.com · usuario@gmail.com",
    "Senha (todas): 123456",
]

SHOT_FILES = [
    "01-page-full.png",
    "02-detalhe-a.png",
    "03-detalhe-b.png",
    "04-detalhe-c.png",
]

DAYS = {
    "19": [
        {
            "title": "1. Grupo de consultoria com nome certo para o cliente",
            "bullets": [
                "No chat em grupo com consultor e supervisor, o cliente vê Consultoria financeira.",
                "O rótulo Bate-Papo fica só para o chat global.",
                "A regra vale na lista e no título da conversa aberta.",
            ],
            "benefits": [
                "O cliente entende que está falando com a equipe financeira.",
                "Some a confusão de chamar o grupo de bate-papo genérico.",
                "O atendimento fica mais profissional na leitura do cliente.",
                "O chat global continua com o nome que já conhecia.",
            ],
        },
        {
            "title": "2. Staff vê o nome do cliente no mesmo grupo",
            "bullets": [
                "Consultor e supervisor veem o nome do cliente, mesmo sendo grupo.",
                "Admin continua com rótulo de grupo descritivo, com o nome do cliente.",
                "A lista do staff mostra o avatar do cliente nesse grupo.",
            ],
            "benefits": [
                "A equipe acha o cliente sem abrir a conversa.",
                "Vários grupos de consultoria não se misturam pelo título.",
                "O visual da lista fica igual ao de um chat direto com o cliente.",
                "Menos erro de responder no grupo errado.",
            ],
        },
        {
            "title": "3. Menu Dev Tools só no Expo web do usuário de QA",
            "bullets": [
                "No navegador, Ctrl+D abre o menu de desenvolvimento.",
                "Só o UID autorizado enxerga o atalho. Outros usuários e o app nativo não.",
                "O menu deixa claro que configs de notificação e zero automático não são apagadas.",
            ],
            "benefits": [
                "Dá para retestar o popup do dia sem pedir reset manual no banco.",
                "QA não depende do agente para limpar o estado do prompt.",
                "O recurso não vaza para cliente final.",
                "O fluxo de aceite do zero fica repetível no mesmo dia.",
            ],
        },
        {
            "title": "4. Resetar hoje como primeira entrada no app",
            "bullets": [
                "O botão limpa ontem e hoje: gastos, zeros, flags e ranking do dia.",
                "O popup da Home, que pergunta sobre ontem, volta a aparecer depois do F5.",
                "A ação finge que o calendário daquele dia nunca existiu.",
            ],
            "benefits": [
                "Dá para repetir o roteiro de gastos acompanhados no mesmo dia.",
                "Não precisa inventar data futura para testar de novo.",
                "O teste do 2º popup de acompanhados fica sob controle.",
                "O time valida o fluxo sem script de Firestore.",
            ],
        },
        {
            "title": "5. Reset não mexe em configurações do usuário",
            "bullets": [
                "Horário de notificação e zero automático permanecem como estavam.",
                "Só o estado do dia (budget, gastos e cache de sessão) é limpo.",
                "Preferências do perfil continuam intactas após o reset.",
            ],
            "benefits": [
                "O teste do dia não desfaz o setup de QA.",
                "Dá para alternar zero automático e ainda resetar o calendário.",
                "Menos retrabalho entre um cenário e outro.",
                "O escopo do Dev Tools fica explícito e seguro.",
            ],
        },
        {
            "title": "6. Incluir supervisor no chat cliente–consultor",
            "bullets": [
                "No Chat, o admin usa Incluir supervisor e escolhe cliente, consultor e supervisor.",
                "O sistema garante o chat direto e promove para grupo ao entrar o supervisor.",
                "A conversa passa a ter os três papéis no mesmo fio.",
            ],
            "benefits": [
                "A escalada de atendimento não cria chat paralelo.",
                "Cliente, consultor e supervisor leem o mesmo histórico.",
                "O fluxo fica a poucos cliques a partir da lista de chats.",
                "Combina com o novo nome Consultoria financeira.",
            ],
        },
        {
            "title": "7. Build web publicado com o chat corrigido",
            "bullets": [
                "O export web da develop subiu no hosting visao-cce8f-app.",
                "O título do grupo e o Dev Tools passam a valer no site de teste.",
                "Legal e app continuam nos alvos de hosting já usados.",
            ],
            "benefits": [
                "Homologação no navegador não depende de Metro local.",
                "O cliente valida o nome do grupo no ambiente publicado.",
                "O próximo checklist parte do mesmo build.",
                "Rollback e novo deploy seguem o mesmo comando.",
            ],
        },
    ],
    "23": [
        {
            "title": "1. Botão Painel de Acompanhamento no cliente",
            "bullets": [
                "No detalhe do cliente, o botão fica logo abaixo de Abrir Planejamento.",
                "Consultor e supervisor abrem o painel com o clientId do atendimento.",
                "A rota ClientFollowUpPanel entra no Router e na navegação.",
            ],
            "benefits": [
                "A equipe acha o comparativo sem caçar várias telas.",
                "O atalho fica no mesmo bloco de lançar na conta do cliente.",
                "Supervisor usa o mesmo caminho do consultor.",
                "O aceite do PDF de melhoria começa por um clique óbvio.",
            ],
        },
        {
            "title": "2. Tabela Planejado × Efetivo × Diferença",
            "bullets": [
                "Cada linha mostra categoria, valor planejado, valor efetivo e diferença.",
                "Diferença negativa aparece entre parênteses, no padrão da planilha antiga.",
                "O título da tela é VISÃO | Acompanhamento financeiro.",
            ],
            "benefits": [
                "A leitura fica igual à planilha que o cliente já conhecia.",
                "Dá para ver desvio por item sem montar relatório à mão.",
                "O visual no app web acompanha o modelo do PDF.",
                "Totais e saldo usam a mesma grade de colunas.",
            ],
        },
        {
            "title": "3. Período igual ao ciclo do planejamento",
            "bullets": [
                "O painel usa resolveClientMovementPeriod do planning do cliente.",
                "Com ciclo de Consumo Moderado, o intervalo é o ciclo atual.",
                "Sem ciclo, cai no mês corrente até hoje.",
            ],
            "benefits": [
                "Planejado e efetivo falam do mesmo recorte de datas.",
                "Não mistura mês calendário com ciclo da consultoria.",
                "O rótulo Ciclo atual / Este mês aparece no cabeçalho.",
                "A conferência bate com o que o planning já usa.",
            ],
        },
        {
            "title": "4. Seções RENDAS, GASTOS e SALDO",
            "bullets": [
                "Rendas vêm das expectedIncomes do planejamento.",
                "Gastos listam contas, Consumo Moderado, acompanhados e demais esperados.",
                "O saldo financeiro compara planejado e efetivo de caixa.",
            ],
            "benefits": [
                "A estrutura do PDF vira tela navegável.",
                "Cada bloco tem total próprio.",
                "O saldo fecha a leitura do acompanhamento.",
                "Itens do planning aparecem mesmo sem lançamento ainda.",
            ],
        },
        {
            "title": "5. Clique na linha abre o registro certo",
            "bullets": [
                "Renda abre ClientIncomeRecords ou IncomeList conforme o tipo.",
                "Consumo Moderado abre Budget; contas abrem Bills.",
                "Acompanhados abrem ClientExpenseRecords com escopo e título.",
            ],
            "benefits": [
                "Corrigir efetivo não exige procurar a tela no menu.",
                "O consultor usa as telas que já existem.",
                "Não há edição de planejamento escondida no painel.",
                "O desvio vira ação em um toque.",
            ],
        },
        {
            "title": "6. Planejado só leitura no painel",
            "bullets": [
                "O painel não altera o planejamento do cliente.",
                "Mudança de efetivo acontece nas telas de lançamento já usadas.",
                "A legenda deixa isso explícito para a equipe.",
            ],
            "benefits": [
                "Evita mudar o plano sem querer durante a conferência.",
                "O planejamento continua no Abrir Planejamento.",
                "O PDF de melhoria fica atendido sem risco de edição indevida.",
                "QA sabe onde validar cada tipo de correção.",
            ],
        },
        {
            "title": "7. Cartão fora do saldo de caixa",
            "bullets": [
                "isCreditCardExpense ficou compartilhado entre Home e painel.",
                "No saldo e nos totais de caixa, compra no cartão não entra.",
                "Linha com split mostra hint Caixa · Cartão quando houver parte no cartão.",
            ],
            "benefits": [
                "Some a dupla contagem de CM metade cartão / metade dinheiro.",
                "O saldo do período não cai com fatura que vira no mês seguinte.",
                "A regra é a mesma da Home e do planning.",
                "O consultor vê o cartão sem misturar com caixa.",
            ],
        },
        {
            "title": "8. Painel pronto para consultor e supervisor",
            "bullets": [
                "Consultor só abre cliente da carteira dele.",
                "Supervisor e admin acessam o mesmo painel no detalhe do cliente.",
                "O carregamento traz planning, gastos e rendas do ciclo em paralelo.",
            ],
            "benefits": [
                "A melhoria do PDF vale para os dois papéis de atendimento.",
                "Ownership do consultor continua protegido.",
                "A tela atualiza com puxar para atualizar.",
                "O fluxo fecha o pedido de área específica abaixo do planejamento.",
            ],
        },
    ],
    "24": [
        {
            "title": "1. Colunas do painel alinhadas aos títulos",
            "bullets": [
                "Planejado, Efetivo e Diferença usam largura fixa e texto centralizado.",
                "Cabeçalho e linhas compartilham a mesma grade, inclusive totais e saldo.",
                "O chevron de navegação tem espaço reservado para não empurrar valores.",
            ],
            "benefits": [
                "O valor fica debaixo do título certo.",
                "Some a leitura de coluna vazia por desalinhamento.",
                "A conferência visual fica mais rápida no desktop.",
                "Totais e saldo seguem o mesmo padrão das linhas.",
            ],
        },
        {
            "title": "2. Seta voltar no Expo web desktop",
            "bullets": [
                "Telas internas com showBackButton passam a mostrar a seta também no PC.",
                "O DesktopShell deixa de esconder o voltar em favor só da sidebar.",
                "O histórico de navegação continua sendo a primeira opção do voltar.",
            ],
            "benefits": [
                "Entrar numa linha do painel não prende a equipe sem saída.",
                "O fluxo consultor no navegador fica igual ao mobile nesse ponto.",
                "Menos dependência de clicar de novo no cliente pela sidebar.",
                "QA consegue ir e voltar no roteiro sem resetar a sessão.",
            ],
        },
        {
            "title": "3. Voltar da linha retorna ao painel",
            "bullets": [
                "O drill-down envia returnTo ClientFollowUpPanel com o clientId.",
                "ClientFollowUpPanel entra no fallback do Header junto das telas de cliente.",
                "Com histórico, o goBack volta para o painel; sem histórico, o returnTo cobre.",
            ],
            "benefits": [
                "Corrigir um gasto e voltar não joga para a Home.",
                "A conferência continua na mesma tela de acompanhamento.",
                "Budget, Bills e registros respeitam a origem do painel.",
                "O roteiro do PDF fica contínuo.",
            ],
        },
        {
            "title": "4. Total de gastos com Caixa e Cartão",
            "bullets": [
                "Abaixo do total de gastos aparece o split Planejado · Caixa · Cartão.",
                "O efetivo também mostra Caixa e Cartão somados no período.",
                "A nota explica que o saldo usa só caixa para evitar dupla contagem.",
            ],
            "benefits": [
                "Dá para ver o compromisso no cartão sem poluir o saldo.",
                "O total deixa de parecer incompleto quando há fatura.",
                "A equipe compara planejado e efetivo nos dois meios.",
                "Fecha o pedido visual do PDF com a regra correta de caixa.",
            ],
        },
        {
            "title": "5. Saldo financeiro só com caixa",
            "bullets": [
                "Saldo planejado = rendas planejadas menos gastos planejados em dinheiro.",
                "Saldo efetivo = rendas efetivas menos gastos efetivos sem cartão.",
                "A diferença do saldo usa a mesma conta Planejado × Efetivo.",
            ],
            "benefits": [
                "O número bate com a lógica já usada na Home.",
                "Fatura no mês seguinte não derruba o saldo do ciclo atual.",
                "A leitura do PDF fica correta do ponto de vista financeiro.",
                "Menos discussão de ‘sumiu dinheiro’ por compra no crédito.",
            ],
        },
        {
            "title": "6. Hosting atualizado com o painel polido",
            "bullets": [
                "Novo export web foi publicado no Firebase Hosting do app.",
                "Alinhamento, voltar e split caixa/cartão entram no site de teste.",
                "O comando deploy:web permanece o caminho oficial.",
            ],
            "benefits": [
                "O cliente valida a versão final do painel no ar.",
                "Não precisa build local para ver as correções de UI.",
                "O ambiente de homologação acompanha a develop.",
                "Próximos ajustes partem desse mesmo alvo.",
            ],
        },
        {
            "title": "7. Conferência rápida sem planilha paralela",
            "bullets": [
                "Com painel, drill-down e split de meio de pagamento, a planilha antiga deixa de ser necessária para o dia a dia.",
                "A equipe compara, abre o registro e corrige no mesmo fluxo.",
                "O resultado esperado do PDF de consultores fica coberto ponta a ponta.",
            ],
            "benefits": [
                "Menos cópia de valor para planilha externa.",
                "A atualização é automática porque usa o Firestore do cliente.",
                "O consultor ganha a facilidade pedida sem perder a regra de cartão.",
                "Supervisor acompanha com a mesma ferramenta.",
            ],
        },
    ],
}


def ensure_labels(day: str) -> None:
    shots = OUT_DIR / "screenshots" / day
    shots.mkdir(parents=True, exist_ok=True)
    labels = [
        {"file": SHOT_FILES[0], "label": f"Imagem 1 — Página inteira dia {day}"},
        {"file": SHOT_FILES[1], "label": f"Imagem 2 — Detalhe — painel A dia {day}"},
        {"file": SHOT_FILES[2], "label": f"Imagem 3 — Detalhe — painel B dia {day}"},
        {"file": SHOT_FILES[3], "label": f"Imagem 4 — Detalhe — painel C dia {day}"},
    ]
    (shots / "labels.json").write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for item in labels:
        assert (shots / item["file"]).exists(), f"missing {day}/{item['file']}"


def build_checklist(day: str, topics: list) -> Path:
    assert len(topics) >= 7, (day, len(topics))
    ensure_labels(day)
    shots = OUT_DIR / "screenshots" / day
    out_docx = OUT_DIR / f"Checklist-411-Novembro-{day}.docx"
    shutil.copy(base.TEMPLATE, out_docx)
    doc = Document(out_docx)
    base.rebuild_header(doc.paragraphs[0])

    # Template 433 tem 7 slots de tópico (10 parágrafos cada). Se N>7,
    # preenche os 7 primeiros slots e acrescenta os demais antes de Imagens.
    max_slots = 7
    for i, topic in enumerate(topics[:max_slots]):
        start = 1 + i * 10
        base.set_plain(doc.paragraphs[start], topic["title"], bold=True, size_pt=17)
        for j, bullet in enumerate(topic["bullets"][:3]):
            base.set_plain(doc.paragraphs[start + 1 + j], f"🔹 {bullet}", size_pt=15)
        base.set_plain(doc.paragraphs[start + 4], "✔️ Benefícios:", size_pt=15)
        for j, benefit in enumerate(topic["benefits"][:4]):
            base.set_plain(doc.paragraphs[start + 5 + j], benefit, size_pt=15)

    img_idx = next(
        i for i, p in enumerate(doc.paragraphs) if p.text.strip().startswith("Imagens")
    )
    if len(topics) > max_slots:
        anchor = doc.paragraphs[img_idx]
        for topic in topics[max_slots:]:
            p_title = anchor.insert_paragraph_before(topic["title"])
            p_title.runs[0].bold = True
            for run in p_title.runs:
                run.font.size = None
            base.set_plain(p_title, topic["title"], bold=True, size_pt=17)
            for bullet in topic["bullets"][:3]:
                p_b = anchor.insert_paragraph_before(f"🔹 {bullet}")
                base.set_plain(p_b, f"🔹 {bullet}", size_pt=15)
            p_ben = anchor.insert_paragraph_before("✔️ Benefícios:")
            base.set_plain(p_ben, "✔️ Benefícios:", size_pt=15)
            for benefit in topic["benefits"][:4]:
                p_x = anchor.insert_paragraph_before(benefit)
                base.set_plain(p_x, benefit, size_pt=15)

    # refresh img index after inserts
    img_idx = next(
        i for i, p in enumerate(doc.paragraphs) if p.text.strip().startswith("Imagens")
    )
    numbered = [
        p for p in doc.paragraphs if re.match(r"^\d+\.\s+", (p.text or "").strip())
    ]
    assert len(numbered) >= 7, (day, len(numbered))

    labels = json.loads((shots / "labels.json").read_text(encoding="utf-8"))
    assert len(labels) == 4
    base.set_plain(doc.paragraphs[img_idx], "Imagens", bold=True, size_pt=17)
    base.add_page_break_before(doc.paragraphs[img_idx])
    body = doc.paragraphs[img_idx]._p.getparent()
    after = doc.paragraphs[img_idx]._p.getnext()
    while after is not None:
        nxt = after.getnext()
        if after.tag == base.qn("w:sectPr"):
            break
        body.remove(after)
        after = nxt

    hashes = []
    for n, item in enumerate(labels, start=1):
        img_path = shots / item["file"]
        assert img_path.exists(), img_path
        hashes.append(hashlib.md5(img_path.read_bytes()).hexdigest())
        caption = item["label"]
        if not caption.startswith("Imagem "):
            caption = f"Imagem {n} — {caption}"
        p_label = doc.add_paragraph()
        p_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
        base.add_run(p_label, caption, bold=True, size_pt=12)
        p_pic = doc.add_paragraph()
        p_pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_pic.add_run().add_picture(str(img_path), width=base.picture_width_cm(img_path))

    assert len(set(hashes)) == 4, (day, hashes)
    doc.save(out_docx)
    base.clean_docx_zip(out_docx)
    doc2 = Document(out_docx)
    base.assert_center_title_and_images(doc2)
    base.assert_header_footer_branding(doc2)
    assert base.count_body_drawings(out_docx) == 4
    text = "\n".join(p.text for p in doc2.paragraphs)
    assert "localhost" not in text.lower()
    assert "smartcity" not in text.lower()
    assert "pasta 9" not in text.lower()
    assert "cinco checklists" not in text.lower()
    assert APP in text
    print(f"Generated {out_docx} topics={len(topics)}")
    return out_docx


def replace_google_doc_with_docx(docx_path: Path, token: str) -> None:
    """Atualiza o arquivo do link do dia 19 (Word no Drive) com o .docx novo."""
    import urllib.request

    file_bytes = docx_path.read_bytes()
    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    url = (
        f"https://www.googleapis.com/upload/drive/v3/files/{BAD_DOC_ID}"
        f"?uploadType=media&supportsAllDrives=true"
    )
    req = urllib.request.Request(url, data=file_bytes, method="PATCH")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", mime)
    with urllib.request.urlopen(req) as resp:
        resp.read()
    # Se o trash do upload do dia 19 tiver apagado esse ID, restaura.
    base.drive_request(
        "PATCH",
        f"https://www.googleapis.com/drive/v3/files/{BAD_DOC_ID}?supportsAllDrives=true",
        token,
        data=json.dumps({"trashed": False}).encode(),
        headers={"Content-Type": "application/json"},
    )
    print(f"Updated Drive file {BAD_DOC_ID}")


def main():
    token = base.get_token()
    used = []
    outputs = {}
    for day, topics in DAYS.items():
        out = build_checklist(day, topics)
        outputs[day] = out
        for name in SHOT_FILES:
            used.append(OUT_DIR / "screenshots" / day / name)
        day_id = base.drive_ensure_folder(MONTH_ID, day, token)
        if day == "19":
            # Mantém o ID do link que o Eduardo já abriu; só troca o conteúdo.
            base.drive_trash(
                day_id,
                [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
                token,
            )
            replace_google_doc_with_docx(out, token)
            # Garante parent = pasta do dia 19
            base.drive_request(
                "PATCH",
                (
                    f"https://www.googleapis.com/drive/v3/files/{BAD_DOC_ID}"
                    f"?supportsAllDrives=true&addParents={day_id}"
                ),
                token,
                data=json.dumps({"name": f"Checklist {PROJECT}"}).encode(),
                headers={"Content-Type": "application/json"},
            )
            print(f"Updated 9- novembro/19 {BAD_DOC_ID}")
            print(f"https://docs.google.com/document/d/{BAD_DOC_ID}/edit")
        else:
            base.drive_trash(
                day_id,
                [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
                token,
            )
            uploaded = base.drive_upload(day_id, out, f"Checklist {PROJECT}", token)
            print(f"Uploaded 9- novembro/{day}", uploaded.get("id"))
            print(f"https://drive.google.com/file/d/{uploaded['id']}/view")

    hashes = [hashlib.md5(path.read_bytes()).hexdigest() for path in used]
    assert len(hashes) == len(set(hashes)) == 12, (len(hashes), len(set(hashes)))
    print("OK 3 checklists × 4 imagens distintas")


if __name__ == "__main__":
    main()
