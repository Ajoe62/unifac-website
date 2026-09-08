/**
 * Personality presets.
 *
 * Colour alone does not make two sites look different. Give the same layout a
 * navy palette instead of a green one and it is visibly the same page, which
 * is the failure mode of every recoloured template. What actually separates
 * them is shape, depth and rhythm: whether corners are pills or squares,
 * whether cards float or sit flat, how much air a section gets, and whether
 * the dark bands carry a texture.
 *
 * A preset is a set of those decisions taken together, because taken
 * separately they fight. Deep shadows under square corners on a tight rhythm
 * reads as a mistake rather than a choice.
 */

export const PRESETS = {
  'classic-institutional': {
    description: 'serif display, pill buttons, warm ground, dotted texture',
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Mulish', system-ui, sans-serif",
      displayWeight: 600,
      google:
        'family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Mulish:wght@300;400;500;600;700;800',
    },
    shape: {
      'radius-card': '14px',
      'radius-lg': '16px',
      'radius-sm': '10px',
      'radius-ic': '12px',
      'radius-pill': '100px',
      'border-weight': '1px',
      'border-weight-btn': '2px',
      'section-y': '5rem',
      'section-y-slim': '3.6rem',
      'wrap-w': 'min(1160px, 92vw)',
    },
    texture: {
      'texture-dot': 'radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px)',
      'texture-dot-size': '22px 22px',
      'texture-dot-opacity': '0.5',
    },
  },

  'modern-clean': {
    description: 'sans display, soft rectangles, flat shadows, no texture',
    fonts: {
      display: "'Sora', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
      displayWeight: 700,
      google: 'family=Sora:wght@400;600;700&family=Inter:wght@300;400;500;600;700;800',
    },
    shape: {
      'radius-card': '10px',
      'radius-lg': '12px',
      'radius-sm': '8px',
      'radius-ic': '10px',
      'radius-pill': '8px',
      'border-weight': '1px',
      'border-weight-btn': '1.5px',
      'section-y': '4.4rem',
      'section-y-slim': '3rem',
      'wrap-w': 'min(1200px, 92vw)',
    },
    texture: {
      'texture-dot': 'none',
      'texture-dot-size': '0 0',
      'texture-dot-opacity': '0',
    },
  },

  'bold-editorial': {
    description: 'heavy display, square corners, dramatic depth, generous air',
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Source Sans 3', system-ui, sans-serif",
      displayWeight: 700,
      google:
        'family=Playfair+Display:wght@500;600;700;800&family=Source+Sans+3:wght@300;400;500;600;700',
    },
    shape: {
      'radius-card': '0px',
      'radius-lg': '0px',
      'radius-sm': '0px',
      'radius-ic': '0px',
      'radius-pill': '0px',
      'border-weight': '1px',
      'border-weight-btn': '2px',
      'section-y': '7rem',
      'section-y-slim': '4.4rem',
      'wrap-w': 'min(1240px, 92vw)',
    },
    texture: {
      'texture-dot': 'none',
      'texture-dot-size': '0 0',
      'texture-dot-opacity': '0',
    },
  },
};

export const DEFAULT_PRESET = 'classic-institutional';
