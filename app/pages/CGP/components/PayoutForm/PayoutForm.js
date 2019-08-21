/* eslint-disable react/prop-types */
// @flow
import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'

import IsValidIcon from '../../../../components/IsValidIcon'
import PasteButton from '../../../../components/PasteButton'
import { isValidAddressOrContract } from '../../../../utils/helpers'

import AssetAmountPair from './components/AssetAmountPair'
import BallotsTable from './components/BallotsTable'

@inject('cgpStore', 'portfolioStore')
@observer
class PayoutForm extends Component {
  addAssetAmountPair = () => this.props.cgpStore.addAssetAmountPair()
  removeAssetAmountPair = index => this.props.cgpStore.removeAssetAmountPair({ index })

  addressChangeHandler = e => this.props.cgpStore.updateAddress(e.currentTarget.value.trim())

  onAddressPasteClicked = (clipboardContents: string) => {
    this.props.cgpStore.updateAddress(clipboardContents)
  }

  onBallotIdPasteClicked = (clipboardContents: string) => {
    this.props.cgpStore.updateBallotId(clipboardContents)
  }

  ballotChangeHandler = e => this.props.cgpStore.updateBallotId(e.currentTarget.value.trim())

  assetAmountChangeHandler = (data, index) => {
    this.props.cgpStore.changeAssetAmountPair({
      index,
      asset:
        typeof data.asset !== 'undefined'
          ? data.asset
          : this.props.cgpStore.assetAmounts[index].asset,
      amount:
        typeof data.amount !== 'undefined'
          ? data.amount
          : this.props.cgpStore.assetAmounts[index].amount,
    })
  }

  get isAddressInvalid() {
    const { address } = this.props.cgpStore
    return address.length && !isValidAddressOrContract(address)
  }

  get isAddressValid() {
    const { address } = this.props.cgpStore
    return address.length && isValidAddressOrContract(address)
  }

  renderAddressErrorMessage() {
    if (this.isAddressInvalid) {
      return (
        <div className="error input-message">
          <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
          <span>Destination Address is invalid</span>
        </div>
      )
    }
  }

  renderBallotIdErrorMessage() {
    const { ballotId, ballotIdValid } = this.props.cgpStore
    if (ballotId && !ballotIdValid) {
      return (
        <div className="error input-message">
          <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
          <span>Ballot ID is invalid</span>
        </div>
      )
    }
  }

  render() {
    const {
      cgpStore: {
        assetAmounts,
        address,
        ballotId,
        ballotIdValid,
        lastAssetAmountValid,
      },
    } = this.props
    return (
      <Flexbox>
        <Flexbox flexDirection="column" flexGrow={1} className="form-container">
          <Flexbox flexDirection="column" className="form-row">
            <label htmlFor="ballotId">Ballot ID</label>
            <Flexbox flexDirection="row">
              <Flexbox flexDirection="column" className="full-width relative">
                <input
                  id="ballotId"
                  name="ballotId"
                  type="text"
                  placeholder="Enter a ballot ID"
                  className={cx({ 'is-valid': ballotIdValid, error: ballotId && !ballotIdValid })}
                  autoFocus
                  onChange={this.ballotChangeHandler}
                  value={ballotId}
                />
                <IsValidIcon
                  isValid={ballotIdValid}
                  className="input-icon"
                  hasColors
                  isHidden={!ballotId}
                />
                {this.renderBallotIdErrorMessage()}
              </Flexbox>
              <PasteButton className="button-on-right" onClick={this.onBallotIdPasteClicked} />
            </Flexbox>
          </Flexbox>
          <OrSeparator />
          <Flexbox flexDirection="column" className="destination-address-input form-row">
            <label htmlFor="address">Address</label>
            <Flexbox flexDirection="row" className="destination-address-input">
              <Flexbox flexDirection="column" className="full-width relative">
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Destination address"
                  className={cx({ 'is-valid': this.isAddressValid, error: this.isToInvalid })}
                  autoFocus
                  onChange={this.addressChangeHandler}
                  value={address}
                />
                <IsValidIcon
                  isValid={isValidAddressOrContract(address)}
                  className="input-icon"
                  hasColors
                  isHidden={!address}
                />
                {this.renderAddressErrorMessage()}
              </Flexbox>
              <PasteButton className="button-on-right" onClick={this.onAddressPasteClicked} />
            </Flexbox>
          </Flexbox>
          <Flexbox flexDirection="column">
            {assetAmounts.map((item, index) => (
              <Flexbox flexDirection="row" className="form-row" key={index}>
                <AssetAmountPair
                  showLabels={index === 0}
                  asset={item.asset}
                  amount={item.amount}
                  assetBalance={this.props.cgpStore.getBalanceFor(item.asset)}
                  onChange={data => {
                    this.assetAmountChangeHandler(data, index)
                  }}
                />
                <div className="remove-container">
                  {/* DO NOT REMOVE LABEL! */}
                  {/* the label is a hack to place the buttons in the right height. */}
                  {index === 0 && <label>x</label>}
                  <button
                    disabled={assetAmounts.length === 1}
                    type="button"
                    className="btn-plus-minus"
                    title="Remove"
                    onClick={() => this.removeAssetAmountPair(index)}
                  >
                    <FontAwesomeIcon icon={['far', 'minus-circle']} />{' '}
                  </button>
                </div>
              </Flexbox>
            ))}
            <Flexbox className="form-row">
              <button
                disabled={!lastAssetAmountValid}
                type="button"
                className="button with-icon"
                title="Add"
                onClick={this.addAssetAmountPair}
              >
                <FontAwesomeIcon icon={['far', 'plus-circle']} />{' '}
                <span className="button-text">Add Asset & Amount</span>
              </button>
            </Flexbox>
          </Flexbox>
        </Flexbox>

        <Flexbox className="form-container ballot-table-container">
          <BallotsTable />
        </Flexbox>
      </Flexbox>
    )
  }
}

export default PayoutForm

function OrSeparator() {
  return (
    <Flexbox alignItems="center">
      <div className="devider" />
      <div>OR</div>
      <div className="devider" />
    </Flexbox>
  )
}
