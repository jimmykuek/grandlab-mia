export const metadata = {
  title: "MIA — Grandlab Sales Assistant",
  description: "AI-powered sales assistant for Grandlab Detailing",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="MIA Grandlab" />
        <meta name="theme-color" content="#0d0d0d" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0d0d0d" }}>
        {children}
      </body>
    </html>
  );
}
