import { defineStore } from 'pinia'
import {computed, ref} from 'vue'

// 指标类型
export enum IndicatorType {
  Performance = 0, // 绩效
  Task = 1, // 作业
}

export interface Indicator {
  type: IndicatorType
  key: string
  name: string
}

export interface Level {
  name: string
  score: number
  tasks?: Array<{
    task: string,
    count: number
  }>
}

export const useIndicatorStore = defineStore('indicator', () => {
  const indicators = ref<Indicator[]>([])
  const performanceIndicators = computed(() =>
      indicators.value.filter(i => i.type === IndicatorType.Performance)
  )
  const taskIndicators = computed(() =>
      indicators.value.filter(i => i.type === IndicatorType.Task)
  )
  const levels = ref<Level[]>([])

  function setIndicators(newIndicators: Indicator[]) {
    indicators.value = newIndicators
  }

  function setLevels(newLevels: Level[]) {
    levels.value = newLevels
  }

  return {
    indicators,
    performanceIndicators,
    taskIndicators,
    levels,
    setIndicators,
    setLevels
  }
})

