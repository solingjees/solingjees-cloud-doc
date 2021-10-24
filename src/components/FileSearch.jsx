/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'
import useIpcRenderer from '../hooks/useIpcRenderer'

const FileSearch = ({ title, onFileSearch }) => {
  const [inputActive, setinputActive] = useState(false)
  const [value, setvalue] = useState('')
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  const node = useRef(null)

  const closeSearch = () => {
    setinputActive(false)
    setvalue('')
    onFileSearch('')
  }

  useEffect(() => {
    if (inputActive) node.current.focus()
  }, [inputActive])

  useEffect(() => {
    if (enterPressed && inputActive) {
      onFileSearch(value)
    }
    if (escPressed && inputActive) {
      closeSearch()
    }
  })

  useIpcRenderer({
    'search-file':()=>{
      setinputActive(true)
    }
  })

  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center file-search-bar mb-0">
      {!inputActive && (
        <>
          <span>{title}</span>
          <button
            type="button"
            className="icon-button btn text-nowrap"
            onClick={() => setinputActive(true)}
          >
            <FontAwesomeIcon icon={faSearch} title="搜索" size="sm" />
          </button>
        </>
      )}
      {inputActive && (
        <>
          <input
            className="form-control form-control-sm"
            value={value}
            ref={node}
            onChange={(e) => setvalue(e.target.value)}
          />
          <button
            type="button "
            className="icon-button btn text-nowrap"
            onClick={closeSearch}
          >
            <FontAwesomeIcon icon={faTimes} title="关闭" size="sm" />
          </button>
        </>
      )}
    </div>
  )
}

FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired,
}

FileSearch.defaultProps = {
  title: '我的云文档',
}

export default FileSearch
