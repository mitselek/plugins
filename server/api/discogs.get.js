const { discogsKey } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return {}

  const { results } = await $fetch('https://api.discogs.com/database/search', {
    query: {
      query: q,
      type: 'release',
      token: discogsKey
    }
  })

  return results.map((x) => ({
    id: x.id,
    title: x.title,
    year: x.year,
    country: x.country,
    format: [...new Set(x.format)],
    label: [...new Set(x.label)],
    image: x.thumb
  }))
})
