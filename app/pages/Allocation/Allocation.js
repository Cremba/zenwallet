import { inject, observer } from 'mobx-react'
import React, { Component } from 'react'
import Slider from 'rc-slider'
import Flexbox from 'flexbox-react'
import moment from 'moment'
import cx from 'classnames'
import * as mobx from 'mobx'
import { isEmpty, isNumber } from 'lodash'

import CgpStore from '../../stores/cgpStore'
import NetworkStore from '../../stores/networkStore'
import VoteStore from '../../stores/voteStore'
import Layout from '../../components/Layout/Layout'
import BoxLabel from '../../components/BoxLabel/BoxLabel'
import ProtectedButton from '../../components/Buttons'
import ChartLoader from '../../components/Chart'
import { kalapasToZen } from '../../utils/zenUtils'
import FormResponseMessage from '../../components/FormResponseMessage'
import Loading from '../../components/Loading'

const marks = {
  20: '',
  30: '',
  40: '',
  50: '',
  60: '',
  70: '',
  80: '',
  90: '',
}

type State = {
  value: number
};

type Props = {
  cgpStore: CgpStore,
  networkStore: NetworkStore,
  voteStore: VoteStore
};

@inject('cgpStore', 'networkStore', 'voteStore')
@observer
class Allocation extends Component<Props, State> {
  state = {
    value: this.props.voteStore.pastAllocation || 50,
  }
  componentDidMount() {
    this.props.cgpStore.initPolling()
    this.props.voteStore.initPolling()
  }
  componentWillUnmount() {
    this.props.cgpStore.stopPolling()
    this.props.voteStore.stopPolling()
  }

  calcNextDistribution = () => {
    const { genesisTimestamp } = this.props.cgpStore
    const missingBlocks =
      (((+this.props.cgpStore.currentInterval + 1) * this.props.cgpStore.intervalLength)
        - this.props.networkStore.headers)
    const time = genesisTimestamp + (missingBlocks * 240000)
    return moment(new Date(time))
  }

  calcTimeRemaining = () => {
    const time = this.calcRemainingBlock() * 4
    const days = Math.floor(time / (24 * 60))
    const hours = Math.floor((time - (days * 24 * 60)) / 60)
    const minutes = Math.floor(time - (days * 24 * 60) - (hours * 60))
    const dayAdded = days === 0 ? '' : `${days} ${days === 1 ? 'day,' : 'days,'}`
    const hourAdded = hours === 0 ? '' : `${hours} ${hours === 1 ? 'hour,' : 'hours,'}`
    return `${dayAdded} ${hourAdded}  ${minutes} minutes`
  }

  calcRemainingBlock = () => {
    const { headers } = this.props.networkStore
    const { intervalLength } = this.props.cgpStore
    return ((this.getNextDistribution(headers) * intervalLength) - headers) + 1
  }

  getNextDistribution = (headers) => Math.ceil((headers / this.props.cgpStore.intervalLength))

  onChange = values => {
    this.setState({ value: 100 - values })
    this.props.voteStore.allocationAmount = 100 - +values
  }

  onSubmitButtonClicked = async (confirmedPassword: string) => {
    this.props.voteStore.createAllocationVote(confirmedPassword)
  }

  renderHasVoted() {
    const { utilized, pastAllocation } = this.props.voteStore
    if (!isNumber(pastAllocation)) {
      return null
    }
    return (
      <Flexbox className="vote-message">
        <FormResponseMessage className="success" forceShow >
          <span>
            Currently you voted with a weight of {kalapasToZen(utilized)} ZP for { pastAllocation }%
            to the CGP. {((this.props.cgpStore.txHistoryStore.lastBlockVoted === 'allocation' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both')
            && isNumber(pastAllocation)) ? 'Loading your vote...' : ''}
          </span>
          <span className="devider" />
          <span>
            Your vote weight will change only if you spend. In case your
            balance increased before the tally block, you can always revote
            in order to have a bigger influence.
          </span>
        </FormResponseMessage>
      </Flexbox>
    )
  }

  renderErrorResponse() {
    const { statusAllocation, errorMessage } = this.props.voteStore
    if (statusAllocation !== 'error') {
      return null
    }
    return (
      <FormResponseMessage className="error">
        <span>There was a problem with creating the vote.</span>
        <span className="devider" />
        <p>Error message: {errorMessage}</p>
      </FormResponseMessage>
    )
  }

  get areAllFieldsValid() {
    const { allocationAmount } = this.props.voteStore
    if (!isNumber(allocationAmount)) return false
    return !!((allocationAmount >= 0) &&
      (allocationAmount <= 100))
  }

  get isSubmitButtonDisabled() {
    const { inprogress } = this.props.voteStore
    return inprogress || !this.areAllFieldsValid
  }

  get getData() {
    const { allocationVote } = this.props.cgpStore
    if (!isEmpty(allocationVote)) {
      const updateVote = mobx.toJS(allocationVote)
      return updateVote
    }
    return []
  }

  renderLoading() {
    const hasVoted = (this.props.cgpStore.txHistoryStore.lastBlockVoted === 'allocation' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both')
      && isNumber(this.props.voteStore.pastAllocation)
    return (
      <Flexbox>
        <Loading
          className="loading-in"
          loadingText={hasVoted ?
              ' Loading your vote...'
          :
              ' Loading...'}
        />
      </Flexbox>
    )
  }

  voteText = () => (isNumber(this.props.voteStore.pastAllocation) ? 'Revote' : 'Vote')

  renderPotentialOutcome() {
    const {
      voteStore: {
        outstanding, utilized, pastAllocation,
      },
    } = this.props
    console.log(this.props.cgpStore.txHistoryStore.lastBlockVoted)
    const zenCount = Number(utilized) + Number(outstanding)
    return (
      <Flexbox className="potential-outcome" flexDirection="column" flexGrow={1}>
        <Flexbox flexDirection="row" justifyContent="space-between" className="word-labels">
          <Flexbox flexDirection="row">
            <label>Potential Outcome</label>
          </Flexbox>
          {((this.props.cgpStore.txHistoryStore.lastBlockVoted === 'allocation' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both')
            && isNumber(this.props.voteStore.pastAllocation)) &&
            <Flexbox flexDirection="row" justifyContent="flex-end">
              <label>{this.renderLoading()}</label>
            </Flexbox>}
        </Flexbox>
        <Flexbox flexDirection="row" flexGrow={1} className="bar-chart">
          <ChartLoader
            chartName="currentVotes"
            externalChartData={this.getData}
            current={[{
              amount: this.state.value,
              count: pastAllocation === this.state.value ? outstanding : zenCount,
            }]}
          />
        </Flexbox>
      </Flexbox>
    )
  }

  renderVote() {
    const {
      voteStore: { inprogress },
    } = this.props
    return (
      <Flexbox className="allocation-container" flexDirection="column"flexGrow={1} >
        <Flexbox className="allocation-input" flexDirection="column" >
          <label className="allocation-title">How would you like to distribute the allocation?</label>

          <Flexbox flexDirection="row">

            <Flexbox flexDirection="column" className="slider-div" width="100%">

              <Flexbox flexDirection="row" justifyContent="space-between" className="word-labels">
                <Flexbox flexDirection="row">
                  <label>Miner Reward</label>
                </Flexbox>
                <Flexbox flexDirection="row" justifyContent="flex-end">
                  <label>Common Goods Pool</label>
                </Flexbox>
              </Flexbox>

              <Flexbox flexDirection="row" height="25px">
                <Slider
                  defaultValue={100 - this.state.value}
                  min={10}
                  max={100}
                  step={5}
                  onChange={this.onChange}
                  marks={marks}
                />

              </Flexbox>

              <Flexbox flexDirection="row" justifyContent="space-between" className="number-labels">
                <Flexbox flexDirection="row" >
                  <label>{100 - this.state.value}%</label>
                </Flexbox>
                <Flexbox flexDirection="row" justifyContent="flex-end">
                  <label>{this.state.value}%</label>
                </Flexbox>
              </Flexbox>

            </Flexbox>

            <Flexbox flexDirection="row" className="button-div">
              <ProtectedButton
                className={cx('allocation-button', { loading: inprogress })}
                disabled={this.isSubmitButtonDisabled}
                onClick={this.onSubmitButtonClicked}
              >
                {inprogress ? 'Voting' : this.voteText()}
              </ProtectedButton>
            </Flexbox>

          </Flexbox>


        </Flexbox>
        <Flexbox>
          { this.renderHasVoted() }
          { this.renderErrorResponse() }
        </Flexbox>
      </Flexbox>

    )
  }

  getTallyBlock() {
    const { currentInterval, intervalLength } = this.props.cgpStore
    return ((+currentInterval + 1) * +intervalLength) + 1
  }

  render() {
    const {
      cgpStore: {
        totalAllocationAmountVoted, resultAllocation, txHistoryStore,
      },
    } = this.props
    const { lastBlockVoted } = txHistoryStore
    if (!lastBlockVoted) this.props.voteStore.statusAllocation = ''
    return (
      <Layout className="allocation">
        <Flexbox flexDirection="column" className="allocation-container">
          <Flexbox className="page-title" flexDirection="column">
            <h1>Mining Reward</h1>
            <h3 className="page-title" >
              Vote for your preferred division of fund allocation
              between miners and the Common Goods Pool.
              Users can influence the outcome on a coin-weighted basis by
              voting on their preferred allocation correction prior to the end of the interval.
              Votes occur on a 10,000 block interval basis (100 blocks for the testnet).
              Allocation correction is capped to 50% (5% for the testnet) per interval.
            </h3>
            <hr />
            <span className="page-subtitle">
              Next estimated allocation correction: {this.calcNextDistribution().format('MMMM DD, YYYY')}
              { ' ' } | Time remaining until end of voting period: {this.calcTimeRemaining()}
            </span>
          </Flexbox>
          <Flexbox flexDirection="row" className="box-bar" >
            <BoxLabel firstLine="Tally Block" secondLine={this.getTallyBlock()} className="magnify" />
            <BoxLabel firstLine="Blocks remaining until tally" secondLine={this.calcRemainingBlock()} className="magnify" />
            <BoxLabel firstLine="Participated in the vote" secondLine={`${totalAllocationAmountVoted ? kalapasToZen(totalAllocationAmountVoted) : 0} ZP`} className="magnify" />
            <BoxLabel
              firstLine="Current Allocation"
              secondLine={(
                <span className="form-row td">
                  <span className="dot off-white" /> Miner Reward:
                  <span className="reward" > {100 - resultAllocation}%</span>
                  <span className="dot blue " /> CGP:
                  <span className="reward" >{resultAllocation}%</span>
                </span>)}
              className="box-current magnify"
            />
          </Flexbox>
          <Flexbox flexDirection="row">
            <Flexbox flexDirection="column" width="100%" className="votes">
              { this.renderVote() }
            </Flexbox>
            { this.renderPotentialOutcome() }
          </Flexbox>
        </Flexbox>
      </Layout>
    )
  }
}
export default Allocation
