import React from 'react'

const BindBankCard = () => {
  return (
    <div>
      <header className="backheader">
        <div className="brdc">
            <div className="back-btn">
            <a href="/home">
                <img alt="back" src="/images/back-btn.png" />
            </a>
            </div>
            <h3>Bind bank card</h3>
        </div>
        </header>

        <div className='page-wrapper' style={{background:'#fff'}}>
            <section className="add-bank-btn">
                <div className="form-bx">
                    <div className="form-rw">
                        <label className="text" htmlFor="account-no">
                        AccNo.
                        </label>
                        <div className="pos">
                        <input
                        id="account-no"
                        placeholder="Please enter Account No."
                        type="text"
                        defaultValue=""
                        />
                        </div>
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="ifsc">
                        IFSC
                        </label>
                        <div className="pos">
                        <input
                            id="ifsc"
                            placeholder="Please enter IFSC"
                            maxLength={11}
                            type="text"
                            defaultValue=""
                        />
                        </div>
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="payee-name">
                        AccName.
                        </label>
                        <input
                        id="payee-name"
                        placeholder="Please enter Payee Name."
                        type="text"
                        defaultValue=""
                        />
                    </div>
                    <div className="form-rw">
                        <label className="text" htmlFor="bank-name">
                        Bank Name
                        </label>
                        <input
                        id="bank-name"
                        placeholder="Please enter Bank Name (e.g., HDFC, SBI)"
                        type="text"
                        defaultValue=""
                        />
                    </div>
                    <button className="login-btn">Commit</button>
                    </div>
                    <br/>
                    <p>
                    Please check the information carefully before submission. If transfer issues
                    occur due to incorrect information, it is the user's responsibility.
                    </p>

            </section>
        </div>

    </div>
  )
}

export default BindBankCard
