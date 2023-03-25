import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export default function Layout({ children }: Props) {
  return (
    <div className="w-96 border rounded-2xl border-slate-300">
      <main>{children}</main>
    </div>
  );
}