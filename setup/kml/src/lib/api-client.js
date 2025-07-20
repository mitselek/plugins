/**
 * Clean API Client for Entu REST API
 * No unused variables, focused single responsibility
 */

export class EntuApiClient {
  constructor (host, account, token) {
    this.host = host
    this.account = account
    this.token = token
    this.baseUrl = `https://${host}/api/${account}`
  }

  async request (endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(options.body && { 'Content-Type': 'application/json' }),
        ...options.headers
      },
      ...options
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async get (endpoint) {
    return this.request(endpoint)
  }

  async post (endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Clean account verification - no unused variables!
  async verifyAccess () {
    await this.get('/')
    return true
  }

  // Helper methods for common queries
  async findEntity (query, limit = 1) {
    const result = await this.get(`/entity?${query}&limit=${limit}`)
    return result.entities || []
  }

  async findEntityByNameAndType (name, type, limit = 1) {
    return this.findEntity(`name.string=${name}&_type.string=${type}&props=_id,name`, limit)
  }

  async createEntity (data) {
    return this.post('/entity', data)
  }

  async updateEntity (id, data) {
    return this.post(`/entity/${id}`, data)
  }
}
