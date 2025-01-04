import { Project, SyntaxKind } from 'ts-morph'
import { ScanSourceFiles } from './ScanSourceFiles'
import type { SourceFile } from '../Types/SourceFile'
import { PatchControllers } from './PatchRegistry'
import { Registry } from '../Builder/Registries'
import { ApiController } from '../Decorators/HttpRoutes'
import { ControllerBase } from '../Controllers/ControllerBase'

// Tập hợp lưu trữ các file đã được quét để tránh xử lý lặp lại
const scanned = new Set<string>()

/**
 * Quét các file TypeScript để tìm các class kế thừa từ ControllerBase
 * @param rootPath - Đường dẫn gốc của dự án
 * @param extention - Phần mở rộng của file cần quét (ví dụ: .ts)
 * @param files - Danh sách file cần quét (mặc định là mảng rỗng)
 * @returns Danh sách các source file được phân tích
 */
export function ScanImplements(rootPath: string, extention: string, files: string[] = []) {
  // Lấy danh sách file TypeScript từ thư mục gốc
  const sourceFiles = ScanSourceFiles(rootPath, extention, files)

  // Khởi tạo một dự án mới bằng ts-morph
  const project = new Project()

  // Thêm tất cả các file vào project để phân tích cú pháp
  sourceFiles.forEach((sourceFile) => project.addSourceFileAtPath(sourceFile))

  // Mảng lưu trữ thông tin các file đã được phân tích
  const projectSourceFiles: SourceFile[] = []

  // Duyệt qua tất cả các file trong project
  project.getSourceFiles().forEach((sourceFile) => {
    // Lấy danh sách các class trong file hiện tại
    sourceFile.getClasses().forEach((classDeclaration) => {
      // Kiểm tra nếu class có decorator @ApiController
      const hasApiControllerDecorator = classDeclaration.getDecorators().some((decorator) => {
        const decoratorName = decorator.getName()
        return decoratorName === ApiController.name
      })

      // Nếu không có @ApiController thì bỏ qua class này
      if (!hasApiControllerDecorator) {
        return
      }

      // Lấy các "heritage clause" (extends, implements) của class
      const heritageClauses = classDeclaration.getHeritageClauses()

      heritageClauses.forEach((clause) => {
        // Kiểm tra nếu class kế thừa (extends) từ một class khác
        if (clause.getToken() === SyntaxKind.ExtendsKeyword) {
          const types = clause.getTypeNodes()

          // Kiểm tra nếu class kế thừa từ "ControllerBase"
          types.forEach((type) => {
            if (type.getText() === ControllerBase.name) {
              const path = sourceFile.getFilePath()

              // Kiểm tra nếu file đã được xử lý
              if (!scanned.has(path)) {
                // Đánh dấu file đã được quét
                scanned.add(path)

                // Thêm file vào danh sách kết quả với thông tin chi tiết
                projectSourceFiles.push({
                  path, // Đường dẫn của file
                  content: sourceFile.getFullText(), // Nội dung đầy đủ của file
                  type: 'Controller', // Loại file (Controller)
                  dependencies: [] // Danh sách dependencies (có thể cập nhật thêm sau)
                })

                // Áp dụng các thay đổi lên controller (nếu cần)
                PatchControllers(sourceFile, classDeclaration)
              }
            }
          })
        }
      })
    })
  })

  // Trả về danh sách các source file đã phân tích
  return {
    SourceFiles: projectSourceFiles,
    Controllers: Registry.Controllers
  }
}
