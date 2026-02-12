<template>
  <view class="page">
    <view class="header">
      <text class="title">SliceLab</text>
      <text class="subtitle">上传图片 -> 输入行列间距 -> 生成切片预览</text>
    </view>

    <!-- @vue-ignore -->
    <button class="pick-button" type="primary" :loading="isPicking" @click="onPickImage">
      选择图片（可多选）
    </button>

    <text v-if="errorMessage" class="error-text">{{ errorMessage }}</text>

    <view v-if="coverImage" class="preview-card">
      <image class="preview-image" :src="coverImage.tempFilePath" mode="widthFix" />
      <view class="meta-row">
        <text class="meta-label">已选</text>
        <text class="meta-value">{{ pickedImages.length }} 张</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">尺寸</text>
        <text class="meta-value">{{ coverImage.width }} x {{ coverImage.height }}</text>
      </view>
      <view class="meta-row" v-if="coverImage.size !== undefined">
        <text class="meta-label">大小</text>
        <text class="meta-value">{{ formatSize(coverImage.size) }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">首图路径</text>
        <text class="meta-value path-value">{{ coverImage.tempFilePath }}</text>
      </view>

      <view class="controls">
        <view class="control-item">
          <text class="control-label">行数</text>
          <input v-model="rowsInput" type="number" class="control-input" />
        </view>
        <view class="control-item">
          <text class="control-label">列数</text>
          <input v-model="colsInput" type="number" class="control-input" />
        </view>
        <view class="control-item">
          <text class="control-label">间距</text>
          <input v-model="gapInput" type="number" class="control-input" />
        </view>
      </view>

      <!-- @vue-ignore -->
      <button class="slice-button" type="primary" :loading="isSlicing" @click="onSliceImage">
        生成切片
      </button>
    </view>

    <view v-if="sliceGroups.length" class="slice-list">
      <view class="slice-list-header">
        <text class="slice-list-title">切片预览</text>
        <view class="slice-actions">
          <text class="slice-list-count">共 {{ totalSliceCount }} 张（{{ sliceGroups.length }} 图）</text>
          <!-- @vue-ignore -->
          <button
            class="export-button"
            size="mini"
            type="primary"
            :loading="isExporting"
            @click="onExportSlices"
          >
            导出全部
          </button>
        </view>
      </view>
      <view v-for="group in sliceGroups" :key="group.imageIndex" class="slice-group">
        <text class="slice-group-title">图片 #{{ group.imageIndex + 1 }} · {{ group.slices.length }} 张</text>
        <view class="slice-grid">
          <view v-for="slice in group.slices" :key="`${group.imageIndex}-${slice.index}`" class="slice-item">
            <image class="slice-image" :src="slice.tempFilePath" mode="widthFix" />
            <text class="slice-meta">#{{ slice.index + 1 }} · {{ slice.width }}x{{ slice.height }}</text>
          </view>
        </view>
      </view>
    </view>

    <canvas
      v-if="canvasSize"
      class="work-canvas"
      canvas-id="slice-work-canvas"
      :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'

import { pickImages, type PickedImageInfo } from '@/utils/image-picker'
import {
  sliceImageByCanvas,
  validateSliceParams,
  type SliceResult,
} from '@/utils/image'
import { exportSliceResults } from '@/utils/exporter'

const isPicking = ref(false)
const isSlicing = ref(false)
const isExporting = ref(false)
const errorMessage = ref('')
const pickedImages = ref<PickedImageInfo[]>([])
const rowsInput = ref('2')
const colsInput = ref('2')
const gapInput = ref('0')
const sliceGroups = ref<SliceGroup[]>([])
const componentInstance = getCurrentInstance()?.proxy

interface SliceGroup {
  imageIndex: number
  slices: SliceResult[]
}

const coverImage = computed(() => pickedImages.value[0] ?? null)

const canvasSize = computed(() => {
  if (!pickedImages.value.length) return null
  let width = 0
  let height = 0
  for (const image of pickedImages.value) {
    if (image.width > width) width = image.width
    if (image.height > height) height = image.height
  }
  return { width, height }
})

const totalSliceCount = computed(() =>
  sliceGroups.value.reduce((total, group) => total + group.slices.length, 0)
)

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function buildBatchEntryName(imageIndex: number, slice: SliceResult): string {
  return `image-${imageIndex + 1}/slice-r${slice.row + 1}-c${slice.col + 1}-${slice.index + 1}.png`
}

// 选择多张图片并读取基础信息，供后续批量切片与预览使用。
async function onPickImage() {
  if (isPicking.value) return

  isPicking.value = true
  errorMessage.value = ''

  try {
    const result = await pickImages(9)
    pickedImages.value = result
    sliceGroups.value = []
    uni.showToast({ title: `已选择 ${result.length} 张`, icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片选择失败，请重试'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } finally {
    isPicking.value = false
  }
}

// 执行切片并返回预览结果，页面只负责展示结果。
async function onSliceImage() {
  if (!pickedImages.value.length || isSlicing.value) return

  const rows = Number.parseInt(rowsInput.value, 10)
  const cols = Number.parseInt(colsInput.value, 10)
  const gap = Number.parseInt(gapInput.value, 10)

  try {
    validateSliceParams(rows, cols, gap)
  } catch (error) {
    const message = error instanceof Error ? error.message : '切片参数不合法'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2000 })
    return
  }

  isSlicing.value = true
  errorMessage.value = ''
  sliceGroups.value = []

  try {
    const groups: SliceGroup[] = []
    for (let i = 0; i < pickedImages.value.length; i += 1) {
      const image = pickedImages.value[i]
      const slices = await sliceImageByCanvas({
        canvasId: 'slice-work-canvas',
        imagePath: image.tempFilePath,
        imageWidth: image.width,
        imageHeight: image.height,
        rows,
        cols,
        gap,
        fileType: 'png',
        quality: 1,
        componentInstance,
      })
      groups.push({ imageIndex: i, slices })
    }

    sliceGroups.value = groups
    const totalCount = groups.reduce((total, group) => total + group.slices.length, 0)
    uni.showToast({ title: `切片完成（${groups.length}图 ${totalCount}张）`, icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '切片失败，请重试'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } finally {
    isSlicing.value = false
  }
}

// 导出切片：H5 导出 zip 下载，微信和 App 走保存到相册。
async function onExportSlices() {
  if (!sliceGroups.value.length || isExporting.value) return

  isExporting.value = true
  errorMessage.value = ''

  try {
    const exportItems = sliceGroups.value.flatMap((group) =>
      group.slices.map((slice) => ({ imageIndex: group.imageIndex, slice }))
    )
    const summary = await exportSliceResults({
      slices: exportItems.map((item) => item.slice),
      baseName: 'slice',
      fileNameBuilder: (slice, position) =>
        buildBatchEntryName(exportItems[position]?.imageIndex ?? 0, slice),
    })

    if (summary.permissionDenied) {
      const message = '导出失败：缺少相册权限，请授权后重试'
      errorMessage.value = message
      uni.showToast({ title: message, icon: 'none', duration: 2600 })
      return
    }

    if (summary.failedCount === 0) {
      uni.showToast({ title: `导出成功（${summary.successCount}张）`, icon: 'success' })
      return
    }

    const message = `导出完成：成功 ${summary.successCount}，保存失败 ${summary.saveFailedCount}`
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出失败，请重试'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 40rpx 28rpx 56rpx;
  background: #f5f7fb;
  box-sizing: border-box;
}

.header {
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  color: #20242d;
  font-weight: 600;
}

.subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.pick-button {
  margin: 0;
}

.error-text {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #d93025;
}

.preview-card {
  margin-top: 24rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
}

.meta-row {
  margin-top: 14rpx;
}

.meta-label {
  display: inline-block;
  min-width: 90rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.meta-value {
  font-size: 24rpx;
  color: #1f2937;
}

.path-value {
  word-break: break-all;
}

.controls {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.control-item {
  flex: 1;
}

.control-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.control-input {
  height: 72rpx;
  padding: 0 18rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #1f2937;
  background: #fff;
}

.slice-button {
  margin-top: 20rpx;
}

.slice-list {
  margin-top: 24rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.slice-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.slice-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.slice-list-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.slice-list-count {
  font-size: 24rpx;
  color: #6b7280;
}

.export-button {
  margin: 0;
}

.slice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.slice-group + .slice-group {
  margin-top: 20rpx;
}

.slice-group-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.slice-item {
  width: calc((100% - 12rpx) / 2);
}

.slice-image {
  width: 100%;
  border-radius: 10rpx;
  background: #f3f4f6;
}

.slice-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #6b7280;
}

.work-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}
</style>
