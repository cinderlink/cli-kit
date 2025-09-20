import { Effect } from "effect"
import { StorageService } from "@/services/storage"
import { StorageServiceLive } from "@/services/impl/storage-impl"
import { z } from "zod"

const program = Effect.gen(function* () {
  const storage = yield* StorageService
  yield* storage.saveState("toDelete", "value")
  yield* storage.clearState("toDelete")
  const value = yield* storage.loadState("toDelete", z.any())
  console.log("value", value)
}).pipe(Effect.provide(StorageServiceLive))

await Effect.runPromise(program)
