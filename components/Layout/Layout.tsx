import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export default function Layout({ children }: Props) {
  return (
    <div className="w-96 border h-[25rem] rounded-2xl border-slate-300 relative">
      {children}
    </div>
  );
}