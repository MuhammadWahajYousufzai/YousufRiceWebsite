"use client"

import * as React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X } from "lucide-react"

export function Popup() {
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        // Show popup on every visit, delayed slightly to not block initial render/hydration
        const timer = setTimeout(() => {
            setOpen(true)
        }, 1500)
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => setOpen(false)

    if (process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER !== 'true') return null

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="ramadan-modal-content max-w-105 p-0 overflow-hidden border-0 sm:rounded-3xl w-[calc(100%-1.5rem)] sm:w-full max-h-[95vh] overflow-y-auto">
                    {/* Stars decoration */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <span className="star-1 absolute top-8 left-6 text-yellow-300 text-xl">✦</span>
                        <span className="star-2 absolute top-16 right-10 text-yellow-200 text-sm">★</span>
                        <span className="star-3 absolute bottom-24 left-8 text-yellow-300 text-base">✦</span>
                        <span className="star-4 absolute top-20 left-1/2 text-yellow-200 text-xs">✦</span>
                        {/* Radial glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)' }} />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute right-3 top-3 z-20 rounded-full bg-white/10 border border-white/20 p-2 backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4 text-white" />
                    </button>

                    <div className="relative px-6 pt-8 pb-7">
                        {/* Moon + Header */}
                        <div className="text-center mb-5">
                            <div className="relative inline-flex items-center justify-center mb-3">
                                <div className="pulse-ring w-20 h-20" style={{ animationDelay: '0s' }} />
                                <div className="pulse-ring w-20 h-20" style={{ animationDelay: '1s' }} />
                                <span className="moon-icon text-6xl relative z-10">🌙</span>
                            </div>

                            <h2 className="title-text text-4xl font-black leading-tight mb-1">
                                Post-Eid<br />Special Offer!
                            </h2>
                            <p className="text-yellow-300/80 text-sm font-medium tracking-widest uppercase mt-1">Karachi home delivery offer</p>
                        </div>

                        {/* Big FREE badge */}
                        <div className="free-badge text-center mb-5">
                            <div className="inline-flex flex-col items-center gap-0.5 bg-linear-to-br from-yellow-400 to-amber-600 rounded-2xl px-8 py-3 shadow-2xl" style={{ boxShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
                                <span className="text-5xl font-black text-white leading-none tracking-tight" style={{ fontFamily: 'var(--font-playfair), serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>1kg FREE</span>
                                <span className="text-base font-semibold text-amber-900">Premium Basmati Rice</span>
                            </div>
                        </div>

                        {/* Points */}
                        <div className="offer-card rounded-2xl p-4 space-y-3 mb-5">
                            <div className="point-row point-1 flex items-center gap-4 p-3.5">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-lg shadow-lg">
                                    🛒
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">On every 15kg order</p>
                                    <p className="text-yellow-300 font-semibold text-sm mt-0.5" style={{ textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>✨ Get 1kg extra absolutely free</p>
                                </div>
                            </div>

                            <div className="point-row point-2 flex items-center gap-4 p-3.5">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-lg shadow-lg">
                                    🚚
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">Free Delivery</p>
                                    <p className="text-yellow-300 font-semibold text-sm mt-0.5" style={{ textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>✨ On all orders, no minimum</p>
                                </div>
                            </div>

                            <div className="point-row point-3 flex items-center gap-4 p-3.5">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-lg shadow-lg">
                                    🏷️
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base leading-tight">Up to 24% Discount</p>
                                    <p className="text-yellow-300 font-semibold text-sm mt-0.5" style={{ textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>✨ Post-Eid special pricing</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <a
                            href="#products"
                            onClick={handleClose}
                            className="cta-btn block w-full text-white font-bold py-4 px-6 rounded-2xl text-center text-lg"
                            style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
                        >
                            🛍️ Shop Now — Grab the Deal
                        </a>

                        <p className="text-center text-yellow-300/40 text-xs mt-4 tracking-widest uppercase">
                            ⏳ HURRY! BEST OFFERS END SOON ⏳
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
