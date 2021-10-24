const { BrowserWindow } = require('electron')


class AppWindow extends BrowserWindow {
    constructor(config,urlLocation){
        const basicConfig = {
            width:800,
            height:600,
            webPreferences: {
              nodeIntegration: true,
              enableRemoteModule: true,
            },
            show:false, //默认先不显示窗口，当渲染进程发出ready-to-show时进行显示
            backgroundColor:'#efefef'
        }
        const finalConfig = {
            ...basicConfig,
            ...config
        }
        super(finalConfig) //相当于 this = new BrowserWindow(finalConfig)
        this.loadURL(urlLocation)
        this.once('ready-to-show',()=>{
            this.show()
        })
    }
}

module.exports =  AppWindow