#!/usr/bin/env python3
"""Checklists 411 — Outubro/21 (ranking histórico) e Outubro/22 (insígnias e bordas).

Somente itens do commit 60498cb.
"""

from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path

ROOT = Path("/home/eduardo/workspaces/Borderless/411-Azevedo1")
spec = importlib.util.spec_from_file_location(
    "cl1516", ROOT / "scripts/build-checklist-15-16.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

PROJECT = 411

DAYS = {
    "21": [
        {
            "title": "1. Fechar o ranking agora salva a edição",
            "bullets": [
                "Ao encerrar, o sistema grava os vencedores antes de zerar os pontos.",
                "O fechamento roda no servidor, numa única operação: ou salva tudo, ou não mexe em nada.",
                "Repetir o fechamento da mesma edição não cria uma edição duplicada.",
            ],
            "benefits": [
                "Acabou o risco de zerar o ranking e perder quem estava no topo.",
                "O número da edição encerrada aparece na confirmação para o admin.",
                "Um toque duplo no botão não duplica o fechamento.",
                "A data de corte avança junto, e a próxima edição começa limpa.",
            ],
        },
        {
            "title": "2. Dois pódios por edição: Individuais e Casais",
            "bullets": [
                "Cada edição encerrada guarda o top 3 da liga Individual e o top 3 da liga Casais.",
                "O pódio congela nome, foto e pontos daquele momento.",
                "Com menos de três participantes, o pódio salva só quem existe.",
            ],
            "benefits": [
                "Casais deixam de ficar fora do reconhecimento.",
                "Pontos e fotos de uma edição antiga não mudam quando o participante evolui.",
                "Empate é resolvido sempre do mesmo jeito: pontos, nome e cadastro.",
                "A edição fica guardada mesmo se a conta mudar de liga depois.",
            ],
        },
        {
            "title": "3. Aba Pódio Anterior no ranking",
            "bullets": [
                "A tela do ranking ganhou a aba Pódio Anterior, ao lado do Ranking Atual.",
                "Ela mostra a última edição encerrada, com 2º à esquerda, 1º elevado no centro e 3º à direita.",
                "Ouro, prata e bronze identificam cada posição, com a data de encerramento da edição.",
            ],
            "benefits": [
                "Quem venceu continua visível depois do reset, sem apagar a conquista.",
                "A leitura do pódio é imediata, sem precisar procurar numa lista.",
                "Enquanto não há edição encerrada, a aba avisa com clareza.",
                "O seletor Individuais e Casais vale também para o pódio.",
            ],
        },
        {
            "title": "4. Histórico de edições encerradas",
            "bullets": [
                "A aba Histórico lista todas as edições, da mais recente para a mais antiga.",
                "Cada edição mostra os vencedores das duas ligas num resumo de uma olhada.",
                "Tocando numa edição, o pódio completo dela abre na mesma tela.",
            ],
            "benefits": [
                "A trajetória da comunidade fica registrada e consultável.",
                "Dá para conferir quem venceu em qualquer mês, sem planilha.",
                "O histórico cresce sozinho a cada fechamento, sem trabalho manual.",
                "Consultor e supervisor consultam o mesmo histórico do cliente.",
            ],
        },
        {
            "title": "5. Navegação por abas e deslize",
            "bullets": [
                "Ranking Atual, Pódio Anterior e Histórico ficam numa barra fixa no topo do ranking.",
                "Deslizar o dedo para os lados troca de aba, além do toque.",
                "A liga escolhida continua valendo ao trocar de aba.",
            ],
            "benefits": [
                "A troca entre atual e histórico é de um gesto.",
                "Quem usa com uma mão só não precisa mirar no botão.",
                "A posição na lista atual não se perde ao olhar o passado.",
                "O visual segue o mesmo roxo e os mesmos cartões do app.",
            ],
        },
        {
            "title": "6. Fechamento protegido no servidor",
            "bullets": [
                "Só o admin fecha uma edição, e a conferência acontece no servidor.",
                "Cliente, consultor e supervisor não conseguem gravar edição por fora do botão oficial.",
                "Se faltar resumo de alguém no fechamento, a pessoa entra com zero, sem travar a edição.",
            ],
            "benefits": [
                "Ninguém altera o histórico por fora do fluxo oficial.",
                "O fechamento não falha por causa de um participante sem resumo.",
                "Quem fechou fica registrado na edição, para auditoria.",
                "As regras de acesso foram publicadas junto com a função.",
            ],
        },
        {
            "title": "7. Publicado e no TestFlight",
            "bullets": [
                "Funções do servidor, regras e índices do ranking histórico foram publicados no Firebase.",
                "A versão 1.0.8, build 19, foi gerada e validada pela Apple para teste.",
                "Os testes automáticos do fechamento e do desempate passaram antes da publicação.",
            ],
            "benefits": [
                "O que está no código é o que está valendo para todos.",
                "Testadores já recebem a novidade pelo TestFlight.",
                "O pacote foi gerado sem erro para celular e navegador.",
                "Cada mudança fica no histórico e pode ser desfeita.",
            ],
        },
    ],
    "22": [
        {
            "title": "1. Catálogo de insígnias do app",
            "bullets": [
                "O app ganhou um catálogo de insígnias com nome, significado e descrição.",
                "Sete insígnias oficiais já nascem cadastradas, como Guardião do Zero e Legado Visão.",
                "Cada insígnia tem ícone próprio de uma lista aprovada e cores definidas.",
            ],
            "benefits": [
                "A conquista tem nome e significado, não é só um desenho.",
                "O cliente entende o que cada insígnia celebra ao tocar nela.",
                "Nada de imagem solta enviada por fora: o visual fica consistente.",
                "O catálogo aparece igual no ranking, na galeria e no perfil.",
            ],
        },
        {
            "title": "2. Admin cria, edita e desativa insígnias",
            "bullets": [
                "No painel de usuários, o botão Insígnias abre a gestão completa do catálogo.",
                "Dá para criar insígnia nova com ícone, cores e estilo de borda escolhidos em listas fechadas.",
                "Desativar tira a insígnia das novas concessões sem apagar quem já tem.",
            ],
            "benefits": [
                "Campanhas novas ganham insígnia própria sem precisar de atualização do app.",
                "Cor inválida ou identificador repetido é recusado antes de salvar.",
                "A contagem de detentores aparece ao lado de cada insígnia.",
                "Consultor e supervisor veem as insígnias, mas não administram.",
            ],
        },
        {
            "title": "3. Concessão e remoção com confirmação",
            "bullets": [
                "O admin busca a pessoa por nome ou e-mail e concede a insígnia num toque.",
                "A mesma insígnia nunca é concedida duas vezes para a mesma pessoa.",
                "Remover pede confirmação e registra quem concedeu e quem removeu.",
            ],
            "benefits": [
                "Nenhuma concessão duplicada aparece no perfil.",
                "A remoção é consciente, sem toque acidental.",
                "Fica registrado quem mexeu, para conferência futura.",
                "A tela atualiza na hora, sem precisar sair e entrar de novo.",
            ],
        },
        {
            "title": "4. Borda da foto escolhida pelo próprio usuário",
            "bullets": [
                "No Perfil, a seção Minha borda mostra a prévia da foto com a borda atual.",
                "Quem tem insígnia escolhe qual delas emoldura a foto, ou volta para a borda padrão.",
                "Só aparece para escolher a insígnia que a pessoa realmente possui e que está ativa.",
            ],
            "benefits": [
                "A foto de perfil vira vitrine da conquista, sem esforço da equipe.",
                "Trocar de borda é imediato e não pede novo login.",
                "Sem insígnia, o perfil explica como liberar as bordas.",
                "Ninguém usa borda de uma insígnia que não conquistou.",
            ],
        },
        {
            "title": "5. Foto emoldurada onde a pessoa aparece",
            "bullets": [
                "Ranking atual, pódio anterior, histórico e galeria mostram a foto com a borda escolhida.",
                "Cada estilo de borda usa as cores da própria insígnia, com destaque para as especiais.",
                "Quem não tem foto continua com as iniciais, dentro da mesma moldura.",
            ],
            "benefits": [
                "Quem conquistou se destaca na lista sem mudar posição nem pontos.",
                "A moldura não tampa nome nem pontuação.",
                "O visual fica igual em todas as telas, sem retrabalho.",
                "Perfil sem foto não fica sem graça nem quebra o layout.",
            ],
        },
        {
            "title": "6. Galeria de detentores de insígnias",
            "bullets": [
                "O botão Ver Detentores de Insígnias, no ranking, abre a galeria da comunidade.",
                "Dá para buscar por nome e filtrar por uma insígnia específica.",
                "Cada cartão mostra foto emoldurada, nome e as insígnias da pessoa.",
            ],
            "benefits": [
                "A comunidade enxerga quem já conquistou cada insígnia.",
                "O filtro responde na hora, sem nova consulta ao banco.",
                "Tocar numa insígnia do cartão abre o significado dela.",
                "A galeria serve de inspiração para quem ainda não conquistou.",
            ],
        },
        {
            "title": "7. Insígnias ao lado do nome no ranking",
            "bullets": [
                "Na lista atual, até três insígnias aparecem ao lado do nome do participante.",
                "Quem tem mais de três mostra o indicador com a quantidade restante.",
                "Se a insígnia da borda ativa for removida, a foto volta sozinha para a borda padrão.",
            ],
            "benefits": [
                "A lista continua limpa, sem fileira infinita de ícones.",
                "A conquista aparece onde todo mundo olha: o ranking.",
                "Nenhuma foto fica com moldura de insígnia que a pessoa perdeu.",
                "A publicação passou por testes de concessão, remoção e borda ativa.",
            ],
        },
    ],
}


def main():
    token = mod.base.get_token()
    files = []
    for day, topics in DAYS.items():
        out = mod.build_checklist(day, topics)
        files.extend((mod.OUT_DIR / "screenshots" / day).glob("*.png"))
        day_id = mod.base.drive_ensure_folder(mod.MONTH_ID, day, token)
        mod.base.drive_trash(
            day_id,
            [f"Checklist {PROJECT}", f"Checklist {PROJECT}.docx"],
            token,
        )
        uploaded = mod.base.drive_upload(day_id, out, f"Checklist {PROJECT}", token)
        print(f"Uploaded 2026/Outubro/{day}", uploaded.get("id"))
        print(f"https://drive.google.com/file/d/{uploaded['id']}/view")

    hashes = [hashlib.md5(path.read_bytes()).hexdigest() for path in files]
    assert len(hashes) == len(set(hashes)) == 8


if __name__ == "__main__":
    main()
