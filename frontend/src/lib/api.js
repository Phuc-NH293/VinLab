export const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api')
export async function api(path, options={}){
  const res = await fetch(`${API}${path}`, {headers:{'Content-Type':'application/json'}, ...options})
  if(!res.ok){ throw new Error((await res.json()).detail || 'Request failed') }
  return res.json()
}
