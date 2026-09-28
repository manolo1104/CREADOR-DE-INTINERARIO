# Logos de tours y paquetes

Los logos llegan de un generador de imágenes con **fondo blanco**. Antes de
meterlos al sitio hay que quitarlo, y ahí está la trampa.

## La trampa

Estos logos son pegatinas: llevan un **contorno blanco de diseño** alrededor de
las letras. Ese contorno y el fondo son el mismo blanco y están pegados, así
que al inundar desde el borde para quitar el fondo **el contorno se va con él**.

Pasó con cuatro de los cinco primeros y **no se veía** al tamaño de la tarjeta.
Solo salió midiendo el anillo exterior de píxeles opacos: debería ser blanco y
salía al 1 %.

## El script

> Hace falta `scipy` además de pillow y numpy: es lo que repone el contorno
> (paso 3). Sin él el script revienta a media faena y deja el logo sin borde.

`scripts/logo-preparar.py` lo hace todo y se verifica solo:

1. Borra la mancha blanca **conectada con el borde**. El blanco de DENTRO (la
   espuma de la cascada, las nubes, el pájaro recortado) se queda, porque no
   toca el borde.
2. Mide en el original cuánto medía el contorno.
3. Si el contorno se fue, lo repone con **ese mismo grosor**.
4. Comprueba que el anillo exterior salga blanco. Si no, aborta en vez de dejar
   un logo mocho.
5. Exporta WebP a 1000 px de ancho (se ve a ~192 px en la tarjeta).

```bash
# Una vez:
python3 -m venv /tmp/venv-logos && /tmp/venv-logos/bin/pip install pillow numpy scipy

# Por cada logo:
/tmp/venv-logos/bin/python scripts/logo-preparar.py \
  "~/Downloads/<archivo>.png" <slug-del-tour>
```

El tercer argumento es el umbral de blanco (228 por defecto, que aguanta el
ruido de compresión del JPEG). Si el fondo es gris claro en vez de blanco,
bájalo a 210.

## Cómo se conecta

En `src/lib/tours.ts`, al tour le pones:

```ts
logo: "/imagenes/tours/logos/<slug>.webp",
```

La tarjeta de `/tours` lo usa sola: lo pinta a caballo del borde superior,
centrado sobre la foto del medio. Si un tour no tiene `logo`, no se rompe nada
y la tarjeta se ve como siempre.

## Auditar los que ya están

```bash
/tmp/venv-logos/bin/python - <<'EOF'
from PIL import Image, ImageFilter
import numpy as np, glob, os
for f in sorted(glob.glob("public/imagenes/tours/logos/*.webp")):
    a=np.array(Image.open(f).convert("RGBA")); al=a[:,:,3]
    op=Image.fromarray((al>200).astype(np.uint8)*255,"L")
    dentro=np.array(op.filter(ImageFilter.MinFilter(9)))>128
    an=(al>200)&(~dentro); rgb=a[:,:,:3]
    bl=an&(rgb[:,:,0]>225)&(rgb[:,:,1]>225)&(rgb[:,:,2]>225)
    p=bl.sum()/max(1,an.sum())*100
    print(f"{os.path.basename(f):40} {p:3.0f}%  {'OK' if p>55 else 'SIN CONTORNO'}")
EOF
```
