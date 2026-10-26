// /icon: 512×512 PNG app icon (manifest "any" icon), static, generated with next/og.
import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-mark'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<BrandMark size={size.width} />, size)
}
