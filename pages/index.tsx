import { useAccount, useNetwork } from 'wagmi';
import Swap from '../components/Swap';
import { SwapProvider, useSwap } from '../contexts/Swap';
import { Account } from '../components/Account';
import { Connect } from '../components/Connect';
import { ApiServiceProvider } from '../contexts/ApiService';
import { HiOutlineCog } from 'react-icons/hi';
import { useModal } from '../hooks/useModal';
import Modal from '../components/Layout/Modal';
import SwapConfig from '../components/SwapConfig';
import TxDetails from '../components/TxDetails';
import NetworkSwitcher from '../components/NetworkSwitcher';
import { AlchemyServiceProvider } from '../contexts/AlchemyService';


function Page() {
  const { open, showModal, hideModal } = useModal();
  const { isConnected } = useAccount();
  const { chain } = useNetwork()
  return (
    <AlchemyServiceProvider network={chain?.name ?? 'ethereum'}>
      <ApiServiceProvider>
        <SwapProvider>
          <div className='gap-1 px-4 py-3 w-full h-full flex flex-col relative'>
            <div className='flex gap-2 px-1 w-full justify-between items-center h-9 mb-1'>
              <NetworkSwitcher />
              {isConnected ?
                <div className='flex items-center gap-2'>
                  <Account />
                  <button onClick={() => showModal()}>
                    <HiOutlineCog className="h-5 w-5 hover:text-slate-900" />
                  </button>
                  {open && (
                    <Modal onClose={hideModal}>
                      <SwapConfig />
                    </Modal>
                  )}
                </div> :
                <Connect
                  className='bg-blue-600 rounded-xl py-2 px-3 text-sm font-medium text-slate-50 hover:bg-blue-500 delay-100'
                />
              }
            </div>
            <div className='bg-slate-200 p-3 border-slate-300 border rounded-2xl flex-1'>
              <Swap />
            </div>
            <div className='flex-1 p-2'>
              <TxDetails />
            </div>
          </div>
        </SwapProvider>
      </ApiServiceProvider>
    </AlchemyServiceProvider>

  )
}

export default Page
