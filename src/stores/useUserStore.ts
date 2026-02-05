import { defineStore } from 'pinia'

export interface UserItem {
  key: string
  name: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as UserItem[],
  }),
  actions: {
    setUsers(users: UserItem[]) {
      console.log(users)
      this.users = users
    },
    removeUserByKey(key: string) {
      this.users = this.users.filter(u => u.key !== key)
    },
    clearUsers() {
      this.users = []
    },
  },
})

