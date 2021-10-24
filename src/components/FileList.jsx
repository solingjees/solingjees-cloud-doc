import React, { useState, useEffect, useCallback } from 'react'
// eslint-disable-next-line no-unused-vars
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'
import { getParentNode } from '../utils/helper'
import useContextMenu from '../hooks/useContextMenu'

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  const [edit, setedit] = useState(null)
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  const clickedItem =  useContextMenu([
    {
      label: '打开',
      click(){
        const parentElement = getParentNode(clickedItem.current,'file-item')
        if (parentElement) {
            onFileClick(parentElement.dataset.id)
        }
      }
    },
    {
      label: '重命名',
      click () {
        const parentElement = getParentNode(clickedItem.current,'file-item')
        if (parentElement) {
          setedit(files[files.findIndex(file => file.id === parentElement.dataset.id)])
        }
      }
    },
    {
      label: '删除',
      click () {
        const parentElement = getParentNode(clickedItem.current,'file-item')
        if (parentElement) {
          // console.log('删除触发前，files是：',files,'要删除的id是', parentElement.dataset.id)
          onFileDelete(parentElement.dataset.id)
        }
      }
    }
  ],['.file-list'],files)
  
  const closeSearch = useCallback((state = 0) => {
    //向上层组件传递文件名的更新
    if (state) {
      onFileDelete(edit.id, files)
      setedit(null)
      return
    }
    onSaveEdit(edit.id, edit.title, edit.isNew)
    setedit(null)
  },[edit])

  useEffect(() => {
    const newFile = files.find((file) => file.isNew)
    if (newFile) {
      setedit(newFile)
    }
  }, [files])

  useEffect(() => {
    if (enterPressed && edit !== null && edit.title.trim() !== '') {
      // onSaveEdit(edit.id, edit.title, edit.isNew)
      closeSearch()
    }
    if (escPressed && edit !== null) {
      closeSearch(1)
    }
  })

  const handleClickEdit =useCallback((file) => {
    if (edit && edit.isNew) {
      closeSearch(1)
    }
    setedit(file)
  },[edit])

  return (
    <ul className="list-group list-group-flush file-list">
      {files.length === 0 && (
        <>
          <span className="text-nowrap icon-button col blank-item my-2 ml-4">
            找不到匹配的项
          </span>
        </>
      )}
      {files.map((file) => (
        <li
          className="list-group-item bg-light d-flex align-items-center file-item row"
          key={file.id}
          data-id={file.id}
          data-title={file.title}
        >
          {!file.isNew && (edit === null || file.id !== edit.id) && (
            <>
              <span className="col-1">
                <FontAwesomeIcon icon={faMarkdown} title="markdown" size="sm" />
              </span>
              <span
                className="text-nowrap icon-button col c-link"
                onClick={() => onFileClick(file.id)}
              >
                {file.title}
              </span>
            </>
          )}
          {((file.isNew && edit !== null) ||
            (edit !== null && file.id === edit.id)) && (
            <>
              <input
                autoFocus
                className="form-control form-control-sm col-10"
                value={edit.title}
                placeholder={edit.isNew ? edit.title : ''}
                onChange={(e) => setedit({ ...edit, title: e.target.value })}
              />
              <button
                type="button"
                className="icon-button btn text-nowrap"
                onClick={() => {
                  closeSearch(edit.isNew ? 1 : 0)
                }}
              >
                <FontAwesomeIcon icon={faTimes} title="关闭" size="sm" />
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onSaveEdit: PropTypes.func,
  onFileDelete: PropTypes.func,
}

export default FileList
