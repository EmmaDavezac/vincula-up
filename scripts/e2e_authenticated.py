#!/usr/bin/env python3
"""Authenticated smoke test for the demo Keycloak accounts and BFF request flow."""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from uuid import uuid4


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

    push_endpoint = f"https://push.invalid/e2e/{uuid4()}"
    api(
        "PUT",
        "/notifications/push-subscription",
        professional_token,
        {
            "endpoint": push_endpoint,
            "keys": {"p256dh": "test-public-key", "auth": "test-auth-secret"},
        },
        expected_status=204,
    )
    api(
        "DELETE",
        f"/notifications/push-subscription?endpoint={urllib.parse.quote(push_endpoint, safe='')}",
        professional_token,
        expected_status=204,
    )
    api(
        "PUT",
        "/notifications/push-subscription",
        professional_token,
        {
            "endpoint": f"http://push.invalid/e2e/{uuid4()}",
            "keys": {"p256dh": "test-public-key", "auth": "test-auth-secret"},
        },
        expected_status=400,
    )
    print("PASS: browser-shaped Web Push subscription is stored/removed; insecure endpoints are rejected")

    profiles = api("GET", "/profesionales?estado=ACTIVO", client_token)
    profile = next(
        item
        for item in profiles
        if item["usuarioId"] == professional["id"]
        and any(speciality["id"] == SPECIALITY_ID for speciality in item["especialidades"])
    )
    activated_profile = api(
        "PATCH",
        "/profesionales/activar",
        professional_token,
        {
            "zonaCoberturaLat": -32.4833,
            "zonaCoberturaLng": -58.2318,
            "radioKm": 15,
            "especialidadIds": [SPECIALITY_ID],
        },
    )
    assert activated_profile["id"] == profile["id"]
    assert activated_profile["estado"] == "ACTIVO"
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
    api("POST", "/solicitudes", professional_token, request_body, expected_status=403)
    api("POST", "/solicitudes", admin_token, request_body, expected_status=403)
    created = api("POST", "/solicitudes", client_token, request_body, expected_status=201)
    request_id = created["id"]
    assert created["estado"] == "PENDIENTE"
    assert created["clienteId"] == client["id"], "The BFF must take the client identity from the token"

    client_requests = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        client_token,
    )
    assert any(item["id"] == request_id for item in client_requests)
    assert all(item["clienteId"] == client["id"] for item in client_requests)

    received = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        professional_token,
    )
    assert all(item["profesionalId"] == profile["id"] for item in received)
    pending = next(item for item in received if item["id"] == request_id)
    assert pending["direccionServicio"] == pending["zonaAproximada"]
    assert pending["latitud"] == round(pending["latitud"], 2)
    assert pending["longitud"] == round(pending["longitud"], 2)
    print("PASS: auth, RBAC, request-list ownership, identity derived from token, pending location privacy")

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

    def create_request(description):
        body = {**request_body, "descripcion": description}
        response = api("POST", "/solicitudes", client_token, body, expected_status=201)
        assert response["estado"] == "PENDIENTE"
        assert response["clienteId"] == client["id"]
        return response

    rejection = create_request("Solicitud E2E para probar rechazo con motivo.")
    api(
        "PATCH",
        f"/solicitudes/{rejection['id']}/rechazar",
        professional_token,
        {"motivo": "   "},
        expected_status=400,
    )
    still_pending = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        professional_token,
    )
    assert next(item for item in still_pending if item["id"] == rejection["id"])["estado"] == "PENDIENTE"
    rejected = api(
        "PATCH",
        f"/solicitudes/{rejection['id']}/rechazar",
        professional_token,
        {"motivo": "  No puedo atender ese día.  "},
    )
    assert rejected["estado"] == "RECHAZADA"
    assert rejected["motivoCancelacion"] == "No puedo atender ese día."
    print("PASS: rejection requires a reason, preserves PENDIENTE when empty, and exposes the trimmed reason")

    first_same_slot = create_request("Solicitud E2E de franja compartida A.")
    second_same_slot = create_request("Solicitud E2E de franja compartida B.")
    for candidate in (first_same_slot, second_same_slot):
        result = api(
            "PATCH",
            f"/solicitudes/{candidate['id']}/aceptar",
            professional_token,
            {},
        )
        assert result["estado"] == "ACEPTADA"
    print("PASS: multiple requests in one available time range can be accepted independently")

    pending_cancellation = create_request("Solicitud E2E para probar cancelación pendiente.")
    api(
        "PATCH",
        f"/solicitudes/{pending_cancellation['id']}/cancelar",
        client_token,
        {"motivo": " "},
        expected_status=400,
    )
    cancelled_pending = api(
        "PATCH",
        f"/solicitudes/{pending_cancellation['id']}/cancelar",
        client_token,
        {"motivo": "  Cambio de planes.  "},
    )
    assert cancelled_pending["estado"] == "CANCELADA"
    assert cancelled_pending["motivoCancelacion"] == "Cambio de planes."
    assert cancelled_pending["canceladaPorRol"] == "CLIENTE"
    client_cancellations = api(
        "GET",
        f"/solicitudes/mias?usuarioId={client['id']}",
        client_token,
    )
    saved_client_cancellation = next(
        item for item in client_cancellations if item["id"] == pending_cancellation["id"]
    )
    assert saved_client_cancellation["canceladaPorRol"] == "CLIENTE"

    accepted_cancellation = create_request("Solicitud E2E para probar cancelación aceptada.")
    api(
        "PATCH",
        f"/solicitudes/{accepted_cancellation['id']}/aceptar",
        professional_token,
        {},
    )
    cancelled_accepted = api(
        "PATCH",
        f"/solicitudes/{accepted_cancellation['id']}/cancelar",
        professional_token,
        {"motivo": "  No podré asistir.  "},
    )
    assert cancelled_accepted["estado"] == "CANCELADA"
    assert cancelled_accepted["motivoCancelacion"] == "No podré asistir."
    assert cancelled_accepted["canceladaPorRol"] == "PROFESIONAL"
    professional_cancellations = api(
        "GET",
        f"/solicitudes/mias?usuarioId={professional['id']}",
        professional_token,
    )
    saved_professional_cancellation = next(
        item for item in professional_cancellations if item["id"] == accepted_cancellation["id"]
    )
    assert saved_professional_cancellation["canceladaPorRol"] == "PROFESIONAL"
    print("PASS: pending and accepted requests require cancellation reasons and retain the actor's explanation")

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

    one_star_request = create_request("Solicitud E2E para probar la calificación mínima.")
    api(
        "PATCH",
        f"/solicitudes/{one_star_request['id']}/aceptar",
        professional_token,
        {},
    )
    api(
        "PATCH",
        f"/solicitudes/{one_star_request['id']}/completar",
        client_token,
        {},
    )
    one_star = api(
        "POST",
        f"/solicitudes/{one_star_request['id']}/calificacion",
        client_token,
        {
            "clienteId": "00000000-0000-0000-0000-000000000000",
            "puntaje": 1,
            "comentario": "Calificación mínima E2E",
        },
        expected_status=201,
    )
    assert one_star["solicitudId"] == one_star_request["id"]
    assert one_star["puntaje"] == 1
    print("PASS: chat, completion, 1- and 5-star ratings, and duplicate rejection")


if __name__ == "__main__":
    main()
