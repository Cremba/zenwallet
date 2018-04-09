import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import { Link } from 'react-router-dom'
import Flexbox from 'flexbox-react'

@inject('loading')
@observer
class UnlockWallet extends Component {
  state = {
    password: '',
    inputType: 'password'
  }

  onClickTogglePasswordVisibility = () => {
    const { inputType } = this.state
    const newType = inputType === 'password' ? 'text' : 'password'
    this.setState({ inputType: newType })
  }

  onChange = (e) => {
    const newValue = e.target.value.trim()
    this.setState({ password: newValue })
  }

  onSubmitClicked = () => {
    const { password } = this.state
    this.props.loading.unlockWallet(password)
  }

  render() {
    const { password, inputType } = this.state

    const passwordIconClassNames = inputType === 'password' ? 'fa fa-eye' : 'fa fa-eye-slash'

    return (
      <Flexbox flexDirection="column" className="loading-container">
        <Flexbox flexDirection="column" className="center unlock-wallet">
          <h1>Unlock Your Wallet</h1>
          <p>Please enter your password</p>

          <div className="input-group password">
            <input
              name="password"
              type={inputType}
              value={password}
              placeholder="Enter password"
              className="input-group-field"
              onChange={this.onChange}
            />
            <a className="input-group-label show-password" onClick={this.onClickTogglePasswordVisibility}>
              <i className={passwordIconClassNames} />
            </a>
          </div>

          <button className="unlock" onClick={this.onSubmitClicked}>
            <span>Unlock</span>
            <i className="fa fa-unlock" />
          </button>

          <Link className="forgot-password" to="/import-or-create-wallet">
            Forgot your password? Import you wallet again
          </Link>

        </Flexbox>
      </Flexbox>
    )
  }
}

export default UnlockWallet