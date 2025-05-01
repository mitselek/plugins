export default defineEventHandler(async (event) => {
  const { esterUrl } = useRuntimeConfig()
  const { q } = getQuery(event)

  setResponseHeader(event, 'Content-Type', 'application/json')

  return $fetch(esterUrl, { query: { q, f: 'human' } })
})
