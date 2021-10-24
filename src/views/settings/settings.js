const { remote } = require('electron')
const Store =  require('electron-store')
const settingsStore = new Store({ name: 'settings' })
const { ipcRenderer } = require('electron') 
const cloudConfigInputs = ['#accessKey','#secretKey','#bucketName','#savedFileLocation','#region']

const $ = (selector) =>{
   const result = document.querySelectorAll(selector)  
   return result.length > 1? result: result[0]
}  
//和window.loaded的区别:DOMContentLoaded在HTML文档解析完成后就触发，loaded要所有的相关资源加载完毕后触发
document.addEventListener('DOMContentLoaded',()=>{
    cloudConfigInputs.forEach(inputId =>{
       if($(inputId)){
           const { id } = $(inputId)
           $(inputId).value = settingsStore.get(id+'') || ''
       }
    })
  $('#select-new-location').addEventListener('click',(e)=>{
      e.preventDefault()
      remote.dialog.showOpenDialog({
          properties: ['openDirectory'],
          message:'选择文件的存储路径'
      }).then(result=>{
          const path = result.filePaths[0]
          $('#savedFileLocation').value = path
      })
  })
  $('#settings-form').addEventListener('submit',()=>{
    cloudConfigInputs.forEach(inputId =>{
        if($(inputId)){
            const { id , value} = $(inputId)
            settingsStore.set( id+'', value || '')
        }
     })
    ipcRenderer.send('on-update-settings')
    remote.getCurrentWindow().close()
  })
  $('.nav-tabs').addEventListener('click',e=>{
      e.preventDefault()
      $('.nav-link').forEach(element => {
           element.classList.remove('active')
      });
      e.target.classList.add('active')
      $('.config-area').forEach(element => {
          element.style.display = 'none'
      })
      $(e.target.dataset.tab).style.display = 'block'
  })
})
