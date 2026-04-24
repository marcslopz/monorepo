export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
}

export function formatCurrency(amount: string | number, currency: string): string {
  const n = Number(amount)
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

export function formatQuantity(quantity: string | number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(Number(quantity))
}
