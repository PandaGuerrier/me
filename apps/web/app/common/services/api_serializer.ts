import { BaseSerializer } from '@adonisjs/core/transformers'

// Inertia resolves transformers itself; JSON endpoints go through this to get the same output.
class ApiSerializer extends BaseSerializer<{ Wrap: 'data' }> {
  wrap = 'data' as const

  definePaginationMetaData(metaData: unknown) {
    return metaData as Record<string, any>
  }
}

export const apiSerializer = new ApiSerializer()
