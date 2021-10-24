const { shell, app, ipcMain } = require("electron")
const Store = require('electron-store')
const settingsStore = new Store({name:'settings'})

const isCloudConfigured = [ 'accessKey','secretKey','bucketName','region'].every(item => !!settingsStore.get(item))

app.setName('Solingjees云笔记')
let template = [{
   label:'文件',
   submenu:[
     {
       label:'新建文章',
       accelerator:'CmdOrCtrl+N',
       click:(menuItem,browserWindow,event)=>{
           browserWindow.webContents.send('create-new-file')
       }
     },{
       label:'保存当前文章',
       accelerator:'CmdOrCtrl+S',
       click:(menuItem,browserWindow,event)=>{
           browserWindow.webContents.send('save-edit-file')
       }
     },{
       label:'搜索文章',
       accelerator:'CmdOrCtrl+F',
       click:(menuItem,browserWindow,event)=>{
           browserWindow.webContents.send('search-file')
       }
     },
     {
       label:'导入文章',
       accelerator:'CmdOrCtrl+0',
       click:(menuItem,browserWindow,event)=>{
          browserWindow.webContents.send('import-file')
       }
     }
   ]
},{
    label:"编辑",
    submenu:[
      {
        label:'撤销',
        accelerator:'CmdOrCtrl+Z',
        role:'undo'
      },
      {
        label:'重做',
        accelerator:'CmdOrCtrl+Z',
        role:"redo"
      },
      {
        label:'separator',
      },
      {
        label:'剪切',
        accelerator:'CmdOrCtrl+X',
        role:'cut'
      },
      {
        label:'复制',
        accelerator:'CmdOrCtrl+C',
        role:'copy'
      },
      {
        label:'粘贴',
        accelerator:'CmdOrCtrl+V',
        role:'paste'
      },
      {
        label:'全选',
        accelerator:'CmdOrCtrl+A',
        role:'selectall'
      }
    ]
},{
    id:"cloudSync",
    label:'云同步',
    submenu:[
      {
        label:'设置',
        accelerator:'CmdOrCtrl+,',
        click:()=>{
          ipcMain.emit('open-settings-window')
        }
      },
      {
        label:'自动同步',
        type:'checkbox', //表示是一个切换器
        enabled: isCloudConfigured,
        checked: !!settingsStore.get('enableAutoSync'),
        click:(menuItem,browserWindow,event)=>{
            settingsStore.set('enableAutoSync', menuItem.checked)
        }
      },
      {
        label:'全部同步至云端',
        enabled:isCloudConfigured,
        click:()=>{
          ipcMain.emit('upload-all-to-cloud')
        }
      },
      {
        label:'从云端下载所有文件到本地',
        enabled:isCloudConfigured,
        click:(menuItem,browserWindow)=>{
          browserWindow.webContents.send('make-show-file-saved')
        }
      }
    ]
},{
  label:'视图',
  submenu:[
    {
      label:"刷新页面",
      accelerator:"CmdOrCtrl+R",
      click:(menuItem,browserWindow)=>{
         if(browserWindow){
            browserWindow.reload()
         }
      }
    },
    {
      label:'切换全屏幕',
      accelerator:(()=>{
        if(process.platform === 'darwin'){
          return 'Ctrl+Command+F'
        } else return 'F11'
      })(),
      click:(menuItem,browserWindow)=>{
        if(browserWindow){
          browserWindow.setFullScreen(!browserWindow.isFullScreen())
        }
      }
    },
    {
      label:'切换开发者工具',
      accelerator:(()=>{
        if(process.platform === 'darwin'){
          return 'Alt+Command+I'
        }else{
          return 'Ctrl+Shift+I'
        }
      })(),
      click:(menuItem,browserWindow)=>{
        if(browserWindow){
          browserWindow.toggleDevTools()
        }
      }
    }
  ]
},
{
  label:'窗口',
  role:'window',
  submenu:[
  {
    label:'最小化',
    accelerator:'CmdOrCtrl+M',
    role:'minimize'
  },
  {
    label:'关闭',
    accelerator:'CmdOrCtrl+W',
    role:'close'
  }
]
},
{
  label:'帮助',
  role:'help',
  submenu:[
    {
      label:"学习更多",
      click:()=>{
        shell.openExternal('http://electron.atom.io') 
        //集成与系统、桌面相关的功能，如在文件夹中打开、在浏览器中打开、将文件移动到回收站
      }
    }
  ]
}
]

if(process.platform === 'darwin'){
  const name = app.getName()
  template.unshift({
    label:name,
    submenu:[{
      label:`关于${name}`,
      role:'about'
    },{
      type:'separator'
    },
    {
      label:'偏好设置',
      accelerator:'Command+.',
      click:()=>{
        ipcMain.emit('open-settings-window')
      }
    },
    {
      label:'服务',
      role:'services',
      submenu:[]  
    },{
      type:'separator'
    },{
      label:`隐藏${name}`,
      accelerator:'Command+H',
      role:'hide'
    },{
      label:'隐藏其他',
      accelerator:'Command+H',
      role:'hideothers'
    },{
      label:'显示全部',
      role:'unhide'
    },{
      type:'separator'
    },{
      label:'退出',
      accelerator:'Command+Q',
      click:()=>{
        app.quit()
      }
    }
  ]
  })
}else{
  template[0].submenu.push({
    label:'设置',
    accelerator:'Ctrl+.',
    click:()=>{
      ipcMain.emit('open-settings-window') //主动触发自己ipcMain的事件
    }
  })
}

module.exports =  template