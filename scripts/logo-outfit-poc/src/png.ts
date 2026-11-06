import { readFileSync, writeFileSync } from "node:fs"
import { PNG } from "pngjs"

export type RgbaImage = {
  width: number
  height: number
  /** length = width * height * 4, RGBA */
  data: Uint8Array
}

export function readPng(path: string): RgbaImage {
  const png = PNG.sync.read(readFileSync(path))
  return {
    width: png.width,
    height: png.height,
    data: new Uint8Array(png.data),
  }
}

export function writePng(path: string, image: RgbaImage): void {
  const png = new PNG({ width: image.width, height: image.height })
  Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength).copy(
    png.data,
  )
  writeFileSync(path, PNG.sync.write(png))
}

export function cloneImage(image: RgbaImage): RgbaImage {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8Array(image.data),
  }
}

export function assertSameSize(a: RgbaImage, b: RgbaImage, label: string): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `${label}: size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    )
  }
}
