<template>

    <el-card class="bg-white">
      <div class="flex flex-col md:flex-row gap-4">
        <el-upload
            id="uploadExcel"
            drag
            :show-file-list="false"
            :auto-upload="false"
            accept=".xls,.xlsx"
            @change="uploadFile"
        >
          <div class="h-40 flex flex-col items-center justify-center w-full text-center">
            <i class="el-icon-upload text-4xl text-indigo-500"></i>
            <p class="mt-2 text-base">点击上传或将 Excel 文件拖拽到此处</p>
            <p class="text-sm text-gray-500 mt-1">支持 .xls / .xlsx</p>
          </div>
        </el-upload>

        <div class="flex-1">
          <el-card shadow="never" class="p-4 h-full">
            <div v-if="importDataSuccess" class="min-h-[120px]">
              <div class="p-2">
                <h3 class="mb-2 text-sm font-medium text-center">NJ档案</h3>
                <el-table :data="njList" style="width: 100%">
                  <el-table-column label="时间" align="center">
                    <template #default="{ row }">
                      {{ (row.startTime ?? '') && (row.endTime ?? '') ? `${row.startTime}-${row.endTime}` : '' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="主播" align="center"/>
                </el-table>
              </div>
              <div class="p-2">
                <h3 class="mb-2 text-sm font-medium text-center">指标汇总</h3>
                <el-table :data="indicatorList" style="width: 100%">
                  <el-table-column prop="level" label="类别">
                    <template #default="{ row }">
                      {{ row.type === IndicatorType.Performance ? '绩效指标' : '' }}
                      {{ row.type === IndicatorType.Task ? '作业指标' : '' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="指标名称" />
                  <el-table-column prop="count" label="指标别名">
                    <template #default="{ row }">{{ row.align.join(',') }}</template>
                  </el-table-column>
                </el-table>
              </div>
              <div class="p-2">
                <h3 class="mb-2 text-sm font-medium text-center">作业等级</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <el-tag
                      v-for="level in levelList"
                      :key="level.name"
                      type="primary"
                  >
                    {{ level.name }}级 : {{ level.score }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div v-else class="flex justify-center text-lg text-gray-700">暂无数据</div>
          </el-card>
        </div>
      </div>
    </el-card>
    <div class="mt-4 flex justify-center gap-2">
      <el-button id="nextBtn" type="primary" @click="next">下一步</el-button>
    </div>

</template>

<script setup>
import { ref, computed, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'
import { useGenerateKey, timeToMinutes, normalizeTimeToHHmm } from '@/utils/index'

const fileList = ref([])
import { useUserStore } from '@/stores/useUserStore'
const userStore = useUserStore()
import { IndicatorType, useIndicatorStore } from '@/stores/useIndicStore.js'
const indicatorStore = useIndicatorStore()

const njList = ref(userStore.users)
const indicatorList = ref(indicatorStore.indicators)
const levelList = ref(indicatorStore.levels)

/**
 * TODO:待优化
 * 校验 NJ 列表中的时间范围是否冲突，存在冲突则弹出提示并返回 true
 */
function checkTimeConflicts(list) {
  const withTime = list.filter(
    (u) => u.startMinutes != null && u.endMinutes != null && u.startMinutes < u.endMinutes
  )
  for (let i = 0; i < withTime.length; i++) {
    const a = withTime[i]
    const aStart = a.startMinutes
    const aEnd = a.endMinutes
    for (let j = i + 1; j < withTime.length; j++) {
      const b = withTime[j]
      const bStart = b.startMinutes
      const bEnd = b.endMinutes
      if (aStart < bEnd && bStart < aEnd) {
        ElMessage.warning(
          `时间范围存在冲突：${a.name}（${a.startTime}-${a.endTime}）与 ${b.name}（${b.startTime}-${b.endTime}）重叠，请检查并修改`
        )
        return true
      }
    }
  }
  return false
}

/** 从单元格字符串解析出 startTime、endTime（规范为 HH.mm）及 startMinutes、endMinutes */
function parseTimeRange(str) {
  if (str == null || String(str).trim() === '') {
    return { startTime: '', endTime: '', startMinutes: undefined, endMinutes: undefined }
  }
  const s = String(str).trim()
  const parts = s.split('-').map(p => p.trim())
  if (parts.length !== 2) {
    return { startTime: '', endTime: '', startMinutes: undefined, endMinutes: undefined }
  }
  const startTime = normalizeTimeToHHmm(parts[0])
  const endTime = normalizeTimeToHHmm(parts[1])
  const startMinutes = startTime ? timeToMinutes(startTime) : undefined
  const endMinutes = endTime ? timeToMinutes(endTime) : undefined
  const valid =
    startMinutes !== undefined && !Number.isNaN(startMinutes) &&
    endMinutes !== undefined && !Number.isNaN(endMinutes)
  return {
    startTime: startTime || '',
    endTime: endTime || '',
    startMinutes: valid ? startMinutes : undefined,
    endMinutes: valid ? endMinutes : undefined
  }
}

async function parseExcelFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    // 解析NJ档案Sheet
    const userSheetName = 'NJ档案'
    if (workbook.SheetNames.includes(userSheetName)) {
      const njSheet = workbook.Sheets[userSheetName]
      const rows = XLSX.utils.sheet_to_json(njSheet)
      const list = []
      const seen = new Set()
      for (const r of rows) {
        const { time = '', username } = r
        if (username === '') continue
        const { startTime, endTime, startMinutes, endMinutes } = parseTimeRange(time || '')
        const dedupeKey = `${username}|${startTime}|${endTime}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        list.push({
          key: useGenerateKey(),
          name: username,
          startTime: startTime || '',
          endTime: endTime || '',
          startMinutes,
          endMinutes
        })
      }
      njList.value = list
    } else {
      ElMessage.error(`Excel 文件中未找到 "${userSheetName}" 工作表，请检查文件内容`)
    }
    // 解析指标Sheet
    const indicatorSheetName = '绩效指标'
    if (workbook.SheetNames.includes(indicatorSheetName)) {
      const indicatorSheet = workbook.Sheets[indicatorSheetName]
      const rows = XLSX.utils.sheet_to_json(indicatorSheet)
      // const unkowns = rows.filter(r => !r.type || !r.name)
      // 指标名称重复校验
      const names = rows.map(row => {
        const { name, align } = row
        const aligns = align ? align.split('，').map(a => a.trim()) : []
        return [`${name}`, ...aligns]
      }).flat()
      // TODO:优化提示，具体到某一个指标
      if ([...new Set(names)].some(n => names.filter(x => x === n).length > 1)) {
        ElMessage.error('绩效指标工作表中存在重复的指标名称，请检查文件内容')
      }
      indicatorList.value = [
        ...rows.filter(r => r.type === '绩效').map(r => ({
          type: IndicatorType.Performance,
          key: useGenerateKey(),
          name: String(r.name).trim(),
          align: r.align ? r.align.split('，').map(a => String(a).trim()) : []
        })),
        ...rows.filter(r => r.type === '作业').map(r => ({
          type: IndicatorType.Task,
          key: useGenerateKey(),
          name: String(r.name).trim(),
          align: r.align ? r.align.split('，').map(a => String(a).trim()) : []
        })),
      ]
    } else {
      ElMessage.error(`Excel 文件中未找到 "${indicatorSheetName}" 工作表，请检查文件内容`)
    }
    const taskLevelSheetName = '作业等级'
    if (workbook.SheetNames.includes(taskLevelSheetName)) {
      const taskLevelSheet = workbook.Sheets[taskLevelSheetName]
      const rows = XLSX.utils.sheet_to_json(taskLevelSheet)
      levelList.value = Object.entries(rows[0] || {}).map(([key, value]) => ({
        name: String(key).trim(),
        score: typeof value === 'number' ? value : (Number(value) || value)
      }))
    } else {
      ElMessage.error(`Excel 文件中未找到 "${taskLevelSheetName}" 工作表，请检查文件内容`)
    }
  } catch (err) {
    console.error('解析 Excel 失败', err)
    ElMessage.error('解析 Excel 失败，请确保文件格式正确')
  }
}

function uploadFile(file, fileListArg) {
  fileList.value = fileListArg.slice()
  const f = file && (file.raw || file) // el-upload 可能包装 raw
  if (f && f instanceof File) {
    parseExcelFile(f)
  }
}

const importDataSuccess = computed(() =>
    njList.value.length > 0 &&
    indicatorList.value.length > 0 &&
    levelList.value.length > 0
)

const emit = defineEmits(['nextStep'])
function next() {
  if (njList.value.length === 0) {
    ElMessage.warning('请先上传并解析包含 NJ 档案的 Excel 文件')
    return
  }
  if (indicatorList.value.length === 0) {
    ElMessage.warning('请先上传并解析包含绩效指标的 Excel 文件')
    return
  }
  if (levelList.value.length === 0) {
    ElMessage.warning('请先上传并解析包含作业等级的 Excel 文件')
    return
  }
  userStore.setUsers(njList.value)
  indicatorStore.setIndicators(indicatorList.value)
  indicatorStore.setLevels(levelList.value)
  emit('nextStep')
}
</script>

<style scoped>

</style>
