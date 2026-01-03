const LS_KEY = "onceonly_api_key";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_KEY);
}

export function setApiKey(key: string) {
  window.localStorage.setItem(LS_KEY, key.trim());
}

export function clearApiKey() {
  window.localStorage.removeItem(LS_KEY);
}
