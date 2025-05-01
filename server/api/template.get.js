const { public: { entuUrl }, entuKey } = useRuntimeConfig()

let token = null
let tokenTime = null
let userId = null

export default defineEventHandler(async (event) => {
  const { userId, token } = await getTemplateUser()
  const { _id, ...query } = getQuery(event)

  if (_id) {
    return $fetch(`${entuUrl}/api/template/entity/${_id}`, {
      headers: { Authorization: `Bearer ${token}` },
      query
    })
  }
  else {
    return $fetch(`${entuUrl}/api/template/entity`, {
      headers: { Authorization: `Bearer ${token}` },
      query: {
        ...query,
        '_viewer.reference': userId
      }
    })
  }
})

async function getTemplateUser () {
  if (!userId || !token || tokenTime < Date.now()) {
    const data = await $fetch(`${entuUrl}/api/auth`, {
      headers: { Authorization: `Bearer ${entuKey}` },
      query: { account: 'template' }
    })

    userId = data?.accounts?.at(0)?.user?._id
    token = data?.token
    tokenTime = Date.now() + 1000 * 60 * 60 // 1 hour
  }

  return { userId, token }
}
