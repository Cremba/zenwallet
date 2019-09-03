// TODO show all info boxes, use props to know if before or during snapshot
/* eslint-disable react/prop-types */
// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'

import BoxLabel from '../../../components/BoxLabel'
import { kalapasToZen } from '../../../utils/zenUtils'
import { numberWithCommas } from '../../../utils/helpers'

@inject('cgpStore', 'networkStore', 'portfolioStore')
@observer
class InfoBoxes extends Component {
  render() {
    const {
      cgpStore: {
        snapshotBlock,
        tallyBlock,
        cgpCurrentZPBalance,
        assets,
        cgpCurrentAllocation,
        prevIntervalTxs,
        prevIntervalZpVoted,
        snapshotBalanceAcc,
      },
      networkStore: { blocks: currentBlock },
    } = this.props

    const isDuringVote = currentBlock > snapshotBlock

    const allAssetsString = assets.reduce((all, cur) => {
      const currentDisplay = `${cur.name}: ${cur.balanceDisplay}`
      return !all ? currentDisplay : `${all}\n${currentDisplay}`
    }, [])

    return (
      <Flexbox flexDirection="row">
        {isDuringVote ? (
          <BoxLabel
            firstLine="Vote Weight Balance"
            secondLine={`${numberWithCommas(kalapasToZen(snapshotBalanceAcc))} ZP`}
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
            secondLine={`${numberWithCommas(currentBlock)} / ${numberWithCommas(tallyBlock)}`}
            className="magnify"
          />
        ) : (
          <BoxLabel
            firstLine="Current Block / Snapshot Block"
            secondLine={`${numberWithCommas(currentBlock)} / ${snapshotBlock}`}
            className="magnify"
          />
        )}

        {isDuringVote ? (
          <BoxLabel
            title={allAssetsString}
            firstLine="CGP Current Allocation / ZP Balance"
            secondLine={`${cgpCurrentAllocation} / ${numberWithCommas(cgpCurrentZPBalance)} ZP`}
            className="magnify"
          />
        ) : (
          <BoxLabel
            firstLine="CGP Current Balance"
            secondLine={`${numberWithCommas(cgpCurrentZPBalance)} ZP`}
            className="magnify"
          />
        )}

        <BoxLabel
          firstLine="Past Semester (TXS / ZP Votes)"
          secondLine={`${numberWithCommas(prevIntervalTxs)} / ${numberWithCommas(prevIntervalZpVoted)} ZP`}
          className="magnify"
        />
      </Flexbox>
    )
  }
}

export default InfoBoxes
