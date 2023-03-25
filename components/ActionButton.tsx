import { useAccount, useConnect } from "wagmi"
import { useSwap } from "../contexts/Swap";
import { Connect } from "./Connect"

interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export default function ActionButton({ disabled, onClick }: Props) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return <Connect className="bg-blue-600 hover:bg-blue-500 delay-100 text-[1.1rem] font-semibold text-slate-50 w-full rounded-xl py-1 text-xl" />
  } else {
    return (
      <button
        className="bg-blue-600 w-full rounded-xl py-2 text-xl text-slate-50 disabled:text-slate-200 hover:bg-blue-500 delay-100 hover:cursor-pointer disabled:bg-blue-300 hover:disabled:bg-blue-300 hover:disabled:cursor-default"
        onClick={onClick}
        disabled={disabled}>
        {
          false ? (
            <p className="text-[1.12rem] font-medium">Insufficient Balance</p>
          ) : (
            <p className="text-[1.12rem] font-medium ">Swap</p>
          )
        }
      </button>
    )
  }

}
