"""Deja un logo de tour listo para el sitio, de una sola pasada.

El problema que resuelve: estos logos vienen con fondo blanco Y con un contorno
blanco de diseño. Los dos son blanco puro y están pegados, así que al inundar
desde el borde para quitar el fondo **el contorno se va con él**. Pasó con
cuatro de los cinco primeros y no se notaba a simple vista al tamaño de la
tarjeta; solo salió midiendo el anillo exterior.

Lo que hace:
  1. Borra la mancha blanca conectada con el borde (el blanco de DENTRO —la
     espuma, las nubes— se queda, porque no toca el borde).
  2. Mide en el original cuánto medía el contorno.
  3. Si el contorno desapareció, lo repone con ese mismo grosor.
  4. Comprueba el resultado: el anillo exterior tiene que salir blanco.
  5. Exporta WebP al tamaño que se usa en el sitio.

Uso: python3 scripts/logo-preparar.py <entrada> <slug> [umbral_blanco]
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ent   = sys.argv[1]
slug  = sys.argv[2]
UMBRAL = int(sys.argv[3]) if len(sys.argv) > 3 else 228
SALIDA = f"public/imagenes/tours/logos/{slug}.webp"
ANCHO_FINAL = 1000
# Grosor del contorno EN EL ARCHIVO FINAL, igual para todos. Antes cada logo
# se contorneaba a su resolución de origen y luego se escalaba, así que cada
# uno acababa con un grosor distinto: iban de 10 a 27 px y en la fila de
# tarjetas se notaba.
GROSOR_FINAL = 20


def quitar_fondo(im: Image.Image, umbral: int) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    h, w = a.shape[:2]
    casi = (a[:, :, 0] >= umbral) & (a[:, :, 1] >= umbral) & (a[:, :, 2] >= umbral)
    fondo = np.zeros((h, w), bool)
    cola = deque()
    for x in range(w):
        for y in (0, h - 1):
            if casi[y, x] and not fondo[y, x]:
                fondo[y, x] = True; cola.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if casi[y, x] and not fondo[y, x]:
                fondo[y, x] = True; cola.append((y, x))
    while cola:
        y, x = cola.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and casi[ny, nx] and not fondo[ny, nx]:
                fondo[ny, nx] = True; cola.append((ny, nx))
    alpha = np.where(fondo, 0, 255).astype(np.uint8)
    alpha = np.array(Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6)))
    # Contra el halo: el filo toma el color del píxel opaco vecino.
    rgb = a[:, :, :3].astype(np.int16)
    borde = (alpha > 8) & (alpha < 248)
    opaco = alpha >= 248
    for y, x in zip(*np.nonzero(borde)):
        y0, y1 = max(0, y-2), min(h, y+3)
        x0, x1 = max(0, x-2), min(w, x+3)
        v = opaco[y0:y1, x0:x1]
        if v.any():
            rgb[y, x] = rgb[y0:y1, x0:x1][v].mean(axis=0)
    out = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")
    caja = out.getbbox()
    return out.crop(caja) if caja else out


def grosor_contorno(im: Image.Image) -> int:
    """Cuánto mide, en el ORIGINAL, la franja blanca entre el fondo y el arte."""
    a = np.array(im.convert("RGB"))
    h, w = a.shape[:2]
    oscuro = a.max(axis=2) < 200
    anchos = []
    for y in range(int(h*0.25), int(h*0.85), max(1, h//30)):
        nb = np.nonzero(a[y].min(axis=1) < 250)[0]
        osc = np.nonzero(oscuro[y])[0]
        if len(nb) and len(osc):
            d = osc[0] - nb[0]
            if 0 < d < h * 0.12:
                anchos.append(d)
    return int(np.median(anchos)) if anchos else 0


def anillo_blanco(im: Image.Image) -> float:
    """% del anillo exterior opaco que es blanco. Mide si el contorno está."""
    a = np.array(im.convert("RGBA")); alpha = a[:, :, 3]
    op = Image.fromarray((alpha > 200).astype(np.uint8)*255, "L")
    dentro = np.array(op.filter(ImageFilter.MinFilter(9))) > 128
    anillo = (alpha > 200) & (~dentro)
    rgb = a[:, :, :3]
    bl = anillo & (rgb[:,:,0] > 225) & (rgb[:,:,1] > 225) & (rgb[:,:,2] > 225)
    return bl.sum() / max(1, anillo.sum()) * 100


def poner_contorno(im: Image.Image, grosor: int) -> Image.Image:
    """Contorno blanco que sigue las curvas del diseño.

    Se calcula por DISTANCIA al borde, no con un filtro de máximo cuadrado.
    El filtro cuadrado engorda igual en diagonal que en recto, así que en las
    curvas y en las puntas de las letras dejaba esquinas y la silueta se veía
    achaflanada. La distancia euclídea da una curva paralela de verdad: a cada
    punto del contorno le corresponde el punto más cercano del diseño.
    """
    from scipy import ndimage

    m = grosor + 2
    a = np.array(im)
    # Se agranda la tela ANTES de medir, o el contorno se corta en los bordes.
    tela_a = np.zeros((a.shape[0] + m*2, a.shape[1] + m*2, 4), dtype=np.uint8)
    tela_a[m:m+a.shape[0], m:m+a.shape[1]] = a
    alpha = tela_a[:, :, 3]

    # Distancia de cada píxel vacío al diseño más cercano.
    dist = ndimage.distance_transform_edt(alpha < 128)
    # Antialias en el filo: el último píxel se desvanece en vez de escalonarse.
    borde = np.clip(grosor + 0.5 - dist, 0, 1)
    halo = np.maximum(borde * 255, alpha).astype(np.uint8)

    blanco = np.zeros_like(tela_a)
    blanco[:, :, :3] = 255
    blanco[:, :, 3] = halo

    tela = Image.fromarray(blanco, "RGBA")
    tela.alpha_composite(Image.fromarray(tela_a, "RGBA"))
    return tela


original = Image.open(ent)
grosor_diseno = grosor_contorno(original)
limpio = quitar_fondo(original, UMBRAL)
pct = anillo_blanco(limpio)
print(f"  contorno del diseño: {grosor_diseno} px  ·  tras limpiar queda {pct:.0f}% del anillo")

if pct < 55:
    # Se ESCALA primero y se contornea después. Al revés, el contorno se
    # encogía junto con la imagen y cada logo acababa con un grosor distinto.
    util = ANCHO_FINAL - 2 * (GROSOR_FINAL + 2)
    limpio.thumbnail((util, util), Image.LANCZOS)
    limpio = poner_contorno(limpio, GROSOR_FINAL)
    pct = anillo_blanco(limpio)
    print(f"  contorno repuesto a {GROSOR_FINAL} px finales  →  anillo {pct:.0f}%")
else:
    limpio.thumbnail((ANCHO_FINAL, ANCHO_FINAL), Image.LANCZOS)

if pct < 55:
    sys.exit(f"  ⚠️ {slug}: el contorno sigue sin salir. Revisar a mano.")

limpio.save(SALIDA, "WEBP", quality=82, method=6)
import os
print(f"  ✓ {SALIDA}  {limpio.size[0]}x{limpio.size[1]}  {os.path.getsize(SALIDA)/1024:.0f} KB")
