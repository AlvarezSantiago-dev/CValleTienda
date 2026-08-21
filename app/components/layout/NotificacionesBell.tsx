'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { createClient } from '@/lib/supabase/client'

interface Item {
  id: string
  titulo: string
  cuerpo: string | null
  pedido_id: string | null
  created_at: string
  leida: boolean
}

/** Fallback solo si Realtime no suscribe. 60s, no 20s. */
const POLL_FALLBACK_MS = 60_000

function haceCuanto(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.max(0, Math.floor(ms / 60000))
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export function NotificacionesBell({ tiendaId }: { tiendaId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const res = await fetch('/api/notificaciones')
      if (!res.ok) return
      const json = (await res.json()) as { items: Item[]; unreadCount: number }
      setItems(json.items ?? [])
      setUnread(json.unreadCount ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  const loadDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void load()
    }, 250)
  }, [load])

  useEffect(() => {
    void load()

    let fallbackId: number | undefined
    const startFallback = () => {
      if (fallbackId !== undefined) return
      fallbackId = window.setInterval(() => void load(), POLL_FALLBACK_MS)
    }
    const stopFallback = () => {
      if (fallbackId === undefined) return
      window.clearInterval(fallbackId)
      fallbackId = undefined
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`notificaciones:${tiendaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `tienda_id=eq.${tiendaId}`,
        },
        () => {
          loadDebounced()
        }
      )
      .subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        if (status === 'SUBSCRIBED') stopFallback()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startFallback()
        }
      })

    const t = window.setTimeout(() => {
      if (channel.state !== 'joined') startFallback()
    }, 4000)

    function onVis() {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.clearTimeout(t)
      stopFallback()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      document.removeEventListener('visibilitychange', onVis)
      void supabase.removeChannel(channel)
    }
  }, [tiendaId, load, loadDebounced])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function marcar(ids: string[]) {
    await fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    void load()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-fg-muted hover:bg-surface-hover hover:text-fg focus-ring"
        aria-label="Notificaciones"
      >
        <Bell size={18} aria-hidden />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-fg text-[10px] font-bold leading-4">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-border-subtle bg-surface shadow-md z-30 overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle flex justify-between items-center">
            <p className="text-sm font-medium">Avisos</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-fg-brand"
                onClick={() => void fetch('/api/notificaciones', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ all: true }),
                }).then(() => load())}
              >
                Marcar leídos
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-fg-muted text-center">Sin avisos nuevos</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.pedido_id ? `/pedidos/${n.pedido_id}` : '/pedidos'}
                    className={cn(
                      'block px-3 py-2 hover:bg-surface-hover',
                      !n.leida && 'bg-primary-soft/40'
                    )}
                    onClick={() => {
                      setOpen(false)
                      if (!n.leida) void marcar([n.id])
                    }}
                  >
                    <p className="text-sm font-medium text-fg">{n.titulo}</p>
                    {n.cuerpo && <p className="text-xs text-fg-muted">{n.cuerpo}</p>}
                    <p className="text-[11px] text-fg-subtle mt-0.5">{haceCuanto(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
