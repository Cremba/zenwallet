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

// import CGPStore from '../../stores/cgpStore'
// import PublicAddressStore from '../../stores/publicAddressStore'
// import RunContractStore from '../../stores/runContractStore'
// import { isValidHex, hashVoteData, payloadData } from '../../utils/helpers'
// import { ref } from '../../utils/domUtils'
import Layout from '../../components/Layout'
// import Loading from '../../components/Loading'
// import IsValidIcon from '../../components/IsValidIcon'
import ProtectedButton from '../../components/Buttons'
// import FormResponseMessage from '../../components/FormResponseMessage'
// import ExternalLink from '../../components/ExternalLink'
// import { kalapasToZen } from '../../utils/zenUtils'

// lior
import AllocationForm from './components/AllocationForm/AllocationForm'
import PayoutForm from './components/PayoutForm/PayoutForm'

@inject('cgpStore', 'publicAddressStore', 'portfolioStore')
@observer
class CGP extends Component {
  // componentDidMount() {
  //   this.props.publicAddressStore.fetch()
  // }

  resetForm = () => this.props.cgpStore.resetData()

  submitVote = () => console.log('submit vote')

  render() {
    const {
      cgpStore: {
        inProgress,
        anyHasData,
        allocationValid,
        payoutValid,
        allocationHasData,
        payoutHasData,
      },
    } = this.props

    return (
      <Layout className="cgp">
        <Flexbox flexDirection="column" className="send-tx-container">
          <Flexbox flexDirection="column" className="page-title">
            <h1>Common Goods Pool</h1>
            <h3>text goes here</h3>
          </Flexbox>

          <Flexbox flexDirection="column" className="form-container">
            <AllocationForm />
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
              disabled={!anyHasData || inProgress}
              onClick={this.resetForm}
            >
              Reset
            </button>
            <ProtectedButton
              className={cx('button-on-right', { loading: inProgress })}
              disabled={
                inProgress ||
                (!allocationHasData && !payoutHasData) ||
                (allocationHasData && !allocationValid) ||
                (payoutHasData && !payoutValid)
              }
              onClick={this.submitVote}
            >
              {inProgress ? 'Voting' : 'Vote'}
            </ProtectedButton>
          </Flexbox>
        </Flexbox>
      </Layout>
    )
  }
}

export default CGP
