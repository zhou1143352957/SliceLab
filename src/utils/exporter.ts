import type { SliceResult } from '@/utils/image'

export interface ExportSliceOptions {
  slices: SliceResult[]
  baseName?: string
}

export interface ExportSliceSummary {
  total: number
  successCount: number
  failedCount: number
  failedIndexes: number[]
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

function triggerH5Download(filePath: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = filePath
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
      success: (res) => resolve(res as UniSaveResultLike),
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
      success: (res) => resolve(res as UniSaveResultLike),
      fail: (error) => reject(error),
    })
  })
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
  const summary: ExportSliceSummary = {
    total: slices.length,
    successCount: 0,
    failedCount: 0,
    failedIndexes: [],
  }

  await ensureMpAlbumPermission()

  for (const slice of slices) {
    const fileName = buildSliceFileName(baseName, slice)

    try {
      // #ifdef H5
      triggerH5Download(slice.tempFilePath, fileName)
      // #endif

      // #ifndef H5
      await saveImageToAlbum(slice.tempFilePath)
      // #endif

      summary.successCount += 1
    } catch {
      summary.failedCount += 1
      summary.failedIndexes.push(slice.index)
    }
  }

  return summary
}
