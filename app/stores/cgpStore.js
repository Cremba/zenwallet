// @flow
import { observable, action, runInAction, computed } from 'mobx'
import { Wallet } from '@zen/zenjs'
import { last, findIndex, keys } from 'lodash'
import { Decimal } from 'decimal.js'

import { getContractHistory, postWalletMnemonicphrase } from '../services/api-service'
import { MAINNET } from '../constants/constants'
import { isValidAddress } from '../utils/helpers'

class CGPStore {
  constructor(publicAddressStore, networkStore, txHistoryStore, portfolioStore) {
    this.publicAddressStore = publicAddressStore
    this.portfolioStore = portfolioStore
    this.networkStore = networkStore
    this.txHistoryStore = txHistoryStore
  }

  @observable inProgress = false
  @observable allocation = -1
  @observable address = ''
  @observable assetAmounts = [{ asset: '', amount: 0 }]
  @observable status = ''
  @observable errorMessage = ''
  // TODO change contracts
  @observable contractId =
    this.networkStore.chain === MAINNET
      ? 'czen1qqqqqqq8rzylch7w03dmym9zad7vuvs4akp5azdaa6hm7gnc7wk287k9qgs7409ea'
      : 'ctzn1qqqqqqq8rzylch7w03dmym9zad7vuvs4akp5azdaa6hm7gnc7wk287k9qgssqskgv'

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
  get allocationHasData() {
    return this.allocation >= 0
  }

  @computed
  get payoutHasData() {
    const lastAssetAmount = last(this.assetAmounts)
    return !!this.address || (lastAssetAmount && (lastAssetAmount.asset || lastAssetAmount.amount))
  }

  @computed
  get anyHasData() {
    return this.allocationHasData || this.payoutHasData
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
    // TODO check by last interval result
    return this.allocation >= 0 && this.allocation <= 100
  }

  @computed
  get payoutValid() {
    const allAmountsNotExceedingBalance = keys(this.aggregatedAssetAmounts).reduce((valid, asset) =>
      Decimal.sub(
        this.portfolioStore.getBalanceFor(asset),
        this.aggregatedAssetAmounts[asset],
      ).greaterThanOrEqualTo(0), true)

    return isValidAddress(this.address) && this.assetAmountsValid && allAmountsNotExceedingBalance
  }

  // async getSnapshotBalance() {
  //   this.snapshotBalance = await this.txHistoryStore.fetchSnapshot()
  // }

  // @action
  // async getVote() {
  //   await this.txHistoryStore.fetch()
  //   const internalTx = this.txHistoryStore.transactions.map(t => t.txHash)
  //   const transactions = await getContractHistory(this.networkStore.chain, '00000000e3113f8bf9cf8b764d945d6f99c642bdb069d137bdd5f7e44f1e75947f58a044', 0, 10000000)
  //   if (isEmpty(this.txHistoryStore.transactions)) return false
  //   const tx = transactions
  //     .filter(t => this.networkStore.headers - t.confirmations
  //       >= Number(this.txHistoryStore.snapshotBlock))
  //     .map(t => t.txHash)
  //     .filter(e => internalTx.includes(e))
  //   if (tx) {
  //     const voteCommand = transactions.filter(t => t.txHash === tx[0])[0]
  //     this.votedCommit = !voteCommand ? this.commit : voteCommand.command
  //   }
  //   return !isEmpty(tx)
  // }

  // async signMessage(message: Buffer, path: Wallet.Path, password) {
  //   const seedString = await postWalletMnemonicphrase(password)
  //   const account = Wallet.fromMnemonic(seedString, this.networkStore.chainUnformatted === MAINNET ? 'main' : this.networkStore.chain.slice(0, -3), new Wallet.RemoteNodeWalletActions(this.networkStore.chainUnformatted === MAINNET ? 'https://remote-node.zp.io' : 'https://testnet-remote-node.zp.io'))
  //   try {
  //     this.inProgress = true
  //     const response = account.signMessage(message, path)
  //     runInAction(() => {
  //       this.status = 'success'
  //       setTimeout(() => {
  //         this.status = ''
  //       }, 15000)
  //     })
  //     this.inProgress = false
  //     return response
  //   } catch (error) {
  //     console.log(error)
  //   }
  // }

  @action
  resetData() {
    this.allocation = -1
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
}

export default CGPStore
