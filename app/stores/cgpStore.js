// @flow
import { observable, action, autorun, computed } from 'mobx'
import { Wallet } from '@zen/zenjs'
import { last, findIndex, keys } from 'lodash'
import { Decimal } from 'decimal.js'

import { MAINNET } from '../constants/constants'
import { isValidAddress } from '../utils/helpers'

class CGPStore {
  constructor(publicAddressStore, networkStore, txHistoryStore, portfolioStore) {
    this.publicAddressStore = publicAddressStore
    this.portfolioStore = portfolioStore
    this.networkStore = networkStore
    this.txHistoryStore = txHistoryStore

    autorun(() => {
      // calculate the min max based on the current block
      // if the block changes to a new interval those values should change
      if (this.networkStore.blocks > 1) {
        this.calculateAllocationMinMax()
      }
    })
  }
  @observable intervalLength = 100 // TODO: edit 100 for final release
  @observable currentInterval = 0
  @observable allocation = 0
  @observable allocationZpMin = 0
  @observable allocationZpMax = 50
  @observable address = ''
  @observable assetAmounts = [{ asset: '', amount: 0 }]
  @observable inProgressAllocation = false
  @observable inProgressPayout = false
  @observable status = ''
  @observable errorMessage = ''
  // TODO change contracts
  @observable contractId =
    this.networkStore.chain === MAINNET
      ? 'czen1qqqqqqq8rzylch7w03dmym9zad7vuvs4akp5azdaa6hm7gnc7wk287k9qgs7409ea'
      : 'ctzn1qqqqqqq8rzylch7w03dmym9zad7vuvs4akp5azdaa6hm7gnc7wk287k9qgssqskgv'

  calculateAllocationMinMax() {
    // TODO call blockchain/cgp/current and calculate the min/max zp/ratio
    // min and max should be toFixed(3)
  }

  @computed
  get aggregatedAssetAmounts() {
    return this.assetAmounts.reduce((aggregated, cur) => {
      if (typeof aggregated[cur.asset] === 'undefined') {
        aggregated[cur.asset] = 0
      }
      aggregated[cur.asset] = Decimal.add(aggregated[cur.asset], cur.amount).toNumber()
      return aggregated
    }, {})
  }

  @computed
  get payoutHasData() {
    const lastAssetAmount = last(this.assetAmounts)
    return !!this.address || (lastAssetAmount && (lastAssetAmount.asset || lastAssetAmount.amount))
  }

  @computed
  get assetAmountsValid() {
    return findIndex(this.assetAmounts, item => !item.asset || !item.amount) === -1
  }

  @computed
  get lastAssetAmountValid() {
    const lastAssetAmount = last(this.assetAmounts)
    return !!lastAssetAmount.asset && !!lastAssetAmount.amount
  }

  @computed
  get allocationValid() {
    return this.allocation >= this.allocationZpMin && this.allocation <= this.allocationZpMax
  }

  @computed
  get payoutValid() {
    const allAmountsNotExceedingBalance = keys(this.aggregatedAssetAmounts).reduce(
      (valid, asset) =>
        Decimal.sub(
          this.portfolioStore.getBalanceFor(asset),
          this.aggregatedAssetAmounts[asset],
        ).greaterThanOrEqualTo(0),
      true,
    )

    return isValidAddress(this.address) && this.assetAmountsValid && allAmountsNotExceedingBalance
  }

  @action
  resetPayout() {
    this.address = ''
    this.assetAmounts = [{ asset: '', amount: 0 }]
    this.status = ''
    this.errorMessage = ''
  }

  @action
  updateAllocation(value) {
    this.allocation = value
  }

  @action
  updateAddress(value) {
    this.address = value
  }

  @action
  addAssetAmountPair() {
    const lastItem = last(this.assetAmounts)
    if (!lastItem.asset || !lastItem.amount) return
    if (this.assetAmounts.length >= 100) return

    this.assetAmounts.push({ asset: '', amount: 0 })
  }

  @action
  removeAssetAmountPair({ index } = {}) {
    if (this.assetAmounts.length === 1) return

    this.assetAmounts.splice(index, 1)
  }

  @action
  changeAssetAmountPair({ index, asset, amount } = {}) {
    this.assetAmounts[index].asset = asset
    this.assetAmounts[index].amount = amount
  }

  @action
  submitAllocationVote() {
    if (this.allocationValid) {
      this.inProgressAllocation = true
      // TODO actually create the vote!
    }
  }

  @action
  submitPayoutVote() {
    if (this.payoutValid) {
      this.inProgressPayout = true
      // TODO actually create the vote!
    }
  }
}

export default CGPStore
