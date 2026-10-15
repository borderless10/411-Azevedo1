#!/usr/bin/env python3
"""Upload do vídeo de apresentação do 411 para a pasta 14 (+ estimativa)."""

from __future__ import annotations

import json
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT = 411
PROJECT_FOLDER_ID = "17E8U2ZehEL4S4hyAWAcMJvIZ2xhm-7ge"
LOCAL = Path(
    "/home/eduardo/workspaces/Borderless/411-Azevedo1/docs/checklists-411/"
    "video de apresentação do 411.mp4"
)
DRIVE_NAME = "video de apresentação do 411"
YEAR = "2026"
MONTH = "Setembro"


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
        raw = resp.read()
        ctype = resp.headers.get("Content-Type", "")
        if "application/json" in ctype:
            return json.loads(raw)
        return raw


def drive_list(parent_id, token):
    files, page = [], None
    while True:
        params = {
            "q": f"'{parent_id}' in parents and trashed=false",
            "fields": "nextPageToken,files(id,name,mimeType)",
            "pageSize": "200",
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
        if page:
            params["pageToken"] = page
        data = drive_request(
            "GET",
            "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(params),
            token,
        )
        files.extend(data.get("files", []))
        page = data.get("nextPageToken")
        if not page:
            break
    return files


def drive_ensure_folder(parent_id, name, token):
    for f in drive_list(parent_id, token):
        if f["name"] == name and f["mimeType"] == "application/vnd.google-apps.folder":
            return f["id"]
    created = drive_request(
        "POST",
        "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
        token,
        data=json.dumps(
            {
                "name": name,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [parent_id],
            }
        ).encode(),
        headers={"Content-Type": "application/json"},
    )
    return created["id"]


def drive_trash(parent_id, names, token):
    for f in drive_list(parent_id, token):
        if f["name"] in names:
            drive_request(
                "PATCH",
                f"https://www.googleapis.com/drive/v3/files/{f['id']}?supportsAllDrives=true",
                token,
                data=json.dumps({"trashed": True}).encode(),
                headers={"Content-Type": "application/json"},
            )


def ensure_day_folder(month_id: str, token: str) -> str:
    for name in ("14 + estimativa", "14"):
        for f in drive_list(month_id, token):
            if f["name"] == name and f["mimeType"] == "application/vnd.google-apps.folder":
                return f["id"]
    return drive_ensure_folder(month_id, "14", token)


def drive_upload(parent_id, local_path: Path, drive_name: str, token: str):
    boundary = "borderless_video_boundary"
    meta = json.dumps({"name": drive_name, "parents": [parent_id]})
    file_bytes = local_path.read_bytes()
    mime = "video/mp4"
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


def main():
    assert LOCAL.exists(), LOCAL
    token = get_token()
    year_id = drive_ensure_folder(PROJECT_FOLDER_ID, YEAR, token)
    month_id = drive_ensure_folder(year_id, MONTH, token)
    day_id = ensure_day_folder(month_id, token)
    drive_trash(
        day_id,
        [DRIVE_NAME, f"{DRIVE_NAME}.mp4"],
        token,
    )
    up = drive_upload(day_id, LOCAL, DRIVE_NAME, token)
    print("Uploaded", DRIVE_NAME, up.get("id"))
    print(f"https://drive.google.com/file/d/{up['id']}/view")
    print("folder", day_id)


if __name__ == "__main__":
    main()
