import { expect, it, vi } from 'vitest'

import { submitLearningMaterial } from '../features/zitouna/api'
import { apiClient } from '../lib/apiClient'

it('serializes proposed tags in the learning-material creation payload', async () => {
  vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 21 } } as never)
  const file = new File(['%PDF-1.4 test'], 'notes.pdf', { type: 'application/pdf' })

  await submitLearningMaterial({
    title: 'Lecture notes',
    type: 'PDF',
    tags: {
      topicIds: [6],
      proposals: [{ name: 'New material topic', field: 'TOPIC' }],
    },
  }, file)

  const formData = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
  const payload = JSON.parse(await (formData.get('payload') as Blob).text())
  expect(payload.tags.topicIds).toEqual([6])
  expect(payload.tags.proposals).toEqual([{ name: 'New material topic', field: 'TOPIC' }])
})