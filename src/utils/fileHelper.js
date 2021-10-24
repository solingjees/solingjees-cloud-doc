const fs = window.require('fs').promises
// eslint-disable-next-line no-unused-vars
const path = window.require('path')

class FileHelper {
  readFile(path) {
    return fs.readFile(path, {
      encoding: 'utf-8',
    })
  }

  writeFile(path, content) {
    const dir = path.split('/').slice(0, -1).join('/')
    fs.access(dir).catch(() => {
      fs.mkdir(dir, {
        recursive: true,
      })
    })
    return fs.writeFile(path, content, {
      encoding: 'utf-8',
    })
  }

  renameFile(path, newPath) {
    return fs.rename(path, newPath)
  }

  //超级危险的操作，会使用硬件能力进行删除，尽量不要使用
  deleteFile (
    // path
  ) {
    // return fs.unlink(path)
  }
}

export default new FileHelper()
