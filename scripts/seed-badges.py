#!/usr/bin/env python3
"""Seed idempotente das sete insígnias oficiais em badgeDefinitions."""

import json
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

BADGES = [
    ("guardiao-do-zero", "Guardião do Zero", "Constância nos dias sem gastos", "Disciplina para proteger cada escolha financeira.", "shield-checkmark", "#8c52ff", "#c0c6d4", "double-violet"),
    ("mestre-consumo-moderado", "Mestre do Consumo Moderado", "Equilíbrio recorrente dentro do planejamento", "Equilíbrio entre aproveitar hoje e construir amanhã.", "scale", "#8c52ff", "#4f8ff7", "split-violet-blue"),
    ("arquiteto-da-reserva", "Arquiteto da Reserva", "Organização e construção de segurança", "Cada decisão vira estrutura para o futuro.", "lock-closed", "#1f3a93", "#e7b958", "metal-corners"),
    ("virada-de-chave", "Virada de Chave", "Evolução marcante nos hábitos financeiros", "Uma mudança de atitude que transformou o caminho.", "key", "#ff6b5e", "#8c52ff", "asymmetric-spark"),
    ("disciplina-de-aco", "Disciplina de Aço", "Consistência excepcional ao longo do ciclo", "Constância que permanece mesmo nos dias difíceis.", "diamond", "#4b5563", "#d7dde8", "cold-metal"),
    ("farol-da-comunidade", "Farol da Comunidade", "Inspiração e apoio a outros participantes", "Sua jornada também ilumina o caminho de outras pessoas.", "flashlight", "#16b8a6", "#f2d38a", "halo-beacon"),
    ("legado-visao", "Legado Visão", "Impacto duradouro na comunidade", "Uma trajetória que representa a essência da comunidade Visão.", "eye", "#e7b958", "#8c52ff", "gold-legacy"),
]


def encode(value):
    if isinstance(value, bool):
        return {"booleanValue": value}
    return {"stringValue": str(value)}


def main():
    subprocess.run(["npx", "firebase", "projects:list"], capture_output=True)
    cfg = json.loads(
        Path.home().joinpath(".config/configstore/firebase-tools.json").read_text()
    )
    token = cfg["tokens"]["access_token"]
    base = "https://firestore.googleapis.com/v1/projects/visao-cce8f/databases/(default)/documents/badgeDefinitions"
    for badge_id, name, meaning, description, icon, primary, secondary, preset in BADGES:
        fields = {
            "name": encode(name),
            "meaning": encode(meaning),
            "description": encode(description),
            "icon": encode(icon),
            "primaryColor": encode(primary),
            "secondaryColor": encode(secondary),
            "borderPreset": encode(preset),
            "isOfficial": encode(True),
            "isActive": encode(True),
        }
        url = f"{base}/{urllib.parse.quote(badge_id, safe='')}"
        req = urllib.request.Request(
            url,
            data=json.dumps({"fields": fields}).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="PATCH",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(badge_id, resp.status)


if __name__ == "__main__":
    main()
