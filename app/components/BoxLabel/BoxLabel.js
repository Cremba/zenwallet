// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import cx from 'classnames'

type Props = {
  firstLine: string,
  secondLine: string,
  className?: string
};

class BoxLabel extends Component<Props> {
  render() {
    const {
      className, firstLine, secondLine, ...rest
    } = this.props
    return (
      <Flexbox className={cx('box', className)} flexDirection="column" flexGrow={1} {...rest}>
        <span className="first-input">{firstLine}</span>
        <span className="second-input">{secondLine}</span>
      </Flexbox>
    )
  }
}

export default BoxLabel
