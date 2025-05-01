const { esterUrl } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  return $fetch(esterUrl, { query: { q, f: 'human' } })
})
