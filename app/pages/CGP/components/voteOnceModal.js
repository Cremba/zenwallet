// @flow

import swal from 'sweetalert'

export default function voteOnceModal() {
  const container = document.createElement('div')
  container.className = 'vote-once-modal-content'
  container.innerHTML = `
    <ul>
      <li>You can only vote once for CGP Allocation and CGP Payout</li>
      <li>You can vote separately</li>
      <li>Your first vote is the one which counts</li>
      <li>Your vote weight will consist of your total ZP at the snapshot block</li>
    </ul>
  `

  return swal({
    title: 'You can only vote once in this interval',
    content: container,
    icon: 'warning',
    buttons: {
      cancel: true,
      confirm: 'Vote',
    },
  })
}
