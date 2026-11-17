#!/usr/bin/env python3
"""Checklists 411 — Novembro dias 13, 16, 17, 18 e 19 (Cartilha Visão)."""

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
MONTH_ID = "1l2Hb-2Ksqkh6mpqPmaoHH9sNcq6jE5fp"  # 9- novembro
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

SHOT_FILES = [
    "01-page-full.png",
    "02-detalhe-a.png",
    "03-detalhe-b.png",
    "04-detalhe-c.png",
]

DAYS = {
    "13": [
        {
            "title": "1. Paridade do supervisor com o consultor",
            "bullets": [
                "O supervisor passa a acessar wishlist, cartões, metas e anotações do cliente.",
                "As regras do Firestore e os serviços de planning incluem o papel supervisor.",
                "Tudo que o consultor faz no cliente, o supervisor também consegue fazer.",
            ],
            "benefits": [
                "A equipe deixa de rebaixar supervisor para consultor só para trabalhar.",
                "O mesmo cliente aparece igual para consultor e supervisor.",
                "Menos erro de permissão ao salvar link, meta ou cartão.",
                "A regra fica centralizada e fácil de manter.",
            ],
        },
        {
            "title": "2. Link de agendamento sem erro no perfil autorizado",
            "bullets": [
                "Supervisor e consultor salvam o link de agendamento do cliente.",
                "A atualização do cadastro respeita o papel sem limpar o link por engano.",
                "Depois de salvar, sair e voltar mantém o link.",
            ],
            "benefits": [
                "O cliente vê o botão de agendar na sidebar.",
                "A liberação da consultoria não depende de gambiarra de perfil.",
                "O erro de permissão some no fluxo real.",
                "Admin continua podendo editar o mesmo campo.",
            ],
        },
        {
            "title": "3. Cartões e metas visíveis para a equipe",
            "bullets": [
                "Cartões cadastrados deixam de aparecer como ausentes para o supervisor.",
                "Cadastro de metas pela conta de supervisor grava e permanece após recarregar.",
                "Wishlist e anotações da lista de desejos aparecem para o profissional.",
            ],
            "benefits": [
                "O atendimento vê o mesmo dado que o cliente.",
                "Meta nova não some ao atualizar a tela.",
                "Anotações deixam de ficar só no lado do cliente.",
                "O print de “sem cartão” deixa de contradizer o cadastro.",
            ],
        },
        {
            "title": "4. Edição de gasto sem fechar o modal vazio",
            "bullets": [
                "Apagar o valor inteiro no modal de gasto não fecha a janela.",
                "O overlay da web não captura o toque dentro do formulário.",
                "Dá para digitar o novo valor e salvar em seguida.",
            ],
            "benefits": [
                "O consultor conclui a correção sem reabrir o cadastro.",
                "Menos clique perdido no meio da edição.",
                "O fluxo fica igual no desktop e no app.",
                "O salvamento só ocorre no botão Salvar.",
            ],
        },
        {
            "title": "5. Atualizar e excluir gasto no planning",
            "bullets": [
                "O update remove campos undefined antes de gravar no Firestore.",
                "A exclusão sanitiza o array restante na mesma regra.",
                "Supervisor usa o mesmo caminho autorizado do consultor.",
            ],
            "benefits": [
                "Some o erro Unsupported field value undefined.",
                "Excluir depois de editar deixa de falhar em cascata.",
                "Web e app compartilham a mesma correção de dados.",
                "O registro afetado pode ser reproduzido e validado.",
            ],
        },
        {
            "title": "6. Recomendações longas sem estourar a tela",
            "bullets": [
                "Textos longos de tópico quebram linha e encolhem no card.",
                "A linha do tópico usa largura total sem cortar no celular.",
                "A edição de gasto como consultor segue no mesmo pacote de correção.",
            ],
            "benefits": [
                "Recomendação longa continua legível em tela pequena.",
                "O layout deixa de empurrar botões para fora.",
                "Cliente e equipe leem o mesmo conteúdo sem corte.",
                "Menos reclame visual no print do celular.",
            ],
        },
        {
            "title": "7. Deploy das regras e da web",
            "bullets": [
                "Firestore rules e índices da cartilha foram publicados no projeto Visão.",
                "O hosting web recebeu o build com as correções de novembro.",
                "A branch develop concentra o trabalho sem misturar com main.",
            ],
            "benefits": [
                "A validação pode ser feita já no ambiente publicado.",
                "Permissões novas valem no servidor, não só no app local.",
                "O time testa no mesmo endereço de produção.",
                "O histórico da develop fica rastreável.",
            ],
        },
    ],
    "16": [
        {
            "title": "1. Zero automático nos gastos acompanhados",
            "bullets": [
                "Em Configurações, perto do horário do aviso, existe a opção de zerar acompanhados.",
                "Consumo Moderado fica de fora da automação.",
                "Com a opção ligada, os demais acompanhados sem lançamento recebem zero.",
            ],
            "benefits": [
                "O cliente não precisa digitar zero um a um.",
                "O consumo moderado continua com o fluxo próprio.",
                "O lembrete e a opção ficam no mesmo lugar.",
                "Dá para desligar e voltar ao modo manual.",
            ],
        },
        {
            "title": "2. Pergunta quando a automação está desligada",
            "bullets": [
                "Sem a opção ativa, ao informar dia sem Consumo Moderado o app pergunta pelos outros.",
                "A lista mostra só acompanhados ainda sem registro.",
                "O cliente confirma ou registra zero na hora.",
            ],
            "benefits": [
                "Nada é zerado sem o cliente saber.",
                "Fica claro o que ainda falta no dia.",
                "O fluxo combina com o aviso de gastos do dia.",
                "Evita buraco silencioso na planilha.",
            ],
        },
        {
            "title": "3. Vários gastos na abertura do dia",
            "bullets": [
                "O aviso inicial aceita mais de um lançamento identificado.",
                "Cada item tem título/categoria e valor, sem somar tudo de cabeça.",
                "O total do fluxo reflete os lançamentos informados.",
            ],
            "benefits": [
                "Despesas diferentes não viram um valor único anônimo.",
                "A auditoria do dia fica rastreável item a item.",
                "Menos erro de soma mental na abertura.",
                "O mesmo padrão serve na Home e no orçamento por categoria.",
            ],
        },
        {
            "title": "4. Atalhos de valor no desktop",
            "bullets": [
                "No computador, o lançamento ganha chips +10 e +15.",
                "O campo de moeda aceita colar valor na web.",
                "Há leitura do total do dia no fluxo desktop.",
            ],
            "benefits": [
                "Lançamentos repetidos ficam mais rápidos.",
                "Menos pop-up só para somar valores comuns.",
                "O teclado e o mouse rendem mais no consultório.",
                "O mobile continua sem mudar o padrão atual.",
            ],
        },
        {
            "title": "5. Sessão pede senha ao fechar de verdade",
            "bullets": [
                "Na web, a sessão usa persistência de aba: fechar a janela pede login de novo.",
                "No app, matar o processo em background marca reautenticação no próximo cold start.",
                "Ir para segundo plano sem matar o app não desloga.",
            ],
            "benefits": [
                "Atende o pedido de não deixar login salvo após fechar.",
                "Evita logout irritante só por trocar de app.",
                "Web e nativo seguem a mesma intenção de segurança.",
                "O teste de aceite fica objetivo: fechar e abrir.",
            ],
        },
        {
            "title": "6. Ranking abre perfil sem foto",
            "bullets": [
                "Tocar no avatar sem foto abre o preview com iniciais.",
                "O botão Ver perfil funciona mesmo sem imagem.",
                "A foto, quando existe, continua ampliando normalmente.",
            ],
            "benefits": [
                "Ninguém fica preso no ranking por falta de foto.",
                "O perfil público de conquistas permanece acessível.",
                "Avatar padrão deixa a lista consistente.",
                "Some o bug de “não abre sem foto”.",
            ],
        },
        {
            "title": "7. Foto consistente entre telas",
            "bullets": [
                "A resolução da foto usa o endereço do Storage com fallback do formato antigo.",
                "Ranking, chat e perfil leem a mesma função de URI.",
                "Sem URI válida, a interface mostra iniciais em vez de sumir.",
            ],
            "benefits": [
                "A foto deixa de aparecer e sumir conforme a tela.",
                "Perfis migrados e novos compartilham a mesma regra.",
                "Menos surpresa ao comparar contas diferentes.",
                "A validação visual fica previsível.",
            ],
        },
    ],
    "17": [
        {
            "title": "1. Cliente solicita gasto extra ou acompanhado",
            "bullets": [
                "O cliente envia solicitação com título e tipo antes de entrar no planejamento.",
                "Consultor e supervisor veem a fila e aprovam ou rejeitam.",
                "Na aprovação, o gasto entra no planning do cliente.",
            ],
            "benefits": [
                "O cliente propõe sem editar o plano sozinho.",
                "A equipe mantém o controle do que vira oficial.",
                "Rejeitar também fica registrado no fluxo.",
                "Menos mensagem fora do sistema pedindo inclusão.",
            ],
        },
        {
            "title": "2. Compras parceladas no cartão",
            "bullets": [
                "Há tela para cadastrar data, total, parcela, cartão e número de parcelas.",
                "As parcelas caem mês a mês na fatura até acabar.",
                "Consultor e supervisor consultam e controlam a lista.",
            ],
            "benefits": [
                "Some a falta de lugar específico para parceladas.",
                "A fatura acompanha o compromisso sem lançamento manual todo mês.",
                "O valor da parcela fica explícito no acompanhamento.",
                "O teste de aceite cobre cadastro e visualização.",
            ],
        },
        {
            "title": "3. Investimentos editáveis e detalhados",
            "bullets": [
                "Lançamento de investimento pode ser corrigido depois de criado.",
                "Aplicações da mesma categoria aparecem detalhadas para o cliente.",
                "O consultor cadastra valores por tipo de investimento.",
            ],
            "benefits": [
                "Erro de digitação não exige apagar e refazer tudo.",
                "O cliente enxerga cada aplicação dentro da categoria.",
                "A conversa de carteira fica mais clara na consultoria.",
                "O histórico deixa de ser caixa-preta.",
            ],
        },
        {
            "title": "4. Ciclo com início e fim explícitos",
            "bullets": [
                "Dá para definir início e fim do ciclo, inclusive data anterior ao cadastro.",
                "A duração calculada fica consistente para cliente e consultor.",
                "O intervalo “de hoje a hoje” deixa de mascarar a escolha real.",
            ],
            "benefits": [
                "Reinício após consultoria fica alinhado com a data combinada.",
                "Ciclo de 31 dias mostra início e fim corretos.",
                "Menos atrito para começar antes do primeiro planning.",
                "A tela e o relatório usam as mesmas datas.",
            ],
        },
        {
            "title": "5. Bloco de notas no app",
            "bullets": [
                "O cliente cria, edita e consulta notas simples.",
                "O conteúdo permanece depois de reabrir o aplicativo.",
                "A entrada fica na navegação lateral.",
            ],
            "benefits": [
                "Anotações rápidas não dependem de outro app.",
                "A consultoria pode pedir um registro e achar depois.",
                "CRUD básico cobre o pedido da cartilha.",
                "A organização pessoal ganha um canto oficial.",
            ],
        },
        {
            "title": "6. Lista de mercado",
            "bullets": [
                "Itens de compra podem ser adicionados, marcados e atualizados.",
                "A lista persiste no Firestore com regras de dono.",
                "A tela fica acessível pelo menu do cliente.",
            ],
            "benefits": [
                "Mercado deixa de ser só mensagem solta no chat.",
                "Dá para voltar e ver o que ainda falta comprar.",
                "O pedido de organização da cartilha fica atendido.",
                "O fluxo é simples de validar no aceite.",
            ],
        },
        {
            "title": "7. Chat com editar e apagar em 1 hora",
            "bullets": [
                "Segurar a mensagem própria mostra Editar e Apagar só dentro de 1 hora.",
                "Apagar vira soft delete com o texto essa mensagem foi apagada.",
                "Editar grava o novo texto e marca como editada.",
            ],
            "benefits": [
                "Corrigir typo deixa de exigir nova mensagem.",
                "O histórico continua legível para os dois lados.",
                "Depois de 1 hora a opção some, como pedido.",
                "Reações continuam funcionando à parte.",
            ],
        },
    ],
    "18": [
        {
            "title": "1. Revisão de permissões no planning",
            "bullets": [
                "add, update e delete de gasto esperado usam ensureOwnerOrAdmin.",
                "Supervisor entra no mesmo gate de admin/consultor autorizado.",
                "Arrays gravados passam por remoção de undefined.",
            ],
            "benefits": [
                "Um único caminho evita buraco de permissão.",
                "O erro do Felipe deixa de voltar no supervisor.",
                "A exclusão não reintroduz campo inválido.",
                "Teste por perfil fica mais direto.",
            ],
        },
        {
            "title": "2. Solicitações pendentes para supervisor",
            "bullets": [
                "Supervisor enxerga solicitações de agendamento em visão ampla.",
                "O hook de pedidos pendentes inclui o papel supervisor.",
                "A liberação do link continua no detalhe do cliente.",
            ],
            "benefits": [
                "Fila de atendimento não depende só do consultor dono.",
                "Supervisor cobre ausência sem trocar de perfil.",
                "O cliente sente resposta mais rápida.",
                "Menos ticket de “não consigo liberar”.",
            ],
        },
        {
            "title": "3. Registros de gasto do cliente para a equipe",
            "bullets": [
                "Tela de registros carrega para supervisor sem bloqueio de ownership.",
                "Consultor segue restrito aos clientes dele.",
                "Admin mantém visão total.",
            ],
            "benefits": [
                "Auditoria de lançamentos não trava no supervisor.",
                "A regra de ownership do consultor permanece.",
                "Casos de exclusão por perfil ficam testáveis.",
                "A cartilha de permissões fecha o ciclo.",
            ],
        },
        {
            "title": "4. Settings só para cliente comum",
            "bullets": [
                "Opções de ranking e lembrete de gasto não tratam supervisor como cliente.",
                "O toggle de zero automático fica no bloco do usuário comum.",
                "Staff continua fora do ranking participativo.",
            ],
            "benefits": [
                "Configuração errada deixa de aparecer para a equipe.",
                "O cliente acha a opção no lugar combinado.",
                "Ranking e staff não se misturam.",
                "Menos confusão de papel na Settings.",
            ],
        },
        {
            "title": "5. Home trata supervisor como staff",
            "bullets": [
                "Fluxos só de cliente (zero planilha, consumo, planejamento) usam isStaffUser.",
                "Supervisor não cai no dashboard de cliente por engano.",
                "Consultor e admin permanecem no mesmo grupo.",
            ],
            "benefits": [
                "A Home do supervisor aponta para o trabalho de equipe.",
                "Prompts de cliente não atrapalham o staff.",
                "Comportamento fica alinhado ao Router.",
                "Menos bug de tela errada após login.",
            ],
        },
        {
            "title": "6. Índices novos no Firestore",
            "bullets": [
                "Coleções de solicitação, parcelada, notas e lista receberam índices.",
                "O deploy de índices foi feito junto com as rules.",
                "Consultas de fila e listagem ficam prontas para produção.",
            ],
            "benefits": [
                "Listagem não quebra por índice faltando.",
                "Aprovação e acompanhamento escalam melhor.",
                "O ambiente publicado reflete o código da develop.",
                "Menos surpresa no primeiro uso real.",
            ],
        },
        {
            "title": "7. Validação cruzada web e app",
            "bullets": [
                "Correções de gasto e sessão foram pensadas para as duas plataformas.",
                "O build web publicado cobre o caso testado no computador.",
                "O nativo herda a mesma lógica de serviço e AuthContext.",
            ],
            "benefits": [
                "O aceite da cartilha não fica só na web.",
                "Kill do app e fechar aba têm regras claras.",
                "QA consegue repetir o mesmo roteiro.",
                "Entrega de novembro fica homogênea.",
            ],
        },
    ],
    "19": [
        {
            "title": "1. Pasta 9- novembro no Drive",
            "bullets": [
                "Dentro de 2026 do projeto 411 foi criada a pasta 9- novembro.",
                "Os meses antigos receberam prefixo numérico do mais antigo ao mais recente.",
                "A ordem visual no Drive fica 1- Janeiro … 8- Outubro … 9- novembro.",
            ],
            "benefits": [
                "Achar o mês atual deixa de depender de ordenação alfabética.",
                "Novembro tem casa certa para as checklists da cartilha.",
                "O padrão de prefixo combina com a regra do time.",
                "Auditoria de pasta fica imediata.",
            ],
        },
        {
            "title": "2. Cinco checklists da cartilha",
            "bullets": [
                "Foram gerados os dias 13, 16, 17, 18 e 19 (pulando 14 e 15).",
                "Cada arquivo tem pelo menos sete tópicos numerados.",
                "Cada um sobe como Checklist 411 na pasta do dia.",
            ],
            "benefits": [
                "O cliente encontra o progresso dia a dia.",
                "O mínimo de tópicos da Borderless é respeitado.",
                "A numeração bate com o combinado na develop.",
                "Fácil apontar evidência por data.",
            ],
        },
        {
            "title": "3. Quatro imagens distintas por dia",
            "bullets": [
                "Cada checklist leva uma página inteira e três detalhes.",
                "Os arquivos de imagem têm hash único entre si e entre dias.",
                "Rótulos e figuras seguem o alinhamento centralizado do template.",
            ],
            "benefits": [
                "O gate de imagens da skill é cumprido.",
                "Não há recorte repetido entre checklists.",
                "A leitura visual no Word fica limpa.",
                "Homologação encontra evidência sem caçar print solto.",
            ],
        },
        {
            "title": "4. Escopo da cartilha fechado em fases",
            "bullets": [
                "Fase 1 cobriu permissões, gastos, fotos e sessão.",
                "Fase 2 cobriu zero automático, multi-lançamento e desktop.",
                "Fase 3 cobriu solicitações, parceladas, investimentos, ciclo, notas e chat.",
            ],
            "benefits": [
                "A entrega não ficou só em correção pontual.",
                "Melhorias e novas funções entraram no mesmo plano.",
                "Dá para testar por fase sem misturar causa.",
                "O PDF de novembro tem resposta item a item.",
            ],
        },
        {
            "title": "5. Regras de chat publicadas",
            "bullets": [
                "Edit e soft delete de mensagem própria estão nas rules.",
                "A janela de 1 hora é validada no servidor.",
                "Reações continuam em caminho separado.",
            ],
            "benefits": [
                "Cliente não edita mensagem alheia.",
                "O aviso essa mensagem foi apagada fica consistente.",
                "Segurança do chat não depende só do app.",
                "O long-press reflete a regra real.",
            ],
        },
        {
            "title": "6. Hosting e rules no ar",
            "bullets": [
                "Hosting visao-cce8f-app recebeu o export web da develop.",
                "Rules e indexes do Firestore foram deployados via CLI.",
                "O ambiente de teste do cliente aponta para o build novo.",
            ],
            "benefits": [
                "Homologação não precisa de build local.",
                "Permissões novas já valem no servidor.",
                "Rollback e próximo deploy ficam claros.",
                "Firebase CLI permanece o caminho oficial.",
            ],
        },
        {
            "title": "7. Próximo passo de homologação",
            "bullets": [
                "Reproduzir cada item com perfil cliente, consultor e supervisor.",
                "Confirmar web e app nos fluxos de gasto e sessão.",
                "Usar o checklist de homologação da própria cartilha.",
            ],
            "benefits": [
                "O time sabe o que ainda falta validar na mão.",
                "Evidência de teste fecha o ciclo com o PDF.",
                "Bugs residuais entram com perfil e plataforma anotados.",
                "A develop fica pronta para merge depois do aceite.",
            ],
        },
    ],
}


def ensure_labels(day: str) -> None:
    shots = OUT_DIR / "screenshots" / day
    labels = [
        {"file": SHOT_FILES[0], "label": f"Imagem 1 — Página inteira dia {day}"},
        {"file": SHOT_FILES[1], "label": f"Imagem 2 — Detalhe — painel A dia {day}"},
        {"file": SHOT_FILES[2], "label": f"Imagem 3 — Detalhe — painel B dia {day}"},
        {"file": SHOT_FILES[3], "label": f"Imagem 4 — Detalhe — painel C dia {day}"},
    ]
    (shots / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2))
    for item in labels:
        assert (shots / item["file"]).exists(), item["file"]


def build_checklist(day: str, topics: list) -> Path:
    assert len(topics) >= 7
    ensure_labels(day)
    shots = OUT_DIR / "screenshots" / day
    out_docx = OUT_DIR / f"Checklist-411-Novembro-{day}.docx"
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
    assert "smartcity" not in text.lower()
    assert APP in text
    print(f"Generated {out_docx}")
    return out_docx


def main():
    token = base.get_token()
    used = []
    for day, topics in DAYS.items():
        out = build_checklist(day, topics)
        for name in SHOT_FILES:
            used.append(OUT_DIR / "screenshots" / day / name)
        day_id = base.drive_ensure_folder(MONTH_ID, day, token)
        base.drive_trash(
            day_id,
            [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
            token,
        )
        uploaded = base.drive_upload(day_id, out, f"Checklist {PROJECT}", token)
        print(f"Uploaded 2026/9- novembro/{day}", uploaded.get("id"))
        print(f"https://drive.google.com/file/d/{uploaded['id']}/view")

    hashes = [hashlib.md5(path.read_bytes()).hexdigest() for path in used]
    assert len(hashes) == len(set(hashes)) == 20, (len(hashes), len(set(hashes)))


if __name__ == "__main__":
    main()
