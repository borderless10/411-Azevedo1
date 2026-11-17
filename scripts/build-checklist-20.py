#!/usr/bin/env python3
"""Checklist 411 — Outubro/20. Somente itens do commit 993b7a8."""

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
DAY = "20"

TOPICS = [
    {
        "title": "1. Tela inicial sem esperar consulta secundária",
        "bullets": [
            "A Home mostra totais e transações assim que rendas e gastos chegam.",
            "A performance do consumo moderado, que faz três leituras a mais, agora carrega em segundo plano.",
            "O card de performance atualiza sozinho quando a consulta termina.",
        ],
        "benefits": [
            "Acaba a sensação de app parado em Carregando dados.",
            "O cliente vê os valores antes, mesmo em rede lenta.",
            "Nenhum valor some: o card completa segundos depois.",
            "Consultor e supervisor não pagam essa espera, como já era.",
        ],
    },
    {
        "title": "2. Ranking com todos os participantes",
        "bullets": [
            "Faltavam 31 resumos no banco. Foram criados com os pontos calculados pela mesma regra do app.",
            "Hoje o ranking tem 37 participantes individuais e 8 casais.",
            "Se faltar resumo de alguém, o app reconstrói a lista inteira e grava todos de uma vez.",
            "O teto da lista subiu de 50 para 500 nomes.",
        ],
        "benefits": [
            "Quem escolheu participar aparece, sem depender de abrir o app antes.",
            "Celular e navegador mostram a mesma quantidade.",
            "Participante novo entra sozinho no próximo carregamento.",
            "O ranking pode crescer sem novo corte escondido.",
        ],
    },
    {
        "title": "3. Troca de liga do ranking sem demora",
        "bullets": [
            "Antes, cada troca de liga relia os 97 usuários e buscava 20 fotos, uma por uma.",
            "A liga já aberta fica guardada na tela: voltar para ela é imediato.",
            "A contagem de participantes usa guarda de 60 segundos em vez de reler todo mundo.",
            "A foto passou a vir gravada no resumo do ranking, sem busca extra por pessoa.",
        ],
        "benefits": [
            "Trocar entre Individuais e Casais responde na hora.",
            "Menos leitura repetida é menos espera e menos custo de banco.",
            "A foto continua aparecendo nas primeiras posições.",
            "A lista não pisca nem volta para o carregamento a cada troca.",
        ],
    },
    {
        "title": "4. Aviso de chat enviado pelo servidor",
        "bullets": [
            "O código do envio pelo servidor entrou no versionamento do projeto.",
            "Mensagem nova no banco dispara o aviso, sem depender do aparelho de quem enviou.",
            "Chat direto avisa os participantes. No Bate-Papo, avisa quem foi mencionado.",
        ],
        "benefits": [
            "O aviso chega com o app fechado ou a tela desligada.",
            "A entrega não depende da rede de quem mandou a mensagem.",
            "O envio fica registrado e pode ser conferido no servidor.",
            "Mudança futura nesse envio passa a ter histórico.",
        ],
    },
    {
        "title": "5. Fotos de perfil em arquivo, listas leves",
        "bullets": [
            "O envio de foto de perfil para o Storage entrou no código versionado.",
            "Listas de usuários, ranking e admin leem o perfil leve, sem a foto em texto.",
            "A foto nova de perfil é gerada menor, em 512px.",
        ],
        "benefits": [
            "Abrir lista com muita gente não segura foto pesada na memória.",
            "Ranking, chat e perfil mostram a mesma foto pelo endereço.",
            "Foto menor sobe e baixa mais rápido no celular.",
            "O cadastro fica enxuto e as telas abrem mais leves.",
        ],
    },
    {
        "title": "6. Consultor enxerga renda geral e acompanhada",
        "bullets": [
            "Registros de Rendas tem os filtros Todas, Acompanhadas e Gerais / salário.",
            "Cada lançamento mostra se é renda acompanhada ou geral.",
            "A tela de rendas do cliente ganhou atalho para todas as rendas, incluindo salário.",
        ],
        "benefits": [
            "Salário e rendas comuns deixam de ficar invisíveis para a equipe.",
            "Dá para conferir só as gerais ou só as acompanhadas.",
            "Supervisor tem a mesma visão do consultor.",
            "A equipe chega na renda geral sem voltar de tela em tela.",
        ],
    },
    {
        "title": "7. Backend publicado e código organizado",
        "bullets": [
            "Funções do servidor, regras de acesso e índices foram publicados no Firebase.",
            "O arquivo de regras do projeto agora é igual ao que está valendo em produção.",
            "As otimizações de carregamento foram testadas antes da publicação: 17 testes automáticos aprovados e pacote gerado sem erro.",
        ],
        "benefits": [
            "O que está no ar e o que está no código são a mesma coisa.",
            "Nenhuma regra de acesso foi afrouxada nessa publicação.",
            "O histórico do que mudou fica guardado e pode ser desfeito.",
            "A próxima melhoria parte de uma base limpa e conferida.",
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
