import { useForm } from '@inertiajs/react'
import { useEffect, useState } from 'react'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Textarea } from '@workspace/ui/components/textarea'
import { cn } from '@workspace/ui/lib/utils'

import { urlFor } from '~/app/client'
import { ConfirmDialog } from '#common/ui/components/confirm_dialog'
import type { RelationStatus } from '#tree/enums/relation_status'
import { STATUS_META, STATUS_ORDER } from '#tree/ui/components/status_meta'
import type { Person, Point } from '#tree/ui/components/types'

const ME = 'me'

export type SheetState =
  | { mode: 'create'; position: Point | null; parentId: string | null }
  | { mode: 'edit'; person: Person }
  | null

interface PersonSheetProps {
  state: SheetState
  people: Person[]
  onClose: () => void
  /** Where a new person lands when no position was picked. */
  placeNear: (parentId: string | null) => Point
}

interface FormData {
  firstName: string
  lastName: string
  status: RelationStatus
  metAt: string
  endedAt: string
  notes: string
  parentUuid: string
}

const emptyForm: FormData = {
  firstName: '',
  lastName: '',
  status: 'acquaintance',
  metAt: '',
  endedAt: '',
  notes: '',
  parentUuid: ME,
}

function fromPerson(person: Person): FormData {
  return {
    firstName: person.firstName,
    lastName: person.lastName ?? '',
    status: person.status,
    metAt: person.metAt ?? '',
    endedAt: person.endedAt ?? '',
    notes: person.notes ?? '',
    parentUuid: person.parentId ?? ME,
  }
}

export function PersonSheet({ state, people, onClose, placeNear }: PersonSheetProps) {
  const form = useForm<FormData>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editing = state?.mode === 'edit' ? state.person : null

  useEffect(() => {
    if (!state) return
    form.clearErrors()
    if (state.mode === 'edit') {
      form.setDefaults(fromPerson(state.person))
      form.setData(fromPerson(state.person))
    } else {
      const data = { ...emptyForm, parentUuid: state.parentId ?? ME }
      form.setDefaults(data)
      form.setData(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parentUuid = form.data.parentUuid === ME ? null : form.data.parentUuid

    form.transform((data) => ({
      ...data,
      lastName: data.lastName || null,
      metAt: data.metAt || null,
      endedAt: data.endedAt || null,
      notes: data.notes || null,
      parentUuid,
      ...(state?.mode === 'create' ? (state.position ?? placeNear(parentUuid)) : {}),
    }))

    const options = { preserveScroll: true, preserveState: true, onSuccess: onClose }
    if (editing) {
      form.put(urlFor('people.update', { id: editing.id }), options)
    } else {
      form.post(urlFor('people.store'), options)
    }
  }

  function destroy() {
    if (!editing) return
    form.delete(urlFor('people.destroy', { id: editing.id }), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        setConfirmDelete(false)
        onClose()
      },
    })
  }

  // Someone can't be met through themself.
  const parentOptions = people.filter((person) => person.id !== editing?.id)

  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader className="border-b border-border">
            <SheetTitle>
              {editing ? displayName(editing) : 'Nouvelle personne'}
            </SheetTitle>
            <SheetDescription>
              {editing ? 'Modifier la relation' : 'Ajouter quelqu’un sur le tableau'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldBlock label="Prénom" htmlFor="firstName" error={form.errors.firstName}>
                <Input
                  id="firstName"
                  autoFocus
                  value={form.data.firstName}
                  onChange={(event) => form.setData('firstName', event.target.value)}
                  aria-invalid={form.errors.firstName ? true : undefined}
                />
              </FieldBlock>
              <FieldBlock label="Nom" htmlFor="lastName" hint="facultatif" error={form.errors.lastName}>
                <Input
                  id="lastName"
                  value={form.data.lastName}
                  onChange={(event) => form.setData('lastName', event.target.value)}
                />
              </FieldBlock>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Statut</legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {STATUS_ORDER.map((status) => {
                  const meta = STATUS_META[status]
                  const active = form.data.status === status
                  return (
                    <button
                      key={status}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => form.setData('status', status)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-foreground/40 bg-muted text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <FieldBlock label="Connu·e via" error={form.errors.parentUuid}>
              <Select
                value={form.data.parentUuid}
                onValueChange={(value) => form.setData('parentUuid', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ME}>Moi directement</SelectItem>
                  {parentOptions.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {displayName(person)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>

            <div className="grid grid-cols-2 gap-3">
              <FieldBlock label="Rencontré·e le" htmlFor="metAt" error={form.errors.metAt}>
                <Input
                  id="metAt"
                  type="date"
                  value={form.data.metAt}
                  onChange={(event) => form.setData('metAt', event.target.value)}
                />
              </FieldBlock>
              <FieldBlock label="Fin" htmlFor="endedAt" hint="si terminé" error={form.errors.endedAt}>
                <Input
                  id="endedAt"
                  type="date"
                  value={form.data.endedAt}
                  min={form.data.metAt || undefined}
                  onChange={(event) => form.setData('endedAt', event.target.value)}
                />
              </FieldBlock>
            </div>

            <FieldBlock label="Notes" htmlFor="notes" error={form.errors.notes}>
              <Textarea
                id="notes"
                rows={4}
                value={form.data.notes}
                onChange={(event) => form.setData('notes', event.target.value)}
              />
            </FieldBlock>
          </div>

          <SheetFooter className="flex-row border-t border-border">
            {editing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Supprimer
              </Button>
            )}
            <Button type="submit" size="sm" className="ml-auto" disabled={form.processing}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={editing ? `Supprimer ${displayName(editing)} ?` : ''}
        desc="Les personnes rencontrées via elle seront rattachées directement à toi."
        cancelBtnText="Annuler"
        confirmText="Supprimer"
        destructive
        isLoading={form.processing}
        handleConfirm={destroy}
      />
    </Sheet>
  )
}

function FieldBlock({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function displayName(person: Person) {
  return person.lastName ? `${person.firstName} ${person.lastName}` : person.firstName
}
