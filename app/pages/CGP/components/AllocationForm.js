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
  get middleValue() {
    const {
      cgpStore: { allocationZpMin, allocationZpMax },
    } = this.props
    return (allocationZpMax + allocationZpMin) / 2
  }

  allocationChangeHandler = value => this.props.cgpStore.updateAllocation(value)
  formatRangeLabels = (value, type) => (
    <span className={cx(type, { 'above-middle': value > this.middleValue })}>
      {value.toFixed(3)} ZP
    </span>
  )
  render() {
    const {
      cgpStore: { allocation, allocationZpMin, allocationZpMax },
    } = this.props
    return (
      <Flexbox flexDirection="column" className="allocation-form">
        <Flexbox flexDirection="column" className="form-row">
          <div className="allocation-input">
            <InputRange
              step={0.001}
              maxValue={allocationZpMax}
              minValue={allocationZpMin}
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
