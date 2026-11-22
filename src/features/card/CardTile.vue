<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Card } from '@/db'
import { useObjectUrl } from '@/utils/useObjectUrl'

const props = defineProps<{ card: Card; subtitle?: string }>()
const photo = useObjectUrl(toRef(() => props.card.frontPhoto))
const style = computed(() => (photo.value ? {} : { background: props.card.color }))
</script>

<template>
  <button class="tile" :class="{ photo: !!photo }" :style="style">
    <img v-if="photo" :src="photo" alt="" draggable="false" />
    <span class="t">{{ card.title }}</span>
    <span v-if="subtitle" class="s">{{ subtitle }}</span>
  </button>
</template>

<style scoped>
.tile {
  position: relative;
  aspect-ratio: 1.586; /* ID-1 card proportions */
  width: 100%;
  border-radius: var(--radius-card);
  padding: 14px;
  color: #fff;
  text-align: left;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.12s var(--ease);
}
.tile:active { transform: scale(0.97); }
.tile:not(.photo)::after {
  content: '';
  position: absolute;
  right: -34px;
  top: -34px;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.14);
}
img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.photo::before {
  content: '';
  position: absolute;
  inset: 40% 0 0;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.55));
  z-index: 1;
}
.photo { justify-content: flex-end; }
.t, .s { position: relative; z-index: 2; }
.t { font-size: 16px; font-weight: 750; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.s { font-size: 12px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.photo .s { display: none; }
</style>
