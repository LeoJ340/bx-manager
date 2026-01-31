<template>
  <el-card class="bg-white p-4">
    <el-button type="primary" @click="openDialog()">添加规则</el-button>
    <el-table :data="rules" style="width: 100%" :span-method="spanMethod">
      <el-table-column prop="level" label="等级" />
      <el-table-column prop="taskName" label="作业" />
      <el-table-column prop="count" label="数量" />
      <el-table-column prop="score" label="分数" ></el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openDialog(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="removeRule(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" title="添加规则">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="等级" prop="level">
          <el-select v-model="form.level" placeholder="请选择等级" @change="changeLevel">
            <el-option v-for="l in indicatorStore.levels" :key="l.name" :label="l.name" :value="l.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="作业" prop="task">
          <el-select v-model="form.task" placeholder="请选择作业">
            <el-option
              v-for="ind in taskOptions"
              :key="ind.key"
              :label="ind.name"
              :value="ind.key"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数量" prop="count">
          <el-input-number v-model="form.count" :min="1" :step="1" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="confirmRule">确定</el-button>
      </template>
    </el-dialog>
  </el-card>

  <div class="mt-4 flex justify-center gap-2">
    <el-button @click="prev">上一步</el-button>
    <el-button type="primary" @click="next">下一步</el-button>
  </div>
</template>

<script setup>
import { ref, defineEmits, computed } from 'vue'

function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch (e) {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

import { useIndicatorStore } from '@/stores/useIndicStore'
const indicatorStore = useIndicatorStore()

const rules = ref([])
rules.value = indicatorStore.levels.map(level => (level.tasks || []).map(task => ({
  id: genId(),
  level: level.name,
  task: task.task,
  taskName: indicatorStore.taskIndicators.find(i => i.key === task.task)?.name || '',
  count: task.count,
  score: level.score,
}))).flat()

const showDialog = ref(false)
const formRef = ref(null)
const form = ref({
  level: '',
  task: '',
  count: 0
})

const taskOptions = computed(() => {
  if (!form.value.level) return indicatorStore.taskIndicators

  // 若处于编辑模式，保留当前编辑项的 taskKey，使其不会被排除
  const editingTaskKey = form.value.id ? (rules.value.find(r => r.id === form.value.id)?.task) : null

  const existingTasks = rules.value.filter(r => r.level === form.value.level).map(r => r.task)
  const excluded = existingTasks.filter(t => t !== editingTaskKey)

  return indicatorStore.taskIndicators.filter(task => !excluded.includes(task.key))
})
function changeLevel() {
  form.value.task = ''
}

function validateCount(rule, value, callback) {
  if (value == null || value === '') {
    return callback(new Error('数量不能为空'))
  }
  if (!Number.isInteger(value) || value <= 0) {
    return callback(new Error('数量必须为正整数'))
  }
  callback()
}
const formRules = {
  level: [{ required: true, message: '请选择等级', trigger: 'change' }],
  task: [{ required: true, message: '请选择作业', trigger: 'change' }],
  count: [
    { required: true, message: '请输入数量', trigger: 'change' },
    { validator: validateCount, trigger: 'change' }
  ],
}

function openDialog(row) {
  if (row) {
    form.value = {
      id: row.id,
      level: row.level,
      task: row.task,
      count: row.count,
    }
  }
  showDialog.value = true
}
function closeDialog () {
  if (formRef.value && formRef.value.resetFields) formRef.value.resetFields()
  // 重置内部 form 值，避免残留导致下一次添加顺序异常
  form.value = { level: '', task: '', count: 0 }
  showDialog.value = false
}

function confirmRule() {
  if (!formRef.value) return
  formRef.value.validate((valid) => {
    if (!valid) return
    const task = indicatorStore.taskIndicators.find(i => i.key === form.value.task) || {}
    const score = indicatorStore.levels.find(l => l.name === form.value.level)?.score || 0
    const item = {
      id: form.value.id || genId(),
      level: form.value.level,
      task: form.value.task,
      taskName: task.name,
      count: form.value.count,
      score,
    }
    if (form.value.id) {
      // 编辑模式，先删除旧项
      const index = rules.value.findIndex(r => r.id === form.value.id)
      if (index !== -1) rules.value.splice(index, 1, item)
    } else {
      const rulesTemp = [...rules.value, item]
      rulesTemp.sort((a, b) => {
        // 先按 level 排序
        const levelOrder = indicatorStore.levels.map(l => l.name)
        const aLevelIdx = levelOrder.indexOf(a.level)
        const bLevelIdx = levelOrder.indexOf(b.level)
        if (aLevelIdx !== bLevelIdx) return aLevelIdx - bLevelIdx
        // 同等级，按 taskName 排序
        const taskOrder = indicatorStore.taskIndicators.map(t => t.name)
        const aTaskIdx = taskOrder.indexOf(a.taskName)
        const bTaskIdx = taskOrder.indexOf(b.taskName)
        if (aTaskIdx !== bTaskIdx) return aTaskIdx - bTaskIdx
        return 0
      })
      rules.value = rulesTemp
    }
    closeDialog()
  })
}

function removeRule(row) {
  if (rules.value.filter(r => r.level === row.level).length <= 1) {
    ElMessage.warning(`等级 "${row.level}" 必须保留至少一条规则`)
    return
  }
  const idx = rules.value.findIndex(r => r.id === row.id)
  if (idx !== -1) rules.value.splice(idx, 1)
}

// 合并等级和分数列：对相同等级的所有项合并显示
function spanMethod({ row, column, rowIndex }) {
  if (column.property === 'level' || column.property === 'score') {
    const lvl = row.level
    const groupIndexes = rules.value.map((r, i) => ({ lvl: r.level, i })).filter(x => x.lvl === lvl).map(x => x.i)
    if (!groupIndexes.length) return [1,1]
    const first = groupIndexes[0]
    const span = groupIndexes.length
    if (rowIndex === first) return [span, 1]
    return [0, 0]
  }
  return [1, 1]
}

const emit = defineEmits(['prevStep', 'nextStep'])
function prev () {
  emit('prevStep')
}
function next() {
  // const valid = indicatorStore.levels.every(level => {
  //   const hasRule = rules.value.some(r => r.level === level.name && r.task && r.count > 0)
  //   if (!hasRule) {
  //     ElMessage.warning(`请为等级 "${level.name}" 添加至少一条规则`)
  //     return false
  //   }
  //   return true
  // })
  // if (!valid) return
  indicatorStore.setLevels(indicatorStore.levels.map(l => ({
    ...l,
    tasks: rules.value.filter(r => r.level === l.name).map(r => ({
      task: r.task,
      count: r.count,
    })),
  })))
  ElMessage.success('规则已保存，进入下一步')
  emit('nextStep')
}
</script>

<style scoped>
/* 简单样式调整，可按需修改 */
</style>
