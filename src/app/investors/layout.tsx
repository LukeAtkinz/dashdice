import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DashDice - Investor Access',
  description: 'Private investor information for DashDice',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function InvestorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
