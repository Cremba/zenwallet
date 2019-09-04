/* eslint-disable no-mixed-operators */
// @flow
import { observable, action, autorun, reaction, computed, runInAction, toJS } from 'mobx'
import { last, findIndex, keys, find, isEqual, isEmpty } from 'lodash'
import { Decimal } from 'decimal.js'
import BigInteger from 'bigi'
import { Data } from '@zen/zenjs'
import { Hash } from '@zen/zenjs/build/src/Consensus/Types/Hash'
import { Allocation } from '@zen/zenjs/build/src/Consensus/Types/Allocation'
import { Ballot } from '@zen/zenjs/build/src/Consensus/Types/Ballot'
import { ContractId } from '@zen/zenjs/build/src/Consensus/Types/ContractId'
import Address from '@zen/zenjs/build/src/Components/Wallet/Address'

import { MAINNET } from '../constants/constants'
import {
  isValidAddress,
  numberWithCommas,
  payloadData,
  convertZPtoPercentage,
  toPayout,
  checkBallot,
  getAddress,
  snapshotBalance,
  format,
  convertPercentageToZP,
} from '../utils/helpers'
import { isZenAsset, kalapasToZen, zenBalanceDisplay } from '../utils/zenUtils'
import {
  getCgp,
  getCgpHistory,
  getCgpVotesFromExplorer,
  getCgpParticipatedZpFromExplorer,
  getCgpPopularBallotsFromExplorer,
  getContractBalance,
  getContractHistory,
  getContractTXHistory,
} from '../services/api-service'

class CGPStore {
  constructor(publicStore, networkStore, txHistoryStore, portfolioStore, authStore, runStore) {
    this.publicAddressStore = publicStore
    this.portfolioStore = portfolioStore
    this.networkStore = networkStore
    this.txHistoryStore = txHistoryStore
    this.authorizedProtocolStore = authStore
    this.runContractStore = runStore

    autorun(() => {
      if (this.ballotId) {
        this.deserializeBallotIdOnChange()
      }
    })

    // reaction ensures running only on the right change
    reaction(
      () =>
        !isEqual(this.address, this.ballotDeserialized.address) ||
        !isEqual(this.assetAmounts, this.ballotDeserialized.spends),
      () => this.removeBallotIdOnDetailsChange(),
    )
  }

  setAutoRuns() {
    // re-fetch when interval changes
    this.fetchDisposer = autorun(() => {
      if (this.networkStore.headers > 0) {
        this.fetch()
      }
    })
  }
  clearAutoRuns() {
    if (typeof this.fetchDisposer === 'function') {
      this.fetchDisposer()
    }
  }

  @observable snapshotBalanceAcc = 0
  @observable assetCGP = []
  @observable cgpCurrentBalance = 0
  @observable cgpCurrentZPBalance = 0
  @observable cgpCurrentAllocation = 0
  @observable cgpPrevAllocation = null
  @observable cgpCurrentPayout = 0
  @observable prevIntervalTxs = 0
  @observable prevIntervalZpVoted = 0
  @observable allocation = 0
  @observable ballotId = ''
  @observable ballotDeserialized = {}
  @observable ballotIdValid = false
  @observable allocationVoted = false
  @observable payoutVoted = false
  @observable pastAllocation = 0
  @observable pastBallotId = ''
  @observable popularBallots = { count: 0, items: [] }
  @observable popularBallotsCurrentAmount = 10
  @observable fetching = {
    popularBallots: false,
  }
  @observable address = ''
  @observable assetAmounts = [{ asset: '', amount: 0 }]
  @observable statusAllocation = {} // { status: 'success/error', errorMessage: '...' }
  @observable statusPayout = {} // { status: 'success/error', errorMessage: '...' }
  contractIdCgp = '00000000eac6c58bed912ff310df9f6960e8ed5c28aac83b8a98964224bab1e06c779b93' // does not change
  contractIdVote = '00000000abbf8805a203197e4ad548e4eaa2b16f683c013e31d316f387ecf7adc65b3fb2' // does not change

  @computed
  get addressCGP() {
    return Address.getPublicKeyHashAddress(
      this.networkStore.chainUnformatted,
      ContractId.fromString(this.contractIdCgp),
    )
  }

  @computed
  get addressVote() {
    return Address.getPublicKeyHashAddress(
      this.networkStore.chainUnformatted,
      ContractId.fromString(this.contractIdVote),
    )
  }

  getBalanceFor(asset) {
    const result = find(this.assets, { asset })
    return result ? result.balance : 0
  }

  @action
  async fetch() {
    return Promise.all([
      this.fetchCgp(),
      this.fetchAssets(),
      this.fetchPrevIntervalVoteCount(),
      this.fetchPrevIntervalAmountOfZpVoted(),
      (() => {
        if (this.popularBallots.items.length === 0) {
          return this.fetchPopularBallots()
        }
      })(),
    ])
  }

  @action
  async fetchCgp() {
    const [cgpCurrent, cgpPrev] = await Promise.all([
      getCgp(),
      this.currentInterval > 1 ? getCgpHistory({ interval: this.currentInterval - 1 }) : [],
    ])
    runInAction(() => {
      this.cgpCurrentAllocation = cgpCurrent.allocation
      this.cgpCurrentPayout = cgpCurrent.payout
      if (cgpPrev.length) {
        this.cgpPrevAllocation = cgpPrev[0].allocation
      }
    })
    const balance = await getContractBalance(
      this.networkStore.chainUnformatted,
      this.addressCGP,
      0,
      100000,
    )
    runInAction(() => {
      const filtered = balance.filter(data => data.asset === '00')[0]
      this.cgpCurrentZPBalance = filtered ? format(filtered.balance) : 0
      this.cgpCurrentBalance = balance
    })
  }

  @action
  async fetchPrevIntervalVoteCount() {
    if (this.currentInterval > 1) {
      const [responsePayout, responseAllocation] = await Promise.all([
        getCgpVotesFromExplorer({
          chain: this.networkStore.chain,
          interval: this.currentInterval - 1,
          type: 'payout',
        }),
        getCgpVotesFromExplorer({
          chain: this.networkStore.chain,
          interval: this.currentInterval - 1,
          type: 'allocation',
        }),
      ])
      runInAction(() => {
        if (responsePayout.success && responseAllocation.success) {
          this.prevIntervalTxs = responsePayout.data.count + responseAllocation.data.count
        }
      })
    }
  }

  @action
  async fetchPrevIntervalAmountOfZpVoted() {
    if (this.currentInterval > 1) {
      const [responsePayout, responseAllocation] = await Promise.all([
        getCgpParticipatedZpFromExplorer({
          chain: this.networkStore.chain,
          interval: this.currentInterval - 1,
          type: 'payout',
        }),
        getCgpParticipatedZpFromExplorer({
          chain: this.networkStore.chain,
          interval: this.currentInterval - 1,
          type: 'allocation',
        }),
      ])

      runInAction(() => {
        if (responsePayout.success && responseAllocation.success) {
          this.prevIntervalZpVoted = Decimal.add(
            responsePayout.data,
            responseAllocation.data,
          ).toNumber()
        }
      })
    }
  }

  @action
  async getVote(command, snapshotBlock) {
    await this.txHistoryStore.fetch()
    const internalTx = this.txHistoryStore.transactions.map(t => t.txHash)
    const transactions = await getContractHistory(
      this.networkStore.chain,
      this.contractIdVote,
      0,
      10000000,
    )
    if (isEmpty(this.txHistoryStore.transactions) || isEmpty(transactions)) return []
    const tx = transactions
      .filter(t => t.command === command)
      .filter(t => this.networkStore.headers - t.confirmations >= Number(snapshotBlock))
      .map(t => t.txHash)
      .filter(e => internalTx.includes(e))
    return tx
  }

  @action
  async hasVoted(command, snapshotBlock) {
    const vote = await this.getVote(command, snapshotBlock)
    return !isEmpty(vote)
  }

  async voted(command, snapshotBlock) {
    const votes = await this.getVote(command, snapshotBlock)
    const vote = votes[0]
    const transactions = await getContractHistory(
      this.networkStore.chain,
      this.contractIdVote,
      0,
      10000000,
    )
    const tx = transactions.find(t => t.txHash === vote)
    if (!tx) return
    const serialized = tx.messageBody.dict.find(txs => txs[0] === command)[1].string
    switch (command) {
      case 'Allocation':
        runInAction(() => {
          this.pastAllocation =
            convertPercentageToZP(Ballot.fromHex(serialized).getData().allocation)
        })
        break
      case 'Payout':
        runInAction(() => {
          this.pastBallotId = serialized
        })
        break
      default:
        break
    }
  }

  @action
  async fetchAssets() {
    if (this.snapshotBlock <= 0) return

    const [allocationVoted, payoutVoted, snapshotBalanceAcc] = await Promise.all([
      await this.hasVoted('Allocation', this.snapshotBlock),
      await this.hasVoted('Payout', this.snapshotBlock),
      await this.txHistoryStore.fetchSnapshot(this.snapshotBlock),
    ])
    runInAction(() => {
      this.allocationVoted = allocationVoted
      this.payoutVoted = payoutVoted
      this.snapshotBalanceAcc = snapshotBalanceAcc
    })
    if (this.isVotingInterval) {
      await Promise.all([
        this.voted('Allocation', this.snapshotBlock),
        await this.voted('Payout', this.snapshotBlock),
      ])
    }
    const transactions = await getContractTXHistory(
      this.networkStore.chain,
      this.addressCGP,
      0,
      65535,
    )
    runInAction(() =>
      this.assetCGP
        .replace(snapshotBalance(transactions, this.snapshotBlock, this.networkStore.blocks)))
  }

  @action
  async fetchPopularBallots() {
    if (
      this.fetching.popularBallots ||
      (this.popularBallots.items.length &&
        this.popularBallots.items.length >= this.popularBallots.count)
    ) {
      return
    }

    this.fetching.popularBallots = true
    const response = await getCgpPopularBallotsFromExplorer({
      chain: this.networkStore.chain,
      type: 'payout',
      pageSize: this.popularBallotsCurrentAmount,
      page: 0,
    })
    runInAction(() => {
      if (response.success) {
        this.popularBallots.count = response.data.count
        this.popularBallots.items.replace(response.data.items)
        this.popularBallotsCurrentAmount += 10
      }
      this.fetching.popularBallots = false
    })
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
  get isVotingInterval() {
    return (
      this.networkStore.headers > this.snapshotBlock && this.networkStore.headers <= this.tallyBlock
    )
  }

  @computed
  get currentInterval() {
    return Math.ceil(this.networkStore.headers / this.intervalLength)
  }

  @computed
  get snapshotBlock() {
    return (this.currentInterval - 1) * this.intervalLength + this.intervalLength * 0.9
  }

  @computed
  get tallyBlock() {
    return this.currentInterval * this.intervalLength
  }

  @computed
  get allocationZpMin() {
    if (this.cgpPrevAllocation === null) return 0
    const minerAmount = convertPercentageToZP(this.cgpPrevAllocation)
    return minerAmount / 0.85
  }

  @computed
  get allocationZpMax() {
    if (this.cgpPrevAllocation === null) return 7.5
    const minerAmount = 50 - convertPercentageToZP(this.cgpPrevAllocation)
    return minerAmount * 0.15
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

    return (
      isValidAddress(this.address, this.networkStore.chain) &&
      this.assetAmountsValid &&
      allAmountsNotExceedingBalance
    )
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
  updateBallotId(value) {
    this.ballotId = value
  }

  removeBallotIdOnDetailsChange() {
    if (
      !isEqual(this.address, this.ballotDeserialized.address) ||
      !isEqual(this.assetAmounts, this.ballotDeserialized.spends)
    ) {
      runInAction(() => {
        this.ballotId = ''
        this.ballotDeserialized = {}
        this.ballotIdValid = false
      })
    }
  }

  deserializeBallotIdOnChange() {
    if (checkBallot(this.ballotId)) {
      runInAction(() => {
        this.ballotIdValid = true
        const { data: payout } = Ballot.fromHex(this.ballotId)
        const { recipient, spends } = payout
        this.ballotDeserialized = payout
        this.address = Address.getPublicKeyHashAddress(
          this.networkStore.chainUnformatted,
          getAddress(recipient),
        )
        const assets = spends.map(spend => {
          const { asset, amount } = spend
          return { asset: asset.asset, amount: amount.intValue() }
        })
        this.assetAmounts.replace(assets)
      })
    } else {
      runInAction(() => {
        this.ballotIdValid = false
      })
    }
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
        const stringAllocation = 'Allocation'
        const all = new Allocation(convertZPtoPercentage(this.allocation))
        const ballot = new Ballot(all).toHex()
        const interval = Data.serialize(new Data.UInt32(BigInteger.valueOf(this.currentInterval)))
        const ballotSerialized = Data.serialize(new Data.String(ballot))
        const message = Hash.compute(interval.toString().concat(ballotSerialized)).bytes
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
              [stringAllocation, new Data.String(ballot)],
              ['Signature', new Data.Dictionary(signatures)],
            ]))
          .catch(error => console.log(error))
        await this.runContractStore.run(
          confirmedPassword,
          payloadData(this.addressVote, data, stringAllocation),
        )
        runInAction(() => {
          this.statusAllocation = { status: 'success' }
        })
      } catch (error) {
        runInAction(() => {
          this.statusAllocation = { status: 'error', errorMessage: error.message }
        })
      }
    }
  }

  @action
  submitPayoutVote = async (confirmedPassword: string) => {
    if (this.payoutValid) {
      try {
        const stringPayout = 'Payout'
        const payout = toPayout(this.networkStore.chainUnformatted, this.address, this.assetAmounts)
        const ballot = new Ballot(payout).toHex()
        const interval = Data.serialize(new Data.UInt32(BigInteger.valueOf(this.currentInterval)))
        const ballotSerialized = Data.serialize(new Data.String(ballot))
        const message = Hash.compute(interval.toString().concat(ballotSerialized)).bytes
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
              [stringPayout, new Data.String(ballot)],
              ['Signature', new Data.Dictionary(signatures)],
            ]))
          .catch(error => console.log(error))
        await this.runContractStore.run(
          confirmedPassword,
          payloadData(this.addressVote, data, stringPayout),
        )
        runInAction(() => {
          this.statusPayout = { status: 'success' }
        })
      } catch (error) {
        runInAction(() => {
          this.statusPayout = { status: 'error', errorMessage: error.message }
        })
      }
    }
  }
}

export default CGPStore
