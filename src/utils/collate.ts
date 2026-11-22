const collator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true })
export const byName = <T>(get: (x: T) => string) => (a: T, b: T) => collator.compare(get(a), get(b))
export const normalize = (s: string) => s.toLocaleLowerCase('uk').replace(/[’'`ʼ]/g, '').trim()
