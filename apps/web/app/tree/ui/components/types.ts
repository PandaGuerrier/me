import type { Data } from '@generated/data'

export type Person = Data.Tree.Person.Variants['forBoard']

export interface Point {
  x: number
  y: number
}

/** screen = world * k + (x, y) */
export interface Viewport extends Point {
  k: number
}
