import { observable, action, runInAction } from 'mobx'
import { isEmpty } from 'lodash'

import { getCgp, getGenesisTimestamp } from '../services/api-service'
import PollManager from '../utils/PollManager'
import { kalapasToZen } from '../utils/zenUtils'


class CgpStore {
  @observable intervalLength = 100 // TODO: edit 100 for final release
  @observable allocationVote = []
  @observable resultAllocation = ''
  @observable totalPayoutAmountVoted = 0
  @observable totalAllocationAmountVoted = 0
  @observable payoutVote = [Object]
  @observable resultPayout = ''
  @observable error = ''
  @observable totalFund = 0
  @observable genesisTimestamp = 0
  currentInterval = 0
  fetchPollManager = new PollManager({
    name: 'Cgp fetch',
    fnToPoll: this.fetch,
    timeoutInterval: 1500,
  })

  constructor(networkStore) {
    this.networkStore = networkStore
  }

  @action
  initPolling() {
    this.fetchPollManager.initPolling()
  }
  @action
  stopPolling() {
    this.fetchPollManager.stopPolling()
  }

  get getFund() {
    return kalapasToZen(+this.fund) +
      ((((this.currentInterval + 1) * (this.intervalLength)) - this.networkStore.headers)
      * ((this.resultAllocation / 100) * 50))
  }

  @action.bound
  async fetch() {
    try {
      const cgp = await getCgp()
      const { tallies } = cgp
      runInAction(() => {
        this.currentInterval = Math.floor(this.networkStore.headers / this.intervalLength)
        this.resultAllocation = cgp.resultAllocation
        this.resultPayout = isEmpty(cgp.resultPayout) ? undefined : cgp.resultPayout
        this.fund = cgp.fund
        this.totalFund = this.getFund
        if (isEmpty(tallies)) {
          this.allocationVote = []
          this.payoutVote = []
          this.totalAllocationAmountVoted = 0
          this.totalPayoutAmountVoted = 0
          this.error = 'No Data'
        } else {
          const currentTally = tallies.filter(data => data.interval === this.currentInterval)[0]
          this.interval = currentTally.interval
          this.allocationVote =
            !isEmpty(currentTally.allocation) ? currentTally.allocation.votes : []
          this.totalAllocationAmountVoted =
            this.getAmountVoted(this.allocationVote)
          this.payoutVote =
            !isEmpty(currentTally.payout) ? this.setData(currentTally.payout.votes) : []
          this.totalPayoutAmountVoted =
            this.getAmountVoted(currentTally.payout.votes ? currentTally.payout.votes : [])
          this.error = ''
        }
      })
    } catch (err) {
      console.error('error getting cgp', err)
      runInAction(() => { this.error = 'Error getting cgp' })
    }
    const coinBaseTimestamp = await getGenesisTimestamp()
    runInAction(() => {
      this.genesisTimestamp = coinBaseTimestamp
    })
  }

  setData(payoutVote) {
    return payoutVote.map(vote => {
      const { recipient, amount, count } = vote
      return { recipient, amount: `${kalapasToZen(amount)} ZP`, count: `${kalapasToZen(count)} ZP` }
    })
  }

  getAmountVoted(votes: Array) {
    if (isEmpty(votes)) {
      return
    }
    return votes
      .map(vote => Number(vote.count))
      .reduce((amount, voteCount) => amount + voteCount, 0)
  }
}

export default CgpStore
