'use client'

import { useState } from 'react'
import { Package, Plus, Trash2, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, KpiCardSkeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { ControlledTabs } from '@/components/ui/Tabs'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { Combobox } from '@/components/ui/Combobox'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { Tooltip } from '@/components/ui/Tooltip'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { Avatar } from '@/components/ui/Avatar'
import { Separator } from '@/components/ui/Separator'
import { DataTable } from '@/components/ui/DataTable'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 scroll-mt-6" id={title.toLowerCase().replace(/\s+/g, '-')}>
      <div>
        <h2 className="text-heading font-semibold text-fg">{title}</h2>
        {description && <p className="text-sm text-fg-muted mt-1">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const DEMO_ROWS = [
  { id: '1', nombre: 'Remera básica', stock: 24, precio: 12500 },
  { id: '2', nombre: 'Jean slim', stock: 8, precio: 45900 },
  { id: '3', nombre: 'Campera softshell', stock: 3, precio: 89900 },
]

export function DesignShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState('hoy')
  const [period, setPeriod] = useState('semana')
  const [sw, setSw] = useState(true)
  const [check, setCheck] = useState(false)
  const [radio, setRadio] = useState('efectivo')
  const [combo, setCombo] = useState<string | null>('1')
  const [search, setSearch] = useState('')
  const [monto, setMonto] = useState(1500)

  return (
    <div className="space-y-12">
      <Section title="Button" description="Variantes, tamaños y loading. Target táctil 44px en mobile (size md).">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline" aria-label="Agregar">
            <Plus size={18} />
          </Button>
          <LinkButton href="/dashboard" variant="outline" size="sm">
            LinkButton
          </LinkButton>
        </div>
      </Section>

      <Section title="Input / Select / Textarea / Moneda">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <Input label="Nombre" placeholder="Producto…" hint="Visible para el cliente" />
          <Input label="Con error" error="Campo obligatorio" defaultValue="" />
          <Select label="Categoría" defaultValue="">
            <option value="" disabled>
              Elegir…
            </option>
            <option value="a">Remeras</option>
            <option value="b">Pantalones</option>
          </Select>
          <div>
            <p className="text-xs font-medium text-fg-muted mb-1.5">Monto ARS</p>
            <InputMonedaARS value={monto} onChange={setMonto} />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Notas" placeholder="Observaciones…" rows={3} />
          </div>
        </div>
      </Section>

      <Section title="SearchInput / Combobox">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <SearchInput value={search} onChange={setSearch} shortcut="⌘K" placeholder="Buscar productos…" />
          <Combobox
            label="Cliente"
            value={combo}
            onChange={setCombo}
            options={[
              { value: '1', label: 'María López', description: 'DNI 30.123.456' },
              { value: '2', label: 'Juan Pérez', description: 'DNI 28.987.654' },
              { value: '3', label: 'Ana Gómez', description: 'Consumidor final' },
            ]}
          />
        </div>
      </Section>

      <Section title="Switch / Checkbox / RadioGroup">
        <div className="space-y-4 max-w-lg">
          <Switch checked={sw} onChange={setSw} label="Imprimir ticket automáticamente" description="Usa PrintBridge si está conectado" />
          <Checkbox
            checked={check}
            onChange={(e) => setCheck(e.target.checked)}
            label="Acepto los términos"
            description="Requerido para continuar"
          />
          <RadioGroup
            name="pago-demo"
            label="Método de pago"
            value={radio}
            onChange={setRadio}
            options={[
              { value: 'efectivo', label: 'Efectivo', description: 'Con redondeo configurable' },
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'tarjeta', label: 'Tarjeta' },
            ]}
          />
        </div>
      </Section>

      <Section title="Badge / Avatar / Separator / Tooltip">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Avatar name="Santiago Valle" />
          <Avatar name="María López" size="lg" />
          <Tooltip content="Ayuda contextual">
            <button type="button" className="text-fg-muted hover:text-fg focus-ring rounded-full p-1 cursor-pointer" aria-label="Ayuda">
              <HelpCircle size={18} />
            </button>
          </Tooltip>
        </div>
        <Separator label="o continuar con" className="max-w-md mt-4" />
      </Section>

      <Section title="Card / StatCard / SegmentedControl">
        <div className="flex flex-wrap gap-3 mb-4">
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'hoy', label: 'Hoy' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Ventas" value="$128.450" delta="+12%" deltaTone="up" icon={<Package size={16} />} />
          <StatCard label="Ticket promedio" value="$4.280" delta="-3%" deltaTone="down" />
          <Card variant="highlighted" padding="sm">
            <CardHeader>
              <CardTitle>Highlighted</CardTitle>
            </CardHeader>
            <CardDescription>Variante de marca para callouts.</CardDescription>
          </Card>
          <KpiCardSkeleton />
        </div>
      </Section>

      <Section title="Tabs / DropdownMenu">
        <ControlledTabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'hoy', label: 'Hoy' },
            { value: 'semana', label: 'Esta semana' },
            { value: 'mes', label: 'Este mes' },
          ]}
        />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-fg-muted">Menú de fila:</span>
          <DropdownMenu
            items={[
              { label: 'Editar', onClick: () => toast.message('Editar') },
              { label: 'Duplicar', onClick: () => toast.message('Duplicar') },
              { separator: true, label: '' },
              { label: 'Eliminar', danger: true, icon: <Trash2 size={14} />, onClick: () => toast.error('Eliminado') },
            ]}
          />
        </div>
      </Section>

      <Section title="Modal / Drawer / Toast">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Abrir Drawer
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success('Venta registrada', { description: 'Ticket enviado a la impresora' })}
          >
            Toast success
          </Button>
          <Button variant="outline" onClick={() => toast.error('No se pudo cobrar')}>
            Toast error
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirmar cobro"
          description="Se registrará la venta y se imprimirá el ticket."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => { setModalOpen(false); toast.success('Listo') }}>
                Confirmar
              </Button>
            </>
          }
        >
          <p className="text-sm text-fg-secondary">
            Total a cobrar: <span className="font-mono font-semibold text-fg">$12.500,00</span>
          </p>
        </Modal>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Filtros"
          description="Aplicá filtros al listado"
          side="bottom"
          footer={
            <Button className="w-full" onClick={() => setDrawerOpen(false)}>
              Aplicar
            </Button>
          }
        >
          <div className="space-y-3">
            <Select label="Estado" defaultValue="todos">
              <option value="todos">Todos</option>
              <option value="ok">Completadas</option>
            </Select>
            <Input label="Desde" type="date" />
          </div>
        </Drawer>
      </Section>

      <Section title="PageHeader / EmptyState / Spinner">
        <PageHeader
          title="Productos"
          description="Catálogo de la tienda con variantes y stock."
          actions={
            <Button size="sm">
              <Plus size={16} /> Nuevo
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState
            title="Sin productos"
            description="Cargá el primero para empezar a vender."
            icon={<Package size={20} />}
            cta={{ label: 'Crear producto', href: '/productos/nuevo' }}
          />
          <div className="flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border-default p-8">
            <Spinner />
            <Spinner size="lg" className="text-primary" />
            <Skeleton className="w-32 h-4" variant="text" />
          </div>
        </div>
      </Section>

      <Section title="DataTable" description="Tabla en desktop ≥md, cards apiladas en mobile.">
        <DataTable
          rows={DEMO_ROWS}
          rowKey={(r) => r.id}
          columns={[
            { id: 'nombre', header: 'Producto', cell: (r) => r.nombre, mobilePrimary: true },
            {
              id: 'stock',
              header: 'Stock',
              cell: (r) => (
                <Badge variant={r.stock < 5 ? 'warning' : 'success'}>{r.stock} u.</Badge>
              ),
              align: 'right',
            },
            {
              id: 'precio',
              header: 'Precio',
              cell: (r) => (
                <span className="font-mono tabular-nums">
                  ${r.precio.toLocaleString('es-AR')}
                </span>
              ),
              align: 'right',
            },
          ]}
          rowActions={() => (
            <DropdownMenu
              items={[
                { label: 'Editar', href: '#' },
                { label: 'Eliminar', danger: true, onClick: () => undefined },
              ]}
            />
          )}
        />
      </Section>
    </div>
  )
}
