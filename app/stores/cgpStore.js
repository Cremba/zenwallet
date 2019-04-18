import { observable, action, runInAction } from 'mobx'
import { isEmpty } from 'lodash'

import { getCgp, getGenesisTimestamp } from '../services/api-service'
import PollManager from '../utils/PollManager'
import { kalapasToZen } from '../utils/zenUtils'
import { truncateString } from '../utils/helpers'


class CgpStore {
  @observable allocationVote = []
  @observable resultAllocation = ''
  @observable totalPayoutVoted = 0
  @observable totalAllocationAmountVoted = 0
  @observable payoutVote = [Object]
  @observable resultPayout = ''
  @observable error = ''
  @observable genesisTimestamp = 0
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

  @action.bound
  async fetch() {
    try {
      const cgp = await getCgp()
      const currentInterval =
        Math.floor(this.networkStore.headers / 100) // TODO: edit 100 for final release
      runInAction(() => {
        this.resultAllocation = cgp.resultAllocation
        this.resultPayout = cgp.resultPayout
        this.fund = cgp.fund
        if (isEmpty(cgp.tallies)) this.error = 'No Data'
        else {
          const currentTally = cgp.tallies.filter(data => data.interval === currentInterval)[0]
          this.interval = currentTally.interval
          this.allocationVote = currentTally.allocation ? currentTally.allocation.votes : []
          this.totalAllocationAmountVoted = this.getAmountVoted(this.allocationVote)
          this.payoutVote = currentTally.payout ? this.setData(currentTally.payout.votes) : []
          this.totalPayoutAmountVoted = this.getAmountVoted(this.payoutVote)
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
      return { recipient: truncateString(recipient), amount: `${kalapasToZen(amount)} ZP`, count: `${kalapasToZen(count)} ZP` }
    })
  }

  getAmountVoted(votes: Array) {
    if (!votes) {
      return
    }
    return votes
      .map(vote => Number(vote.count))
      .reduce((amount, voteCount) => amount + voteCount, 0)
  }
}

export default CgpStore
