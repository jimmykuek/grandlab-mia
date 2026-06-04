export const metadata = {
  title: "MIA — Grandlab Sales Assistant",
  description: "AI-powered sales assistant for Grandlab Detailing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0d0d0d" }}>
        {children}
      </body>
    </html>
  );
}
