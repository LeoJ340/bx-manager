import { defineStore } from 'pinia'

export interface UserItem {
  key: string
  name: string
  /** 时间范围开始，统一为 HH.mm 如 07.00；不存在时为空字符串 */
  startTime?: string
  /** 时间范围结束，统一为 HH.mm 如 08.00；不存在时为空字符串 */
  endTime?: string
  /** 从 0:00 起的分钟数，用于区间判断；无时间时为 undefined */
  startMinutes?: number
  /** 从 0:00 起的分钟数，用于区间判断；无时间时为 undefined */
  endMinutes?: number
}

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as UserItem[],
  }),
  actions: {
    setUsers(users: UserItem[]) {
      this.users = users
    },
  },
})

