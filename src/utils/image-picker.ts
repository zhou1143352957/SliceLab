export interface PickedImageInfo {
  tempFilePath: string
  width: number
  height: number
  size?: number
  type?: string
}

interface ChooseImageFileLike {
  path?: string
  size?: number
  type?: string
}

interface ChooseImageResultLike {
  tempFilePaths?: string[]
  tempFiles?: ChooseImageFileLike[]
}

interface ImageInfoResultLike {
  width: number
  height: number
}

// 将 uni 的失败对象转为可读文案，统一页面提示逻辑。
function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (error && typeof error === 'object' && 'errMsg' in error) {
    const errMsg = (error as { errMsg?: unknown }).errMsg
    if (typeof errMsg === 'string' && errMsg.trim()) {
      if (errMsg.includes('cancel')) {
        return '已取消选择图片'
      }
      return errMsg
    }
  }
  return fallback
}

// 选择单张图片，作为切片流程输入。
function chooseSingleImage(): Promise<ChooseImageResultLike> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => resolve(res as ChooseImageResultLike),
      fail: (error) => reject(new Error(toErrorMessage(error, '图片选择失败，请重试'))),
    })
  })
}

// 读取图片尺寸，后续用于切片参数校验。
function readImageInfo(src: string): Promise<ImageInfoResultLike> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: (res) => resolve(res as ImageInfoResultLike),
      fail: (error) => reject(new Error(toErrorMessage(error, '图片信息读取失败，请重试'))),
    })
  })
}

export async function pickSingleImage(): Promise<PickedImageInfo> {
  const selected = await chooseSingleImage()
  const tempFilePath = selected.tempFilePaths?.[0]

  if (!tempFilePath) {
    throw new Error('未获取到图片路径，请重试')
  }

  const info = await readImageInfo(tempFilePath)
  const fileMeta = selected.tempFiles?.[0]

  return {
    tempFilePath,
    width: info.width,
    height: info.height,
    size: fileMeta?.size,
    type: fileMeta?.type,
  }
}
