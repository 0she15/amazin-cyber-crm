import "./globals.css"
export const metadata = { title: "Amazin Cyber — Lead Pipeline", description: "Microsoft 365 security reviews for small businesses" }
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
