import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** Reactive object URL for a Blob, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Ref<Blob | null | undefined>) {
  const url = ref<string | null>(null)
  const revoke = () => {
    if (url.value) URL.revokeObjectURL(url.value)
    url.value = null
  }
  watch(
    blob,
    (b) => {
      revoke()
      if (b) url.value = URL.createObjectURL(b)
    },
    { immediate: true },
  )
  onBeforeUnmount(revoke)
  return url
}
