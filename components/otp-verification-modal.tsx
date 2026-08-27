"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (code: string) => void | Promise<void>
  onResend?: () => void | Promise<void>
}

export function OTPVerificationModal({ isOpen, onClose, onVerify, onResend }: OTPVerificationModalProps) {
  const [otpCode, setOtpCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const handleVerify = async () => {
    if (otpCode.length !== 6) return
    setIsLoading(true)
    try {
      await onVerify(otpCode)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!onResend || isResending) return
    setIsResending(true)
    try {
      await onResend()
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Vérification du code OTP</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <p className="text-sm text-muted-foreground text-center">
            Entrez le code à 6 chiffres reçu par email pour activer votre compte entreprise.
          </p>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={otpCode.length !== 6 || isLoading}
            className="w-full h-12 rounded-full bg-[#0B1220] transition-transform duration-200 hover:scale-[1.01] hover:bg-[#0B1220]/90"
          >
            {isLoading ? "Vérification..." : "Vérifier"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Code non reçu ?{" "}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                {isResending ? "Envoi..." : "Renvoyer le code"}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
