#!/usr/bin/env python3
"""Mint HS256 anon + service_role JWTs for a disposable local stack.

Reads JWT_SECRET from the environment (never argv). Writes ONLY the two JWT
strings to stdout as JSON. Does not print the signing secret.

Used by bring-up-real-server-stack.sh — credentials are per-run and local-only.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sys
import time


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def mint(secret: bytes, role: str, exp: int) -> str:
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    now = int(time.time())
    payload = b64url(
        json.dumps(
            {
                "iss": "season-sim-disposable",
                "role": role,
                "iat": now,
                "exp": exp,
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = b64url(hmac.new(secret, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def main() -> int:
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret) < 32:
        print("JWT_SECRET must be set to >=32 characters", file=sys.stderr)
        return 2
    # Long-lived API keys for the disposable stack process only (not user sessions).
    exp = int(time.time()) + 60 * 60 * 24  # 24h wall clock max for one CI/local run
    out = {
        "anon_key": mint(secret.encode("utf-8"), "anon", exp),
        "service_role_key": mint(secret.encode("utf-8"), "service_role", exp),
    }
    json.dump(out, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
