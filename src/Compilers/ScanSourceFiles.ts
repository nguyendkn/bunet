import fs from 'fs'
import path from 'path'

export function ScanSourceFiles(rootPath: string, ext: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true }) // Sử dụng với tùy chọn để giảm lệnh kiểm tra loại file

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name)

    if (entry.isDirectory()) {
      // Đệ quy xử lý thư mục con
      ScanSourceFiles(fullPath, ext, files)
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      // Chỉ thêm file nếu đúng đuôi mở rộng
      files.push(fullPath)
    }
  }

  return files
}
