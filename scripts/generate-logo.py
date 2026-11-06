#!/usr/bin/env python3
"""Genera el PNG de la marca de Vincula-UP para los correos.

    python3 scripts/generate-logo.py

    ─────────────────────────────────────────────────────────────────────
    Por qué existe un script y no un PNG editado a mano:

    El correo se ve en clientes que NO renderizan SVG (casi ninguno), así
    que hace falta un PNG. Y como `favicon.svg` deja escrito que "si cambia
    la marca hay que rehacer los tres archivos, no solo el SVG", el PNG no
    puede quedar suelto: tiene que salir de la misma geometría de la marca.

    Por eso los números de abajo son los del `viewBox="0 0 64 64"` del
    favicon, punto por punto, y no una reinterpretación:

      · cuadro    <rect width=64 height=64 rx=15 fill=#e35f43>
      · letra V   <path d="M17 18h11l4 18 4-18h11L32 46z" fill=#fff>

    Si cambia la marca hay que cambiar acá los MISMOS números y volver a
    correr el script, junto con rehacer el favicon.svg y el
    apple-touch-icon.png.

    No usa PIL ni ninguna dependencia: solo zlib y struct de la biblioteca
    estándar, que ya traen el PNG (chunk + CRC) y la compresión. Se dibuja
    con supermuestreo (4×) y se promedia, que es como un antialias.
    ─────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

# ── Geometría de la marca (idéntica a frontend/.../public/favicon.svg) ──────
VIEWBOX = 64          # el viewBox del SVG
RADIO = 15            # rx del rectángulo
CORAL = (0xE3, 0x5F, 0x43)   # --coral de styles.css
BLANCO = (0xFF, 0xFF, 0xFF)

# El path de la V, descompuesto en los seis puntos que lo componen.
V = [(17, 18), (28, 18), (32, 36), (36, 18), (47, 18), (32, 46)]

# ── Salida ─────────────────────────────────────────────────────────────────
SALIDA = Path(__file__).resolve().parent.parent / (
    "frontend/vincula-up-web/public/logo-cuadrado.png"
)
LADO = 256            # en el correo se muestra a 56–64 px: 256 aguanta retina
SUPER = 4             # factor de supermuestreo


def dentro_rectangulo_redondeado(x: float, y: float, lado: int, radio: int) -> bool:
    """Punto dentro del cuadro con esquinas redondeadas, por distancia al centro."""
    cx = min(max(x, radio), lado - radio)
    cy = min(max(y, radio), lado - radio)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= radio * radio


def dentro_poligono(x: float, y: float, puntos: list[tuple[int, int]]) -> bool:
    """Cruce de rayos horizontales: clásico y suficiente para una letra convexa."""
    dentro = False
    j = len(puntos) - 1
    for i in range(len(puntos)):
        xi, yi = puntos[i]
        xj, yj = puntos[j]
        if (yi > y) != (yj > y):
            x_interseccion = xi + (y - yi) * (xj - xi) / (yj - yi)
            if x < x_interseccion:
                dentro = not dentro
        j = i
    return dentro


def dibujar() -> list[list[tuple[int, int, int, int]]]:
    """Devuelve la imagen en RGBA, promediando SUPER×SUPER muestras por píxel."""
    alto = LADO * SUPER
    escala = VIEWBOX / alto
    filas: list[list[tuple[int, int, int, int]]] = []

    for py in range(LADO):
        fila = []
        for px in range(LADO):
            r = g = b = 0
            muestras = SUPER * SUPER
            for sy in range(SUPER):
                for sx in range(SUPER):
                    # punto en coordenadas del viewBox de 64
                    x = (px * SUPER + sx + 0.5) * escala
                    y = (py * SUPER + sy + 0.5) * escala
                    if not dentro_rectangulo_redondeado(x, y, VIEWBOX, RADIO):
                        continue                      # fuera del cuadro: transparente
                    if dentro_poligono(x, y, V):
                        r, g, b = BLANCO             # la V, blanca
                    else:
                        r, g, b = CORAL               # el fondo, coral
            fila.append((r // muestras, g // muestras, b // muestras, 255))
        filas.append(fila)
    return filas


def escribir_png(ruta: Path, ancho: int, alto: int, pixeles: list) -> None:
    """Escribe un PNG RGBA de 8 bits con solo zlib y struct."""
    crudo = b"".join(b"\x00" + bytes(v for px in fila for v in px) for fila in pixeles)

    def chunk(tipo: bytes, datos: bytes) -> bytes:
        cuerpo = tipo + datos
        return (struct.pack(">I", len(datos)) + cuerpo
                + struct.pack(">I", zlib.crc32(cuerpo) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(crudo, 9))
    png += chunk(b"IEND", b"")
    ruta.write_bytes(png)


def main() -> int:
    if not SALIDA.parent.is_dir():
        print(f"No existe el directorio destino: {SALIDA.parent}", file=sys.stderr)
        return 1
    escribir_png(SALIDA, LADO, LADO, dibujar())
    print(f"Logo generado: {SALIDA} ({LADO}×{LADO})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())