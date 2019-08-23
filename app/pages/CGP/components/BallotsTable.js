// @flow
import React, { Component, Fragment } from 'react'
import { inject, observer } from 'mobx-react'
import Flexbox from 'flexbox-react'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'

// import OnScrollBottom from '../../../../../components/OnScrollBottom'
import CgpStore from '../../../stores/cgpStore'
import { truncateString } from '../../../utils/helpers'

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
    return popularBallots.map(ballot => (
      <Fragment key={`${ballot.id}`}>
        <tr onClick={this.ballotIdClickHandler} data-value={ballot.id} className="ballot-row">
          <td>
            <div title={ballot.id}>{truncateString(ballot.id)}</div>
          </td>
          <td>{ballot.zpVoted} ZP</td>
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
    // const { fetchBallots } = this.props.cgpStore
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
        {/* <OnScrollBottom onScrollBottom={txHistoryStore.fetch} /> */}
      </div>
    )
  }
}

export default BallotsTable
