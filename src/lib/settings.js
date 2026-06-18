export const KEYS = {
  DISPLAY_NAME: 'geoscan-display-name',
  LAB_NAME:     'geoscan-lab-name',
  NORM_REF:     'geoscan-norm-ref',
}

export const DEFAULTS = {
  [KEYS.NORM_REF]: 'ISO 17892-12',
}

export function getSetting(key) {
  return localStorage.getItem(key) ?? DEFAULTS[key] ?? ''
}

export function setSetting(key, value) {
  localStorage.setItem(key, value)
}
