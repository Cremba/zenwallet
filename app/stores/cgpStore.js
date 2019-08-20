/* eslint-disable no-mixed-operators */
// @flow
import { observable, action, autorun, computed, runInAction, toJS } from 'mobx'
import { last, findIndex, keys, find } from 'lodash'
import { Decimal } from 'decimal.js'
import BigInteger from 'bigi'
import { Data } from '@zen/zenjs'
import { Hash } from '@zen/zenjs/build/src/Consensus/Types/Hash'
import { Allocation, Payout } from '@zen/zenjs/build/src/Consensus/Types/VoteData'

import { MAINNET } from '../constants/constants'
import {
  isValidAddress,
  numberWithCommas,
  payloadData,
  convertAllocation,
  serialize,
} from '../utils/helpers'
import { isZenAsset, kalapasToZen, zenBalanceDisplay } from '../utils/zenUtils'
import { getContractBalance } from '../services/api-service'

class CGPStore {
  constructor(publicStore, networkStore, txHistoryStore, portfolioStore, authStore, runStore) {
    this.publicAddressStore = publicStore
    this.portfolioStore = portfolioStore
    this.networkStore = networkStore
    this.txHistoryStore = txHistoryStore
    this.authorizedProtocolStore = authStore
    this.runContractStore = runStore

    autorun(() => {
      // calculate the min max based on the current block
      // if the block changes to a new interval those values should change
      if (this.networkStore.blocks > 1) {
        this.calculateAllocationMinMax()
      }
    })
  }

  @observable assetCGP = []
  @observable cgpCurrentBalance = 0
  @observable cgpCurrentAllocation = 0
  @observable prevIntervalTxs = 0
  @observable prevIntervalZpVotes = 0
  @observable allocation = 0
  @observable allocationZpMin = 0
  @observable allocationZpMax = 50
  @observable address = ''
  @observable assetAmounts = [{ asset: '', amount: 0 }]
  @observable inProgressAllocation = false
  @observable inProgressPayout = false
  @observable statusAllocation = {} // { status: 'success/error', errorMessage: '...' }
  @observable statusPayout = {} // { status: 'success/error', errorMessage: '...' }
  contractId = '00000000abbf8805a203197e4ad548e4eaa2b16f683c013e31d316f387ecf7adc65b3fb2' // does not change

  calculateAllocationMinMax() {
    // TODO call blockchain/cgp/current and calculate the min/max zp/ratio
    // min and max should be toFixed(3)
  }

  getBalanceFor(asset) {
    const result = find(this.assets, { asset })
    return result ? result.balance : 0
  }

  @action
  async fetchAssets() {
    const assets = await getContractBalance(this.networkStore.chain, this.contractId, 0, 65535)
    runInAction(() => this.assetCGP.replace(assets))
  }

  @computed
  get assets() {
    return this.assetCGP.map(asset => ({
      ...asset,
      name: this.portfolioStore.getAssetName(asset.asset),
      balance: isZenAsset(asset.asset) ? kalapasToZen(asset.balance) : asset.balance,
      balanceDisplay: isZenAsset(asset.asset)
        ? zenBalanceDisplay(asset.balance)
        : numberWithCommas(asset.balance),
    }))
  }

  filteredBalances = query => {
    if (!this.assets.length) {
      return []
    }
    if (!query) {
      return this.assets
    }
    return this.assets
      .filter(asset => asset.name.indexOf(query) > -1 || asset.asset.indexOf(query) > -1)
  }

  @computed
  get intervalLength() {
    return this.networkStore.chain === MAINNET ? 10000 : 100
  }

  @computed
  get currentInterval() {
    return Math.floor((this.networkStore.blocks - 1) / this.intervalLength)
  }

  @computed
  get snapshotBlock() {
    return this.currentInterval * this.intervalLength + this.intervalLength * 0.9
  }

  @computed
  get tallyBlock() {
    return (this.currentInterval + 1) * this.intervalLength
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
  resetStatuses() {
    this.statusAllocation = {}
    this.statusPayout = {}
  }

  @action
  resetPayout() {
    this.address = ''
    this.assetAmounts = [{ asset: '', amount: 0 }]
    this.statusAllocation = {}
    this.statusPayout = {}
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
  submitAllocationVote = async (confirmedPassword: string) => {
    if (this.allocationValid) {
      try {
        this.inProgressAllocation = true
        const stringAllocation = 'Allocation'
        const all = serialize(new Allocation(convertAllocation(this.allocation)))
        const interval = Data.serialize(new Data.UInt32(BigInteger.valueOf(this.currentInterval)))
        const message = Hash.compute(interval.toString().concat(all)).bytes
        await this.publicAddressStore.getKeys(confirmedPassword)
        const arrayPromise = toJS(this.publicAddressStore.publicKeys).map(async item => {
          const { publicKey, path } = item
          const signature = await this.authorizedProtocolStore.signMessage(
            message,
            path,
            confirmedPassword,
          )
          return [publicKey, new Data.Signature(signature)]
        })
        const data = await Promise.all(arrayPromise)
          .then(signatures =>
            new Data.Dictionary([
              [stringAllocation, new Data.String(all)],
              ['Signature', new Data.Dictionary(signatures)],
            ]))
          .catch(error => console.log(error))
        await this.runContractStore.run(
          confirmedPassword,
          payloadData(this.contractId, data, stringAllocation),
        )
        runInAction(() => {
          this.statusAllocation = { status: 'success' }
        })
      } catch (error) {
        runInAction(() => {
          this.statusAllocation = { status: 'error', errorMessage: error.message }
        })
      }

      runInAction(() => {
        this.inProgressAllocation = false
      })
    }
  }

  @action
  submitPayoutVote = async (confirmedPassword: string) => {
    if (this.payoutValid) {
      try {
        this.inProgressPayout = true
        const stringPayout = 'Payout'
        const payout = serialize(new Payout(
          {
            kind: 'PKRecipient',
            address: this.address,
          },
          this.assetAmounts,
        ))
        const interval = Data.serialize(new Data.UInt32(BigInteger.valueOf(this.currentInterval)))
        const message = Hash.compute(interval.toString().concat(payout)).bytes
        await this.publicAddressStore.getKeys(confirmedPassword)
        const arrayPromise = toJS(this.publicAddressStore.publicKeys).map(async item => {
          const { publicKey, path } = item
          const signature = await this.authorizedProtocolStore.signMessage(
            message,
            path,
            confirmedPassword,
          )
          return [publicKey, new Data.Signature(signature)]
        })
        const data = await Promise.all(arrayPromise)
          .then(signatures =>
            new Data.Dictionary([
              [stringPayout, new Data.String(payout)],
              ['Signature', new Data.Dictionary(signatures)],
            ]))
          .catch(error => console.log(error))
        await this.runContractStore.run(
          confirmedPassword,
          payloadData(this.contractId, data, stringPayout),
        )
        runInAction(() => {
          this.statusPayout = { status: 'success' }
        })
      } catch (error) {
        runInAction(() => {
          this.statusPayout = { status: 'error', errorMessage: error.message }
        })
      }

      runInAction(() => {
        this.inProgressPayout = false
      })
    }
  }
}

export default CGPStore
