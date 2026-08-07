import './globals.css';

export const metadata = {
  title: 'LedgerLens — pattern & anomaly detection for any spreadsheet',
  description:
    'Upload any Excel or CSV file and get an instant AI-assisted dashboard: column statistics, correlations, and flagged anomalies.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink font-body antialiased">{children}</body>
    </html>
  );
}
