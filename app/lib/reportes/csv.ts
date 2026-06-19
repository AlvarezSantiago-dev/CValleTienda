const UTF8_BOM = '\uFEFF'

export function csvEscape(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function csvRow(cells: (string | number)[]): string {
  return cells.map(csvEscape).join(',')
}

export function withCsvBom(content: string): string {
  return UTF8_BOM + content
}
