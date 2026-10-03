#!/usr/bin/env python3
"""Deja la ruta de la maqueta del aviso consistente en los tres lugares donde
aparece: docker-compose.yml, application.properties y NotificacionService.java.

Por qué existe un script para esto y no se edita a mano:

El nombre del archivo tiene letras que se repiten ("prereregistro") y el canal
por el que llegan los comandos a esta máquina descarta caracteres repetidos: al
escribir la ruta a mano salía "preregistro.html" (sin una "e"), que no existe,
y el servicio caía en el texto de repuesto en vez de la maqueta. Peor todavía:
el error seestepitido varias veces porque el archivo SÍ estaba bien en el disco
y solo la ruta escrita en los archivos de configuración era incorrecta.

Este script no escribe el nombre en ningún momento: lo lee del disco y reemplaza
lo que haya, así que no puede volver a pasar.

    python3 scripts/arreglar-ruta-plantilla.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "backend/bff-web/src/main/resources/correos"
RUTA_EN_IMAGEN = "/app/correos"

OBJETIVOS = [
    (RAIZ / "docker-compose.yml", re.compile(r"MAIL_PLANTILLA:.*")),
    (RAIZ / "backend/bff-web/src/main/resources/application.properties",
     re.compile(r"mail\.plantilla=.*")),
    (RAIZ / "backend/bff-web/src/main/java/com/vinculaup/bff_web/service/NotificacionService.java",
     re.compile(r'@Value\("\$\{mail\.plantilla:[^}]*\}"\)')),
]


def main() -> int:
    plantillas = sorted(ORIGEN.glob("*.html"))
    if not plantillas:
        print(f"No hay ninguna maqueta en {ORIGEN}", file=sys.stderr)
        return 1
    if len(plantillas) > 1:
        print(f"Hay mas de una maqueta en {ORIGEN}: "
              f"{[p.name for p in plantillas]}", file=sys.stderr)
        return 1

    nombre = plantillas[0].name
    ruta = f"{RUTA_EN_IMAGEN}/{nombre}"
    print(f"Maqueta encontrada: {nombre}")
    print(f"Ruta en el contenedor: {ruta}")

    for archivo, patron in OBJETIVOS:
        lineas = archivo.read_text(encoding="utf-8").split("\n")
        cambiadas = 0
        for i, linea in enumerate(lineas):
            if not patron.search(linea):
                continue
            # Se conserva la indentación que tenía: en docker-compose perderla
            # rompe el YAML entero.
            sangria = linea[: len(linea) - len(linea.lstrip())]
            if archivo.name == "NotificacionService.java":
                nuevo = sangria + f'@Value("${{mail.plantilla:{ruta}}}")'
            elif archivo.name == "docker-compose.yml":
                nuevo = sangria + f"MAIL_PLANTILLA: {ruta}"
            else:
                nuevo = sangria + f"mail.plantilla=${{MAIL_PLANTILLA:{ruta}}}"
            if linea != nuevo:
                lineas[i] = nuevo
                cambiadas += 1
            break
        if cambiadas:
            archivo.write_text("\n".join(lineas), encoding="utf-8")
            print(f"  corregido: {archivo.relative_to(RAIZ)}")
        else:
            print(f"  ya estaba bien: {archivo.relative_to(RAIZ)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())