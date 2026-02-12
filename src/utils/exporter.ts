import type { SliceResult } from '@/utils/image'
import { createZipBlob, type ZipEntry } from '@/utils/zip'

export interface ExportSliceOptions {
  slices: SliceResult[]
  baseName?: string
}

export interface ExportSliceSummary {
  total: number
  successCount: number
  failedCount: number
  failedIndexes: number[]
  permissionDeniedCount: number
  saveFailedCount: number
  permissionDenied: boolean
  firstErrorMessage: string
}

interface UniSaveResultLike {
  authSetting?: Record<string, boolean>
}

function sanitizeBaseName(baseName?: string): string {
  const value = (baseName ?? 'slice').trim()
  return value.length ? value : 'slice'
}

function buildSliceFileName(baseName: string, slice: SliceResult): string {
  return `${baseName}-r${slice.row + 1}-c${slice.col + 1}-${slice.index + 1}.png`
}

function buildZipFileName(baseName: string): string {
  return `${baseName}-all.zip`
}

function triggerH5Download(filePath: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = filePath
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function triggerH5BlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  try {
    triggerH5Download(objectUrl, fileName)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}

function createEmptySummary(total: number): ExportSliceSummary {
  return {
    total,
    successCount: 0,
    failedCount: 0,
    failedIndexes: [],
    permissionDeniedCount: 0,
    saveFailedCount: 0,
    permissionDenied: false,
    firstErrorMessage: '',
  }
}

function saveImageToAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (error) => reject(error),
    })
  })
}

function callUniGetSetting(): Promise<UniSaveResultLike> {
  return new Promise((resolve, reject) => {
    uni.getSetting({
      success: (res) => resolve(res as unknown as UniSaveResultLike),
      fail: (error) => reject(error),
    })
  })
}

function callUniAuthorize(scope: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.authorize({
      scope,
      success: () => resolve(),
      fail: (error) => reject(error),
    })
  })
}

function callUniOpenSetting(): Promise<UniSaveResultLike> {
  return new Promise((resolve, reject) => {
    uni.openSetting({
      success: (res) => resolve(res as unknown as UniSaveResultLike),
      fail: (error) => reject(error),
    })
  })
}

function callUniShowModal(
  title: string,
  content: string
): Promise<{ confirm: boolean; cancel: boolean }> {
  return new Promise((resolve, reject) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(res),
      fail: (error) => reject(error),
    })
  })
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  const maybeMsg = (error as { errMsg?: string } | null)?.errMsg
  if (typeof maybeMsg === 'string' && maybeMsg.length) return maybeMsg

  return 'unknown-error'
}

function isPermissionDeniedError(errorMessage: string): boolean {
  const value = errorMessage.toLowerCase()
  return (
    value.includes('auth deny') ||
    value.includes('permission denied') ||
    value.includes('authorize') ||
    value.includes('denied') ||
    value.includes('无权限') ||
    value.includes('权限')
  )
}

function markSliceFailed(summary: ExportSliceSummary, index: number): void {
  summary.failedCount += 1
  summary.failedIndexes.push(index)
}

async function readH5FileBytes(filePath: string): Promise<Uint8Array> {
  const response = await fetch(filePath)
  if (!response.ok) {
    throw new Error(`切片读取失败：${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

// H5 端导出为 Zip，规避浏览器对多文件自动下载的限制。
async function exportSlicesForH5(
  slices: SliceResult[],
  baseName: string
): Promise<ExportSliceSummary> {
  const summary = createEmptySummary(slices.length)
  const zipEntries: ZipEntry[] = []

  for (const slice of slices) {
    const fileName = buildSliceFileName(baseName, slice)
    try {
      const bytes = await readH5FileBytes(slice.tempFilePath)
      zipEntries.push({
        fileName,
        data: bytes,
      })
      summary.successCount += 1
    } catch (error) {
      const errorMessage = normalizeErrorMessage(error)
      if (!summary.firstErrorMessage) {
        summary.firstErrorMessage = errorMessage
      }
      summary.saveFailedCount += 1
      markSliceFailed(summary, slice.index)
    }
  }

  if (!zipEntries.length) {
    throw new Error(summary.firstErrorMessage || '无可导出的切片文件')
  }

  const zipBlob = createZipBlob(zipEntries)
  triggerH5BlobDownload(zipBlob, buildZipFileName(baseName))
  return summary
}

function markRemainingAsFailed(
  summary: ExportSliceSummary,
  slices: SliceResult[],
  fromPosition: number
): void {
  for (let i = fromPosition; i < slices.length; i += 1) {
    markSliceFailed(summary, slices[i].index)
  }
}

// App 端导出失败后统一提示用户到系统设置开启权限。
async function promptAppPermissionGuide(): Promise<void> {
  // #ifdef APP-PLUS
  await callUniShowModal(
    '需要相册权限',
    '请在系统设置中为当前应用开启相册权限后重试导出。'
  )
  // #endif
}

// 微信小程序导出前确保有相册写入权限。
async function ensureMpAlbumPermission(): Promise<void> {
  // #ifdef MP-WEIXIN
  const setting = await callUniGetSetting()
  const granted = setting.authSetting?.['scope.writePhotosAlbum']

  if (granted === true) return

  try {
    await callUniAuthorize('scope.writePhotosAlbum')
    return
  } catch {
    const openSettingResult = await callUniOpenSetting()
    if (openSettingResult.authSetting?.['scope.writePhotosAlbum'] !== true) {
      throw new Error('请先授予相册权限后再导出')
    }
  }
  // #endif
}

// 统一导出入口：H5 触发下载，非 H5 保存到相册。
export async function exportSliceResults(
  options: ExportSliceOptions
): Promise<ExportSliceSummary> {
  const slices = options.slices
  if (!slices.length) {
    throw new Error('暂无可导出的切片')
  }

  const baseName = sanitizeBaseName(options.baseName)
  // #ifdef H5
  return exportSlicesForH5(slices, baseName)
  // #endif

  const summary = createEmptySummary(slices.length)

  await ensureMpAlbumPermission()

  for (let i = 0; i < slices.length; i += 1) {
    const slice = slices[i]

    try {
      // #ifndef H5
      await saveImageToAlbum(slice.tempFilePath)
      // #endif

      summary.successCount += 1
    } catch (error) {
      const errorMessage = normalizeErrorMessage(error)
      if (!summary.firstErrorMessage) {
        summary.firstErrorMessage = errorMessage
      }

      if (isPermissionDeniedError(errorMessage)) {
        summary.permissionDenied = true
        summary.permissionDeniedCount += 1
        markSliceFailed(summary, slice.index)
        markRemainingAsFailed(summary, slices, i + 1)
        await promptAppPermissionGuide()
        break
      }

      summary.saveFailedCount += 1
      markSliceFailed(summary, slice.index)
    }
  }

  return summary
}
