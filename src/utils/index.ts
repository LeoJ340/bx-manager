export function useGenerateKey() {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    } catch (e) {}
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}
