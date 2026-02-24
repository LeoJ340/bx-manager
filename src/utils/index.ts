export function useGenerateKey() {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    } catch (e) {}
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

const TIME_PART = /^\d{1,2}\.\d{2}$/

/** 将 07.00 格式转为从 0:00 起的分钟数，无效返回 NaN */
export function timeToMinutes(t: string | undefined | null): number {
    if (t == null) return NaN
    const s = t.trim()
    if (!TIME_PART.test(s)) return NaN
    const parts = s.split('.').map((x) => parseInt(x, 10))
    const h = parts[0]
    const m = parts[1]
    if (h === undefined || Number.isNaN(h)) return NaN
    return h * 60 + (m === undefined || Number.isNaN(m) ? 0 : m)
}

/** 规范为 HH.mm（如 7.00 -> 07.00），无效返回空字符串 */
export function normalizeTimeToHHmm(t: string | undefined | null): string {
    if (t == null) return ''
    const s = t.trim()
    if (!TIME_PART.test(s)) return ''
    const [h, m] = s.split('.')
    const hNum = parseInt(h!, 10)
    const mNum = parseInt(m!, 10)
    if (Number.isNaN(hNum) || hNum < 0 || hNum > 24) return ''
    const padH = String(hNum).padStart(2, '0')
    const padM = String(Number.isNaN(mNum) ? 0 : mNum).padStart(2, '0')
    return `${padH}.${padM}`
}
