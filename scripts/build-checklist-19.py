#!/usr/bin/env python3
"""Checklist 411 — Outubro/19."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path("/home/eduardo/workspaces/Borderless/411-Azevedo1")
spec = importlib.util.spec_from_file_location(
    "cl1516", ROOT / "scripts/build-checklist-15-16.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

PROJECT = 411
DAY = "19"

TOPICS = [
    {
        "title": "1. Notificação de chat pelo servidor",
        "bullets": [
            "Cada mensagem nova no banco dispara o envio pelo servidor, sem depender do aparelho de quem mandou.",
            "Chat direto avisa os participantes. No Bate-Papo, o aviso vai para quem foi mencionado.",
            "Token inválido é limpo do cadastro e o erro de entrega fica registrado no log.",
        ],
        "benefits": [
            "A mensagem avisa mesmo com o app fechado ou a tela desligada.",
            "O consultor não precisa estar com o app aberto para o cliente receber.",
            "Menção e mensagem comum chegam com título e texto corretos.",
            "A entrega deixa de depender da rede do remetente.",
        ],
    },
    {
        "title": "2. Chave de push da Apple no lugar certo",
        "bullets": [
            "A chave de notificações da Apple foi criada só para push e vinculada ao app no Expo.",
            "A chave antiga, que era de envio para a loja, foi substituída.",
            "O teste de entrega voltou aprovado nos aparelhos testados.",
        ],
        "benefits": [
            "O iPhone passa a aceitar o push vindo do servidor.",
            "TestFlight e loja usam a mesma credencial de produção.",
            "Sem essa chave, nenhum push de chat chegava fora do app.",
            "A chave fica guardada no projeto para os próximos envios.",
        ],
    },
    {
        "title": "3. Fotos de perfil no Storage",
        "bullets": [
            "As 23 fotos que estavam gravadas como texto dentro do cadastro foram movidas para arquivos.",
            "O cadastro guarda só o endereço da foto. O texto pesado foi apagado dos 23 perfis.",
            "Foto nova de perfil já sobe direto para o arquivo, sem passar pelo cadastro.",
        ],
        "benefits": [
            "Nenhum perfil continua com foto pesada dentro do banco.",
            "A foto continua igual no ranking, no chat e no perfil.",
            "Foto nova já nasce no lugar certo.",
            "O endereço da foto tem prioridade sobre o formato antigo.",
        ],
    },
    {
        "title": "4. Listas sem carregar foto pesada",
        "bullets": [
            "Iniciar conversa, usuários do admin e ranking leem o perfil leve, sem a foto em texto.",
            "O ranking busca a foto pelo endereço, só dos 20 primeiros.",
            "A foto enviada daqui para frente é gerada menor, em 512px.",
        ],
        "benefits": [
            "Abrir lista com muita gente não segura todas as fotos na memória.",
            "É a causa mais provável dos fechamentos em alguns testes.",
            "A lista abre com nome e dados, e a foto entra pelo endereço.",
            "Foto menor também sobe e baixa mais rápido.",
        ],
    },
    {
        "title": "5. Consultor vê renda geral e acompanhada",
        "bullets": [
            "Registros de Rendas ganhou os filtros Todas, Acompanhadas e Gerais / salário.",
            "Cada lançamento mostra se é acompanhada ou geral.",
            "O bloco de meta do ciclo só aparece quando a visão inclui renda acompanhada.",
        ],
        "benefits": [
            "Salário e outras rendas comuns deixam de ficar invisíveis para a equipe.",
            "Dá para conferir só as gerais ou só as acompanhadas.",
            "O total do dia acompanha o filtro escolhido.",
            "Supervisor tem a mesma visão do consultor.",
        ],
    },
    {
        "title": "6. Atalho para todas as rendas do cliente",
        "bullets": [
            "A tela de Rendas Acompanhadas ganhou o atalho Ver todas as rendas (incluindo salário).",
            "O botão Rendas do Cliente virou Rendas Acompanhadas, para não confundir.",
            "O atalho só aparece para consultor, supervisor e admin vendo o cliente.",
        ],
        "benefits": [
            "A equipe chega na renda geral sem voltar ao detalhe do cliente.",
            "O nome do botão diz o que a tela realmente mostra.",
            "O cliente não vê atalho de equipe na tela dele.",
            "As duas visões de renda ficam a um toque uma da outra.",
        ],
    },
    {
        "title": "7. Builds de teste na Apple",
        "bullets": [
            "O build 14 (1.0.7) subiu para o TestFlight com as rendas do consultor.",
            "O build 15 (1.0.7) foi disparado com fotos no Storage e listas leves.",
            "Antes do envio, o pacote do iOS foi gerado localmente sem erro.",
        ],
        "benefits": [
            "O teste no iPhone usa o mesmo pacote da loja.",
            "Push, foto e renda podem ser testados juntos no aparelho.",
            "Cada build tem número próprio para saber o que está instalado.",
            "O que é só servidor (push e fotos) já vale sem esperar o build.",
        ],
    },
]


def main():
    out = mod.build_checklist(DAY, TOPICS)
    token = mod.base.get_token()
    day_id = mod.base.drive_ensure_folder(mod.MONTH_ID, DAY, token)
    mod.base.drive_trash(
        day_id,
        [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
        token,
    )
    uploaded = mod.base.drive_upload(day_id, out, f"Checklist {PROJECT}", token)
    print(f"Uploaded 2026/Outubro/{DAY}", uploaded.get("id"))
    print(f"https://drive.google.com/file/d/{uploaded['id']}/view")


if __name__ == "__main__":
    main()
