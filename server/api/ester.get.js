export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return []

  setResponseHeader(event, 'Content-Type', 'application/json')

  return $fetch('https://ester.entu.eu', { query: { q, f: 'human' } })
})
