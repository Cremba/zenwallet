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
    const { className, ...rest } = this.props
    return (
      <Flexbox className={cx('box', className)} flexDirection="column" flexGrow={1} {...rest}>
        <span className="first-input">{this.props.firstLine}</span>
        <span className="second-input">{this.props.secondLine}</span>
      </Flexbox>
    )
  }
}

export default BoxLabel
