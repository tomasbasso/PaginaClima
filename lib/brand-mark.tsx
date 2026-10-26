// Static app mark for the generated PNG icons (app/icon.tsx, app/apple-icon.tsx): night sky
// gradient, a pale moon and the flat Pampa band with its horizon line. Satori markup: every
// element is absolutely positioned, no text, no fonts.

export function BrandMark({ size }: { size: number }) {
  const moon = Math.round(size * 0.26)
  const ground = Math.round(size * 0.24)
  const line = Math.max(2, Math.round(size * 0.008))
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: 'linear-gradient(180deg, #0e131c 0%, #16233d 55%, #2a3f66 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: Math.round(size * 0.5 - moon / 2),
          top: Math.round(size * 0.24),
          width: moon,
          height: moon,
          borderRadius: '50%',
          background: '#f1ead8',
          boxShadow: `0 0 ${Math.round(size * 0.1)}px rgba(241, 234, 216, 0.45)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: ground,
          width: '100%',
          height: line,
          background: 'rgba(241, 234, 216, 0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: ground,
          background: '#0a0e15',
        }}
      />
    </div>
  )
}
