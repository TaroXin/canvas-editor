import { loadImage } from '.'

export interface IPdfPage {
  // JPEG 图片数据
  data: Uint8Array
  // 图片像素尺寸
  width: number
  height: number
  // 页面尺寸（pt）
  pageWidth: number
  pageHeight: number
}

interface ICreatePdfOption {
  pixelRatio: number
  quality: number
}

// 1pt = 1/72英寸，页面像素按 96dpi 换算
const PX_TO_PT = 72 / 96

function formatNumber(num: number): string {
  return Number(num.toFixed(2)).toString()
}

// 生成以 JPEG 为页面内容的 PDF 文件
export function buildPdf(pageList: IPdfPage[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const chunkList: Uint8Array[] = []
  const offsetList: number[] = []
  let length = 0
  const write = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    chunkList.push(bytes)
    length += bytes.length
  }
  const writeObject = (id: number, body: string, stream?: Uint8Array) => {
    offsetList[id] = length
    write(`${id} 0 obj\n${body}\n`)
    if (stream) {
      write('stream\n')
      write(stream)
      write('\nendstream\n')
    }
    write('endobj\n')
  }
  write('%PDF-1.4\n')
  // 每页占用三个对象：页面、内容流、图片
  const getPageId = (index: number) => 3 + index * 3
  const kids = pageList.map((_, index) => `${getPageId(index)} 0 R`).join(' ')
  writeObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
  writeObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageList.length} >>`)
  pageList.forEach((page, index) => {
    const pageId = getPageId(index)
    const contentId = pageId + 1
    const imageId = pageId + 2
    const pageWidth = formatNumber(page.pageWidth)
    const pageHeight = formatNumber(page.pageHeight)
    writeObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    )
    // 图片铺满页面
    const content = encoder.encode(
      `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`
    )
    writeObject(contentId, `<< /Length ${content.length} >>`, content)
    writeObject(
      imageId,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>`,
      page.data
    )
  })
  // 交叉引用表
  const objectCount = 2 + pageList.length * 3
  const xrefOffset = length
  write(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`)
  for (let id = 1; id <= objectCount; id++) {
    write(`${String(offsetList[id]).padStart(10, '0')} 00000 n \n`)
  }
  write(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  )
  // 合并
  const pdf = new Uint8Array(length)
  let offset = 0
  chunkList.forEach(chunk => {
    pdf.set(chunk, offset)
    offset += chunk.length
  })
  return pdf
}

function convertDataURLToBytes(dataURL: string): Uint8Array {
  const binary = atob(dataURL.split(',')[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// 页面图片转换为 PDF
export async function createPdf(
  dataURLList: string[],
  options: ICreatePdfOption
): Promise<Blob> {
  const { pixelRatio, quality } = options
  const pageList: IPdfPage[] = []
  for (const dataURL of dataURLList) {
    const image = await loadImage(dataURL)
    const { width, height } = image
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    // JPEG 不支持透明，先铺白底
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0)
    pageList.push({
      data: convertDataURLToBytes(canvas.toDataURL('image/jpeg', quality)),
      width,
      height,
      pageWidth: (width / pixelRatio) * PX_TO_PT,
      pageHeight: (height / pixelRatio) * PX_TO_PT
    })
  }
  return new Blob([buildPdf(pageList)], { type: 'application/pdf' })
}
