// @flow
import React, { Component, Fragment } from 'react'
import { inject, observer } from 'mobx-react'
import Flexbox from 'flexbox-react'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'

import CgpStore from '../../../stores/cgpStore'
import { truncateString, numberWithCommas } from '../../../utils/helpers'

type Props = {
  cgpStore: CgpStore
};

@inject('cgpStore')
@observer
class BallotsTable extends Component<Props> {
  ballotIdClickHandler = e => {
    this.props.cgpStore.updateBallotId(e.currentTarget.attributes['data-value'].value)
  }
  renderRows() {
    const { popularBallots } = this.props.cgpStore
    return popularBallots.items.map(ballot => (
      <Fragment key={`${ballot.ballot}`}>
        <tr onClick={this.ballotIdClickHandler} data-value={ballot.ballot} className="ballot-row">
          <td className="ballot-id">
            <div title={ballot.ballot}>{truncateString(ballot.ballot)}</div>
          </td>
          <td className="zp-voted">{numberWithCommas(Number(ballot.zpAmount).toFixed(8))} ZP</td>
        </tr>
        <tr className="separator" />
      </Fragment>
    ))
  }

  renderLoadingTransactions() {
    return (
      <tr className="loading-transactions">
        <td colSpan={5}>
          <Flexbox>
            <Flexbox flexGrow={1}>Loading ballots ...</Flexbox>
            <FontAwesomeIcon icon={['far', 'spinner-third']} spin />
          </Flexbox>
        </td>
      </tr>
    )
  }
  render() {
    const { fetchPopularBallots, popularBallots } = this.props.cgpStore
    return (
      <div>
        <Flexbox>
          <table>
            <thead>
              <tr>
                <th className="align-left">Ballot ID</th>
                <th className="align-left">ZP Voted</th>
              </tr>
              <tr className="separator" />
            </thead>
            <tbody>{this.renderRows()}</tbody>
          </table>
        </Flexbox>
        {popularBallots.count > 0 && popularBallots.items.length < popularBallots.count && (
          <button className="btn-link" onClick={fetchPopularBallots.bind(this.props.cgpStore)}>
            Load more
          </button>
        )}
      </div>
    )
  }
}

export default BallotsTable
