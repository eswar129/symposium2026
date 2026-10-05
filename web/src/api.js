const BASE = import.meta.env.VITE_API || 'http://localhost:5000'

export const api = {
  get: (p) => fetch(BASE + p).then((r) => r.json()),
  post: (p, body) =>
    fetch(BASE + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
}