import { useDisconnect, useEnsAvatar } from "wagmi";

interface Props {
  address?: `0x${string}`;
}

export default function Profile({ address }: Props) {
  const { disconnect } = useDisconnect();
  const { data } = useEnsAvatar({ address });

  return (
    <div className='flex flex-col p-5 h-full bg-slate-200 rounded-2xl'>
      <div className='flex items-center justify-between w-2/3 mb-3'>
        <p className="text-xl font-semibold">Profile</p>
        <button
            className='bg-red-600 rounded-lg py-2 px-3 text-sm text-slate-50 font-semibold hover:bg-red-500 delay-100'
            onClick={() => disconnect()}
          >
            Log Out
          </button>

      </div>
      <p className="text-sm mb-1 flex-none">Recent Transactions</p>
      <div className='border border-slate-500 rounded-2xl p-4 flex-1 flex'>
        <p className="m-auto text-sm">Working...</p>
      </div>
    </div>
  )
}