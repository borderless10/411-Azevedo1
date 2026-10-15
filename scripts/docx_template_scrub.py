#!/usr/bin/env python3
"""Helpers reutilizáveis: scrub + gate anti-resíduo do template 433.docx."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

FORBIDDEN = re.compile(
    r"smartcity|ajfmonitoramentos|smartcity-ademar",
    re.I,
)

# Remove o Relationship inteiro (não só o Target)
REL_TRASH = re.compile(
    r'<Relationship[^>]*Target="(?:mailto:admin@smartcity-ademar\.app|https://ajfmonitoramentos\.com/)"[^>]*/>',
    re.I,
)

LEAK_STRINGS = (
    "mailto:admin@smartcity-ademar.app",
    "https://ajfmonitoramentos.com/",
    "admin@smartcity-ademar.app",
)


def scrub_docx(path: Path) -> None:
    """Remove hyperlinks/texto do cliente de referência do template 433."""
    tmp = path.with_suffix(".scrubbed.docx")
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.endswith((".xml", ".rels")):
                text = data.decode("utf-8", errors="ignore")
                text = REL_TRASH.sub("", text)
                for s in LEAK_STRINGS:
                    text = text.replace(s, "")
                data = text.encode("utf-8")
            zout.writestr(info, data)
    tmp.replace(path)


def assert_no_template_leak(path: Path) -> None:
    """Gate duro: falha se ainda houver smartcity/ajf no pacote."""
    with zipfile.ZipFile(path) as z:
        blob = b"".join(z.read(n) for n in z.namelist())
    text = blob.decode("utf-8", errors="ignore")
    m = FORBIDDEN.search(text)
    if m:
        raise AssertionError(
            f"Resíduo do template 433 no docx: {m.group(0)!r}. "
            "Scrub incompleto — NÃO fazer upload."
        )


def restore_template_media(docx_path: Path, template_path: Path) -> list[str]:
    """Se o save dropou mídia ainda referenciada, restaura do template."""
    restored: list[str] = []
    tmp = docx_path.with_suffix(".mediafix.docx")
    zt = zipfile.ZipFile(template_path)
    zo = zipfile.ZipFile(docx_path)
    zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
    try:
        out_names = set(zo.namelist())
        for info in zo.infolist():
            zout.writestr(info, zo.read(info.filename))
        for name in zt.namelist():
            if name.startswith("word/media/") and name not in out_names:
                zout.writestr(name, zt.read(name))
                restored.append(name)
    finally:
        zt.close()
        zo.close()
        zout.close()
    tmp.replace(docx_path)
    return restored


if __name__ == "__main__":
    import sys

    target = Path(sys.argv[1])
    scrub_docx(target)
    assert_no_template_leak(target)
    print("OK — sem resíduos do template:", target)
