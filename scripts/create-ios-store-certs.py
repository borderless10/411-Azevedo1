#!/usr/bin/env python3
"""Cria certificado de distribuição e perfil App Store via App Store Connect API."""
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import jwt
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets"
KEY_PATH = SECRETS / "AuthKey_368P79H8BN.p8"
KEY_ID = "368P79H8BN"
ISSUER_ID = "611ffa7f-efe9-47c2-8770-cf2efe9d5660"
BUNDLE_ID = "com.borderlesspc2.visao411"
API = "https://api.appstoreconnect.apple.com"


def token():
    key = KEY_PATH.read_text()
    payload = {
        "iss": ISSUER_ID,
        "exp": int(time.time()) + 19 * 60,
        "aud": "appstoreconnect-v1",
    }
    encoded = jwt.encode(payload, key, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})
    return encoded.decode("utf-8") if isinstance(encoded, bytes) else encoded


def api(method, path, body=None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + token(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw.decode()) if raw else {}
    except urllib.error.HTTPError as err:
        detail = err.read().decode()
        raise SystemExit(f"Apple API {method} {path} -> {err.code}\n{detail}") from err


def run(cmd, **kwargs):
    subprocess.check_call(cmd, **kwargs)


def enable_push_notifications(bundle_res_id):
    caps = api("GET", f"/v1/bundleIds/{bundle_res_id}/bundleIdCapabilities")
    for cap in caps.get("data") or []:
        cap_type = (cap.get("attributes") or {}).get("capabilityType")
        if cap_type == "PUSH_NOTIFICATIONS":
            print("Push Notifications já ativo no App ID.")
            return
    try:
        api(
            "POST",
            "/v1/bundleIdCapabilities",
            {
                "data": {
                    "type": "bundleIdCapabilities",
                    "attributes": {"capabilityType": "PUSH_NOTIFICATIONS"},
                    "relationships": {
                        "bundleId": {"data": {"type": "bundleIds", "id": bundle_res_id}}
                    },
                }
            },
        )
        print("Push Notifications ativado no App ID.")
    except SystemExit as err:
        if "409" in str(err) or "DUPLICATE" in str(err):
            print("Push Notifications já existia.")
            return
        raise


def main():
    if not KEY_PATH.exists():
        sys.exit(f"Chave não encontrada: {KEY_PATH}")
    SECRETS.mkdir(exist_ok=True)

    qs = urllib.parse.urlencode({"filter[identifier]": BUNDLE_ID})
    bundles = api("GET", f"/v1/bundleIds?{qs}")
    items = bundles.get("data") or []
    if not items:
        sys.exit(f"Bundle ID {BUNDLE_ID} não encontrado no time.")
    bundle_res_id = items[0]["id"]
    print("Bundle ID Apple:", bundle_res_id)
    enable_push_notifications(bundle_res_id)

    key_file = SECRETS / "ios-dist.key"
    p12_file = SECRETS / "ios-dist.p12"
    p12_pass_file = SECRETS / "ios-dist-p12-password.txt"
    reuse_cert = p12_file.exists() and p12_pass_file.exists() and key_file.exists()

    csr_file = SECRETS / "ios-dist.csr"
    if reuse_cert:
        certs = api(
            "GET",
            "/v1/certificates?"
            + urllib.parse.urlencode({"filter[certificateType]": "IOS_DISTRIBUTION"}),
        )
        saved = SECRETS / "ios-dist-cert-id.txt"
        dist_certs = certs.get("data") or []
        if saved.exists():
            cert_id = saved.read_text().strip()
        elif dist_certs:
            cert_id = dist_certs[-1]["id"]
        else:
            sys.exit("Nenhum certificado IOS_DISTRIBUTION encontrado.")
        print("Reusando certificado:", cert_id)
        password = p12_pass_file.read_text().strip()
    else:
        if not key_file.exists():
            run(
                [
                    "openssl",
                    "req",
                    "-new",
                    "-newkey",
                    "rsa:2048",
                    "-nodes",
                    "-keyout",
                    str(key_file),
                    "-out",
                    str(csr_file),
                    "-subj",
                    "/CN=Visao 411 Distribution/O=Borderless/C=BR",
                ]
            )
        csr = csr_file.read_text()
        cert_resp = api(
            "POST",
            "/v1/certificates",
            {
                "data": {
                    "type": "certificates",
                    "attributes": {
                        "certificateType": "IOS_DISTRIBUTION",
                        "csrContent": csr,
                    },
                }
            },
        )
        cert = cert_resp["data"]
        cert_id = cert["id"]
        der = base64.b64decode(cert["attributes"]["certificateContent"])
        cer_file = SECRETS / "ios-dist.cer"
        cer_file.write_bytes(der)
        print("Certificado:", cert_id)

        pem_file = SECRETS / "ios-dist.pem"
        run(["openssl", "x509", "-inform", "DER", "-in", str(cer_file), "-out", str(pem_file)])

        if not p12_pass_file.exists():
            p12_pass_file.write_text(base64.b64encode(os.urandom(18)).decode().strip() + "\n")
        password = p12_pass_file.read_text().strip()
        run(
            [
                "openssl",
                "pkcs12",
                "-export",
                "-inkey",
                str(key_file),
                "-in",
                str(pem_file),
                "-out",
                str(p12_file),
                "-passout",
                f"pass:{password}",
                "-name",
                "ios-distribution",
            ]
        )

    profile_name = "Visao 411 App Store EAS"
    existing = api(
        "GET",
        "/v1/profiles?" + urllib.parse.urlencode({"filter[name]": profile_name}),
    )
    for prof in existing.get("data") or []:
        api("DELETE", f"/v1/profiles/{prof['id']}")
        print("Perfil antigo removido:", prof["id"])

    profile_resp = api(
        "POST",
        "/v1/profiles",
        {
            "data": {
                "type": "profiles",
                "attributes": {
                    "name": profile_name,
                    "profileType": "IOS_APP_STORE",
                },
                "relationships": {
                    "bundleId": {"data": {"type": "bundleIds", "id": bundle_res_id}},
                    "certificates": {"data": [{"type": "certificates", "id": cert_id}]},
                },
            }
        },
    )
    profile = profile_resp["data"]
    profile_b64 = profile["attributes"]["profileContent"]
    provision = SECRETS / "ios-appstore.mobileprovision"
    provision.write_bytes(base64.b64decode(profile_b64))
    print("Perfil:", profile["id"])

    creds = {
        "ios": {
            "provisioningProfilePath": "secrets/ios-appstore.mobileprovision",
            "distributionCertificate": {
                "path": "secrets/ios-dist.p12",
                "password": password,
            },
        }
    }
    (ROOT / "credentials.json").write_text(json.dumps(creds, indent=2) + "\n")
    print("credentials.json escrito.")


if __name__ == "__main__":
    main()
