import { Fraunces, JetBrains_Mono } from "next/font/google"

// Display face used for headlines across the marketing pages (home, tarification).
export const fraunces = Fraunces({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    variable: "--font-fraunces",
})

// Utility face used for eyebrows, badges and numbered markers.
export const marketingMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["500", "600"],
    variable: "--font-mono-marketing",
})
