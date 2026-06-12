// Indian number formatting — lakhs and crores.

export function inr(value) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 1 : 2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${Math.round(abs / 1e3)}k`
  return `${sign}₹${Math.round(abs)}`
}

export function inrFull(value) {
  return '₹' + Math.round(value).toLocaleString('en-IN')
}

export function years(y) {
  if (y === null) return 'never'
  const whole = Math.floor(y)
  const months = Math.round((y - whole) * 12)
  if (months === 0) return `${whole} yr`
  if (whole === 0) return `${months} mo`
  return `${whole} yr ${months} mo`
}
