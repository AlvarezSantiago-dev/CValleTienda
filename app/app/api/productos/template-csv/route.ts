import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarTemplateCSV } from '@/lib/rubro/templates'
import type { Rubro } from '@/types/database'

const RUBROS_VALIDOS: Rubro[] = [
  'ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico',
  'carniceria', 'farmacia', 'verduleria',
]

export async function GET(request: Request) {
  // Verificar autenticación
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rubro = searchParams.get('rubro') as Rubro | null

  const rubroValido: Rubro = rubro && RUBROS_VALIDOS.includes(rubro) ? rubro : 'generico'

  const csv = generarTemplateCSV(rubroValido)

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="template-productos-${rubroValido}.csv"`,
      'Cache-Control':       'no-store',
    },
  })
}
