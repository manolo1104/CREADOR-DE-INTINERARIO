// Un ZIP armado en el navegador, sin librerías.
//
// Las fotos se guardan tal cual, sin comprimir: un JPG ya está comprimido y
// volver a comprimirlo solo gasta batería para ahorrar nada. Así el ZIP se
// arma al instante, porque el navegador pega las fotos que ya tiene en
// memoria en vez de copiarlas.

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** La huella que el ZIP exige de cada archivo para comprobar que llegó entero. */
export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ArchivoZip {
  nombre: string;
  datos: Blob;
  crc: number;
}

export function armarZip(archivos: ArchivoZip[], fecha = new Date()): Blob {
  const texto = new TextEncoder();
  // Fecha y hora en el formato de MS-DOS, que es el que entiende el ZIP.
  const hora = ((fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1)) & 0xffff;
  const dia  = (((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate()) & 0xffff;
  const UTF8 = 0x0800;

  const cuerpo: BlobPart[] = [];
  const indice: BlobPart[] = [];
  let desplazamiento = 0;
  let tamIndice = 0;

  for (const a of archivos) {
    const nombre = texto.encode(a.nombre);
    const tam = a.datos.size;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, UTF8, true);
    local.setUint16(8, 0, true);            // sin comprimir
    local.setUint16(10, hora, true);
    local.setUint16(12, dia, true);
    local.setUint32(14, a.crc, true);
    local.setUint32(18, tam, true);
    local.setUint32(22, tam, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    cuerpo.push(local.buffer, nombre, a.datos);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, UTF8, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, hora, true);
    central.setUint16(14, dia, true);
    central.setUint32(16, a.crc, true);
    central.setUint32(20, tam, true);
    central.setUint32(24, tam, true);
    central.setUint16(28, nombre.length, true);
    // 30–41: sin campos extra, comentario, disco ni atributos (quedan en cero)
    central.setUint32(42, desplazamiento, true);
    indice.push(central.buffer, nombre);

    desplazamiento += 30 + nombre.length + tam;
    tamIndice += 46 + nombre.length;
  }

  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamIndice, true);
  fin.setUint32(16, desplazamiento, true);

  return new Blob([...cuerpo, ...indice, fin.buffer], { type: "application/zip" });
}
