import '../styles/globals.css'

export const metadata = {
  title: 'ProVideoEditor - Professional Web Video Editor',
  description: 'Feature-rich, fast, and efficient web-based video editor with advanced editing capabilities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}