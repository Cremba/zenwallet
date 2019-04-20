import { inject, observer } from 'mobx-react'
import React, { Component } from 'react'
import Slider from 'rc-slider'
import Flexbox from 'flexbox-react'
import moment from 'moment'
import cx from 'classnames'
import * as mobx from 'mobx'
import { isEmpty } from 'lodash'

import CgpStore from '../../stores/cgpStore'
import NetworkStore from '../../stores/networkStore'
import VoteStore from '../../stores/voteStore'
import Layout from '../../components/Layout/Layout'
import BoxLabel from '../../components/BoxLabel/BoxLabel'
import ProtectedButton from '../../components/Buttons'
import ChartLoader from '../../components/Chart'
import { kalapasToZen } from '../../utils/zenUtils'
import FormResponseMessage from '../../components/FormResponseMessage'

const intervalLength = 100
const marks = {
  10: '',
  20: '',
  30: '',
  40: '',
  50: '',
  60: '',
  70: '',
  80: '',
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
    const { headers } = this.props.networkStore
    const { genesisTimestamp } = this.props.cgpStore
    const time = genesisTimestamp + (headers * 240000) // 360) * 86400000)
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
    const { blocks } = this.props.networkStore
    return (this.getNextDistribution(blocks) * intervalLength) - blocks
  }

  getNextDistribution = (headers) => Math.ceil((headers / intervalLength))

  updateAmountDisplay = (amountDisplay) => {
    const { voteStore } = this.props
    voteStore.updateAmountDisplay(amountDisplay)
  }

  onChange = values => {
    this.setState({ value: values })
    this.props.voteStore.allocationAmount = Number(values)
  }

  onSubmitButtonClicked = async (confirmedPassword: string) => {
    this.props.voteStore.createAllocationVote(confirmedPassword)
  }

  renderSuccessResponse() {
    if (this.props.voteStore.status !== 'success') {
      return null
    }
    return (
      <FormResponseMessage className="success">
        <span>Successfully voted, the vote will appear after a mined block.</span>
      </FormResponseMessage>
    )
  }

  renderErrorResponse() {
    const { status, errorMessage } = this.props.voteStore
    if (status !== 'error') {
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
    return !!((allocationAmount > 0) &&
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
    return [{
      amount: 0,
      count: 1,
    }]
  }

  renderVote() {
    const {
      voteStore: { inprogress },
    } = this.props
    return (
      <Flexbox className="allocation-container" flexDirection="column"flexGrow={2} >
        <Flexbox className="allocation-input" flexDirection="column" >
          <label className="allocation-title">How would you like to distribute the allocation?</label>

          <Flexbox flexDirection="row">

            <Flexbox flexDirection="column" className="slider-div" width="100%">

              <Flexbox flexDirection="row" justifyContent="space-between" className="word-labels">
                <Flexbox flexDirection="row">
                  <label>CGP</label>
                </Flexbox>
                <Flexbox flexDirection="row" justifyContent="flex-end">
                  <label>Miner reward</label>
                </Flexbox>
              </Flexbox>

              <Flexbox flexDirection="row" height="25px">
                <Slider
                  defaultValue={this.state.value}
                  min={0}
                  max={90}
                  step={10}
                  onChange={this.onChange}
                  marks={marks}
                />

              </Flexbox>

              <Flexbox flexDirection="row" justifyContent="space-between" className="number-labels">
                <Flexbox flexDirection="row">
                  <label>{this.state.value}%</label>
                </Flexbox>
                <Flexbox flexDirection="row" justifyContent="flex-end">
                  <label>{100 - this.state.value}%</label>
                </Flexbox>
              </Flexbox>

            </Flexbox>

            <Flexbox flexDirection="row" className="button-div">
              <ProtectedButton
                className={cx('allocation-button', { loading: inprogress })}
                disabled={this.isSubmitButtonDisabled}
                onClick={this.onSubmitButtonClicked}
              >
                {inprogress ? 'Voting' : 'Vote'}
              </ProtectedButton>
            </Flexbox>

          </Flexbox>


        </Flexbox>
        <Flexbox className="allocation-response">
          { this.renderSuccessResponse() }
          { this.renderErrorResponse() }
        </Flexbox>
      </Flexbox>

    )
  }

  render() {
    const {
      cgpStore: {
        totalAllocationAmountVoted, resultAllocation, error,
      },
      voteStore: {
        outstanding, utilized, pastAllocation, status,
      },
    } = this.props
    const zenCount = Number(utilized) + Number(outstanding)
    return (
      <Layout className="allocation">
        <Flexbox flexDirection="column" className="allocation-container">
          <Flexbox className="page-title" flexDirection="column">
            <h1>Mining Allocation</h1>
            <h3>
              Vote for your preferred division of fund allocation
              between miners and the Common Goods Pool.
              Users can influence the outcome on a coin-weighted basis by
              voting on their preferred allocation correction prior to the end of the interval.
              Votes occur on a 10,000 block interval basis (100 blocks for the testnet).
              Allocation correction is capped to 15% (5% for the testnet) per interval.
            </h3>
            <hr />
            <span className="page-subtitle">
              Next estimated allocation correction: {this.calcNextDistribution().format('MMMM DD, YYYY')}
            </span>
          </Flexbox>
          <Flexbox flexDirection="row" className="box-bar" >
            <BoxLabel firstLine={this.calcTimeRemaining()} secondLine="Time remaining until end of voting period" />
            <BoxLabel firstLine={this.calcRemainingBlock()} secondLine="Blocks remaining until end of voting period" />
            <BoxLabel firstLine={`${totalAllocationAmountVoted ? kalapasToZen(totalAllocationAmountVoted) : 0} ZP`} secondLine="ZP have participated in the vote" />
            <BoxLabel
              firstLine="Current Allocation"
              secondLine={(
                <span className="form-row td">
                  <span className="dot blue" /> CGP:
                  <span className="reward" >{resultAllocation}%</span>
                  <span className="dot off-white" /> Miner reward:
                  <span className="reward" > {100 - resultAllocation}%</span>
                </span>)}
              className="box"
            />
          </Flexbox>
          <Flexbox flexDirection="row">
            { this.renderVote() }

            <Flexbox className="potential-outcome" flexDirection="column" flexGrow={1}>
              <label className="allocation-title">Potential Outcome</label>
              <div className="bar-chart">
                <ChartLoader
                  chartName="currentVotes"
                  showTitle={false}
                  externalChartData={this.getData}
                  externalChartLoading={error === 'No Data' || status === 'success'}
                  current={[{
                    amount: this.state.value,
                    count: pastAllocation === this.state.value ? outstanding : zenCount,
                  }]}
                  // TODO: add onclick event
                />
              </div>
            </Flexbox>
          </Flexbox>
        </Flexbox>
      </Layout>
    )
  }
}
export default Allocation