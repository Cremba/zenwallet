/* eslint-disable react/prop-types */
// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'
// import FontAwesomeIcon from '@fortawesome/react-fontawesome'
// import { isEmpty } from 'lodash'
// import * as mobx from 'mobx'
// import BigInteger from 'bigi'
// import { Data } from '@zen/zenjs'
import * as mobx from 'mobx'
import BigInteger from 'bigi'
import { Data } from '@zen/zenjs'
import { sha3_256 as sha } from 'js-sha3'
import { Allocation, Payout } from '@zen/zenjs/build/src/Consensus/Types/VoteData'

// import CGPStore from '../../stores/cgpStore'
// import PublicAddressStore from '../../stores/publicAddressStore'
// import RunContractStore from '../../stores/runContractStore'
// import { isValidHex, hashVoteData, payloadData } from '../../utils/helpers'
// import { ref } from '../../utils/domUtils'
import Layout from '../../components/Layout'
// import BoxLabel from '../../components/BoxLabel'
// import Loading from '../../components/Loading'
// import IsValidIcon from '../../components/IsValidIcon'
import ProtectedButton from '../../components/Buttons'
// import FormResponseMessage from '../../components/FormResponseMessage'
// import ExternalLink from '../../components/ExternalLink'
// import { kalapasToZen } from '../../utils/zenUtils'
import { payloadData, convertAllocation, serialize} from '../../utils/helpers'


// lior
import AllocationForm from './components/AllocationForm/AllocationForm'
import PayoutForm from './components/PayoutForm/PayoutForm'

@inject('cgpStore', 'publicAddressStore', 'portfolioStore', 'networkStore', 'runContractStore', 'authorizedProtocolStore')
@observer
class CGP extends Component {
  componentDidMount() {
    this.props.cgpStore.fetchAssets().then().catch()
  }

  resetPayoutForm = () => this.props.cgpStore.resetPayout()

  submitAllocationVote = async (confirmedPassword: string) => {
    const {
      cgpStore: {
        allocation,
        contractId,
        currentInterval,
      },
    } = this.props
    const stringAllocation = 'Allocation'
    const all = serialize(new Allocation(convertAllocation(allocation).toString()))
    const message = Buffer.from(sha
      .update(sha(Data.serialize(new Data.UInt32(BigInteger.valueOf(currentInterval)))))
      .update(sha(Data.serialize(new Data.String(all)))).toString(), 'hex')
    await this.props.publicAddressStore.getKeys(confirmedPassword)
    const arrayPromise = mobx.toJS(this.props.publicAddressStore.publicKeys).map(async item => {
      const { publicKey, path } = item
      const signature =
        await this.props.authorizedProtocolStore.signMessage(message, path, confirmedPassword)
      return [publicKey, new Data.Signature(signature)]
    })
    const data = await Promise.all(arrayPromise)
      .then((signatures) => new Data.Dictionary([[stringAllocation, new Data.String(all)], ['Signature', new Data.Dictionary(signatures)]]))
      .catch(error => console.log(error))
    await this.props.runContractStore
      .run(confirmedPassword, payloadData(contractId, data, stringAllocation))
  }

  submitPayoutVote = async (confirmedPassword: string) => {
    const {
      cgpStore: {
        address,
        assetAmounts,
        contractId,
        currentInterval,
      },
    } = this.props
    const stringPayout = 'Payout'
    const payout = serialize(new Payout({ kind: 'PKRecipient', address }, assetAmounts))
    const message = Buffer.from(sha
      .update(sha(Data.serialize(new Data.UInt32(BigInteger.valueOf(currentInterval)))))
      .update(sha(Data.serialize(new Data.String(payout)))).toString(), 'hex')
    await this.props.publicAddressStore.getKeys(confirmedPassword)
    const arrayPromise = mobx.toJS(this.props.publicAddressStore.publicKeys).map(async item => {
      const { publicKey, path } = item
      const signature =
        await this.props.authorizedProtocolStore.signMessage(message, path, confirmedPassword)
      return [publicKey, new Data.Signature(signature)]
    })
    const data = await Promise.all(arrayPromise)
      .then((signatures) => new Data.Dictionary([[stringPayout, new Data.String(payout)], ['Signature', new Data.Dictionary(signatures)]]))
      .catch(error => console.log(error))
    await this.props.runContractStore
      .run(confirmedPassword, payloadData(contractId, data, stringPayout))
  }

  render() {
    const {
      cgpStore: {
        inProgressAllocation, inProgressPayout, payoutValid, payoutHasData,
      },
    } = this.props

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
            <Flexbox flexDirection="row" className="box-bar">
              {/* <BoxLabel
                firstLine="Current Block / Tally Block"
                secondLine={`${currentBlock} / ${tallyBlock}`}
                className="magnify"
              /> */}
              {/* <BoxLabel
                firstLine="CGP Balance (Currently / End of interval)"
                secondLine={`${fund ? kalapasToZen(fund) : 0} / ${totalFund} ZP`}
                className="magnify"
              />
              <BoxLabel
                firstLine="ZP have participated in the vote"
                secondLine={`${
                  totalPayoutAmountVoted ? kalapasToZen(totalPayoutAmountVoted) : 0
                } ZP`}
                className="magnify"
              />
              <BoxLabel
                firstLine="Previous Winner"
                secondLine={
                  resultPayout ? (
                    <span>
                      <CopyableTableCell string={resultPayout.recipient} hideIcon isSpan /> /{' '}
                      {kalapasToZen(resultPayout.amount)} ZP
                    </span>
                  ) : (
                    <span>No winner in last payout</span>
                  )
                }
                className="magnify"
              /> */}
            </Flexbox>
          </section>

          <section>
            <Flexbox className="section-title">
              <h1>CGP Allocation</h1>
            </Flexbox>
            <Flexbox flexDirection="column" className="form-container">
              <Flexbox className="form-row" />
              <AllocationForm />
            </Flexbox>
            <Flexbox justifyContent="space-between" flexDirection="row">
              <Flexbox flexGrow={2} />
              <ProtectedButton
                className={cx('button-on-right', { loading: inProgressAllocation })}
                disabled={inProgressAllocation}
                onClick={this.submitAllocationVote}
              >
                {inProgressAllocation ? 'Voting' : 'Vote'}
              </ProtectedButton>
            </Flexbox>
          </section>

          <section>
            <Flexbox className="section-title">
              <h1>CGP Payout</h1>
            </Flexbox>
            <Flexbox flexDirection="column" className="form-container">
              <PayoutForm />
            </Flexbox>

            <Flexbox justifyContent="space-between" flexDirection="row">
              {/* {this.renderSuccessResponse()}
            {this.renderErrorResponse()}
            {this.renderIntervalEnded()}
            {this.renderBeforeSnapshot()} */}
              <Flexbox flexGrow={2} />
              <button
                className={cx('button-on-right', 'secondary')}
                disabled={!payoutHasData || inProgressPayout}
                onClick={this.resetPayoutForm}
              >
                Reset
              </button>
              <ProtectedButton
                className={cx('button-on-right', { loading: inProgressPayout })}
                disabled={inProgressPayout || !payoutHasData || (payoutHasData && !payoutValid)}
                onClick={this.submitPayoutVote}
              >
                {inProgressPayout ? 'Voting' : 'Vote'}
              </ProtectedButton>
            </Flexbox>
          </section>
        </Flexbox>
      </Layout>
    )
  }
}

export default CGP
