import { observable, action, runInAction, toJS } from 'mobx'
import { isEmpty, isNumber } from 'lodash'

import { getUtilization, postAllocationVote, postPayoutVote } from '../services/api-service'
import PollManager from '../utils/PollManager'
import { kalapasToZen } from '../utils/zenUtils'


class VoteStore {
  @observable allocationAmount = ''
  @observable payoutAddress = ''
  @observable payoutAmount = ''
  @observable pastAllocation = ''
  @observable pastPayoutAmount = ''
  @observable pastPayoutAddress = ''
  @observable pastPayout = ''
  @observable outstanding = -1
  @observable utilized = -1
  @observable inprogress = false
  @observable errorMessage = ''
  fetchPollManager = new PollManager({
    name: 'Vote Store fetch',
    fnToPoll: this.fetch,
    timeoutInterval: 2500,
  })

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
      const response = await getUtilization()
      runInAction(() => {
        this.outstanding = response.outstanding
        this.utilized = response.utilized
        if (response.vote) {
          this.pastAllocation = isNumber(response.vote.allocation) ? response.vote.allocation : null
          if (!isEmpty(response.vote.payout)) {
            // TODO: handle past data
            this.pastPayout = toJS(response.vote.payout)
            this.pastPayoutAmount = kalapasToZen(this.pastPayout.amount)
            this.pastPayoutAddress = this.pastPayout.recipient
          } else {
            this.pastPayout = ''
            this.pastPayoutAmount = ''
            this.pastPayoutAddress = ''
          }
        } else {
          this.pastPayoutAddress = ''
          this.pastPayoutAmount = ''
          this.pastAllocation = ''
          this.pastPayout = ''
        }
        this.error = ''
      })
    } catch (err) {
      console.error('error getting cgp', err)
      runInAction(() => { this.error = 'Error getting cgp' })
    }
  }

  @action.bound
  async createAllocationVote(password) {
    try {
      this.inprogress = true
      const data = {
        allocation: this.allocationAmount,
        password,
      }
      const response = await postAllocationVote(data)
      runInAction(() => {
        console.log('createAllocationVote response', response)
        this.reset()
        this.statusAllocation = 'success'
        setTimeout(() => {
          this.statusAllocation = ''
        }, 50000)
      })
    } catch (error) {
      runInAction(() => {
        console.error('createTransaction error', error, error.response)
        this.errorMessage = error.response.data
      })
      this.inprogress = false
      this.statusAllocation = 'error'
      setTimeout(() => {
        this.statusAllocation = ''
      }, 15000)
    }
  }


  @action.bound
  async createPayoutVote(password) {
    try {
      this.inprogress = true
      const data = {
        payout: {
          recipient: this.payoutAddress,
          amount: this.payoutAmount,
        },
        password,
      }
      const response = await postPayoutVote(data)

      runInAction(() => {
        console.log('createPayoutVote response', response)
        this.reset()
        this.statusPayout = 'success'
        setTimeout(() => {
          this.statusPayout = ''
        }, 15000)
      })
    } catch (error) {
      runInAction(() => {
        console.error('createTransaction error', error, error.response)
        this.errorMessage = error.response.data
      })
      this.inprogress = false
      this.statusPayout = 'error'
      setTimeout(() => {
        this.statusPayout = ''
      }, 15000)
    }
  }

  @action
  updateAmountDisplay(amountDisplay) {
    this.payoutAmount = amountDisplay
  }

  @action
  updateAddressDisplay(addressDisplay) {
    this.payoutAddress = addressDisplay
  }

  reset() {
    this.inprogress = false
    this.errorMessage = ''
  }
}

export default VoteStore
