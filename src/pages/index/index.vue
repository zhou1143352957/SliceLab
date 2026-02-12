<template>
  <view class="page">
    <view class="header">
      <text class="title">SliceLab</text>
      <text class="subtitle">上传图片并读取基础信息（MVP 第 1 步）</text>
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
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { pickSingleImage, type PickedImageInfo } from '@/utils/image-picker'

const isPicking = ref(false)
const errorMessage = ref('')
const imageInfo = ref<PickedImageInfo | null>(null)

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
    uni.showToast({ title: '图片加载成功', icon: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片选择失败，请重试'
    errorMessage.value = message
    uni.showToast({ title: message, icon: 'none', duration: 2200 })
  } finally {
    isPicking.value = false
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
</style>
