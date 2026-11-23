import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import type {ReactNode} from 'react'
import {expect, expectTypeOf, it, vi} from 'vitest'
import {updateFaq} from '../features/zitouna/api'
import {useFaqMutations} from '../features/zitouna/hooks/useFaqMutations'
import type {FaqEntry} from '../features/zitouna/types'

vi.mock('../features/zitouna/api', () => ({
  createFaq: vi.fn(), updateFaq: vi.fn(), deleteFaq: vi.fn(),
}))

const original: FaqEntry = {
  id: 1, question: 'Original question', answer: 'Original answer', published: true,
  tags: [{id: 3, name: 'Math', field: 'TOPIC', type: 'Subject', parentId: null,
    parentName: null, status: 'APPROVED', aliases: [], decisionReason: null}],
  createdAt: null, updatedAt: null,
}

function setup() {
  const client = new QueryClient({defaultOptions: {mutations: {retry: false}}})
  client.setQueryData(['faqs'], [original])
  const wrapper = ({children}: {children: ReactNode}) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(useFaqMutations, {wrapper})
  expectTypeOf<Parameters<typeof hook.result.current.updateMutation.mutate>[0]['data']>()
    .toEqualTypeOf<Parameters<typeof updateFaq>[1]>()
  return {...hook, client}
}

it('sends tag selections while keeping response tags intact during optimistic updates', async () => {
  let complete!: (value: FaqEntry) => void
  vi.mocked(updateFaq).mockReturnValueOnce(new Promise((resolve) => { complete = resolve }))
  const {result, client} = setup()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const data = {question: 'Updated question', published: false, tags: {topicIds: [5]}}

  act(() => result.current.updateMutation.mutate({id: 1, data}))
  await waitFor(() => expect(updateFaq).toHaveBeenCalledWith(1, data))
  expect(client.getQueryData(['faqs'])).toEqual([{...original, question: data.question, published: false}])

  await act(async () => complete({...original, question: data.question, published: false, tags: []}))
  await waitFor(() => expect(result.current.updateMutation.isSuccess).toBe(true))
  for (const key of ['faqs', 'faq', 'zitounaFeed']) {
    expect(invalidate).toHaveBeenCalledWith({queryKey: [key]})
  }
  client.clear()
})

it('rolls back optimistic edits when the API rejects a tagged update', async () => {
  let fail!: (error: Error) => void
  vi.mocked(updateFaq).mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject }))
  const {result, client} = setup()
  act(() => result.current.updateMutation.mutate({id: 1, data: {answer: 'Edited', tags: {topicIds: []}}}))
  await waitFor(() => expect(client.getQueryData(['faqs'])).toEqual([{...original, answer: 'Edited'}]))

  await act(async () => fail(new Error('Update rejected')))
  await waitFor(() => expect(result.current.updateMutation.isError).toBe(true))
  expect(client.getQueryData(['faqs'])).toEqual([original])
  client.clear()
})

it('retains existing tags for partial updates without a tag selection', async () => {
  vi.mocked(updateFaq).mockResolvedValueOnce({...original, answer: 'Edited'})
  const {result, client} = setup()
  await act(async () => { await result.current.updateMutation.mutateAsync({id: 1, data: {answer: 'Edited'}}) })
  expect(updateFaq).toHaveBeenLastCalledWith(1, {answer: 'Edited'})
  expect(client.getQueryData(['faqs'])).toEqual([{...original, answer: 'Edited'}])
  client.clear()
})
