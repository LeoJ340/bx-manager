<template>

    <el-card class="bg-white">
      <div class="flex flex-col md:flex-row gap-4">
        <el-space>
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
        </el-space>

        <div class="flex-1">
          <el-card shadow="never" class="p-4 h-full">
            <div v-if="importDataSuccess" class="min-h-[120px]">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-2">
                  <h4 class="mb-2 text-sm font-medium text-center">NJ</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <el-tag
                        v-for="u in userStore.users"
                        :key="u.key"
                        type="primary"
                        @close="removeUser(u.key)"
                    >
                      {{ u.name }}
                    </el-tag>
                  </div>
                </div>

                <div class="p-2">
                  <h4 class="mb-2 text-sm font-medium text-center">绩效指标</h4>
                  <div class="flex flex-wrap gap-2">
                    <el-tag
                        v-for="u in indicatorStore.performanceIndicators"
                        :key="u.key"
                        type="primary"
                    >
                      {{ u.name }}
                    </el-tag>
                  </div>
                  <h4 class="mt-2 mb-2 text-sm font-medium text-center">作业指标</h4>
                  <div class="flex flex-wrap gap-2">
                    <el-tag
                        v-for="u in indicatorStore.taskIndicators"
                        :key="u.key"
                        type="primary"
                    >
                      {{ u.name }}
                    </el-tag>
                  </div>
                </div>

                <div class="p-2">
                  <h4 class="mb-2 text-sm font-medium text-center">作业等级</h4>
                  <div class="flex flex-col gap-2">
                    <el-tag
                        v-for="level in indicatorStore.levels"
                        :key="level.name"
                        type="primary"
                    >
                      {{ level.name }}级 : {{ level.score }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="flex justify-center text-lg text-gray-700">暂无数据</div>
          </el-card>
        </div>
      </div>
    </el-card>
    <div class="mt-4 flex justify-center gap-2">
      <el-space>
        <el-button id="nextBtn" type="primary" @click="next">下一步</el-button>
      </el-space>
    </div>

  <el-tour v-model="tour">
    <el-tour-step
        target="#uploadExcel"
        title="上传 Excel 表格"
        description="点击这里上传我给你的Excel表格."
    />
    <el-tour-step
        target="#nextBtn"
        title="下一步"
        description="上传文件、数据显示后，点击这里进入下一步."
    />
  </el-tour>

</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'

const tour = ref(false)

const fileList = ref([])
import { useUserStore } from '@/stores/useUserStore'
const userStore = useUserStore()
import { IndicatorType, useIndicatorStore } from '@/stores/useIndicStore.js'
const indicatorStore = useIndicatorStore()

async function parseExcelFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const userSheetName = 'NJ档案'
    if (workbook.SheetNames.includes(userSheetName)) {
      const njSheet = workbook.Sheets[userSheetName]
      const rows = XLSX.utils.sheet_to_json(njSheet, { header: 1 })
      const names = rows.map(r => (r && r[0] != null) ? String(r[0]).trim() : '').filter(v => v !== '')
      userStore.setUsersFromNames(names)
    } else {
      ElMessage.error(`Excel 文件中未找到 "${userSheetName}" 工作表，请检查文件内容`)
    }
    const indicatorSheetName = '绩效指标'
    if (workbook.SheetNames.includes(indicatorSheetName)) {
      const indicatorSheet = workbook.Sheets[indicatorSheetName]
      const rows = XLSX.utils.sheet_to_json(indicatorSheet, { header: 1 })
      indicatorStore.setIndicators([
        ...rows
        .map(r => (r && r[0] != null) ? String(r[0]).trim() : '').filter(v => v !== '')
        .map(e => ({ type: IndicatorType.Performance, key: crypto.randomUUID(), name: e })),
        ...rows
        .map(r => (r && r[1] != null) ? String(r[1]).trim() : '').filter(v => v !== '')
        .map(e => ({ type: IndicatorType.Task, key: crypto.randomUUID(), name: e }))
      ])
    } else {
      ElMessage.error(`Excel 文件中未找到 "${indicatorSheetName}" 工作表，请检查文件内容`)
    }
    const taskLevelSheetName = '作业等级'
    if (workbook.SheetNames.includes(taskLevelSheetName)) {
      const taskLevelSheet = workbook.Sheets[taskLevelSheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(taskLevelSheet)
      const levels = Object.entries(rows[0] || {}).map(([key, value]) => ({
        name: String(key).trim(),
        score: typeof value === 'number' ? value : (Number(value) || value)
      }))
      indicatorStore.setLevels(levels)
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
  userStore.users.length > 0 &&
  indicatorStore.indicators.length > 0 &&
  indicatorStore.levels.length > 0
)
function removeUser(key) {
  userStore.removeUserByKey(key)
}

const emit = defineEmits(['nextStep'])
function next() {
  if (userStore.users.length === 0) {
    ElMessage.warning('请先上传并解析包含 NJ 档案的 Excel 文件')
    return
  }
  if (indicatorStore.indicators.length === 0) {
    ElMessage.warning('请先上传并解析包含绩效指标的 Excel 文件')
    return
  }
  if (indicatorStore.levels.length === 0) {
    ElMessage.warning('请先上传并解析包含作业等级的 Excel 文件')
    return
  }
  emit('nextStep')
}
</script>

<style scoped>

</style>
