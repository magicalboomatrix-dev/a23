'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DepositWithdrawBtns from '../components/DepositWithdrawBtns'
import SkeletonBlock from '../components/SkeletonBlock'
import Toast from '../components/Toast'
import { userAPI, walletAPI, withdrawAPI } from '../lib/api'
import { formatStatusLabel } from '../lib/formatters'

const WithDrawPage = () => {
  const router = useRouter()
  const [bankAccounts, setBankAccounts] = useState([])
  const [history, setHistory] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [withdrawGuidelines, setWithdrawGuidelines] = useState([])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [banksRes, histRes, walletRes] = await Promise.all([
        userAPI.getBankAccounts(),
        withdrawAPI.history({}),
        walletAPI.getInfo(),
      ])

      const accounts = banksRes.accounts || []
      setBankAccounts(accounts)
      if (accounts.length > 0) {
        setSelectedAccountId((prev) => prev || String(accounts[0].id))
      } else {
        setSelectedAccountId('')
      }

      setHistory(histRes.withdrawals || [])
      setWalletBalance(Number(walletRes.available_withdrawal || walletRes.balance || 0))
    } catch (error) {
      setToast({ message: error.message || 'Failed to load withdrawal data.', type: 'error' })
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchData()
    userAPI.getUiConfig().then((res) => setWithdrawGuidelines(res.withdraw_guidelines || [])).catch(() => setWithdrawGuidelines([]))
  }, [])

  const handleWithdraw = async (event) => {
    event.preventDefault()

    const parsedAmount = Number(amount)
    if (!selectedAccountId) {
      setToast({ message: 'Please select one bank account.', type: 'error' })
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setToast({ message: 'Withdrawal amount must be greater than 0.', type: 'error' })
      return
    }

    if (parsedAmount > walletBalance) {
      setToast({ message: 'Withdrawal amount cannot exceed wallet balance.', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const response = await withdrawAPI.request({ bank_account_id: Number(selectedAccountId), amount: parsedAmount })
      const selectedBank = bankAccounts.find((account) => String(account.id) === String(selectedAccountId))
      const txId = response?.withdraw?.id
        ? `TXN_WR_${response.withdraw.id}_${Date.now()}`
        : `TXN_WR_${Date.now()}`

      setAmount('')
      await fetchData()
      const params = new URLSearchParams({
        type: 'withdraw',
        amount: String(parsedAmount),
        bank: selectedBank ? formatBankOption(selectedBank) : '-',
        tx: txId,
        primary: '/withdraw',
        secondary: '/wallet',
      })
      router.push(`/success?${params.toString()}`)
    } catch (error) {
      setToast({ message: error.message || 'Failed to submit withdrawal request.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatBankOption = (account) => {
    const accountNumber = String(account.account_number || '')
    const masked = accountNumber.length >= 4 ? `****${accountNumber.slice(-4)}` : accountNumber
    return `${account.bank_name} - ${masked}`
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-107.5 bg-white pb-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <header className="sticky top-0 z-40 mx-auto flex w-full max-w-107.5 items-center bg-white px-4 py-3 shadow-sm">
        <a href="/home" className="mr-3 inline-flex"><img alt="back" src="/images/back-btn.png" className="h-5 w-5" /></a>
        <h3 className="flex-1 text-center text-sm font-semibold text-[#111]">Withdraw</h3>
      </header>

      <div className="bg-white pb-6">
        <DepositWithdrawBtns></DepositWithdrawBtns>

        <div className="mx-auto w-full max-w-107.5 px-4">
          <section className="mt-4 border border-[#d6b774] bg-white p-4 shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
            {loadingData ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-5 w-1/2" />
                <SkeletonBlock className="h-11 w-full" />
                <SkeletonBlock className="h-11 w-full" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-3">
                <div className="rounded border border-[#ead8ab] bg-[#f7f0e3] px-3 py-2 text-sm font-medium text-[#3f2b03]">
                  Current Wallet Balance: ₹{walletBalance.toFixed(2)}
                </div>

                <input
                  className="h-11 w-full border border-[#d8d1c4] bg-[#faf7f0] px-4 text-sm"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Withdrawal Amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />

                <select
                  className="h-11 w-full border border-[#d8d1c4] bg-[#faf7f0] px-4 text-sm"
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  required
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {formatBankOption(account)}
                    </option>
                  ))}
                </select>

                <button className="h-11 w-full bg-[#111] text-sm font-semibold text-white" type="submit" disabled={submitting || bankAccounts.length === 0}>
                  {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                </button>
              </form>
            )}

            {!loadingData && bankAccounts.length === 0 && (
              <p className="pt-2.5 text-center text-sm text-[#666]">No bank accounts added yet.</p>
            )}

            <div className="mt-3 flex gap-2">
              <Link className="inline-flex flex-1 items-center justify-center gap-2 bg-[#111] px-4 py-3 text-sm font-semibold text-white" href="/bind-bank-card">
                <img alt="Add Bank" className="h-4 w-4" src="/images/addicon.png" /> Add Bank Account
              </Link>
              <Link className="inline-flex flex-1 items-center justify-center border border-[#d8d1c4] bg-white px-4 py-3 text-sm font-semibold text-[#111]" href="/bank-accounts">
                Manage Accounts
              </Link>
            </div>
          </section>

          <div className="mt-4 border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
            <div className="px-3 py-3 text-left text-[10px] font-medium text-red-600">
              {(withdrawGuidelines.length > 0 ? withdrawGuidelines : ['Withdrawal instructions are currently unavailable.']).map((rule, index) => (
                <p key={`${rule}-${index}`}>{index + 1}. {rule}</p>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-[#ead8ab]">
            <table className="w-full border-collapse text-left text-xs text-[#111]">
              <thead>
                <tr>
                  <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Amount</th>
                  <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Status</th>
                  <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Account</th>
                  <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2">Date</th>
                  <th className="border-b bg-[#f7f0e3] px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((withdrawItem, index) => (
                  <tr key={withdrawItem.id || index}>
                    <td className="border-b border-r border-[#f0e3c6] px-3 py-2">₹{withdrawItem.amount}</td>
                    <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{formatStatusLabel(withdrawItem.status)}</td>
                    <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{withdrawItem.account_number || '-'}</td>
                    <td className="border-b border-r border-[#f0e3c6] px-3 py-2">{withdrawItem.created_at ? new Date(withdrawItem.created_at).toLocaleDateString() : '-'}</td>
                    <td className="border-b px-3 py-2">{withdrawItem.reject_reason || '-'}</td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td className="px-3 py-6 text-center" colSpan="5">No withdrawals yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WithDrawPage