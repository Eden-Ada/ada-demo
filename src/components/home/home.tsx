import React from 'react'
import './home.css'
import AdaNavDemo from './ada-nav-package-demo/ada-nav-demo'
// import AdaTestPane from './ada-pane-package/ada-test-pane'

const Home: React.FC = () => {
  return (
    <div className="home">
      {/* Main content area */}
      <div className="home__content">
        {/* Uncomment to add the AI orb back: */}
        {/* <AdaTestPane /> */}
      </div>
      
      {/* Navigation positioned at bottom */}
      <div className="home__navigation">
        <AdaNavDemo />
      </div>
    </div>
  )
}

export default Home
