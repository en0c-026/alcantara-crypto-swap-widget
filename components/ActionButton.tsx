import { useAccount, useConnect } from "wagmi"
import { useSwap } from "../contexts/Swap";
import { Connect } from "./Connect"

interface Props {
  onClick: () => void;
  needMoreAllownce: boolean;
  insufficientBalance: boolean;
  disabled: boolean;
}

export default function ActionButton({
  onClick,
  needMoreAllownce,
  insufficientBalance,
  disabled
}: Props) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return <Connect className="bg-blue-600 w-full rounded-xl py-2 text-lg text-slate-50 disabled:text-slate-200 hover:bg-blue-500 delay-100 hover:cursor-pointer disabled:bg-blue-400 hover:disabled:bg-blue-400 hover:disabled:cursor-default" />
  } else {
    return (
      <button
        className="bg-blue-600 w-full rounded-xl h-11 py-2 text-lg text-slate-50 disabled:text-slate-200 hover:bg-blue-500 delay-100 hover:cursor-pointer disabled:bg-blue-400 hover:disabled:bg-blue-400 hover:disabled:cursor-default"
        onClick={onClick}
        disabled={disabled}
      >
        {insufficientBalance ? <p>Insufficient Balance</p> : needMoreAllownce ? <p>Approve</p> : <p>Swap</p>}
      </button>
    )
  }

}
