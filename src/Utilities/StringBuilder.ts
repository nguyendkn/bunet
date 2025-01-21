export class StringBuilder {
  private chunks: string[] = [] // Mảng lưu các phần của chuỗi
  private length: number = 0 // Độ dài của chuỗi

  // Phương thức Append, thêm chuỗi vào cuối
  Append(template: string, ...args: any[]): this {
    this.chunks.push(template.Format(args)) // Thêm vào mảng
    this.length += template.length // Cập nhật độ dài
    return this
  }

  // Phương thức AppendLine, thêm chuỗi vào cuối và kèm theo dấu newline
  AppendLine(template: string = '', ...args: any[]): this {
    return this.Append(template.Format(args) + '\n')
  }

  // Phương thức Insert, chèn chuỗi vào một vị trí nhất định
  Insert(index: number, value: string): this {
    const start = this.chunks.slice(0, index).join('')
    const end = this.chunks.slice(index).join('')
    this.chunks = [start, value, end]
    this.length = this.chunks.join('').length // Cập nhật độ dài
    return this
  }

  // Phương thức Remove, xóa một phần chuỗi
  Remove(start: number, length: number): this {
    const currentString = this.ToString()
    const newString = currentString.slice(0, start) + currentString.slice(start + length)
    this.chunks = [newString]
    this.length = newString.length // Cập nhật độ dài
    return this
  }

  // Phương thức Replace, thay thế chuỗi con bằng chuỗi mới
  Replace(oldValue: string, newValue: string): this {
    const currentString = this.ToString()
    const updatedString = currentString.replace(new RegExp(oldValue, 'g'), newValue)
    this.chunks = [updatedString]
    this.length = updatedString.length
    return this
  }

  // Phương thức ToString, chuyển mảng chuỗi thành chuỗi duy nhất
  ToString(): string {
    return this.chunks.join('')
  }

  // Phương thức để lấy độ dài chuỗi
  Size(): number {
    return this.length
  }
}
