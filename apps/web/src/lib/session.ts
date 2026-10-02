const STORAGE_KEY = "zalary.authToken"

export function getSessionToken(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setSessionToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearSessionToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
