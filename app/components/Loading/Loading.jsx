import PropTypes from 'prop-types'
import React from 'react'
import classNames from 'classnames'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'

export default function Loading({ className, loadingText, ...props }) {
  return (
    <div className={classNames(className)} {...props}>
      <span>
        <FontAwesomeIcon icon={['far', 'spinner']} spin />
        {loadingText}
      </span>
    </div>
  )
}

Loading.propTypes = {
  loadingText: PropTypes.string,
  className: PropTypes.string,
}

Loading.defaultProps = {
  loadingText: ' Loading...',
  className: 'Loading',
}
