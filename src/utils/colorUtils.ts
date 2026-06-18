export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface HSB {
  h: number
  s: number
  b: number
}

export interface ColorFormats {
  hex: string
  rgb: RGB
  hsl: HSL
  hsb: HSB
  rgba: { r: number; g: number; b: number; a: number }
  cmyk: { c: number; m: number; y: number; k: number }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const hexToRgb = (hex: string): RGB => {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  if (clean.length === 8) {
    clean = clean.slice(0, 6)
  }
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return {
    r: clamp(isNaN(r) ? 0 : r, 0, 255),
    g: clamp(isNaN(g) ? 0 : g, 0, 255),
    b: clamp(isNaN(b) ? 0 : b, 0, 255),
  }
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase()
}

export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / delta + 2) / 6
        break
      case bn:
        h = ((rn - gn) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export const hslToRgb = (h: number, s: number, l: number): RGB => {
  const hn = h / 360
  const sn = s / 100
  const ln = l / 100

  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  }
}

export const rgbToHsb = (r: number, g: number, b: number): HSB => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  const s = max === 0 ? 0 : delta / max
  const br = max

  if (delta !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / delta + 2) / 6
        break
      case bn:
        h = ((rn - gn) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    b: Math.round(br * 100),
  }
}

export const hsbToRgb = (h: number, s: number, b: number): RGB => {
  const hn = h / 360
  const sn = s / 100
  const bn = b / 100

  const i = Math.floor(hn * 6)
  const f = hn * 6 - i
  const p = bn * (1 - sn)
  const q = bn * (1 - f * sn)
  const t = bn * (1 - (1 - f) * sn)

  let r = 0, g = 0, bl = 0

  switch (i % 6) {
    case 0: r = bn; g = t; bl = p; break
    case 1: r = q; g = bn; bl = p; break
    case 2: r = p; g = bn; bl = t; break
    case 3: r = p; g = q; bl = bn; break
    case 4: r = t; g = p; bl = bn; break
    case 5: r = bn; g = p; bl = q; break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(bl * 255),
  }
}

export const rgbToCmyk = (r: number, g: number, b: number) => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const k = 1 - Math.max(rn, gn, bn)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }

  const c = (1 - rn - k) / (1 - k)
  const m = (1 - gn - k) / (1 - k)
  const y = (1 - bn - k) / (1 - k)

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

export const getAllFormats = (hex: string): ColorFormats => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b)
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b)

  return {
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb,
    hsl,
    hsb,
    rgba: { ...rgb, a: 1 },
    cmyk,
  }
}

export const formatRgbString = (rgb: RGB, spaces: boolean = true): string =>
  spaces ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : `rgb(${rgb.r},${rgb.g},${rgb.b})`

export const formatRgbaString = (rgba: { r: number; g: number; b: number; a: number }, spaces: boolean = true): string =>
  spaces
    ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`
    : `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`

export const formatHslString = (hsl: HSL, spaces: boolean = true): string =>
  spaces ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`

export const formatHsbString = (hsb: HSB, spaces: boolean = true): string =>
  spaces ? `hsb(${hsb.h}, ${hsb.s}%, ${hsb.b}%)` : `hsb(${hsb.h},${hsb.s}%,${hsb.b}%)`

export const formatHsvString = (hsb: HSB, spaces: boolean = true): string =>
  spaces ? `hsv(${hsb.h}, ${hsb.s}%, ${hsb.b}%)` : `hsv(${hsb.h},${hsb.s}%,${hsb.b}%)`

export const formatCmykString = (cmyk: { c: number; m: number; y: number; k: number }, spaces: boolean = true): string =>
  spaces
    ? `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`
    : `cmyk(${cmyk.c}%,${cmyk.m}%,${cmyk.y}%,${cmyk.k}%)`

export const formatHexString = (hex: string, withHash: boolean = true, uppercase: boolean = true): string => {
  let clean = hex.replace('#', '')
  clean = uppercase ? clean.toUpperCase() : clean.toLowerCase()
  return withHash ? '#' + clean : clean
}

export const formatHex8String = (hex: string, alpha: number = 1, withHash: boolean = true): string => {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0')
  const clean = hex.replace('#', '')
  return withHash ? `#${clean}${alphaHex}`.toUpperCase() : `${clean}${alphaHex}`.toUpperCase()
}

export const isValidHex = (hex: string): boolean => {
  const clean = hex.replace('#', '').trim()
  return /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(clean)
}

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2)
}

export interface ContrastCheckResult {
  ratio: number
  normalText: {
    AA: boolean
    AAA: boolean
  }
  largeText: {
    AA: boolean
    AAA: boolean
  }
  foreground: string
  background: string
}

export const checkContrast = (foreground: string, background: string): ContrastCheckResult => {
  const ratio = getContrastRatio(foreground, background)
  return {
    ratio,
    normalText: {
      AA: ratio >= 4.5,
      AAA: ratio >= 7,
    },
    largeText: {
      AA: ratio >= 3,
      AAA: ratio >= 4.5,
    },
    foreground,
    background,
  }
}

export const generateComplementary = (hex: string): string[] => {
  const { hsl } = getAllFormats(hex)
  const colors: string[] = []
  colors.push(hex)
  const complementaryHsl = { h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l }
  const { r, g, b } = hslToRgb(complementaryHsl.h, complementaryHsl.s, complementaryHsl.l)
  colors.push(rgbToHex(r, g, b))
  return colors
}

export const generateAnalogous = (hex: string): string[] => {
  const { hsl } = getAllFormats(hex)
  const colors: string[] = []
  for (let i = -2; i <= 2; i++) {
    const newHsl = { h: (hsl.h + i * 30 + 360) % 360, s: hsl.s, l: hsl.l }
    const { r, g, b } = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    colors.push(rgbToHex(r, g, b))
  }
  return colors
}

export const generateTriadic = (hex: string): string[] => {
  const { hsl } = getAllFormats(hex)
  const colors: string[] = []
  for (let i = 0; i < 3; i++) {
    const newHsl = { h: (hsl.h + i * 120) % 360, s: hsl.s, l: hsl.l }
    const { r, g, b } = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    colors.push(rgbToHex(r, g, b))
  }
  return colors
}

export const generateMonochromatic = (hex: string): string[] => {
  const { hsl } = getAllFormats(hex)
  const colors: string[] = []
  const lightnesses = [15, 30, 45, hsl.l, 70, 85]
  for (const l of lightnesses) {
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, clamp(l, 5, 95))
    colors.push(rgbToHex(r, g, b))
  }
  return colors
}

export const generateShades = (hex: string, count: number = 9): string[] => {
  const { hsl } = getAllFormats(hex)
  const colors: string[] = []
  const step = 100 / (count + 1)
  for (let i = 1; i <= count; i++) {
    const l = Math.round(i * step)
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, clamp(l, 5, 95))
    colors.push(rgbToHex(r, g, b))
  }
  return colors
}

export interface ExtractedColor {
  hex: string
  count: number
  percentage: number
}

export const extractColorsFromImage = (
  imageData: ImageData,
  colorCount: number = 8,
  quality: number = 10
): ExtractedColor[] => {
  const pixels: { r: number; g: number; b: number }[] = []

  for (let i = 0; i < imageData.data.length; i += 4 * quality) {
    const a = imageData.data[i + 3]
    if (a < 128) continue

    pixels.push({
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    })
  }

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()
  const bucketSize = 32

  for (const p of pixels) {
    const br = Math.floor(p.r / bucketSize) * bucketSize
    const bg = Math.floor(p.g / bucketSize) * bucketSize
    const bb = Math.floor(p.b / bucketSize) * bucketSize
    const key = `${br},${bg},${bb}`

    const existing = buckets.get(key)
    if (existing) {
      existing.r += p.r
      existing.g += p.g
      existing.b += p.b
      existing.count++
    } else {
      buckets.set(key, { r: p.r, g: p.g, b: p.b, count: 1 })
    }
  }

  const sorted = Array.from(buckets.values())
    .map(b => ({
      hex: rgbToHex(Math.round(b.r / b.count), Math.round(b.g / b.count), Math.round(b.b / b.count)),
      count: b.count,
      percentage: 0,
    }))
    .sort((a, b) => b.count - a.count)

  const total = sorted.reduce((sum, c) => sum + c.count, 0)
  const withPercentage = sorted.map(c => ({
    ...c,
    percentage: +((c.count / total) * 100).toFixed(1),
  }))

  const unique: ExtractedColor[] = []
  for (const color of withPercentage) {
    const isDuplicate = unique.some(u => {
      const rgb1 = hexToRgb(u.hex)
      const rgb2 = hexToRgb(color.hex)
      const dist = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
      )
      return dist < 50
    })
    if (!isDuplicate) {
      unique.push(color)
      if (unique.length >= colorCount) break
    }
  }

  return unique
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
