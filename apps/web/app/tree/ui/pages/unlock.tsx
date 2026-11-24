import { Head, useForm, usePage } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'

import { urlFor } from '~/app/client'
import type { InertiaProps } from '#core/ui/types'

export default function UnlockPage(_: InertiaProps) {
  const { flash } = usePage()
  const form = useForm({ password: '' })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.post(urlFor('unlock.store'), { onFinish: () => form.reset('password') })
  }

  return (
    <>
      <Head title="Verrouillé" />
      <main className="flex min-h-svh items-center justify-center px-4">
        <form onSubmit={submit} className="flex w-full max-w-64 flex-col items-center gap-6">
          <span className="text-sm font-medium tracking-[0.4em] text-muted-foreground">ME</span>
          <div className="relative w-full">
            <input
              type="password"
              name="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
              aria-label="Mot de passe"
              aria-invalid={flash.error ? true : undefined}
              value={form.data.password}
              onChange={(event) => form.setData('password', event.target.value)}
              className="h-11 w-full rounded-full border border-border bg-transparent pr-11 pl-5 text-center text-lg tracking-[0.5em] outline-none transition-colors placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-foreground/40 aria-invalid:border-destructive/60"
              placeholder="••••"
            />
            <button
              type="submit"
              disabled={form.processing || !form.data.password}
              aria-label="Entrer"
              className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-20"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
          <p className="h-4 text-xs text-destructive" role="alert">
            {flash.error}
          </p>
        </form>
      </main>
    </>
  )
}
