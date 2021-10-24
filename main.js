const  MenuTemplate  = require('./src/assets/menuTemplate')
const { autoUpdater } = require('electron-updater')
const { app, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const Store = require('electron-store')
const AppWindow = require('./src/AppWindow')
const isDev = require('electron-is-dev')
const settingsStore = new Store({name:'settings'})
const fileStore = new Store({ name: 'cloudDoc' })
const { v4: uuid } = require('uuid')
const CloudConnection = require('./src/utils/uploadCloud')
const isCloudConfigured =  () => [ 'accessKey','secretKey','bucketName','region'].every(item => !!settingsStore.get(item))

let mainWindow
let settingsWindow

app.on('ready', () => {
  // check new version
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdatesAndNotify() //打包完成的包中才能运行
  autoUpdater.on('error',(error)=>{
    dialog.showErrorBox('更新发生错误', error === null ? 'unknown': JSON.stringify(error))
  })
  autoUpdater.on('update-available',()=>{
    dialog.showMessageBox({
      type:'info',
      title:'发现新版本',
      message:'发现新版本，是否现在更新?',
      button:['是','稍后考虑']
    },(res)=>{
      if(res.response === 0){
         autoUpdater.downloadUpdate()
      }
    })
  })
  autoUpdater.on('update-not-available',()=>{
    dialog.showMessageBox({
      title:'没有新版本',
      message:'当前已经是最新版本'
    })
  })

  // setup the top menu
  let menu = Menu.buildFromTemplate(MenuTemplate)
  Menu.setApplicationMenu(menu)
  
  // build the main window
  const mainWindowConfig = {
    width:1440,
    height:768
  }

  const urlLocation = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname,'./index.html')}`
  mainWindow = new AppWindow(mainWindowConfig,urlLocation)
  mainWindow.on('close',()=>{mainWindow = null})

  //listen the event
  ipcMain.on('open-settings-window',()=>{
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow
    }
    const settingsWindowLocation = `file://${path.join(__dirname,'src/views/settings/index.html')}`
    settingsWindow = new AppWindow(settingsWindowConfig,settingsWindowLocation)
    settingsWindow.removeMenu()
    settingsWindow.on('close',()=>{settingsWindow = null})
  })

  ipcMain.on('on-update-settings',()=>{
    const cloudSyncMenu = menu.getMenuItemById('cloudSync') 
    const arr = [1,2,3]
    arr.forEach(index => {
      cloudSyncMenu.submenu.items[index].enabled = isCloudConfigured()
    })
    if(!isCloudConfigured()){
       settingsStore.set('enableAutoSync',false)
    }
  })

  ipcMain.on('upload-file-to-cloud',async (event,data)=>{
     const connection = new CloudConnection({
        region: settingsStore.get('region'),
        accessKeyId: settingsStore.get('accessKey'),
        accessKeySecret: settingsStore.get('secretKey'),
        bucket: settingsStore.get('bucketName'),
     })
     const res = await  connection.upload(data.key, data.path, true)
     if(res.status === 200){
       mainWindow.webContents.send('active-file-uploaded', {
         updatedAt: res.data.updatedAt
       })
     }else{
       dialog.showErrorBox('连接云存储失败，检查网络连接或云服务商来修复此问题',JSON.stringify(res))
     }
  })

  ipcMain.on('download-file',async (event,data) => {
    const filesObj = fileStore.get('Files')
    const connection = new CloudConnection({
      region: settingsStore.get('region'),
      accessKeyId: settingsStore.get('accessKey'),
      accessKeySecret: settingsStore.get('secretKey'),
      bucket: settingsStore.get('bucketName'),
   })
    const isExit =  await connection.exitFile(data.key)
    if(isExit && isExit.res.status === 200){
      //  console.log(isExit,filesObj[data.id]) 
       const cloudFileDate = new Date(isExit.res.headers[ 'last-modified']).valueOf()
       const localFileDate = filesObj[data.id].updatedAt? new Date(filesObj[data.id].updatedAt).valueOf():0
       if(cloudFileDate > localFileDate){
         // 云端数据更加新
        //  console.log(new Date(cloudFileDate).toLocaleString(),new Date(localFileDate).toLocaleString(),cloudFileDate > localFileDate)
         const res = await  connection.download(data.key , data.path)
         if(res.status === 200){
           mainWindow.webContents.send('file-downloaded',{status: 'downloaded-success',id:data.id,updatedAt: cloudFileDate})
         }else{
           dialog.showErrorBox('下载服务器文件失败',JSON.stringify(res))
         }
       }else{
        mainWindow.webContents.send('file-downloaded',{status: 'no-new-file',id:data.id})
       }
    }else{
       //云端没有这个文件
       mainWindow.webContents.send('file-downloaded',{status:'no-file',id:data.id})
    }
  })

  ipcMain.on('upload-all-to-cloud',async ()=>{
    mainWindow.webContents.send('handle-loading-status',true)
    const connection = new CloudConnection({
      region: settingsStore.get('region'),
      accessKeyId: settingsStore.get('accessKey'),
      accessKeySecret: settingsStore.get('secretKey'),
      bucket: settingsStore.get('bucketName'),
   })
    const files = fileStore.get('Files')
    const keys =  Object.keys(files)
    let alluploaded = true
    let successedNum = 0
    let updatedArr = []
    for(let key of keys){
      const file = files[key]
      const res =  await connection.upload(file.title+'.md',file.path,true)
      if(res.status === 200){
        successedNum ++
        updatedArr.push(res.data.updatedAt)
      }else{
        alluploaded = false
        dialog.showErrorBox('上传失败',`本地文件${file.title}.md同步上传失败:${JSON.stringify(res)}`)
        break;
      }
    }
    mainWindow.webContents.send('files-uploaded', {updatedArr})
    mainWindow.webContents.send('handle-loading-status',false)
    dialog.showMessageBox({
      type:'info',
      title: alluploaded? '全部上传成功':'部分上传成功',
      message:`成功上传了${successedNum}个文件`
    })
  })

   ipcMain.on('download-all-files',async ()=>{
    const connection = new CloudConnection({
      region: settingsStore.get('region'),
      accessKeyId: settingsStore.get('accessKey'),
      accessKeySecret: settingsStore.get('secretKey'),
      bucket: settingsStore.get('bucketName'),
    })
    const res =  await connection.getList()
    if(res.status === 200){
       //从云端下载后，比较云端文件和本地文件
         // res.data.list item
          // {
          //     name: 'aa.js.md',
          //     url: 'http://solingjees-cloud-doc.oss-cn-hongkong.aliyuncs.com/aa.js.md',
          //     lastModified: '2021-10-21T03:41:43.000Z',
          //     etag: '"736A975C611E1109218A548B9FC75F06"',
          //     type: 'Normal',
          //     size: 4853,
          //     storageClass: 'Standard',
          //     owner: [Object]
          //   },
          const localFiles = fileStore.get('Files')
          const cloudFiles = res.data.list
          // 创建需要下载的文件列表
          const needDownloadFileList = cloudFiles.reduce((prev,cur)=>{
              const keys = Object.keys(localFiles)
              let isFind = false
              for(let key of keys){
                if(localFiles[key].title +'.md' === cur.name){
                  // 云端这个文件在本地存在
                  isFind = true
                  if(new Date(localFiles[key].updatedAt).valueOf() <
                   new Date(cur.lastModified).valueOf()){
                       // 本地数据没有云端更加新
                      prev.push({
                        id: localFiles[key].id,
                        name: localFiles[key].title,
                        path: cur.url
                      })
                   }
                   break;
                }
              }
              if(!isFind){
                // 把文件下载在默认位置
                prev.push({
                    name: cur.name.substring(0, cur.name.length - 3),
                    path: settingsStore.get('saveFileLocation') + '/'+ cur.name
                })
                return prev
              }else{
                //找到了
                return prev
              }
          },[])
          // console.log(needDownloadFileList)
          //下载所有的文件
          for(let fileIndex in needDownloadFileList){
            const res = await  connection.download(needDownloadFileList[fileIndex].name+'.md',
              needDownloadFileList[fileIndex].path)
            if(res.status === 200){
                if(needDownloadFileList[fileIndex].id){
                   //如果id存在，说明是更新的文件
                   localFiles[needDownloadFileList[fileIndex].id] = {
                     ...localFiles[needDownloadFileList[fileIndex].id],
                     isSynced:true,
                     updatedAt: res.data.updatedAt
                   }
                }else{
                  //没有id，说明是新文件
                  const newId = uuid()
                  localFiles[newId] = {
                    id:newId,
                    title: needDownloadFileList[fileIndex].name,
                    isSynced:true,
                    createAt: res.data.updatedAt,
                    updatedAt: res.data.updatedAt,
                    path: needDownloadFileList[fileIndex].path
                  }
                }
            }else{
               dialog.showErrorBox('存在云端文件下载失败',JSON.stringify(res))
               break;
            }
          }
          mainWindow.webContents.send('download-files-finished', { newFiles: localFiles })
    }else{
      dialog.showErrorBox('获取云端文件列表失败',JSON.stringify(res))
    }
   })
    
   ipcMain.on('rename-cloud-file',async (event,data)=>{
       const { oldTitle, newTitle ,path } = data
       const connection = new CloudConnection({
        region: settingsStore.get('region'),
        accessKeyId: settingsStore.get('accessKey'),
        accessKeySecret: settingsStore.get('secretKey'),
        bucket: settingsStore.get('bucketName'),
      })
      // console.log(oldTitle,newTitle,path)
      try{
        const res = await connection.exitFile(oldTitle+'.md')
        if(res){
             //文件存在，删除该文件
            const res2 = await connection.deleteFile(oldTitle+'.md')
            if(!(res2.status && res2.status === 200)){
              throw new Error(res2)   
            }
        }
         const res3 = await connection.upload(newTitle+'.md', path, true)
        //  console.log(res3)
         if(!(res3.status && res3.status === 200)){
          throw new Error(res3)
        }
      }catch(err){
         dialog.showErrorBox('重命名云端文件失败',JSON.stringify(err))
      } 
   })

   ipcMain.on('trash-cloud-file',async (event,message)=>{
     const title = message.title
     const connection = new CloudConnection({
      region: settingsStore.get('region'),
      accessKeyId: settingsStore.get('accessKey'),
      accessKeySecret: settingsStore.get('secretKey'),
      bucket: settingsStore.get('bucketName'),
    })
     const res = await  connection.deleteFile(title+'.md')
     if(res.status  && res.status === 200){
       //删除成功
     }else{
      dialog.showErrorBox('删除云端文件失败',JSON.stringify(res))
     }
   })
})