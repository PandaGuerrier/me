import { Head, router } from '@inertiajs/react'
import { Lock, Minus, Plus, Crosshair } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@workspace/ui/components/button'

import { urlFor } from '~/app/client'
import type { InertiaProps } from '#core/ui/types'
import { BoardCanvas, type BoardCanvasHandle } from '#tree/ui/components/board_canvas'
import { PersonSheet, type SheetState } from '#tree/ui/components/person_sheet'
import { STATUS_META, STATUS_ORDER } from '#tree/ui/components/status_meta'
import type { Person, Point, Viewport } from '#tree/ui/components/types'

type PageProps = InertiaProps<{ people: Person[] }>

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export default function BoardPage({ people }: PageProps) {
  const canvasRef = useRef<BoardCanvasHandle>(null)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [zoom, setZoom] = useState(1)

  const counts = useMemo(() => {
    const result = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]))
    for (const person of people) result[person.status]++
    return result
  }, [people])

  // Keep the open sheet in sync with fresh server data.
  useEffect(() => {
    setSheet((current) => {
      if (current?.mode !== 'edit') return current
      const fresh = people.find((person) => person.id === current.person.id)
      return fresh ? { mode: 'edit', person: fresh } : null
    })
  }, [people])

  const placeNear = useCallback(
    (parentId: string | null): Point => {
      const byId = new Map(people.map((person) => [person.id, person]))
      const parent = parentId ? byId.get(parentId) : undefined
      const origin = parent ? { x: parent.x, y: parent.y } : { x: 0, y: 0 }
      const siblings = people.filter((person) => (person.parentId ?? null) === parentId).length

      if (!parent) {
        const radius = 220 + 70 * Math.floor(siblings / 8)
        const angle = siblings * GOLDEN_ANGLE
        return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) }
      }

      // Fan out away from whoever the parent hangs from.
      const grand = parent.parentId ? byId.get(parent.parentId) : undefined
      const away = Math.atan2(origin.y - (grand?.y ?? 0), origin.x - (grand?.x ?? 0))
      const spread = ((siblings % 5) - 2) * 0.45
      const radius = 180 + 60 * Math.floor(siblings / 5)
      return {
        x: Math.round(origin.x + Math.cos(away + spread) * radius),
        y: Math.round(origin.y + Math.sin(away + spread) * radius),
      }
    },
    [people]
  )

  const move = useCallback((person: Person, point: Point) => {
    router.patch(urlFor('people.move', { id: person.id }), { ...point }, {
      preserveScroll: true,
      preserveState: true,
      only: ['people'],
    })
  }, [])

  const onViewportChange = useCallback((viewport: Viewport) => setZoom(viewport.k), [])

  // Keyboard: n = new person, +/- = zoom, 0 = recenter.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (sheet || target.closest('input, textarea, [contenteditable], [role="dialog"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'n') {
        event.preventDefault()
        setSheet({ mode: 'create', position: null, parentId: null })
      } else if (event.key === '+' || event.key === '=') canvasRef.current?.zoomBy(1.2)
      else if (event.key === '-') canvasRef.current?.zoomBy(1 / 1.2)
      else if (event.key === '0') canvasRef.current?.recenter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  return (
    <>
      <Head title="Tableau" />
      <main className="relative h-svh w-full overflow-hidden">
        <BoardCanvas
          ref={canvasRef}
          people={people}
          selectedId={sheet?.mode === 'edit' ? sheet.person.id : null}
          onSelect={(person) => setSheet({ mode: 'edit', person })}
          onCreateAt={(position) => setSheet({ mode: 'create', position, parentId: null })}
          onMove={move}
          onViewportChange={onViewportChange}
        />

        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <div className="pointer-events-auto flex items-baseline gap-3">
            <span className="text-sm font-semibold tracking-[0.3em]">ME</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {people.length} {people.length > 1 ? 'personnes' : 'personne'}
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setSheet({ mode: 'create', position: null, parentId: null })}
            >
              <Plus />
              Ajouter
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label="Verrouiller"
              title="Verrouiller"
              onClick={() => router.post(urlFor('unlock.destroy'))}
            >
              <Lock />
            </Button>
          </div>
        </header>

        <ul className="pointer-events-none absolute bottom-4 left-4 hidden flex-col gap-1.5 text-xs text-muted-foreground sm:flex">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />
              {STATUS_META[status].label}
              <span className="tabular-nums text-muted-foreground/60">{counts[status]}</span>
            </li>
          ))}
        </ul>

        <div className="absolute right-4 bottom-4 flex items-center gap-0.5 rounded-xl border border-border bg-card/80 p-1 backdrop-blur">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Dézoomer"
            onClick={() => canvasRef.current?.zoomBy(1 / 1.2)}
          >
            <Minus />
          </Button>
          <span className="w-11 text-center text-xs text-muted-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Zoomer"
            onClick={() => canvasRef.current?.zoomBy(1.2)}
          >
            <Plus />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Recentrer"
            title="Recentrer (0)"
            onClick={() => canvasRef.current?.recenter()}
          >
            <Crosshair />
          </Button>
        </div>

        {people.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[calc(50%+56px)] text-center text-sm text-muted-foreground">
            Double-clique n’importe où pour ajouter quelqu’un.
          </p>
        )}

        <PersonSheet
          state={sheet}
          people={people}
          onClose={() => setSheet(null)}
          placeNear={placeNear}
        />
      </main>
    </>
  )
}
