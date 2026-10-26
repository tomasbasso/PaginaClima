// /apple-icon: 180×180 PNG apple-touch-icon, same mark as app/icon.tsx.
import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-mark'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={size.width} />, size)
}
