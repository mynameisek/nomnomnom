import { ImageResponse } from 'next/og'

export const alt = 'NŌM — Scanne le menu. Comprends chaque plat.'
export const size = { width: 1200, height: 628 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090B',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* Brand name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#FAFAFA',
            letterSpacing: '-4px',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          NŌM
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#FF6B35',
            marginBottom: 12,
            letterSpacing: '-0.5px',
          }}
        >
          Scanne le menu. Comprends chaque plat.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: '#71717A',
            marginBottom: 40,
            letterSpacing: '0.5px',
          }}
        >
          200 cuisines · 50 langues · Un seul geste
        </div>

        {/* Food emoji row */}
        <div
          style={{
            fontSize: 40,
            display: 'flex',
            gap: 16,
          }}
        >
          {'🍜'}{'🥘'}{'🍣'}{'🥙'}{'🍝'}
        </div>
      </div>
    ),
    { ...size }
  )
}
