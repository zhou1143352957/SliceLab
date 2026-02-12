<template>
  <view class="page">
    <view class="header">
      <text class="title">SliceLab</text>
      <text class="subtitle">上传图片 -> 输入行列 -> 生成切片预览</text>
    </view>

    <button class="pick-button" type="primary" :loading="isPicking" @click="onPickImage">
      选择图片
    </button>

    <text v-if="errorMessage" class="error-text">{{ errorMessage }}</text>

    <view v-if="imageInfo" class="preview-card">
      <image class="preview-image" :src="imageInfo.tempFilePath" mode="widthFix" />
      <view class="meta-row">
        <text class="meta-label">尺寸</text>
        <text class="meta-value">{{ imageInfo.width }} x {{ imageInfo.height }}</text>
      </view>
      <view class="meta-row" v-if="imageInfo.size !== undefined">
        <text class="meta-label">大小</text>
        <text class="meta-value">{{ formatSize(imageInfo.size) }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">路径</text>
        <text class="meta-value path-value">{{ imageInfo.tempFilePath }}</text>
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
      </view>

      <button class="slice-button" type="primary" :loading="isSlicing" @click="onSliceImage">
        生成切片
      </button>
    </view>

    <view v-if="sliceResults.length" class="slice-list">
      <view class="slice-list-header">
        <text class="slice-list-title">切片预览</text>
        <text class="slice-list-count">共 {{ sliceResults.length }} 张</text>
      </view>
      <view class="slice-grid">
        <view v-for="slice in sliceResults" :key="slice.index" class="slice-item">
          <image class="slice-image" :src="slice.tempFilePath" mode="widthFix" />
          <text class="slice-meta">#{{ slice.index + 1 }} · {{ slice.width }}x{{ slice.height }}</text>
        </view>
      </view>
    </view>

    <canvas
      v-if="imageInfo"
      class="work-canvas"
      canvas-id="slice-work-canvas"
      :style="{ width: `${imageInfo.width}px`, height: `${imageInfo.height}px` }"
    />
  </view>
</template>

<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'

import { pickSingleImage, type PickedImageInfo } from '@/utils/image-picker'
import {
  sliceImageByCanvas,
  validateSliceParams,
  type SliceResult,
} from '@/utils/image'

const isPicking = ref(false)
const isSlicing = ref(false)
const errorMessage = ref('')
const imageInfo = ref<PickedImageInfo | null>(null)
const rowsInput = ref('2')
const colsInput = ref('2')
const sliceResults = ref<SliceResult[]>([])
const componentInstance = getCurrentInstance()?.proxy

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 选择单张图片并读取基础信息，供后续切片参数与预览使用。
async function onPickImage() {
  if (isPicking.value) return

  isPicking.value = true
  errorMessage.value = ''

  try {
    const result = await pickSingleImage()
    imageInfo.value = result
    sliceResults.value = []
    uni.showToast({ title: '图片加载成功', icon: 'success' })
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
  if (!imageInfo.value || isSlicing.value) return

  const rows = Number.parseInt(rowsInput.value, 10)
  const cols = Number.parseInt(colsInput.value, 10)

  try {
    validateSliceParams(rows, cols)
  } catch (error) {
    const message = error instanceof Error ? error.message : '切片参数不合法'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2000 })
    return
  }

  isSlicing.value = true
  errorMessage.value = ''

  try {
    const result = await sliceImageByCanvas({
      canvasId: 'slice-work-canvas',
      imagePath: imageInfo.value.tempFilePath,
      imageWidth: imageInfo.value.width,
      imageHeight: imageInfo.value.height,
      rows,
      cols,
      fileType: 'png',
      quality: 1,
      componentInstance,
    })
    sliceResults.value = result
    uni.showToast({ title: `切片完成（${result.length}张）`, icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '切片失败，请重试'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } finally {
    isSlicing.value = false
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

.slice-list-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.slice-list-count {
  font-size: 24rpx;
  color: #6b7280;
}

.slice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
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
