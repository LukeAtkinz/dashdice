import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Dashdice",
  description: "Admin panel for Dashdice",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}
