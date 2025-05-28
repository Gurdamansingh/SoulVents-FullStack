import React, { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
    length?: number;
    onComplete: (otp: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, onComplete }) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        // Take only the last character if multiple characters are pasted
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if OTP is complete
        const otpValue = newOtp.join('');
        if (otpValue.length === length) {
            onComplete(otpValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        if (isNaN(Number(pastedData))) return;

        const newOtp = [...otp];
        for (let i = 0; i < Math.min(pastedData.length, length); i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);

        // Focus last filled input or first empty input
        const lastFilledIndex = newOtp.length - 1 - [...newOtp].reverse().findIndex(val => val !== '');
        const focusIndex = lastFilledIndex < length - 1 ? lastFilledIndex + 1 : lastFilledIndex;
        inputRefs.current[focusIndex]?.focus();

        // Check if OTP is complete
        const otpValue = newOtp.join('');
        if (otpValue.length === length) {
            onComplete(otpValue);
        }
    };

    return (
        <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
                <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(e, index)}
                    onKeyDown={e => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-2xl border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
            ))}
        </div>
    );
};

export default OTPInput;