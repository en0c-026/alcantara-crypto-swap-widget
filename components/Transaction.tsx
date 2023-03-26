import { useMemo } from "react";
import { HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi";
import { BaseToken } from "../config/tokens"
import { Steps, TxHashUrl } from "../contexts/Swap";
import Spinner from "./Layout/Spinner";
import ViewInExplorerButton from "./ViewInExplorerButton";

interface Props {
  fromToken?: BaseToken;
  toToken?: BaseToken;
  steps: Steps;
  txHashUrl: TxHashUrl;
  openModalTransaction: boolean;
  onCloseModalTransaction: () => void;
}
export default function Transaction({
  fromToken,
  toToken,
  steps,
  txHashUrl,
  openModalTransaction,
  onCloseModalTransaction
}: Props) {

  const fromTokenMemo = useMemo(() => {
    if (!openModalTransaction) return undefined;
    return fromToken;
  }, [openModalTransaction])
  const toTokenMemo = useMemo(() => {
    if (!openModalTransaction) return undefined;
    return toToken;
  }, [openModalTransaction])


  return (
    <div className="px-2 py-4 w-full h-full overflow-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-slate-700">
      <p className="text-xl font-semibold text-center">Transaction</p>
      <div className="bg-slate-800 rounded-2xl px-4 py-1 h-5/6 flex flex-col justify-between">
        <div className="space-y-1.5 flex-1 flex flex-col h-full justify-center">
          <div className="border rounded-xl py-2 h-28 flex flex-col w-full">
            <div className="flex-none inline-flex gap-2 justify-center">
              <p>Swap</p>
              <span className="flex gap-1 items-center font-semibold">
                <img src={fromTokenMemo?.logoURI} className='h-5 w-5' alt="" />
                {fromTokenMemo?.symbol}
              </span>
              <p>to</p>
              <span className="flex gap-1 items-center font-semibold">
                <img src={toTokenMemo?.logoURI} className='h-5 w-5' alt="" />
                {toTokenMemo?.symbol}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {steps['swap'].state === 'loading' && <Spinner className="animate-spin h-7 w-7 mx-auto text-white" />}
              {steps['swap'].state === 'completed' && <HiOutlineCheckCircle className="h-6 w-6 mx-auto text-green-600" />}
              {steps['swap'].state === 'failed' && <HiOutlineXCircle className="h-7 w-7 mx-auto text-red-600" />}
              {txHashUrl !== '' && <ViewInExplorerButton url={txHashUrl} />}
              <button className="bg-blue-600 w-full hover:bg-blue-500 delay-100 mt-2 rounded-xl py-2 text-xl flex-none" onClick={onCloseModalTransaction}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
