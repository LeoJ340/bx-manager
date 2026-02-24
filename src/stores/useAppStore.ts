import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const roomPrefix = ref('')
  function setRoomPrefix(prefix: string) {
    roomPrefix.value = prefix
  }

  return { roomPrefix, setRoomPrefix }
})
