/* eslint-disable react/prop-types */
// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
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
import BoxLabel from '../../components/BoxLabel'
// import Loading from '../../components/Loading'
// import IsValidIcon from '../../components/IsValidIcon'
import ProtectedButton from '../../components/Buttons'
import FormResponseMessage from '../../components/FormResponseMessage'
// import ExternalLink from '../../components/ExternalLink'
// import { kalapasToZen } from '../../utils/zenUtils'
import { payloadData, convertAllocation, serialize } from '../../utils/helpers'

import AllocationForm from './components/AllocationForm'
import PayoutForm from './components/PayoutForm'
import InfoBoxes from './components/InfoBoxes'

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
  componentDidMount() {
    this.props.cgpStore
      .fetchAssets()
      .then()
      .catch()
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
    const {
      statusAllocation: { status },
    } = this.props.cgpStore
    return <SuccessResponse type="Allocation" hide={status !== 'success'} />
  }

  renderPayoutSuccessResponse() {
    const {
      statusPayout: { status },
    } = this.props.cgpStore
    return <SuccessResponse type="Payout" hide={status !== 'success'} />
  }

  render() {
    const {
      cgpStore: {
        inProgressAllocation,
        inProgressPayout,
        payoutValid,
        payoutHasData,
        snapshotBlock,
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
            <React.Fragment>
              <section>
                <Flexbox className="section-title">
                  <h1>CGP Allocation</h1>
                </Flexbox>
                <Flexbox flexDirection="column" className="form-container allocation">
                  <Flexbox className="form-row" />
                  <AllocationForm />
                </Flexbox>
                <Flexbox justifyContent="space-between" flexDirection="row">
                  {this.renderAllocationErrorResponse()}
                  {this.renderAllocationSuccessResponse()}
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
                  {this.renderPayoutErrorResponse()}
                  {this.renderPayoutSuccessResponse()}
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
            </React.Fragment>
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
    <FormResponseMessage className="success">
      <span>{type} vote was successfully broadcasted</span>
      {message && (
        <React.Fragment>
          <span className="devider" />
          <p>{message}</p>
        </React.Fragment>
      )}
    </FormResponseMessage>
  )
}
