const { discogsKey, discogsUrl } = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)

  if (!q) return {}

  const webUrl = discogsUrl.replace('api.', 'www.')
  const { results } = await $fetch(`${discogsUrl}/database/search`, {
    query: {
      query: q,
      type: 'release',
      token: discogsKey
    }
  })

  return results.map((x) => ({
    discogs_id: [x.id],
    title: [x.title],
    year: [x.year],
    country: [x.country],
    format: [...new Set(x.format)],
    label: [...new Set(x.label)],
    genre: [...new Set(x.genre)],
    barcode: [...new Set(x.barcode)],
    image: [x.thumb],
    url: [`${webUrl}/release/${x.id}`]
  }))
})
