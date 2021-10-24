import React from 'react'
import PropTypes from 'prop-types'
// eslint-disable-next-line no-unused-vars
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const BottonBtn = ({ text, colorClass, icon, onBtnClick }) => (
  <button
    type="button"
    className={`btn btn-block no-border btn-rad-0 ${colorClass}`}
    onClick={onBtnClick}
  >
    <FontAwesomeIcon size="sm" className="mr-1" icon={icon} />
    {text}
  </button>
)

BottonBtn.propTypes = {
  text: PropTypes.string,
  colorClass: PropTypes.string,
  icon: PropTypes.object,
  onBtnClick: PropTypes.func,
}

BottonBtn.defaultProps = {
  text: '新建',
}

export default BottonBtn
