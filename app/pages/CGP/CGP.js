/* eslint-disable react/prop-types */
// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'

import { truncateString } from '../../utils/helpers'
import Layout from '../../components/Layout'
// import Loading from '../../components/Loading'
// import IsValidIcon from '../../components/IsValidIcon'
import { protectedModals } from '../../components/Buttons/ProtectedButton'
import FormResponseMessage from '../../components/FormResponseMessage'

import AllocationForm from './components/AllocationForm'
import PayoutForm from './components/PayoutForm'
import InfoBoxes from './components/InfoBoxes'
import voteOnceModal from './components/voteOnceModal'
import BallotsTable from './components/BallotsTable'

@inject(
  'cgpStore',
  'publicAddressStore',
  'portfolioStore',
  'networkStore',
  'runContractStore',
  'authorizedProtocolStore',
)
@observer
class CGP extends Component {
  state = {
    inProgressAllocation: false,
    inProgressPayout: false,
  }
  componentDidMount() {
    this.props.cgpStore.resetStatuses()
    this.props.networkStore
      .fetch()
      .then()
      .catch()
    this.props.cgpStore
      .fetch()
      .then()
      .catch()
  }

  resetPayoutForm = () => this.props.cgpStore.resetPayout()

  submitAllocationVote = async () => {
    const confirmedVoteOnce = await voteOnceModal()
    if (!confirmedVoteOnce) return
    this.setState({ inProgressAllocation: true })
    // prevent enter from closing the new swal HACK
    setTimeout(async () => {
      try {
        const password = await protectedModals()
        await this.props.cgpStore.submitAllocationVote(password)
      } catch (error) {
        console.log(error.message)
      }
      this.setState({ inProgressAllocation: false })
    }, 100)
  }

  submitPayoutVote = async () => {
    const confirmedVoteOnce = await voteOnceModal()
    if (!confirmedVoteOnce) return
    this.setState({ inProgressPayout: true })
    // prevent enter from closing the new swal HACK
    setTimeout(async () => {
      try {
        const password = await protectedModals()
        await this.props.cgpStore.submitPayoutVote(password)
      } catch (error) {
        console.log(error.message)
      }
      this.setState({ inProgressPayout: false })
    }, 100)
  }

  renderAllocationErrorResponse() {
    const {
      statusAllocation: { status, errorMessage },
    } = this.props.cgpStore
    return <ErrorResponse type="allocation" hide={status !== 'error'} errorMessage={errorMessage} />
  }

  renderPayoutErrorResponse() {
    const {
      statusPayout: { status, errorMessage },
    } = this.props.cgpStore
    return <ErrorResponse type="payout" hide={status !== 'error'} errorMessage={errorMessage} />
  }

  renderAllocationSuccessResponse() {
    const { allocationVoted, pastAllocation, snapshotBalanceAcc } = this.props.cgpStore
    return (
      <SuccessResponse
        type="Allocation"
        hide={!allocationVoted}
        message={`You voted for ${pastAllocation} Zp with ${snapshotBalanceAcc} `}
      />
    )
  }

  renderPayoutSuccessResponse() {
    const { payoutVoted, pastBallotId, snapshotBalanceAcc } = this.props.cgpStore
    return (
      <SuccessResponse
        type="Payout"
        hide={!payoutVoted}
        message={`You voted for BallotId: ${truncateString(pastBallotId)} with ${snapshotBalanceAcc} `}
      />
    )
  }

  render() {
    const {
      cgpStore: {
        payoutValid,
        allocationValid,
        payoutHasData,
        snapshotBlock,
        allocationVoted,
        payoutVoted,
      },
      networkStore: { blocks: currentBlock },
    } = this.props

    const isDuringVote = currentBlock > snapshotBlock

    return (
      <Layout className="cgp">
        <Flexbox flexDirection="column" className="send-tx-container">
          <Flexbox flexDirection="column" className="page-title">
            <h1>Common Goods Pool</h1>
            <h3>
              Every 10,000 blocks (100 blocks for the testnet) funds are distributed from the CGP to
              the winning proposal. Users can influence the outcome on a coin-weighted basis by
              voting on their preferred proposal prior to the end of the interval. A proposal
              ‘ballot’ consists of both an <span className="bold">address</span> and an{' '}
              <span className="bold">amount</span>. Note that ‘ballots’ which pay to the same
              address but a different amount will be considered different ballots.
            </h3>
          </Flexbox>

          <section>
            <InfoBoxes />
          </section>

          {!isDuringVote && (
            <Flexbox flexGrow={2} flexDirection="row" className="form-response-message warning">
              <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
              <Flexbox flexDirection="column">
                <p>
                  Voting will be possible only after snapshot. Your vote weight will consist of your
                  total ZP at the snapshot block.
                </p>
              </Flexbox>
            </Flexbox>
          )}

          {isDuringVote && (
            <Flexbox>
              <Flexbox flexGrow={1} flexDirection="column" className="form-container">
                <section>
                  <Flexbox
                    flexDirection="column"
                    className={cx('allocation-form-container', { invalid: !allocationValid })}
                  >
                    <Flexbox className="section-title">
                      <h1>CGP Allocation</h1>
                    </Flexbox>
                    <AllocationForm />
                  </Flexbox>
                  <Flexbox justifyContent="space-between" flexDirection="row">
                    {this.renderAllocationErrorResponse()}
                    {this.renderAllocationSuccessResponse()}
                    <Flexbox flexGrow={2} />
                    <button
                      className={cx('button-on-right', {
                        loading: this.state.inProgressAllocation,
                      })}
                      disabled={this.state.inProgressAllocation || !allocationValid}
                      onClick={this.submitAllocationVote}
                      hidden={allocationVoted}
                    >
                      {this.state.inProgressAllocation ? 'Voting' : 'Vote'}
                    </button>
                  </Flexbox>
                </section>

                <section>
                  <Flexbox flexDirection="column" className="payout-form-container">
                    <Flexbox className="section-title">
                      <h1>CGP Payout</h1>
                    </Flexbox>
                    <PayoutForm />
                  </Flexbox>

                  <Flexbox justifyContent="space-between" flexDirection="row">
                    {this.renderPayoutErrorResponse()}
                    {this.renderPayoutSuccessResponse()}
                    <Flexbox flexGrow={2} />
                    <button
                      className={cx('button-on-right', 'secondary')}
                      disabled={!payoutHasData || this.state.inProgressPayout}
                      onClick={this.resetPayoutForm}
                      hidden={payoutVoted}
                    >
                      Reset
                    </button>
                    <button
                      className={cx('button-on-right', { loading: this.state.inProgressPayout })}
                      disabled={
                        this.state.inProgressPayout ||
                        !payoutHasData ||
                        (payoutHasData && !payoutValid)
                      }
                      onClick={this.submitPayoutVote}
                      hidden={payoutVoted}
                    >
                      {this.state.inProgressPayout ? 'Voting' : 'Vote'}
                    </button>
                  </Flexbox>
                </section>
              </Flexbox>
              <Flexbox className="form-container ballot-table-container">
                <section>
                  <Flexbox flexDirection="column">
                    <div className="section-title">
                      <h1>Popular Ballots</h1>
                    </div>
                    <div className="ballot-table">
                      <BallotsTable />
                    </div>
                  </Flexbox>
                </section>
              </Flexbox>
            </Flexbox>
          )}
        </Flexbox>
      </Layout>
    )
  }
}

export default CGP

function ErrorResponse({ type, hide, errorMessage }) {
  if (hide) {
    return null
  }
  return (
    <FormResponseMessage className="error">
      <span>There was a problem with the {type} vote.</span>
      <span className="devider" />
      <p>Error message: {errorMessage}</p>
    </FormResponseMessage>
  )
}

function SuccessResponse({ type, hide, message }) {
  if (hide) {
    return null
  }
  return (
    <Flexbox flexGrow={2} flexDirection="row" className={cx('form-response-message', 'success')}>
      <FontAwesomeIcon icon={['far', 'check']} />
      <Flexbox flexDirection="column">
        <span> {type} vote was successfully broadcast</span>
        {message && (
          <React.Fragment>
            <span className="devider" />
            <p>{message}</p>
          </React.Fragment>
        )}
      </Flexbox>
    </Flexbox>
  )
}
