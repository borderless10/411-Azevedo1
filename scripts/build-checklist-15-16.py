#!/usr/bin/env python3
"""Checklists 411 — Outubro/15 e Outubro/16."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = Path("/home/eduardo/workspaces/Borderless/411-Azevedo1")
spec = importlib.util.spec_from_file_location(
    "cl14", ROOT / "scripts/build-checklist-14-outubro.py"
)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PROJECT = 411
MONTH_ID = "1A7Y2RXUzyRcPTmQYW1G56KVznuAaSRXp"
APP = "https://planejecomvisao.com.br/login"
LEGAL = "https://visao-cce8f.web.app"
OUT_DIR = ROOT / "docs/checklists-411"

base.LEGAL = LEGAL
base.LOGINS = [
    f"App: {APP}",
    f"Legal / Privacidade: {LEGAL}",
    f"Exclusão de conta: {LEGAL}/exclusao-conta",
    "consultor@gmail.com · gustavo@gmail.com · consultor2@gmail.com · usuario@gmail.com",
    "Senha (todas): 123456",
]

DAYS = {
    "15": [
        {
            "title": "1. Vencimento e recorrência independentes",
            "bullets": [
                "A conta pode ser recorrente com vencimento, recorrente sem data, avulsa com data ou avulsa sem data.",
                "As quatro combinações ficam gravadas. Uma opção não apaga a outra.",
                "O dia informado continua sendo só o dia, sem inventar mês na hora de salvar.",
            ],
            "benefits": [
                "O consultor não perde a recorrência ao deixar a data em branco.",
                "Uma conta avulsa pode ter vencimento sem virar mensal.",
                "O planejamento e a lista usam a mesma regra.",
                "O dado antigo não é reescrito só porque a combinação parecia estranha.",
            ],
        },
        {
            "title": "2. Sem data continua sem vencimento",
            "bullets": [
                "Se não há dia nem data, a conta mostra Sem vencimento.",
                "O sistema não preenche com hoje, com a criação nem com o início do ciclo.",
                "Hoje não é tratado como atraso.",
            ],
            "benefits": [
                "O cliente não vê Vence hoje numa conta que não tem data.",
                "A lista deixa de inventar atraso.",
                "A ausência de data continua ausência depois de reabrir a tela.",
                "Conta sem data não entra sozinha na lista de vencidas.",
            ],
        },
        {
            "title": "3. Marca Já vencida só para a equipe",
            "bullets": [
                "Consultor, supervisor e admin marcam e desmarcam Já vencida numa conta em aberto.",
                "A marca vale com data e também sem data.",
                "O cliente não vê esse selo.",
            ],
            "benefits": [
                "A equipe destaca uma obrigação atrasada mesmo sem dia preenchido.",
                "O cliente continua vendo só o estado da data real.",
                "Tirar a marca não esconde um vencimento que já passou.",
                "Pagar a conta limpa a marca.",
            ],
        },
        {
            "title": "4. Data passada aparece vencida para o cliente",
            "bullets": [
                "Conta em aberto com vencimento antes de hoje fica vencida para todo mundo.",
                "O dia de hoje permanece Vence hoje.",
                "Conta paga deixa de aparecer como vencida.",
            ],
            "benefits": [
                "O atraso real não depende da marca manual.",
                "O cliente e o consultor leem a mesma data.",
                "A meia-noite local define o que já passou.",
                "O total de vencidas da lista acompanha essa regra.",
            ],
        },
        {
            "title": "5. Reinício do ciclo só avança conta paga",
            "bullets": [
                "Conta recorrente que já foi paga recebe o mesmo dia no mês do novo ciclo.",
                "Conta ainda em aberto mantém a data original.",
                "Conta sem vencimento continua sem data. Conta inativa não volta sozinha.",
            ],
            "benefits": [
                "Um atraso em aberto não é empurrado para o futuro.",
                "O consultor não redigita o dia das contas já quitadas.",
                "Dia 31 em fevereiro cai no último dia válido do mês.",
                "Reiniciar de novo não duplica a conta nem rola a data outra vez.",
            ],
        },
        {
            "title": "6. Desativar e reativar sem apagar",
            "bullets": [
                "A conta inativa some para o cliente e sai dos totais.",
                "O consultor continua vendo a conta, com o estado inativo e a ação Reativar.",
                "O histórico de gasto já lançado permanece.",
            ],
            "benefits": [
                "Dá para pausar uma obrigação sem perder o cadastro.",
                "O cliente não paga nem vê uma conta que a equipe desligou.",
                "Reativar devolve a conta ao planejamento.",
                "A desativação não apaga pagamentos antigos.",
            ],
        },
        {
            "title": "7. Troca de senha no iPhone",
            "bullets": [
                "Os campos de senha atual, nova senha e confirmação aceitam o preenchimento do sistema.",
                "O botão trava no primeiro toque e mostra que está processando.",
                "O sucesso só aparece depois que a senha foi de fato alterada.",
            ],
            "benefits": [
                "O teclado do iPhone oferece a senha salva e a sugestão de senha nova.",
                "Um toque duplo não dispara duas trocas.",
                "Senha atual errada recebe uma mensagem clara.",
                "A senha não é gravada em log.",
            ],
        },
    ],
    "16": [
        {
            "title": "1. Renda acompanhada aceita valor zero",
            "bullets": [
                "O zero da renda acompanhada é gravado e continua visível ao reabrir.",
                "Campo vazio não vira zero.",
                "Confirmar zero do dia cria o lançamento e recarrega a lista.",
            ],
            "benefits": [
                "Um dia sem venda deixa de sumir da renda acompanhada.",
                "O consultor vê o zero depois que o cliente sai da tela.",
                "O valor 0 não é tratado como campo faltando.",
                "As outras rendas continuam exigindo valor maior que zero.",
            ],
        },
        {
            "title": "2. Origem da renda",
            "bullets": [
                "A renda pode levar um texto opcional de origem, por exemplo venda de bolo.",
                "O texto tem no máximo 80 caracteres, com acentos, e vai junto do lançamento.",
                "Cliente e consultor autorizado veem a origem, inclusive quando o valor é zero.",
            ],
            "benefits": [
                "Dá para saber de onde veio aquele valor sem mudar o nome do acompanhamento.",
                "Sem origem, o campo fica vazio. Não aparece texto inventado.",
                "A edição da renda também grava e mostra a origem.",
                "O consumo moderado não muda por causa desse campo.",
            ],
        },
        {
            "title": "3. Busca de cliente no painel",
            "bullets": [
                "Consultor e supervisor têm o campo Buscar cliente acima da lista.",
                "A busca olha apelido, nome e e-mail na lista que já foi carregada.",
                "O supervisor também encontra pelo nome do consultor responsável.",
            ],
            "benefits": [
                "Não há uma consulta nova no banco a cada letra.",
                "A busca não mostra cliente de outro consultor.",
                "jose não encontra José. O acento continua valendo.",
                "Sem resultado, a lista diz Nenhum cliente encontrado.",
            ],
        },
        {
            "title": "4. Ranking lê um resumo por pessoa",
            "bullets": [
                "Cada participante tem um documento curto com pontos, liga, nome e apelido.",
                "A tela pede só a liga aberta, os 50 primeiros, em ordem de pontos.",
                "Registrar ou corrigir um ponto atualiza só o resumo daquela pessoa.",
            ],
            "benefits": [
                "A abertura deixa de baixar todos os usuários e todos os orçamentos.",
                "A foto não entra nesse resumo.",
                "No reset, a data de corte continua e os pontos do resumo voltam a zero.",
                "A primeira abertura grava os resumos. As seguintes usam essa leitura curta.",
            ],
        },
        {
            "title": "5. Fotos do ranking depois da lista",
            "bullets": [
                "Os nomes aparecem assim que o resumo chega.",
                "As fotos dos 20 primeiros carregam em seguida, juntas, sem segurar a lista.",
                "Quem está logado pode ler os resumos. Grava o dono, o consultor daquele cliente, o supervisor e o admin.",
            ],
            "benefits": [
                "A classificação não espera a foto de cada pessoa, uma por uma.",
                "A lista já mostra posição, nome e pontos.",
                "A foto continua vindo do perfil, não do resumo.",
                "O índice da liga com os pontos sustenta essa consulta.",
            ],
        },
        {
            "title": "6. Gastos do ciclo por data",
            "bullets": [
                "Quando a tela pede início e fim, a busca usa o usuário e a data no banco.",
                "O histórico inteiro deixa de vir para o aparelho só para filtrar o mês.",
                "O mesmo índice serve a busca de gastos de um dia.",
            ],
            "benefits": [
                "O Consumo Moderado baixa o período do ciclo, não todos os meses.",
                "Enquanto o índice termina de ser criado, a tela volta ao filtro anterior.",
                "Os outros filtros, como categoria, continuam valendo.",
                "A consulta fica igual no app e na web.",
            ],
        },
        {
            "title": "7. Uma leitura na tela de Consumo Moderado",
            "bullets": [
                "A tela lê o planejamento uma vez e os gastos do ciclo uma vez.",
                "Os orçamentos pedidos são os meses desse ciclo.",
                "A média sai desses dados, sem buscar o planejamento e os gastos de novo.",
            ],
            "benefits": [
                "A abertura deixa de repetir a mesma leitura.",
                "Conta de casal busca os dois integrantes no mesmo lote.",
                "Conta individual não pede o orçamento do par.",
                "O indicador de meta usa o ciclo que já está na tela.",
            ],
        },
    ],
}


def build_checklist(day: str, topics: list) -> Path:
    assert len(topics) >= 7
    shots = OUT_DIR / "screenshots" / day
    out_docx = OUT_DIR / f"Checklist-411-Outubro-{day}.docx"
    shutil.copy(base.TEMPLATE, out_docx)
    doc = Document(out_docx)
    base.rebuild_header(doc.paragraphs[0])

    for i, topic in enumerate(topics):
        start = 1 + i * 10
        base.set_plain(doc.paragraphs[start], topic["title"], bold=True, size_pt=17)
        for j, bullet in enumerate(topic["bullets"][:3]):
            base.set_plain(doc.paragraphs[start + 1 + j], f"🔹 {bullet}", size_pt=15)
        base.set_plain(doc.paragraphs[start + 4], "✔️ Benefícios:", size_pt=15)
        for j, benefit in enumerate(topic["benefits"][:4]):
            base.set_plain(doc.paragraphs[start + 5 + j], benefit, size_pt=15)

    numbered = [
        p for p in doc.paragraphs if re.match(r"^\d+\.\s+", (p.text or "").strip())
    ]
    assert len(numbered) >= 7, len(numbered)

    labels = json.loads((shots / "labels.json").read_text())
    assert len(labels) == 4
    img_idx = next(
        i for i, p in enumerate(doc.paragraphs) if p.text.strip().startswith("Imagens")
    )
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

    assert len(set(hashes)) == 4
    doc.save(out_docx)
    base.clean_docx_zip(out_docx)
    doc2 = Document(out_docx)
    base.assert_center_title_and_images(doc2)
    base.assert_header_footer_branding(doc2)
    assert base.count_body_drawings(out_docx) == 4
    text = "\n".join(p.text for p in doc2.paragraphs)
    assert "localhost" not in text.lower()
    assert APP in text
    print(f"Generated {out_docx}")
    return out_docx


def main():
    token = base.get_token()
    files = []
    for day, topics in DAYS.items():
        out = build_checklist(day, topics)
        files.extend((OUT_DIR / "screenshots" / day).glob("*.png"))
        day_id = base.drive_ensure_folder(MONTH_ID, day, token)
        base.drive_trash(
            day_id,
            [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
            token,
        )
        uploaded = base.drive_upload(day_id, out, f"Checklist {PROJECT}", token)
        print(f"Uploaded 2026/Outubro/{day}", uploaded.get("id"))
        print(f"https://drive.google.com/file/d/{uploaded['id']}/view")

    hashes = [hashlib.md5(path.read_bytes()).hexdigest() for path in files]
    assert len(hashes) == len(set(hashes)) == 8


if __name__ == "__main__":
    main()
