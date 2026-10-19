import { describe, it, expect } from 'vitest'
import { buildPdf, IPdfPage } from '@/editor/utils/pdf'

function createPage(pageWidth: number, pageHeight: number): IPdfPage {
  return {
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    width: 10,
    height: 20,
    pageWidth,
    pageHeight
  }
}

function decode(pdf: Uint8Array): string {
  return new TextDecoder('latin1').decode(pdf)
}

describe('buildPdf', () => {
  const pdf = decode(
    buildPdf([createPage(595.5, 842.25), createPage(842.25, 595.5)])
  )

  it('文件头与结尾', () => {
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true)
    expect(pdf.endsWith('%%EOF\n')).toBe(true)
  })

  it('页面数量与尺寸', () => {
    expect(pdf).toContain('/Kids [3 0 R 6 0 R] /Count 2')
    expect(pdf).toContain('/MediaBox [0 0 595.5 842.25]')
    expect(pdf).toContain('/MediaBox [0 0 842.25 595.5]')
  })

  it('图片以 JPEG 嵌入', () => {
    expect(pdf).toContain(
      '/Width 10 /Height 20 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 4'
    )
  })

  it('交叉引用表偏移指向对应对象', () => {
    const startXref = Number(/startxref\n(\d+)/.exec(pdf)![1])
    expect(pdf.slice(startXref, startXref + 4)).toBe('xref')
    const offsetList = [
      ...pdf.slice(startXref).matchAll(/(\d{10}) 00000 n/g)
    ].map(match => Number(match[1]))
    // 目录、页面树 + 每页三个对象
    expect(offsetList).toHaveLength(8)
    offsetList.forEach((offset, index) => {
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true)
    })
  })
})
