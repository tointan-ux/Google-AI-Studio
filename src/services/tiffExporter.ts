import { PlateLayer } from '../types/prepress';

/**
 * Encodes a PlateLayer (8-bit coverage 0..255) into a genuine, standard-compliant
 * 1-bit bi-level TIFF file (TIFF 6.0 specification, Little-Endian 'II').
 */
export function exportPlateAs1BitTiff(plate: PlateLayer, dpi = 2400): Uint8Array {
  const width = plate.width;
  const height = plate.height;
  const rowBytes = Math.ceil(width / 8);
  const imageDataSize = rowBytes * height;

  // Pack 8-bit coverage (0..255) into 1-bit bi-level pixels (1 = ink, 0 = no ink)
  const packedData = new Uint8Array(imageDataSize);
  const cov = plate.coverage;

  let byteIdx = 0;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    let currentByte = 0;
    let bitCount = 0;

    for (let x = 0; x < width; x++) {
      // Threshold at 128 (or > 0 for 1-bit)
      const isInk = cov[rowStart + x] > 127 ? 1 : 0;
      currentByte = (currentByte << 1) | isInk;
      bitCount++;

      if (bitCount === 8) {
        packedData[byteIdx++] = currentByte;
        currentByte = 0;
        bitCount = 0;
      }
    }

    if (bitCount > 0) {
      currentByte = currentByte << (8 - bitCount);
      packedData[byteIdx++] = currentByte;
    }
  }

  // Build TIFF Structure:
  // 1. Header (8 bytes): 0x49 0x49 (II), 42 (0x002A), IFD offset (8)
  // 2. IFD: 2 bytes count (14 tags) + 14 * 12 bytes = 170 bytes + 4 bytes next IFD offset (0)
  // 3. Values / Extra Tag Data (XRes, YRes, Software string, InkName string)
  // 4. Image Data

  const headerSize = 8;
  const numTags = 14;
  const ifdSize = 2 + numTags * 12 + 4;
  const ifdOffset = headerSize;

  const extraDataOffset = headerSize + ifdSize;
  const xResRational = [dpi, 1]; // 8 bytes: rational
  const yResRational = [dpi, 1]; // 8 bytes: rational
  const softwareStr = 'SoftProof Prepress TIFF Engine 2.4\0';
  const inkNameStr = `${plate.separation.name}\0`;

  const extraDataSize = 8 + 8 + softwareStr.length + inkNameStr.length;
  const imageDataOffset = (extraDataOffset + extraDataSize + 3) & ~3; // 4-byte aligned
  const totalFileSize = imageDataOffset + imageDataSize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // 1. Header
  uint8[0] = 0x49; // 'I'
  uint8[1] = 0x49; // 'I' (Little Endian)
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  // Extra data offsets
  const xResOffset = extraDataOffset;
  const yResOffset = xResOffset + 8;
  const softwareOffset = yResOffset + 8;
  const inkNameOffset = softwareOffset + softwareStr.length;

  view.setUint32(xResOffset, xResRational[0], true);
  view.setUint32(xResOffset + 4, xResRational[1], true);
  view.setUint32(yResOffset, yResRational[0], true);
  view.setUint32(yResOffset + 4, yResRational[1], true);

  for (let i = 0; i < softwareStr.length; i++) {
    uint8[softwareOffset + i] = softwareStr.charCodeAt(i);
  }
  for (let i = 0; i < inkNameStr.length; i++) {
    uint8[inkNameOffset + i] = inkNameStr.charCodeAt(i);
  }

  // 2. IFD Tags
  let p = ifdOffset;
  view.setUint16(p, numTags, true);
  p += 2;

  const writeTag = (tag: number, type: number, count: number, valueOrOffset: number) => {
    view.setUint16(p, tag, true);
    view.setUint16(p + 2, type, true);
    view.setUint32(p + 4, count, true);
    view.setUint32(p + 8, valueOrOffset, true);
    p += 12;
  };

  // Types: 3=SHORT (2 bytes), 4=LONG (4 bytes), 5=RATIONAL (8 bytes), 2=ASCII
  writeTag(254, 4, 1, 0); // NewSubfileType: full-resolution image
  writeTag(256, 4, 1, width); // ImageWidth
  writeTag(257, 4, 1, height); // ImageLength
  writeTag(258, 3, 1, 1); // BitsPerSample: 1
  writeTag(259, 3, 1, 1); // Compression: 1 (None)
  writeTag(262, 3, 1, 0); // PhotometricInterpretation: 0 (WhiteIsZero: 0=no ink, 1=ink)
  writeTag(273, 4, 1, imageDataOffset); // StripOffsets
  writeTag(277, 3, 1, 1); // SamplesPerPixel: 1
  writeTag(278, 4, 1, height); // RowsPerStrip
  writeTag(279, 4, 1, imageDataSize); // StripByteCounts
  writeTag(282, 5, 1, xResOffset); // XResolution
  writeTag(283, 5, 1, yResOffset); // YResolution
  writeTag(296, 3, 1, 2); // ResolutionUnit: 2 (Inch)
  writeTag(305, 2, softwareStr.length, softwareOffset); // Software

  view.setUint32(p, 0, true); // Next IFD offset: 0

  // 3. Image Data
  uint8.set(packedData, imageDataOffset);

  return uint8;
}

/**
 * Triggers a browser download of a generated TIFF file
 */
export function downloadTiffFile(filename: string, data: Uint8Array) {
  const blob = new Blob([data as unknown as BlobPart], { type: 'image/tiff' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
