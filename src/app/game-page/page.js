'use client'
import React from 'react'
import Header from '../components/Header'
import { useState } from "react"

const GamePage = () => {
  const [activeTab, setActiveTab] = useState("tab-1");

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const numbers = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20"];
  const [showPopup, setShowPopup] = useState(false);
  const [amount, setAmount] = useState("");
  //const [activeElement, setActiveElement] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const [savedAmounts, setSavedAmounts] = useState({});
  const [activeBox, setActiveBox] = useState(null);

  const openPopup = (num) => {
    setActiveSlot(num);
    setAmount("");
    setShowPopup(true);
    setActiveBox(num);   // set active box
    setShowPopup(true);  // open popup
  };

  const saveAmount = () => {
    setSavedAmounts({
      ...savedAmounts,
      [activeSlot]: amount
    });
    setShowPopup(false);
  };

  
  return (
    <div>
      <Header></Header>
      <section className=''>
        <div className="head-title topround text-center" style={{borderRadius:0,marginTop:"5px"}}><h2 className="title-text"><b>DISAWAR</b></h2></div>
        <div className='tabs-panel'>
          <ul className="tabs">
        <li className={`tab-link ${activeTab === "tab-1" ? "current" : ""}`} onClick={() => handleTabClick("tab-1")}>
          Jodi
        </li>

        <li className={`tab-link ${activeTab === "tab-2" ? "current" : ""}`} onClick={() => handleTabClick("tab-2")}>
          Haruf
        </li>

        <li className={`tab-link ${activeTab === "tab-3" ? "current" : ""}`} onClick={() => handleTabClick("tab-3")}>
          Crossing
        </li>
      </ul>

      <div id="tab-1" className={`tab-content ${activeTab === "tab-1" ? "current" : ""}`}>
        <div className='tabsin'>

            {numbers.map((num) => (
              <div key={num} className={`tbbx box ${activeBox === num ? "active" : "active"}`} onClick={() => openPopup(num)}>
                <div className='num'>{num}</div>

                {savedAmounts[num] && (
                  <div className="amount-ad ">{savedAmounts[num]}</div>
                )}
              </div>
            ))}
      
          
        </div>
        <div className='crossing-number' style={{marginTop:"20px"}}>
            <div className='labels'>
              <div className='no'>No.</div>
              <div className='val'>Value</div>
            </div>
            <div className='labels crossing-row'>
              <div className='no'>01</div>
              <div className='val'><i className='fa fa-inr'></i>10</div>
            </div>
        </div>
      </div>

      <div id="tab-2" className={`tab-content ${activeTab === "tab-2" ? "current" : ""}`}>
        
        <div className='heading'>Andar</div>
        <div className='tabsin' style={{marginBottom:"10px"}}>
              <div className="tbbx">0</div>
              <div className="tbbx">1</div>
              <div className="tbbx">2</div>
              <div className="tbbx">3</div>
              <div className="tbbx">4</div>
              <div className="tbbx">5</div>
              <div className="tbbx">6</div>
              <div className="tbbx">7</div>
              <div className="tbbx">8</div>
              <div className="tbbx">9</div>
        </div>

        <div className='heading'>Bahar</div>
        <div className='tabsin'>
              <div className="tbbx">0</div>
              <div className="tbbx">1</div>
              <div className="tbbx">2</div>
              <div className="tbbx">3</div>
              <div className="tbbx">4</div>
              <div className="tbbx">5</div>
              <div className="tbbx">6</div>
              <div className="tbbx">7</div>
              <div className="tbbx">8</div>
              <div className="tbbx">9</div>
        </div>
        
      </div>

      <div id="tab-3" className={`tab-content ${activeTab === "tab-3" ? "current" : ""}`}>
         <div className='crossing-number'>
          <div className="save-value">
            <form>
            <input
              type="number"
              placeholder="Enter First Number"
            />

            <input
              type="number"
              placeholder="Amount"
            />
            <button onClick={saveAmount}>Save</button>
            </form>
          </div>
         </div>
        <div className='crossing-number'>
            <div className='labels'>
              <div className='no'>No.</div>
              <div className='val'>Value</div>
            </div>
            <div className='labels crossing-row'>
              <div className='no'>01</div>
              <div className='val'><i className='fa fa-inr'></i>10</div>
            </div>
        </div>

        <div className='crossing-block'>
            
        </div>
      </div>
        </div>
        </section>

        {/* Popup */}
      {showPopup && (
        <div className="popup-overlay amount-popup">
          <div className="popup">
            <h3>Please point on selected number</h3>
            <form>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
            <button onClick={saveAmount}>Save</button>
            </form>
          </div>
        </div>
      )}


      <div className='payfooter'>
        <div className='left'>
          <div className='bx'><i className='fa fa-inr'></i> 10</div>
        </div>
        <div className='right'>
          <div className='btn'><button>Play</button></div>
        </div>
      </div>

    </div>
  )
}

export default GamePage