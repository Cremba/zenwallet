import React from 'react'
import { Provider } from 'mobx-react'
import MobxDevTools from 'mobx-react-devtools'
import ErrorBoundary from 'react-error-boundary'
import 'react-table/react-table.css'
import 'react-toastify/dist/ReactToastify.css'

import ErrorScreen from './pages/ErrorScreen'
import AppUpdater from './components/AppUpdater'
import WipeModal from './components/WipeModal'
import history from './services/history'
import './services/rendererZenNodeNonZeroExit'
import stores from './stores'
import Routes from './Routes'
import './fontawesome'

export default class App extends React.Component {
  render() {
    return (
      <Provider history={history} {...stores}>
        <ErrorBoundary FallbackComponent={ErrorScreen}>
          <React.Fragment>
            <AppUpdater />
            <WipeModal />
            <div className="app-wrapper">
              <Routes />
            </div>
            {process.env.NODE_ENV !== 'production' && <MobxDevTools />}
          </React.Fragment>
        </ErrorBoundary>
      </Provider>
    )
  }
}
