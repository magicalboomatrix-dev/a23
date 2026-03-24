'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

export default function SuccessPage() {
  const searchParams = useSearchParams()

  const type = searchParams.get('type') || 'bet'
  const market = searchParams.get('market') || '-'
  const betType = searchParams.get('betType') || '-'
  const number = searchParams.get('number') || '-'
  const amount = searchParams.get('amount') || '0'
  const bank = searchParams.get('bank') || '-'
  const txId = searchParams.get('tx') || 'TXN_PENDING'
  const primaryOverride = searchParams.get('primary')
  const secondaryOverride = searchParams.get('secondary')

  const isWithdraw = type === 'withdraw'

  const title = isWithdraw ? 'Withdrawal Request Submitted!' : 'Bet Placed Successfully!'
  const subtitle = isWithdraw
    ? 'Your withdrawal request has been registered and is awaiting admin approval.'
    : 'Your ticket has been registered in our system.'

  const summaryTitle = isWithdraw ? 'REQUEST SUMMARY' : 'BET SUMMARY'
  const badge = isWithdraw ? 'PENDING' : 'CONFIRMED'

  const primaryLabel = isWithdraw ? 'GO TO WITHDRAW' : 'PLAY ANOTHER'
  const primaryHref = primaryOverride || (isWithdraw ? '/withdraw' : '/home')
  const secondaryLabel = isWithdraw ? 'GO TO WALLET' : 'GO TO MY BETS'
  const secondaryHref = secondaryOverride || (isWithdraw ? '/wallet' : '/my-bets')

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-107.5 items-center justify-center bg-[#0b0903] px-3 py-6">
      <div className="relative w-full overflow-hidden border border-[#3f320f] bg-[radial-gradient(circle_at_top,#3f2f08,#171104_52%,#110d03)] shadow-[0_22px_44px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(247,197,45,0.12),transparent_40%),radial-gradient(circle_at_90%_90%,rgba(247,197,45,0.08),transparent_38%)]" />

        <div className="relative px-5 py-6 text-center text-[#f5e8c6]">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#f5be24] shadow-[0_0_0_10px_rgba(245,190,36,0.14)]">
            <i className="fa fa-check text-2xl text-white" aria-hidden="true"></i>
          </div>

          <h1 className="text-[34px] font-black leading-[1.05] text-[#ffffff]">{title}</h1>
          <p className="mx-auto mt-2 max-w-70 text-sm font-medium text-[#f1cc6a]">{subtitle}</p>

          <div className="mt-6 border border-[#5d4718] bg-[#1a1306]/80 px-4 py-4 text-left">
            <div className="mb-3 flex items-center justify-between border-b border-[#4a3a14] pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d2a847]">
              <span>{summaryTitle}</span>
              <span className="bg-[#f5be24] px-2 py-1 text-[10px] text-[#1f1500]">{badge}</span>
            </div>

            {!isWithdraw && (
              <div className="space-y-2 text-sm text-[#e8d8ae]">
                <div className="flex items-center justify-between"><span className="text-[#a98f4d]">Market</span><strong className="text-white">{market}</strong></div>
                <div className="flex items-center justify-between"><span className="text-[#a98f4d]">Bet Type</span><strong className="text-white">{betType}</strong></div>
                <div className="flex items-center justify-between"><span className="text-[#a98f4d]">Number</span><span className="bg-[#f5be24] px-3 py-1 text-base font-black text-[#1a1205]">{number}</span></div>
                <div className="mt-3 border-t border-[#4a3a14] pt-3 flex items-center justify-between"><span className="text-[#d2a847]">Total Amount</span><strong className="text-2xl font-black text-[#f5be24]">{formatCurrency(amount)}</strong></div>
              </div>
            )}

            {isWithdraw && (
              <div className="space-y-2 text-sm text-[#e8d8ae]">
                <div className="flex items-center justify-between"><span className="text-[#a98f4d]">Bank</span><strong className="text-right text-white">{bank}</strong></div>
                <div className="flex items-center justify-between"><span className="text-[#a98f4d]">Status</span><span className="bg-[#f5be24] px-3 py-1 text-xs font-black text-[#1a1205]">PENDING</span></div>
                <div className="mt-3 border-t border-[#4a3a14] pt-3 flex items-center justify-between"><span className="text-[#d2a847]">Requested Amount</span><strong className="text-2xl font-black text-[#f5be24]">{formatCurrency(amount)}</strong></div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <Link href={primaryHref} className="flex w-full items-center justify-center gap-2 bg-[#f5be24] px-4 py-3 text-sm font-black uppercase text-[#1b1200] shadow-[0_8px_18px_rgba(245,190,36,0.28)]">
              <i className={`fa ${isWithdraw ? 'fa-bank' : 'fa-gamepad'}`} aria-hidden="true"></i>
              <span>{primaryLabel}</span>
            </Link>
            <Link href={secondaryHref} className="flex w-full items-center justify-center gap-2 border border-[#f5be24] bg-transparent px-4 py-3 text-sm font-black uppercase text-[#f5be24]">
              <i className={`fa ${isWithdraw ? 'fa-wallet' : 'fa-list-alt'}`} aria-hidden="true"></i>
              <span>{secondaryLabel}</span>
            </Link>
          </div>
        </div>

        <div className="relative border-t border-[#3f320f] bg-[#151005] px-4 py-3 text-center text-[10px] text-[#8d6d2d]">
          <i className="fa fa-circle mr-1 text-[7px]" aria-hidden="true"></i>
          Transaction ID: {txId}
        </div>
      </div>
    </div>
  )
}
