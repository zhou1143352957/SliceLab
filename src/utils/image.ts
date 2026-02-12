export interface SliceRect {
  index: number
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

export interface SliceResult {
  index: number
  row: number
  col: number
  width: number
  height: number
  tempFilePath: string
}

export interface SliceImageByCanvasOptions {
  canvasId: string
  imagePath: string
  imageWidth: number
  imageHeight: number
  rows: number
  cols: number
  gap?: number
  fileType?: 'png' | 'jpg'
  quality?: number
  componentInstance?: unknown
}

interface CanvasToTempFilePathResultLike {
  tempFilePath: string
}

interface CanvasContextLike {
  clearRect: (x: number, y: number, width: number, height: number) => void
  drawImage: (
    image: string,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
  draw: (reserve?: boolean, callback?: () => void) => void
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} 必须是大于 0 的整数`)
  }
}

function assertNonNegativeInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} 必须是大于等于 0 的整数`)
  }
}

// 统一校验切片参数，避免页面层重复写校验分支。
export function validateSliceParams(rows: number, cols: number, gap = 0): void {
  assertPositiveInteger(rows, 'rows')
  assertPositiveInteger(cols, 'cols')
  assertNonNegativeInteger(gap, 'gap')
}

// 构建切片矩形，默认按“从上到下、从左到右”顺序输出。
export function buildSliceRects(
  imageWidth: number,
  imageHeight: number,
  rows: number,
  cols: number,
  gap = 0
): SliceRect[] {
  validateSliceParams(rows, cols, gap)
  assertPositiveInteger(imageWidth, 'imageWidth')
  assertPositiveInteger(imageHeight, 'imageHeight')

  const horizontalGapTotal = (cols - 1) * gap
  const verticalGapTotal = (rows - 1) * gap
  const availableWidth = imageWidth - horizontalGapTotal
  const availableHeight = imageHeight - verticalGapTotal

  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new Error('切片参数超过图片尺寸，请减少行列数或 gap 后重试')
  }

  const baseWidth = Math.floor(availableWidth / cols)
  const baseHeight = Math.floor(availableHeight / rows)
  const widthRemainder = availableWidth - baseWidth * cols
  const heightRemainder = availableHeight - baseHeight * rows

  if (baseWidth <= 0 || baseHeight <= 0) {
    throw new Error('切片参数超过图片尺寸，请减少行列数或 gap 后重试')
  }

  const rects: SliceRect[] = []
  let y = 0
  let index = 0

  for (let row = 0; row < rows; row += 1) {
    const currentHeight = row === rows - 1 ? baseHeight + heightRemainder : baseHeight
    let x = 0

    for (let col = 0; col < cols; col += 1) {
      const currentWidth = col === cols - 1 ? baseWidth + widthRemainder : baseWidth
      rects.push({
        index,
        row,
        col,
        x,
        y,
        width: currentWidth,
        height: currentHeight,
      })
      index += 1
      x += currentWidth
      if (col < cols - 1) {
        x += gap
      }
    }

    y += currentHeight
    if (row < rows - 1) {
      y += gap
    }
  }

  return rects
}

function createCanvasContext(canvasId: string, componentInstance?: unknown): CanvasContextLike {
  return uni.createCanvasContext(canvasId, componentInstance as any) as unknown as CanvasContextLike
}

function drawRect(
  context: CanvasContextLike,
  imagePath: string,
  rect: SliceRect
): Promise<void> {
  return new Promise((resolve) => {
    context.clearRect(0, 0, rect.width, rect.height)
    context.drawImage(
      imagePath,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height
    )
    context.draw(false, () => resolve())
  })
}

function exportRectToTempFile(
  canvasId: string,
  rect: SliceRect,
  fileType: 'png' | 'jpg',
  quality: number,
  componentInstance?: unknown
): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath(
      {
        canvasId,
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height,
        destWidth: rect.width,
        destHeight: rect.height,
        fileType,
        quality,
        success: (res) => resolve((res as CanvasToTempFilePathResultLike).tempFilePath),
        fail: (error) => reject(error),
      },
      componentInstance as any
    )
  })
}

// 基于 Canvas 执行切片，返回切片结果路径集合。
export async function sliceImageByCanvas(
  options: SliceImageByCanvasOptions
): Promise<SliceResult[]> {
  const {
    canvasId,
    imagePath,
    imageWidth,
    imageHeight,
    rows,
    cols,
    gap = 0,
    fileType = 'png',
    quality = 1,
    componentInstance,
  } = options

  if (!canvasId) {
    throw new Error('canvasId 不能为空')
  }
  if (!imagePath) {
    throw new Error('imagePath 不能为空')
  }

  const rects = buildSliceRects(imageWidth, imageHeight, rows, cols, gap)
  const context = createCanvasContext(canvasId, componentInstance)
  const results: SliceResult[] = []

  for (const rect of rects) {
    await drawRect(context, imagePath, rect)
    const tempFilePath = await exportRectToTempFile(
      canvasId,
      rect,
      fileType,
      quality,
      componentInstance
    )
    results.push({
      index: rect.index,
      row: rect.row,
      col: rect.col,
      width: rect.width,
      height: rect.height,
      tempFilePath,
    })
  }

  return results
}
