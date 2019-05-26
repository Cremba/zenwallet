// @flow

import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import Flexbox from 'flexbox-react'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import moment from 'moment'
import ReactTable from 'react-table'
import { isEmpty, isNumber } from 'lodash'

import PasteButton from '../../components/PasteButton'
import { ref } from '../../utils/domUtils'
import Layout from '../../components/Layout/Layout'
import CgpStore from '../../stores/cgpStore'
import NetworkStore from '../../stores/networkStore'
import VoteStore from '../../stores/voteStore'
import BoxLabel from '../../components/BoxLabel/BoxLabel'
import IsValidIcon from '../../components/IsValidIcon'
import { isValidAddress } from '../../utils/helpers'
import FormResponseMessage from '../../components/FormResponseMessage'
import AmountInput from '../../components/AmountInput'
import { ZENP_MAX_DECIMALS, ZENP_MIN_DECIMALS } from '../../constants'
import ProtectedButton from '../../components/Buttons'
import { kalapasToZen } from '../../utils/zenUtils'
import ReactTablePagination from '../../components/ReactTablePagination'
import Loading from '../../components/Loading'
import CopyableTableCell from '../../components/CopyableTableCell'

type Props = {
  cgpStore: CgpStore,
  networkStore: NetworkStore,
  voteStore: VoteStore
};

@inject('cgpStore', 'networkStore', 'voteStore')
@observer
class CGP extends Component<Props> {
  state = {
    selected: '',
  }
  componentDidMount() {
    this.props.cgpStore.initPolling()
    this.props.networkStore.initPolling()
    this.props.voteStore.initPolling()
  }

  getNextDistribution = (headers) => Math.ceil((headers / this.props.cgpStore.intervalLength))

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

  get isToInvalid() {
    const { payoutAddress } = this.props.voteStore
    return !!payoutAddress && payoutAddress.length && !isValidAddress(payoutAddress)
  }

  get isToValid() {
    const { payoutAddress } = this.props.voteStore
    return !!payoutAddress && (payoutAddress.length > 0) && isValidAddress(payoutAddress)
  }

  renderAddressErrorMessage() {
    if (this.isToInvalid) {
      return (
        <div className="error input-message">
          <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
          <span>Destination Address is invalid</span>
        </div>
      )
    }
  }


  get columns() {
    return [
      {
        Header: 'Proposal Address',
        id: 'recipient',
        accessor: vote => <CopyableTableCell string={vote.recipient} isTx isReactTable />,
        headerStyle: { outline: 0 },
      },
      {
        Header: 'Requested Amount',
        id: 'amount',
        accessor: 'amount',
        headerStyle: { outline: 0 },
      },
      {
        Header: 'Votes',
        id: 'count',
        accessor: 'count',
        headerStyle: { outline: 0 },
      }]
  }

  renderErrorResponse() {
    const { statusPayout, errorMessage } = this.props.voteStore
    if (statusPayout !== 'error') {
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

  renderHasVoted() {
    const { pastPayoutAmount, pastPayoutAddress } = this.props.voteStore
    if (!isNumber(pastPayoutAmount) && isEmpty(pastPayoutAddress)) {
      return null
    }
    const { utilized } = this.props.voteStore
    return (
      <FormResponseMessage className="success vote-box-message" forceShow>
        <span>
          Currently you voted with a weight of {kalapasToZen(utilized)} ZP
          for an amount of {pastPayoutAmount} ZP to address: { ' ' }
          <span>
            <CopyableTableCell string={pastPayoutAddress} hideIcon normalText isSpan />.
          </span>
          {((this.props.cgpStore.txHistoryStore.lastBlockVoted === 'payout' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both') && isNumber(pastPayoutAmount)) ? ' The vote will appear after a mined block.' : ''}
        </span>
        <span className="devider" />
        <span>
          Your vote weight will change only if you spend. In case your
          balance increased before the tally block, you can always revote
          in order to have a bigger influence.
        </span>
      </FormResponseMessage>
    )
  }

  getData(payoutVote) {
    return payoutVote.map((item) => {
      const { amount, recipient, count } = item
      return [{ amount, recipient, count }]
    })
  }

  updateAmountDisplay = (amountDisplay) => {
    const { voteStore } = this.props
    voteStore.updateAmountDisplay(amountDisplay)
  }

  get areAllFieldsValid() {
    const { payoutAmount, payoutAddress } = this.props.voteStore
    return !!(payoutAmount && payoutAddress &&
      (payoutAmount <= this.props.cgpStore.fund) && this.isToValid)
  }

  get isSubmitButtonDisabled() {
    const { inprogress } = this.props.voteStore
    return inprogress || !this.areAllFieldsValid
  }

  updateAddressDisplay = (evt: SyntheticEvent<HTMLInputElement>) => {
    this.props.voteStore.payoutAddress = evt.currentTarget.value.trim()
  }

  onSubmitButtonClicked = async (confirmedPassword: string) => {
    this.props.voteStore.createPayoutVote(confirmedPassword)
  }
  onPasteClicked = (clipboardContents: string) => {
    this.props.voteStore.payoutAddress = clipboardContents
  }

  renderLoading() {
    const hasVoted =
      (this.props.cgpStore.txHistoryStore.lastBlockVoted === 'payout' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both')
      && isNumber(this.props.voteStore.pastPayoutAmount)
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

  renderVote() {
    const {
      voteStore: { payoutAmount, payoutAddress, inprogress },
      cgpStore: { totalFund },
    } = this.props
    return (
      <Flexbox flexDirection="column" className="vote" >
        <Flexbox className="vote-box" flexDirection="column" >
          <h3 className="vote-title">How would you like to vote for next distribution?</h3>
          <Flexbox flexDirection="column" className="destination-address-input form-row">
            <label htmlFor="to">Proposal Address</label>
            <Flexbox flexDirection="row" className="destination-address-input">

              <Flexbox flexDirection="column" className="full-width relative">
                <input
                  id="payoutAddress"
                  ref={ref('elTo').bind(this)}
                  name="payoutAddress"
                  type="text"
                  placeholder="Proposal address"
                  className={cx({ 'is-valid': this.isToValid, error: this.isToInvalid })}
                  onChange={this.updateAddressDisplay}
                  value={payoutAddress}
                  autoFocus
                />
                <IsValidIcon
                  isValid={isValidAddress(payoutAddress)}
                  className="input-icon"
                  hasColors
                  isHidden={!payoutAddress}
                />
                {this.renderAddressErrorMessage()}
              </Flexbox>
              <PasteButton
                className="button-on-right"
                onClick={this.onPasteClicked}
              />
            </Flexbox>
          </Flexbox>
          <Flexbox flexDirection="column" className="form-row">
            <AmountInput
              amount={payoutAmount}
              amountDisplay={payoutAmount}
              maxDecimal={ZENP_MAX_DECIMALS}
              minDecimal={ZENP_MIN_DECIMALS}
              maxAmount={totalFund}
              shouldShowMaxAmount
              exceedingErrorMessage="Insufficient tokens in the CGP fund"
              onAmountDisplayChanged={this.updateAmountDisplay}
              label="Requested Amount"
              classname="amount"
            />
          </Flexbox>

          <Flexbox flexDirection="row" justifyContent="flex-end" className="form-row button-row">

            <ProtectedButton
              className={cx('button-on-right', { loading: inprogress })}
              disabled={this.isSubmitButtonDisabled}
              onClick={this.onSubmitButtonClicked}
            >
              {inprogress ? 'Voting' : 'Vote'}
            </ProtectedButton>

          </Flexbox>

        </Flexbox>
        { this.renderHasVoted() }
        { this.renderErrorResponse() }
      </Flexbox>
    )
  }

  onRowClicked = (index) => {
    const { payoutVote } = this.props.cgpStore
    const { amount, recipient } = payoutVote[index]
    this.updateAmountDisplay((parseInt(amount, 10)))
    this.props.voteStore.payoutAddress = recipient
    setTimeout(() => { this.setState({ selected: '' }) }, 2000)
  }

  getTallyBlock() {
    const { currentInterval, intervalLength } = this.props.cgpStore
    return ((+currentInterval + 1) * +intervalLength) + 1
  }

  calculateRows(payoutVote) {
    if (payoutVote.length < 7) {
      return payoutVote.length === 0 ? 1 : payoutVote.length
    }
    return 7
  }

  render() {
    const {
      cgpStore: {
        fund, totalFund, totalPayoutAmountVoted, payoutVote, error, resultPayout, txHistoryStore,
      },
      voteStore: {
        pastPayoutAmount,
      },
    } = this.props
    const { lastBlockVoted } = txHistoryStore
    const hasVoted: boolean = ((lastBlockVoted === 'payout' || lastBlockVoted === 'both') && isNumber(pastPayoutAmount))
    return (
      <Layout className="GCP">
        <Flexbox flexDirection="column" className="CGP-container">
          <Flexbox justifyContent="space-between" flexDirection="column">
            <Flexbox flexDirection="column" className="page-title">
              <h1>Common Goods Pool</h1>
              <h3 className="page-title" >
                Every 10,000 blocks (100 blocks for the testnet)
                funds are distributed from the CGP to the winning proposal.
                Users can influence the outcome on a coin-weighted basis by voting on their
                preferred proposal prior to the end of the interval.
                A proposal ‘ballot’ consists of both an <span className="bold">address</span> and an <span className="bold">amount</span>.
                Note that ‘ballots’ which pay to the same address
                but a different amount will be considered different ballots.
              </h3>
              <hr className="line-break" />
              <span className="page-subtitle">
                Next estimated distribution: {this.calcNextDistribution().format('MMMM DD, YYYY')}
                { ' ' } | Time remaining until end of voting period: {this.calcTimeRemaining()}
              </span>
            </Flexbox>
          </Flexbox>
          <Flexbox flexDirection="row" className="box-bar">
            <BoxLabel firstLine="Tally Block/ Remaining blocks" secondLine={`${this.getTallyBlock()} / ${this.calcRemainingBlock()}`} className="magnify" />
            <BoxLabel firstLine="CGP Balance (Currently / End of interval)" secondLine={`${fund ? kalapasToZen(fund) : 0} / ${totalFund} ZP`} className="magnify" />
            <BoxLabel firstLine="ZP have participated in the vote" secondLine={`${totalPayoutAmountVoted ? kalapasToZen(totalPayoutAmountVoted) : 0} ZP`} className="magnify" />
            <BoxLabel
              firstLine="Previous Winner"
              secondLine={(
                resultPayout ?
                  <span>
                    <CopyableTableCell string={resultPayout.recipient} hideIcon isSpan />
                    { ' ' }/ {kalapasToZen(resultPayout.amount)} ZP
                  </span>
              :
                  <span>
                   No winner in last payout
                  </span>)}
              className="magnify"
            />
          </Flexbox>
          <Flexbox flexDirection="row">
            <Flexbox flexDirection="column" width="100%" >
              { this.renderVote() }
            </Flexbox>
            <Flexbox className="active-proposal" flexDirection="column" >
              <Flexbox className="proposal" flexDirection="column" >
                <Flexbox flexDirection="row" justifyContent="space-between" className="word-labels">

                  <Flexbox flexDirection="row">
                    <label className="vote-title">Current Distribution Votes</label>
                  </Flexbox>
                  {((this.props.cgpStore.txHistoryStore.lastBlockVoted === 'payout' || this.props.cgpStore.txHistoryStore.lastBlockVoted === 'both')
                    && isNumber(this.props.voteStore.pastPayoutAmount)) &&
                    <Flexbox flexDirection="row" justifyContent="flex-end">
                      <label className="vote-title" >{this.renderLoading()}</label>
                    </Flexbox>}
                </Flexbox>
                <Flexbox flexDirection="row">
                  <ReactTable
                    manual
                    className="align-left-headers"
                    minRows={this.calculateRows(payoutVote)}
                    resizable={false}
                    sortable={false}
                    PaginationComponent={ReactTablePagination}
                    data={error === 'No Data' ? [] : payoutVote}
                    showPagination={false}
                    sortedData
                    columns={this.columns}
                    noDataText="No votes in this interval yet"
                    NoDataComponent={hasVoted ? Loading : React.Fragment.defaultProps}
                    getTrProps={(state, rowInfo) => {
                      if (rowInfo && rowInfo.row) {
                        return {
                          onClick: () => {
                            this.setState({
                              selected: rowInfo.index,
                            })
                            this.onRowClicked(rowInfo.index)
                          },
                          style: {
                            background: rowInfo.index === this.state.selected ? 'white' : '',
                            color: rowInfo.index === this.state.selected ? 'black' : '',
                          },
                        }
                      }
                        return {}
                    }
                  }
                  />
                </Flexbox>
              </Flexbox>
            </Flexbox>
          </Flexbox>
        </Flexbox>
      </Layout>
    )
  }
}

export default CGP
