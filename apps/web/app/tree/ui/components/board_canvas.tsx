import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

import { cn } from '@workspace/ui/lib/utils'

import { STATUS_META, formatPeriod } from '#tree/ui/components/status_meta'
import type { Person, Point, Viewport } from '#tree/ui/components/types'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2.5
const CLICK_TOLERANCE = 4

export interface BoardCanvasHandle {
  zoomBy: (factor: number) => void
  recenter: () => void
  /** World coordinates of the middle of the screen. */
  center: () => Point
}

interface BoardCanvasProps {
  people: Person[]
  selectedId: string | null
  ref?: React.Ref<BoardCanvasHandle>
  onSelect: (person: Person) => void
  onCreateAt: (point: Point) => void
  onMove: (person: Person, point: Point) => void
  onViewportChange?: (viewport: Viewport) => void
}

type Gesture =
  | { kind: 'pan'; pointerId: number; startX: number; startY: number; origin: Viewport }
  | {
      kind: 'node'
      pointerId: number
      person: Person
      startX: number
      startY: number
      origin: Point
      moved: boolean
    }

const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k))

export function BoardCanvas({
  people,
  selectedId,
  ref,
  onSelect,
  onCreateAt,
  onMove,
  onViewportChange,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, k: 1 })
  const [ready, setReady] = useState(false)
  // Positions being dragged, shown before the server has saved them.
  const [dragged, setDragged] = useState<Record<string, Point>>({})

  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    onViewportChange?.(view)
  }, [view, onViewportChange])

  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current!.getBoundingClientRect()
    const { x, y, k } = viewRef.current
    return { x: (clientX - rect.left - x) / k, y: (clientY - rect.top - y) / k }
  }, [])

  const zoomAt = useCallback((factor: number, screenX: number, screenY: number) => {
    setView((current) => {
      const k = clampZoom(current.k * factor)
      const ratio = k / current.k
      return { k, x: screenX - (screenX - current.x) * ratio, y: screenY - (screenY - current.y) * ratio }
    })
  }, [])

  const recenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setView({ x: rect.width / 2, y: rect.height / 2, k: 1 })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (factor) => {
        const rect = containerRef.current!.getBoundingClientRect()
        zoomAt(factor, rect.width / 2, rect.height / 2)
      },
      recenter,
      center: () => {
        const rect = containerRef.current!.getBoundingClientRect()
        return toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
      },
    }),
    [recenter, toWorld, zoomAt]
  )

  // Start with "me" in the middle of the screen.
  useEffect(() => {
    recenter()
    setReady(true)
  }, [recenter])

  // Trackpad: two fingers pan, pinch (ctrlKey) zooms. Mouse wheel + ctrl/cmd zooms.
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = element!.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top)
      } else {
        setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }))
      }
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // Drop optimistic positions once the server echoes them back.
  useEffect(() => {
    setDragged((current) => {
      const next = { ...current }
      for (const person of people) {
        const pending = next[person.id]
        if (pending && pending.x === person.x && pending.y === person.y) delete next[person.id]
      }
      return next
    })
  }, [people])

  function onBackgroundPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: viewRef.current,
    }
  }

  function onNodePointerDown(event: React.PointerEvent, person: Person) {
    if (event.button !== 0) return
    event.stopPropagation()
    containerRef.current!.setPointerCapture(event.pointerId)
    gestureRef.current = {
      kind: 'node',
      pointerId: event.pointerId,
      person,
      startX: event.clientX,
      startY: event.clientY,
      origin: dragged[person.id] ?? { x: person.x, y: person.y },
      moved: false,
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY

    if (gesture.kind === 'pan') {
      setView({ ...gesture.origin, x: gesture.origin.x + dx, y: gesture.origin.y + dy })
      return
    }

    if (!gesture.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE) return
    gesture.moved = true
    const k = viewRef.current.k
    setDragged((current) => ({
      ...current,
      [gesture.person.id]: {
        x: Math.round(gesture.origin.x + dx / k),
        y: Math.round(gesture.origin.y + dy / k),
      },
    }))
  }

  function onPointerUp(event: React.PointerEvent) {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    gestureRef.current = null

    if (gesture.kind !== 'node') return
    if (!gesture.moved) {
      onSelect(gesture.person)
      return
    }
    const k = viewRef.current.k
    onMove(gesture.person, {
      x: Math.round(gesture.origin.x + (event.clientX - gesture.startX) / k),
      y: Math.round(gesture.origin.y + (event.clientY - gesture.startY) / k),
    })
  }

  function onDoubleClick(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest('[data-node]')) return
    onCreateAt(toWorld(event.clientX, event.clientY))
  }

  const positionOf = (person: Person): Point => dragged[person.id] ?? { x: person.x, y: person.y }
  const byId = new Map(people.map((person) => [person.id, person]))
  const gridSize = 32 * view.k

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(circle, oklch(1 0 0 / 0.07) 1px, transparent 1px)',
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <div
        className={cn('absolute top-0 left-0 origin-top-left', !ready && 'invisible')}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
          {people.map((person) => {
            const from = person.parentId && byId.get(person.parentId)
            const start = from ? positionOf(from) : { x: 0, y: 0 }
            const end = positionOf(person)
            const ended = Boolean(person.endedAt)
            return (
              <line
                key={person.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={STATUS_META[person.status].color}
                strokeOpacity={ended ? 0.25 : 0.45}
                strokeWidth={1.25 / Math.max(view.k, 0.6)}
                strokeDasharray={ended ? '4 5' : undefined}
              />
            )
          })}
        </svg>

        <div
          className="absolute flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/20 bg-background text-xs font-semibold tracking-[0.25em] text-foreground"
          style={{ left: 0, top: 0 }}
        >
          <span className="pl-[0.25em]">ME</span>
        </div>

        {people.map((person) => (
          <PersonNode
            key={person.id}
            person={person}
            position={positionOf(person)}
            selected={person.id === selectedId}
            dragging={person.id in dragged}
            onPointerDown={(event) => onNodePointerDown(event, person)}
          />
        ))}
      </div>
    </div>
  )
}

interface PersonNodeProps {
  person: Person
  position: Point
  selected: boolean
  dragging: boolean
  onPointerDown: (event: React.PointerEvent) => void
}

function PersonNode({ person, position, selected, dragging, onPointerDown }: PersonNodeProps) {
  const meta = STATUS_META[person.status]
  const period = formatPeriod(person.metAt, person.endedAt)
  const ended = Boolean(person.endedAt)

  return (
    <button
      type="button"
      data-node
      onPointerDown={onPointerDown}
      className={cn(
        'absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2.5 rounded-full border bg-card py-1.5 pr-4 pl-2 text-left whitespace-nowrap transition-[border-color,opacity,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        selected ? 'border-foreground/50' : 'border-border hover:border-foreground/25',
        dragging && 'cursor-grabbing shadow-[0_8px_24px_oklch(0_0_0/0.6)]'
      )}
      style={{ left: position.x, top: position.y }}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-background',
          ended && 'opacity-45'
        )}
        style={{ backgroundColor: meta.color }}
      >
        {initials(person)}
      </span>
      <span className={cn('flex flex-col leading-tight', ended && 'opacity-55')}>
        <span className="text-sm font-medium text-foreground">
          {person.firstName}
          {person.lastName ? ` ${person.lastName}` : ''}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {meta.label}
          {period ? ` · ${period}` : ''}
        </span>
      </span>
    </button>
  )
}

function initials(person: Person) {
  return `${person.firstName[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase()
}
