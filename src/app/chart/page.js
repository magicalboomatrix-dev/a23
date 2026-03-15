'use client'
import React from 'react'
import Header from '../components/Header';
import YearlyChart from '../components/YearlyChart';

const ChartPage = () => {
  return (
    <div style={{paddingBottom:'100px'}}>
        <Header></Header>

        <div className='page-wrapper0 lr-padding' style={{background:'#fff'}}>
        
        <div className='page-wrapper-inners' style={{marginTop: '5px'}}>
            <div className="head-title topround text-center"><h2 className="title-text"><b>SATTA RECORD CHART 2026</b></h2></div>

            <div className="select-opts">
                <select className="select-dropdown first">
                    <option value="AGRA">AGRA</option>
                    <option value="ALIGARH">ALIGARH</option>
                    <option value="ALWAR">ALWAR</option>
                    <option value="DISAWAR">DISAWAR</option>
                    <option value="DWARKA">DWARKA</option>
                    <option value="Delhi Bazar">Delhi Bazar</option>
                    <option value="FARIDABAD">FARIDABAD</option>
                </select>
                <select className="select-dropdown">
                    <option>2024</option>
                    <option>2025</option>
                    <option>2026</option>
                </select>
                <button className="header_btn" type="button">
                    Check <span className="arw">→</span>
                </button>
            </div>

            <YearlyChart></YearlyChart>

        </div>
        </div>
      
    </div>
  )
}

export default ChartPage
