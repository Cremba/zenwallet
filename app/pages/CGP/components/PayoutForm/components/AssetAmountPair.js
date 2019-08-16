import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import PropTypes from 'prop-types'

import AutoSuggestAssets from '../../../../../components/AutoSuggestAssets'
import AmountInput from '../../../../../components/AmountInput'
import { isZenAsset } from '../../../../../utils/zenUtils'
import { ZENP_MAX_DECIMALS, ZENP_MIN_DECIMALS } from '../../../../../constants'

class AssetAmountPair extends Component {
  // reset hack - AutoSuggestAssets does not reset properly if prev asset was valid
  componentDidUpdate(prevProps) {
    if (prevProps.asset !== '' && !this.props.asset) {
      this.AutoSuggestAssets.wrappedInstance.reset()
    }
  }

  assetChangedHandler = ({ asset }) => {
    const { onChange } = this.props
    if (typeof onChange === 'function') {
      onChange({ asset })
    }
  }
  amountChangedHandler = amountDisplay => {
    const { onChange } = this.props
    if (typeof onChange === 'function') {
      onChange({ amount: Number(amountDisplay) })
    }
  }

  render() {
    const {
      asset, assetBalance, amount, showLabels,
    } = this.props
    return (
      <React.Fragment>
        <AutoSuggestAssets
          cgp
          asset={asset}
          onUpdateParent={this.assetChangedHandler}
          showLabel={showLabels}
          ref={(el) => { this.AutoSuggestAssets = el }}
        />
        <AmountInput
          amount={amount}
          amountDisplay={amount ? String(amount) : ''}
          maxDecimal={isZenAsset(asset) ? ZENP_MAX_DECIMALS : 0}
          minDecimal={isZenAsset(asset) ? ZENP_MIN_DECIMALS : 0}
          maxAmount={asset ? assetBalance : null}
          shouldShowMaxAmount
          exceedingErrorMessage="Insufficient Funds"
          onAmountDisplayChanged={this.amountChangedHandler}
          label={showLabels ? 'Amount' : ''}
        />
      </React.Fragment>
    )
  }
}

AssetAmountPair.propTypes = {
  asset: PropTypes.string,
  assetBalance: PropTypes.number,
  amount: PropTypes.number,
  amountDisplay: PropTypes.string,
  onChange: PropTypes.func,
  showLabels: PropTypes.bool,
}

export default AssetAmountPair
