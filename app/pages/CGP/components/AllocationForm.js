/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import InputRange from 'react-input-range'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'

import 'react-input-range/lib/css/index.css'

@inject('cgpStore')
@observer
class AllocationForm extends Component {
  allocationChangeHandler = value => this.props.cgpStore.updateAllocation(value)
  formatRangeLabels = (value, type) => (
    <span className={cx(type, { 'above-middle': value > 25 })}>
      {value.toFixed(3)} {type !== 'value' ? 'ZP' : ''}
    </span>
  )
  render() {
    const {
      cgpStore: { allocation },
    } = this.props
    return (
      <Flexbox flexDirection="column" className="allocation-form">
        <Flexbox flexDirection="column" className="form-row allocation-input-container">
          <div className="allocation-input">
            <InputRange
              step={0.001}
              maxValue={50}
              minValue={0}
              value={allocation}
              onChange={this.allocationChangeHandler}
              formatLabel={this.formatRangeLabels}
            />
          </div>
        </Flexbox>
      </Flexbox>
    )
  }
}

export default AllocationForm
