/** Helpers HTML para rutas de descarga de documentos (PDF vía print del browser). */

export function escHtml(str: string | null | undefined): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatMoneyDoc(n: number, simbolo = '$'): string {
  const formatted = Number(n ?? 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${simbolo}${formatted}`
}

export function wrapDocHtml(opts: {
  title: string
  body: string
  pageSize?: 'A4' | 'auto'
  autoPrint?: boolean
}): string {
  const pageCss =
    opts.pageSize === 'auto'
      ? '@page { margin: 10mm; }'
      : '@page { size: A4; margin: 12mm 10mm; }'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(opts.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 20px 24px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.45;
    }
    .toolbar {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      margin-bottom: 16px; padding: 12px 14px;
      background: #f3f4f6; border-radius: 10px; font-size: 12px; color: #4b5563;
    }
    .toolbar button {
      appearance: none; border: none; cursor: pointer;
      background: #111827; color: #fff; font-weight: 600; font-size: 13px;
      padding: 10px 16px; border-radius: 999px; min-height: 44px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; background: #f9fafb; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #6b7280; }
    .strong { font-weight: 700; color: #111827; }
    @media print {
      body { padding: 0; max-width: 100%; }
      ${pageCss}
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    <span>En el diálogo de impresión elegí <strong>Guardar como PDF</strong> para compartir por WhatsApp o mail.</span>
  </div>
  ${opts.body}
  ${opts.autoPrint !== false ? `<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),350))</script>` : ''}
</body>
</html>`
}
