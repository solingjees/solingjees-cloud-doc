
/* eslint-disable no-unused-vars */
import React, { useState ,useEffect, useContext, useCallback, useMemo, useRef } from 'react'
// import logo from './logo.svg'
import './App.css'
import 'easymde/dist/easymde.min.css'
import { v4 as uuid } from 'uuid'
import {
  flattenArr,
  objToArr,
  timestampToString
} from './utils/helper'
import FileHelper from './utils/fileHelper'
import { faPlus, faFileImport, faSave } from '@fortawesome/free-solid-svg-icons'
import 'bootstrap/dist/css/bootstrap.min.css'
import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import Loader from './components/Loader'
import SimpleMDE from 'react-simplemde-editor'
import defaultFiles from './utils/defaultFiles'
import BottonBtn from './components/BottonBtn'
import TabList from './components/TabList'
import fileHelper from './utils/fileHelper'
import useIpcRenderer from './hooks/useIpcRenderer'
const { remote ,ipcRenderer} = window.require('electron')
const { join,basename,extname,dirname } = window.require('path')
const Store = window.require('electron-store')
const fileStore = new Store({ name: 'cloudDoc' })
const settingStore = new Store({name:"settings"})
const isCloudConfigured = ()=> [ 'accessKey','secretKey','bucketName','region','enableAutoSync'].every(item => !!settingStore.get(item))


//把文件持久化到本地
const saveFilesToStore = (files) => {
  //we don't have to store any info in file system. eg: isNew , body ,etc
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createAt, isSynced, updatedAt } = file
    result[id] = {
      id,
      path,
      title,
      createAt,
      isSynced,
      updatedAt
    }
    return result
  }, {})
  fileStore.set('Files', filesStoreObj)
}

function App() {
  const [files, setfiles] = useState(fileStore.get('Files') || {})
  const filesArr =  useMemo(()=> objToArr(files),[files])
  const [activeFileId, setactiveFileId] = useState('')
  const filesRef = useRef(fileStore.get('Files') || {})
  const [openFileIds, setopenFileIds] = useState([])
  const [unsavedFileIds, setunsavedFileIds] = useState([])
  const [loading,setLoading] = useState(false)
  const [searchFiles, setsearchFiles] = useState([])
  const [showSearching, setshowSearching] = useState(false)
  const savedLocation = settingStore.get('savedFileLocation',remote.app.getPath('documents') )
  const openedFiles = useMemo(() => openFileIds.map((openId) => {
    return files[openId]
  }),[files,openFileIds])
  const activeFile =  useMemo(()=> files[activeFileId],[files,activeFileId])
  const fileListArr =  useMemo(() => showSearching ? searchFiles : filesArr,[showSearching,searchFiles,filesArr])

  const fileClick = useCallback((fileId) => {
    //set current active file
    setactiveFileId(fileId)
    const currentFile = files[fileId]
    const  { id , title , path , isLoaded} = currentFile
    if (!isLoaded) {
      if(isCloudConfigured()){
        // 从云端拉取数据
        ipcRenderer.send('download-file',{ key: `${title}.md`, path, id})
      }else{
        fileHelper.readFile(currentFile.path).then((value) => {
          // finish reading from the disk
          const newFile = { ...currentFile, body: value, isLoaded: true }
          // alter files
          setfiles({ ...files, [fileId]: newFile }) 
        }).catch(()=>{
          remote.dialog.showMessageBox({
            type:'error',
            title:'文件不存在',
            message:'我们找不到这文件，现在即将删除这引用.'
          }).then(res=>{
            setfiles(files.map(file => file.id !== id))
          })
        })
      } 
     
    }
    if (!openFileIds.includes(fileId)) {
      // add new fileid to openedFiles
      setopenFileIds([...openFileIds, fileId])
    }
  },[files,openFileIds])

  const tabClick = (fileId) => {
    setactiveFileId(fileId)
  }

  const tabClose = useCallback((id) => {
    const tabWidthout = openFileIds.filter((fileId) => fileId !== id)
    setopenFileIds(tabWidthout)
    if (tabWidthout.length > 0) {
      setactiveFileId(tabWidthout[0])
    } else {
      setactiveFileId('')
    }
  },[openFileIds])

  const fileChange = useCallback((id, value) => {
    if(value === files[id].body) return
    const newFile = {
      ...files[id],
      body: value,
      isSynced:false
    }
    setfiles({ ...files, [id]: newFile })
    if (!unsavedFileIds.includes(id)) setunsavedFileIds([...unsavedFileIds, id])
  },[files,unsavedFileIds])

  const updateFileName = useCallback((id, title, isNew = false) => {
    const oldTitle = files[id].title
    //newPath should be different based on isNew
    const newPath = isNew ? join(savedLocation, `${title}.md`)
      : join(dirname(files[id].path), `${title}.md`)
    //要存储的文件信息
    const modifiedFile = {
      ...files[id],
      title,
      isNew: false,
      path: newPath,
    }
    // console.log(JSON.stringify(modifiedFile))
    //新的文件目录信息
    const newFiles = { ...files, [id]: modifiedFile }
    if (isNew) {
      FileHelper.writeFile(newPath, newFiles[id].body).then(() => {
        setfiles(newFiles)
        console.log(newFiles)
        saveFilesToStore(newFiles)
      })
    } else {
      const oldPath = files[id].path
      FileHelper.renameFile(oldPath, newPath).then(() => {
        setfiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }
    if(isCloudConfigured()){
      //要更新云端
      ipcRenderer.send('rename-cloud-file', {
        oldTitle,
        newTitle: title,
        path: newPath
       })
   // ipcRenderer.send('delete-file-on-cloud', { id ,title, isNew})
    }
  },[files,savedLocation])

  const deleteFile = useCallback((id) => {
      const files = filesRef.current
      if (files[id].isNew) {
        const { [id]: value, ...afterDelete } = files
        setfiles(afterDelete)
      } else {
        const res =  remote.dialog.showMessageBox({
          type: 'warning',
          title: `您确定将该文件移入回收站吗?`,
          message:`您确定将该文件移入回收站吗?`,
          buttons:['确定','取消']
        }).then(res => {
            const index = res.response
            if(index === 0){  
             remote.shell.moveItemToTrash(files[id].path,(err)=>{
                remote.dialog.showErrorBox('删除失败',JSON.stringify(err))
             })
             ipcRenderer.send('trash-cloud-file', { title: files[id].title })
             const { [id]: value, ...afterDelete } = files
             setfiles(afterDelete)
             saveFilesToStore(afterDelete)
             tabClose(id)
            }
        })
      }
  },[files])

  

  const fileSearch = useCallback((keyWord) => {
    //filter out the new files based on the keyword
    if (keyWord === '') {
      setshowSearching(false)
      setsearchFiles([])
    }
    const newFiles = filesArr.filter((file) => file.title.includes(keyWord))
    setshowSearching(true)
    setsearchFiles(newFiles)
  },[filesArr])

  const createNewFile = useCallback(() => {
    const newId = uuid()
    const newFiles = {
      id: newId,
      title: '',
      body: '## 请输入 MarkDown',
      createAt: new Date().valueOf(),
      isNew: true
    }
    setfiles({ ...files, [newId]: newFiles })
  },[files])

  const saveCurrentFile =useCallback(() => {
    fileHelper
      .writeFile(activeFile.path, activeFile.body)
      .then(() => {
        saveFilesToStore(files)
        setunsavedFileIds(unsavedFileIds.filter((id) => id !== activeFile.id))
        if(isCloudConfigured()){
            // 配置都齐全，上传文件到云端
            ipcRenderer.send('upload-file-to-cloud',{
              key: `${activeFile.title}.md`,
              path: activeFile.path
            })
        }
      })
  },[files,unsavedFileIds,activeFile])

  //打开导入文件的对话框
  const importFiles = useCallback((e) => {
    remote.dialog.showOpenDialog({
      title: "选择导入的 markdown 文件",
      properties: ["openFile", "multiSelections"],
      filters: [
        {name:'Markdown files',extensions:['md']}
      ],
    }).then(res => {
        // if closed, shut down
        if(res.canceled)   return
        const paths = res.filePaths
    
        if (Array.isArray(paths)) {
          //filter out the path we already have at electron store
          const filteredPaths = paths.filter(path => {
            const alreadyAdded = Object.values(files).find(file => {
               return file.path === path
            })
            return !alreadyAdded
          })
          //extent the path array to an array contains files info
          const importFilesArr = filteredPaths.map(path => {
            return {
              id: uuid(),
              title: basename(path,extname(path)),
              path,
            }
          })
          const newFiles = { ...files, ...flattenArr(importFilesArr) }
          setfiles(newFiles)
          saveFilesToStore(newFiles)
          if (importFilesArr.length > 0) {
            remote.dialog.showMessageBox({
              type: 'info',
              title: `导入成功`,
              message:  `成功导入了${importFilesArr.length}个文件`
            })
          }
        }
    })
  },[files])
 
  const activeFileUploaded = useCallback((event,message)=>{
     const {id} = activeFile
     const modifiedFile = {
         ...files[id] ,isSynced: true, updatedAt: message.updatedAt || new Date().valueOf()
     }
     const newFiles = { ...files , [id]: modifiedFile}
     setfiles(newFiles)
     saveFilesToStore(newFiles)
  },[files,activeFile])

  const fileDownloaded = useCallback((event,message) =>{
    const currentFile = files[message.id]
    const { id ,path  } = currentFile
    fileHelper.readFile(path).then(value=>{
      let newFile
      if(message.status === 'downloaded-success'){
        newFile = { ...files[id], body: value, isLoaded: true , isSynced: true, updatedAt:message.updatedAt || new Date().valueOf()}
      }else{
        newFile = { ...files[id], body: value, isLoaded: true }
      }
      const newFiles = { ...files, [id]:newFile }
      setfiles(newFiles)
      saveFilesToStore(newFiles)
    }).catch(()=>{
      remote.dialog.showMessageBox({
        type:'error',
        title:'文件不存在',
        message:'我们找不到这文件，现在即将删除这引用.'
      }).then(res=>{
        const newFiles = { ...files }
        delete newFiles[message.id]
        setfiles(newFiles)
        saveFilesToStore(newFiles)
      })
    })
  },[files])

  const handleLoadingStatus = (event,message) =>{
     setLoading(message)
  }

  const handleFilesUploaded =useCallback((event,message) => {
     const newFiles = objToArr(files).reduce((prev,cur,index)=>{
        prev[cur.id] = {
          ...files[cur.id],
          isSynced:true,
          updatedAt: index < message.updatedArr.length ?  message.updatedArr[index] : new Date().valueOf()
        }
        return prev
     },{})
     setfiles(newFiles)
     saveFilesToStore(newFiles)
  },[files])

  const handleMakeShowFileSaved =useCallback(() => {
     if(unsavedFileIds.length > 0){
       //说明有没保存的
       remote.dialog.showMessageBox({
        type:'question',
        title: '存在尚未保存的文件',
        buttons:['确定','取消'],
        message:'有文件没有被保存, 从云端下载文件可能会造成本地编辑但暂未保存的内容覆盖, 您确定要从云端下载文件吗?'
       }).then(res=>{
          const btnIndex = res.response
          if(btnIndex === 0){
            // 确定
            ipcRenderer.send('download-all-files')
          }
       })
     }else{
      ipcRenderer.send('download-all-files')
     }
  },[unsavedFileIds])

  const handleDownloadFilesFinished = (event,message) => {
     setfiles(message.newFiles)
     saveFilesToStore(message.newFiles)
  }
  useEffect(()=>{
    filesRef.current = JSON.parse(JSON.stringify(files))
    console.log('fileRef发生更新',filesRef.current)
  },[files])


  useEffect(()=>{
    console.log('files发生更新',files)
  },[files])


  useIpcRenderer({
    'create-new-file':createNewFile,
    'import-file':importFiles,
    'save-edit-file':saveCurrentFile,
    'active-file-uploaded':activeFileUploaded,
    'file-downloaded':fileDownloaded,
    'handle-loading-status': handleLoadingStatus,
    'files-uploaded':handleFilesUploaded,
    'make-show-file-saved':handleMakeShowFileSaved,
    'download-files-finished':handleDownloadFilesFinished
  })
  //container-fluid:宽度横跨100%
  return (
    <div className="App container-fluid px-0">
      {
        loading? <Loader/> : ''
      }
      <div className="row no-gutters container">
        {/* 占栅格三列 ,背景禁忌红*/}
        <div className="col-3 bg-light left-panel">
          <div className="flex-col">
            <FileSearch
              title="我的云文档"
              onFileSearch={(value) => {
                fileSearch(value)
              }}
            ></FileSearch>
            <FileList
              files={fileListArr}
              onFileClick={fileClick}
              onFileDelete={(id)=>{
                deleteFile(id)
              }}
              onSaveEdit={(id, newvalue, isNew) => {
                updateFileName(id, newvalue, isNew)
              }}
            />
            <div className="row no-gutters button-group">
              <div className="col">
                <BottonBtn
                  text="新建"
                  colorClass="btn-primary"
                  icon={faPlus}
                  onBtnClick={createNewFile}
                />
              </div>
              <div className="col">
                <BottonBtn
                  text="导入"
                  onBtnClick={importFiles}
                  colorClass="btn-success"
                  icon={faFileImport}
                />
              </div>
            </div>
          </div>
        </div>
        {/* 占栅格9列，背景初始蓝*/}
        <div className="col-9  right-panel">
          {!activeFile && (
            <div className="start-page">选择或创建新的 MarkDown 文档</div>
          )}
          {activeFile && (
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileId}
                unsaveIds={unsavedFileIds}
                onTabClick={tabClick}
                onCloseTab={tabClose}
              />
              <div  className="markdown">
                <SimpleMDE
                  className='markdown-editor'
                  key={activeFile && activeFile.id}
                  value={activeFile.body}
                  onChange={(value) => {
                    fileChange(activeFile.id, value)
                  }}
                />
              </div>
              <div className='lastLine'>
              {
                  !!activeFile.isSynced && isCloudConfigured() && 
                  <span className='sync-status'>已同步，最后同步{timestampToString(activeFile.updatedAt)}</span>
              }
              {
                  !activeFile.isSynced && isCloudConfigured() &&
                  <span className='sync-status'>存在变更，尚未同步</span>
              }
                  <div className='tips'>Command/Ctrl + S以保存内容</div>
              </div>
             
            </>
          )}
          
        </div>
      </div>
    </div>
  )
}

export default App
 