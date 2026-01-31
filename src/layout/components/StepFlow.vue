<template>
  <div class="p-4">
    <el-steps :active="active" finish-status="success" align-center>
      <el-step v-for="(s, i) in steps" :key="i" :title="s" />
    </el-steps>

    <div class="mt-6">
      <component :is="currentComponent" @prevStep="prev" @nextStep="next" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DataInitStep from './DataInitStep.vue'
import RuleSetting from './RuleSetting.vue'
import PerformanceReport from './PerformanceReport.vue'

const steps = ['数据初始化', '规则设置', '绩效填报']
const active = ref(0)

const components = [
  DataInitStep,
  RuleSetting,
  PerformanceReport,
]

const currentComponent = computed(() => components[active.value])

function next() {
  if (active.value < steps.length - 1) active.value++
}
function prev() {
  if (active.value > 0) active.value--
}
</script>

<style scoped>

</style>
