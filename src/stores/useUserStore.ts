import { defineStore } from 'pinia'

export interface UserItem {
  key: string
  name: string
}

function genKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as UserItem[],
  }),
  actions: {
    setUsersFromNames(names: string[]) {
      // 去重并生成对象列表
      const seen = new Set<string>()
      const list: UserItem[] = []
      for (const n of names) {
        const name = String(n).trim()
        if (!name) continue
        if (seen.has(name)) continue
        seen.add(name)
        list.push({ key: genKey(), name })
      }
      this.users = list
    },
    addUser(name: string) {
      const n = String(name).trim()
      if (!n) return
      // 防止重复名字
      if (this.users.some(u => u.name === n)) return
      this.users.push({ key: genKey(), name: n })
    },
    removeUserByKey(key: string) {
      this.users = this.users.filter(u => u.key !== key)
    },
    clearUsers() {
      this.users = []
    },
  },
})

