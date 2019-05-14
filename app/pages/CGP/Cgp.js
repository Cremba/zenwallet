// @flow

import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import Flexbox from 'flexbox-react'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import moment from 'moment'
import ReactTable from 'react-table'

import PasteButton from '../../components/PasteButton'
import { ref } from '../../utils/domUtils'
import Layout from '../../components/Layout/Layout'
import CgpStore from '../../stores/cgpStore'
import NetworkStore from '../../stores/networkStore'
import VoteStore from '../../stores/voteStore'
import BoxLabel from '../../components/BoxLabel/BoxLabel'
import IsValidIcon from '../../components/IsValidIcon'
import { isValidAddress, truncateString } from '../../utils/helpers'
import FormResponseMessage from '../../components/FormResponseMessage'
import AmountInput from '../../components/AmountInput'
import { ZENP_MAX_DECIMALS, ZENP_MIN_DECIMALS } from '../../constants'
import ProtectedButton from '../../components/Buttons'
import { kalapasToZen } from '../../utils/zenUtils'
import ReactTablePagination from '../../components/ReactTablePagination'
import Loading from '../../components/Loading'


const intervalLength = 100


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

  getNextDistribution = (headers) => Math.ceil((headers / intervalLength))

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
    const { headers } = this.props.networkStore
    return (this.getNextDistribution(headers) * intervalLength) - headers
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
        accessor: vote => truncateString(vote.recipient),
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

  renderSuccessResponse() {
    if (this.props.voteStore.statusPayout !== 'success') {
      return null
    }
    return (
      <FormResponseMessage className="success">
        <span>Successfully voted, the vote will appear after a mined block.</span>
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
    // $FlowFixMe
    this.elTo.focus()
  }

  renderVote() {
    const {
      voteStore: { payoutAmount, payoutAddress, inprogress },
      cgpStore: { totalFund },
    } = this.props
    return (
      <Flexbox>
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

  renderResult() {
    const { resultPayout } = this.props.cgpStore
    return (
      <Flexbox className="payout-result" flexGrow={1} flexDirection="column" >
        <Flexbox className="result" flexDirection="column" >
          <h3 className="vote-title">Previous Distribution</h3>
          <Flexbox flexDirection="row" flexGrow={1} >
            <table>
              <thead>
                <tr>
                  <th className="align-left">Proposal Address</th>
                  <th className="align-left">Requested Amount</th>
                </tr>
                <tr className="separator" />
              </thead>
              { resultPayout &&
              <tbody>
                <td>{resultPayout.recipient ? truncateString(resultPayout.recipient) : ''}</td>
                <td>{resultPayout.amount ? kalapasToZen(resultPayout.amount) : 0} ZP</td>
              </tbody>}
            </table>
          </Flexbox>
        </Flexbox>
      </Flexbox>)
  }

  getTotalFund() {

  }

  render() {
    const {
      cgpStore: {
        fund, totalFund, totalPayoutAmountVoted, payoutVote, error,
      },
      voteStore: {
        statusPayout,
      },
    } = this.props
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
              </span>
            </Flexbox>
          </Flexbox>
          <Flexbox flexDirection="row" className="box-bar">
            <BoxLabel firstLine={`${fund ? kalapasToZen(fund) : 0} ZP/ ${totalFund} ZP`} secondLine="Currently in the CGP" className="magnify" />
            <BoxLabel firstLine={`${totalPayoutAmountVoted ? kalapasToZen(totalPayoutAmountVoted) : 0} ZP`} secondLine="ZP have participated in the vote" className="magnify" />
            <BoxLabel firstLine={this.calcRemainingBlock()} secondLine="Blocks remaining until end of voting period" />
            <BoxLabel firstLine={this.calcTimeRemaining()} secondLine="Time remaining until end of voting period" />
          </Flexbox>
          <Flexbox flexDirection="row" >
            <Flexbox flexDirection="column" flexGrow={1} >
              { this.renderVote() }
              { this.renderResult() }
              { this.renderSuccessResponse() }
              { this.renderErrorResponse() }
            </Flexbox>
            <Flexbox className="active-proposal" flexGrow={1} flexDirection="column" >
              <Flexbox className="proposal" flexDirection="column" >
                <h3 className="vote-title">Current Distribution Votes</h3>
                <Flexbox flexDirection="row" flexGrow={1} >
                  <ReactTable
                    manual
                    className="align-left-headers"
                    minRows={6}
                    resizable={false}
                    sortable={false}
                    PaginationComponent={ReactTablePagination}
                    data={error === 'No Data' ? [] : payoutVote}
                    showPagination={payoutVote.length >= 6}
                    columns={this.columns}
                    LoadingComponent={statusPayout === 'success' ? Loading : React.Fragment.defaultProps}
                    loading={statusPayout === 'success'}
                    previousText={<FontAwesomeIcon icon={['fas', 'angle-double-left']} />}
                    nextText={<FontAwesomeIcon icon={['fas', 'angle-double-right']} />}
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
