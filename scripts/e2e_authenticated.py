#!/usr/bin/env python3
"""Authenticated smoke test for the demo Keycloak accounts and BFF request flow."""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone


KEYCLOAK_URL = os.getenv("E2E_KEYCLOAK_URL", "http://127.0.0.1:8080")
BFF_URL = os.getenv("E2E_BFF_URL", "http://127.0.0.1:9001/api")
REALM = "vincula-up"
CLIENT_ID = "vincula-up-public"
PASSWORD = "password"
SPECIALITY_ID = "33333333-3333-3333-3333-333333333333"
DAYS_IN_SPANISH = (
    "LUNES",
    "MARTES",
    "MIERCOLES",
    "JUEVES",
    "VIERNES",
    "SABADO",
    "DOMINGO",
)


def request(method, url, token=None, body=None, expected_status=200):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.status
            payload = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        payload = error.read()
    assert status == expected_status, (
        f"{method} {url} returned HTTP {status}, expected {expected_status}: "
        f"{payload.decode(errors='replace')[:500]}"
    )
    return json.loads(payload) if payload else None


def access_token(username):
    values = urllib.parse.urlencode(
        {
            "grant_type": "password",
            "client_id": CLIENT_ID,
            "username": username,
            "password": PASSWORD,
        }
    ).encode()
    token_request = urllib.request.Request(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data=values,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(token_request, timeout=30) as response:
        return json.load(response)["access_token"]


def api(method, path, token=None, body=None, expected_status=200):
    return request(method, f"{BFF_URL}{path}", token, body, expected_status)


def next_available_slot(availability):
    by_day = {item["diaSemana"].upper(): item for item in availability}
    today = datetime.now(timezone.utc).date()
    for offset in range(1, 8):
        date = today + timedelta(days=offset)
        day = DAYS_IN_SPANISH[date.weekday()]
        slot = by_day.get(day)
        if slot and slot["horaInicio"][:5] <= "12:00" and slot["horaFin"][:5] >= "13:00":
            start = datetime.combine(date, datetime.min.time()).replace(hour=12)
            end = start + timedelta(hours=1)
            return start.isoformat(timespec="seconds"), end.isoformat(timespec="seconds")
    raise AssertionError("The demo professional has no 12:00-13:00 slot in the next seven days")


def main():
    client_token = access_token("cliente@vincula-up.local")
    professional_token = access_token("profesional@vincula-up.local")
    admin_token = access_token("admin@vincula-up.local")

    api("GET", "/usuarios/yo", expected_status=401)
    client = api("GET", "/usuarios/yo", client_token)
    professional = api("GET", "/usuarios/yo", professional_token)
    admin = api("GET", "/usuarios/yo", admin_token)
    assert client["rolNegocio"] == "CLIENTE"
    assert professional["rolNegocio"] == "PROFESIONAL"
    assert admin["rolNegocio"] == "ADMIN"
    api("GET", f"/solicitudes/mias?usuarioId={admin['id']}", admin_token, expected_status=403)

    profiles = api("GET", "/profesionales?estado=ACTIVO", client_token)
    profile = next(
        item
        for item in profiles
        if item["usuarioId"] == professional["id"]
        and any(speciality["id"] == SPECIALITY_ID for speciality in item["especialidades"])
    )
    start, end = next_available_slot(profile["disponibilidad"])
    request_body = {
        "clienteId": "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "profesionalId": profile["id"],
        "especialidadId": SPECIALITY_ID,
        "direccionServicio": "Domicilio de prueba, Concepcion del Uruguay",
        "latitud": -32.4833,
        "longitud": -58.2318,
        "fechaHoraPropuesta": start,
        "fechaHoraFinPropuesta": end,
        "descripcion": "E2E automatizado del circuito de solicitud.",
    }
    created = api("POST", "/solicitudes", client_token, request_body, expected_status=201)
    request_id = created["id"]
    assert created["estado"] == "PENDIENTE"
    assert created["clienteId"] == client["id"], "The BFF must take the client identity from the token"

    received = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        professional_token,
    )
    pending = next(item for item in received if item["id"] == request_id)
    assert pending["direccionServicio"] == pending["zonaAproximada"]
    assert pending["latitud"] == round(pending["latitud"], 2)
    assert pending["longitud"] == round(pending["longitud"], 2)
    print("PASS: auth, RBAC, identity derived from token, pending location privacy")

    accepted = api(
        "PATCH",
        f"/solicitudes/{request_id}/aceptar",
        professional_token,
        {},
    )
    assert accepted["estado"] == "ACEPTADA"
    received = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        professional_token,
    )
    accepted_request = next(item for item in received if item["id"] == request_id)
    assert accepted_request["direccionServicio"] == request_body["direccionServicio"]
    assert accepted_request["latitud"] == request_body["latitud"]
    print("PASS: professional acceptance reveals exact location to the participant")

    message = api(
        "POST",
        f"/solicitudes/{request_id}/mensajes",
        client_token,
        {"emisorId": "00000000-0000-0000-0000-000000000000", "texto": "Mensaje E2E"},
        expected_status=201,
    )
    assert message["solicitudId"] == request_id
    assert message["emisorId"] == client["id"]

    completed = api(
        "PATCH",
        f"/solicitudes/{request_id}/completar",
        client_token,
        {},
    )
    assert completed["estado"] == "COMPLETADA"
    rating_body = {
        "clienteId": "00000000-0000-0000-0000-000000000000",
        "puntaje": 5,
        "comentario": "Calificación E2E",
    }
    rating = api(
        "POST",
        f"/solicitudes/{request_id}/calificacion",
        client_token,
        rating_body,
        expected_status=201,
    )
    assert rating["solicitudId"] == request_id
    assert rating["puntaje"] == 5
    api(
        "POST",
        f"/solicitudes/{request_id}/calificacion",
        client_token,
        rating_body,
        expected_status=409,
    )
    print("PASS: chat, completion, one rating per request, and duplicate rejection")


if __name__ == "__main__":
    main()
