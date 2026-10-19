import type { IEditorData, IEditorOption } from './Editor'

export interface IPrintOption {
  offscreen?: boolean
  data?: IEditorData
  options?: IEditorOption
}

export interface IGetPdfOption {
  // 图片像素比，默认取 printPixelRatio
  pixelRatio?: number
  // JPEG 压缩质量（0-1），默认：0.92
  quality?: number
}
