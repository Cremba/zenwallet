// TODO show all info boxes, use props to know if before or during snapshot
/* eslint-disable react/prop-types */
// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'

import BoxLabel from '../../../components/BoxLabel'
import { kalapasToZen } from '../../../utils/zenUtils'

@inject('cgpStore', 'networkStore', 'portfolioStore')
@observer
class InfoBoxes extends Component {
  render() {
    const {
      cgpStore: {
        snapshotBlock,
        tallyBlock,
        cgpCurrentZPBalance,
        cgpCurrentAllocation,
        prevIntervalTxs,
        prevIntervalZpVotes,
        snapshotBalanceAcc,
      },
      networkStore: { blocks: currentBlock },
    } = this.props

    const isDuringVote = currentBlock > snapshotBlock

    return (
      <Flexbox flexDirection="row">

        {isDuringVote ? (
          <BoxLabel
            firstLine="Vote Weight Balance"
            secondLine={`${kalapasToZen(snapshotBalanceAcc)} ZP`}
            className="magnify"
          />
        ) : (
          <BoxLabel
            firstLine="Potential Vote Weight Balance"
            secondLine={`${this.props.portfolioStore.zenDisplay} ZP`}
            className="magnify"
          />
        )}
        {isDuringVote ? (
          <BoxLabel
            firstLine="Current Block / Tally Block"
            secondLine={`${currentBlock} / ${tallyBlock}`}
            className="magnify"
          />
        ) : (
          <BoxLabel
            firstLine="Current Block / Snapshot Block"
            secondLine={`${currentBlock} / ${snapshotBlock}`}
            className="magnify"
          />
        )}

        {isDuringVote ? (
          <BoxLabel
            firstLine="CGP Current Allocation / ZP Balance"
            secondLine={`${cgpCurrentAllocation} / ${cgpCurrentZPBalance}`}
            className="magnify"
          />
        ) : (
          <BoxLabel
            firstLine="CGP Current Balance"
            secondLine={String(cgpCurrentZPBalance)}
            className="magnify"
          />
        )}

        <BoxLabel
          firstLine="Past Semester (TXS / ZP Votes)"
          secondLine={`${prevIntervalTxs} / ${prevIntervalZpVotes}`}
          className="magnify"
        />
      </Flexbox>
    )
  }
}

export default InfoBoxes
