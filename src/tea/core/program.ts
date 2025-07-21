/**
 * TEA Program Type
 * 
 * Defines the core TEA (The Elm Architecture) program structure
 * for pure functional terminal applications.
 */

import { Effect } from 'effect'
import type { AppServices } from '../../core/types'

/**
 * TEA Program definition
 */
export interface Program<Model, Msg> {
  init: () => [Model, Cmd<Msg>]
  update: (msg: Msg, model: Model) => [Model, Cmd<Msg>]
  view: (model: Model) => View
  subscriptions?: (model: Model) => Sub<Msg>
}

/**
 * Command - represents side effects
 */
export type Cmd<Msg> = Effect.Effect<Msg | null, never, AppServices>

/**
 * Subscription - continuous event streams
 */
export type Sub<Msg> = {
  id: string
  effect: Effect.Effect<Msg, never, AppServices>
}

/**
 * View - pure rendering function
 */
export type View = {
  render: () => string
}