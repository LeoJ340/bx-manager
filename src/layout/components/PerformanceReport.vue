<template>
  <el-card class="bg-white p-4">

    <div class="mb-4 flex justify-between items-center">
      <div class="text-lg font-semibold">绩效填报</div>
      <div class="flex gap-2">
        <el-upload
            id="uploadExcel"
            :show-file-list="false"
            :auto-upload="false"
            accept=".xls,.xlsx"
            @change="uploadFile"
        >
          <el-button type="primary" plain>导入Excel</el-button>
        </el-upload>
        <el-button type="primary" @click="exportDetailsExcel" :disabled="!rows.length">导出明细</el-button>
        <el-button type="primary" @click="openDialog">新增报备</el-button>
      </div>
    </div>

    <el-table :data="rows" border style="width: 100%">
      <el-table-column fixed prop="date" label="日期" width="105" />
      <el-table-column fixed prop="week" label="周" width="55" />
      <el-table-column fixed prop="nj" label="NJ" width="130" />

      <el-table-column
        v-for="ind in performanceIndicators"
        :key="ind.key"
        :label="ind.name"
        :prop="ind.key"
      ></el-table-column>

      <el-table-column
        v-for="ind in taskIndicators"
        :key="ind.key"
        :label="ind.name"
        :prop="ind.key"
      ></el-table-column>

      <el-table-column fixed="right" label="操作" width="80">
        <template #default="{ row }">
          <el-button type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="mt-4 flex justify-center gap-2">
      <el-button type="primary" @click="summary">生成统计</el-button>
      <el-button type="primary" plain :disabled="!totalSummary.length" @click="exportSummaryExcel">导出Excel</el-button>
    </div>

    <el-table v-if="totalSummary.length" :data="totalSummary" border class="mt-4" style="width: 100%">
      <el-table-column fixed prop="nj" label="NJ" width="130" />
      <el-table-column
          v-for="ind in performanceIndicators"
          :key="ind.key"
          :label="ind.name"
          :prop="ind.key"
      ></el-table-column>
      <el-table-column prop="taskLevelText" label="作业完成度" width="120" />
      <el-table-column
          v-for="ind in taskIndicators"
          :key="ind.key"
          :label="ind.name"
          :prop="ind.key"
      ></el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="showDialog" title="新增报备">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="日期" prop="date">
        <el-date-picker v-model="form.date" type="date" placeholder="选择日期" style="width: 100%" />
      </el-form-item>

      <el-form-item label="用户" prop="userKey">
        <el-select v-model="form.userKey" placeholder="选择用户">
          <el-option v-for="u in userStore.users" :key="u.key" :label="u.name" :value="u.key" />
        </el-select>
      </el-form-item>

      <el-form-item label="报备内容" prop="content">
        <el-input type="textarea" v-model="form.content" :rows="4" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="submit">确定</el-button>
    </template>
  </el-dialog>

  <div class="mt-4 flex justify-center gap-2">
    <el-button @click="prev">上一步</el-button>
  </div>
</template>

<script setup>
import { defineEmits, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useUserStore } from '@/stores/useUserStore'
import { useIndicatorStore } from '@/stores/useIndicStore'

const userStore = useUserStore()
const indicatorStore = useIndicatorStore()
const performanceIndicators = indicatorStore.performanceIndicators
const taskIndicators = indicatorStore.taskIndicators

const rows = ref([])

const showDialog = ref(false)
const formRef = ref(null)
const form = ref({ date: null, userKey: '', content: '' })
const rules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  userKey: [{ required: true, message: '请选择用户', trigger: 'change' }],
  content: [{ required: true, message: '请输入报备内容', trigger: 'blur' }],
}

function openDialog() {
  showDialog.value = true
}

function closeDialog () {
  if (formRef.value && formRef.value.resetFields) formRef.value.resetFields()
  form.value = { date: null, userKey: '', content: '' }
  showDialog.value = false
}

function excelSerialToDate(serial) {
  if (serial == null) return null
  const num = Number(serial)
  if (Number.isNaN(num)) return null
  // Excel 序列号基准：1970-01-01 对应 25569，计算毫秒
  const ms = Math.round((num - 25569) * 86400 * 1000)
  return new Date(ms)
}

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekLabel(d) {
  if (!d) return ''
  const dt = new Date(d)
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return map[dt.getDay()]
}

function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch (e) {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
}

function submit() {
  if (!formRef.value) return
  formRef.value.validate((valid) => {
    if (!valid) return
    const user = userStore.users.find(u => u.key === form.value.userKey)
    if (!user) {
      ElMessage.error('选择的用户无效')
      return
    }
    const parts = String(form.value.content || '').split('\n')
    const realContent = parts.length > 1 ? parts.slice(1).join('\n') : parts[0]
    const resultObj = String(realContent || '').split('，').map(e => {
      const [name, count] = e.split(' ')
      const indicator = indicatorStore.indicators.find(i => i.name === name) || {}
      return {
        type: indicator.type,
        key: indicator.key,
        name,
        count: Number(count) || 0,
      }
    }).reduce((obj, item) => {
      obj[item.key] = item.count; // 核心：key为属性，count为值
      return obj;
    }, {});
    const item = {
      id: genId(),
      date: formatDate(form.value.date),
      week: weekLabel(form.value.date),
      nj: user.name,
      userKey: user.key,
      ...resultObj
    }
    console.log('新增报备项', item)
    rows.value.push(item)
    closeDialog()
  })
}

function removeRow({ id }) {
  const idx = rows.value.findIndex(r => r.id === id)
  if (idx !== -1) rows.value.splice(idx, 1)
}

const fileList = ref([])
function uploadFile(file, fileListArg) {
  fileList.value = fileListArg.slice()
  const f = file && (file.raw || file) // el-upload 可能包装 raw
  if (f && f instanceof File) {
    parseExcelFile(f)
  }
}

async function parseExcelFile (file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const sheetRows = XLSX.utils.sheet_to_json(sheet)
    if (!sheetRows.length) {
      ElMessage.error('未检测到Excel文件Sheet1工作表中存在有效的报备数据，请检查文件内容是否正确')
      return
    }
    console.log('表格内容：', sheetRows)
    const result = sheetRows.map(r => {
      const { date, week, ...rest } = r
      const realDate = excelSerialToDate(date)
      return Object.entries(rest).map(([username, content]) => {
        const user = userStore.users.find(u => u.name === username)
        if (!user) return { unknownUser: username }
        const resultObj = content.split('，').map(e => {
          const [name, count] = e.split(' ')
          const indicator = indicatorStore.indicators.find(i => i.name === name) || {}
          return {
            type: indicator.type,
            key: indicator.key,
            name,
            count: Number(count) || 0,
          }
        }).reduce((obj, item) => {
          obj[item.key] = item.count; // 核心：key为属性，count为值
          return obj;
        }, {});
        return {
          id: genId(),
          date: formatDate(realDate),
          week,
          nj: user.name,
          userKey: user.key,
          ...resultObj
        }
      })
    }).flat()
    console.log('解析明细结果：', result)
    rows.value = result.filter(r => !r.unknownUser)
    const unknownUsers = result.filter(r => r.unknownUser).map(r => r.unknownUser)
    if (unknownUsers.length) {
      const unknownUsersStr = [...new Set(unknownUsers)].join(', ')
      ElMessage.warning(`导入完成，跳过未知用户的报备数据：${unknownUsersStr}，若需添加请先在db文件中创建对应NJ，并重新完成数据初始化步骤`)
    }
  } catch (err) {
    console.error('导入Excel失败', err)
    ElMessage.error('导入Excel失败，请检查文件格式及内容是否正确')
  }
}

async function exportDetailsExcel() {
  if (!rows.value || rows.value.length === 0) {
    ElMessage.warning('暂无明细数据可导出')
    return
  }
  try {
    const XLSX = await import('xlsx')
    const header = [
      '日期',
      '周',
      'NJ',
      ...performanceIndicators.map(i => i.name),
      ...taskIndicators.map(i => i.name)
    ]

    const data = [header]
    for (const item of rows.value) {
      const row = [
        item.date || '',
        item.week || '',
        item.nj || '',
        ...performanceIndicators.map(i => Number(item[i.key]) || 0),
        ...taskIndicators.map(i => Number(item[i.key]) || 0),
      ]
      data.push(row)
    }
    console.log(data)

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = { Sheets: { '明细': ws }, SheetNames: ['明细'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    downloadFile(blob, `明细_${formatDate(new Date())}.xlsx`)
  } catch (err) {
    console.error('导出 Excel 失败', err)
    ElMessage.error('导出 Excel 失败')
  }
}

const totalSummary = ref([])

function summary () {
  const total = userStore.users
    .map(u => {
      const userRows = rows.value.filter(r => r.userKey === u.key)
      return userRows.reduce((acc, row) => {
        for (const ind of indicatorStore.indicators) {
          const key = ind.key
          const count = Number(row[key]) || 0
          if (!acc[key]) acc[key] = 0
          acc[key] += count
        }
        return acc
      }, {
        nj: u.name,
        njKey: u.key
      })
    })
    // 作业完成等级
    .map(item => {
      const taskLevel = indicatorStore.levels
        .filter(l => l.tasks.every(task => {
          const actualCount = Number(item[task.task]) || 0
          return actualCount >= task.count || 0
        }))
        .map(l => l.name)
      return {
        ...item,
        taskLevel,
        taskLevelText: taskLevel.length ? `完成${taskLevel.join(',')}级作业` : ''
      }
    })
  console.log(total)
  totalSummary.value = total
}
async function exportSummaryExcel() {
  if (!totalSummary.value || totalSummary.value.length === 0) {
    ElMessage.warning('暂无统计数据可导出')
    return
  }
  try {
    const XLSX = await import('xlsx')
    const header = [
      'NJ',
      ...performanceIndicators.map(i => i.name),
      '作业完成度',
      ...taskIndicators.map(i => i.name)
    ]

    const data = [header]
    for (const item of totalSummary.value) {
      const row = [
        item.nj || '',
        ...performanceIndicators.map(i => Number(item[i.key]) || 0),
        item.taskLevelText || '',
        ...taskIndicators.map(i => Number(item[i.key]) || 0),
      ]
      data.push(row)
    }
    console.log(data)

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = { Sheets: { '统计': ws }, SheetNames: ['统计'] }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    downloadFile(blob, `统计_${formatDate(new Date())}.xlsx`)
  } catch (err) {
    console.error('导出 Excel 失败', err)
    ElMessage.error('导出 Excel 失败')
  }
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  ElMessage.success('开始下载文件')
}


const emit = defineEmits(['prevStep'])
function prev () {
  ElMessageBox.confirm(
    '确定返回上一步？当前填写的数据将不会被保存。',
    '确认返回',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    emit('prevStep')
  })
}
</script>

<style scoped>
</style>
