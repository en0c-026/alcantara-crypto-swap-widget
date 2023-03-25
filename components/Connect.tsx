import { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi'
import { useModal } from '../hooks/useModal';
import Modal from './Layout/Modal';

interface Props {
  className: string;
}

export function Connect({ className }: Props) {
  const { isConnected } = useAccount();
  const { connect, connectors, isLoading, pendingConnector } =
    useConnect();
  const { open, showModal, hideModal } = useModal();
  useEffect(() => {
    if (!isConnected) return;
    hideModal()
  }, [isConnected]);

  return (<>
    <button className={className} onClick={() => showModal()}>Connect</button>

    {
      open && (
        <Modal onClose={hideModal}>
          <div className='flex flex-col justify-center px-4 h-full gap-2 rounded-2xl bg-slate-200'>
            {connectors
              .map((x) => (
                <button
                  className='bg-blue-600 rounded-xl py-2 font-semibold text-slate-50 hover:bg-blue-500 delay-100'
                  key={x.id}
                  onClick={() => connect({ connector: x })}
                >
                  {x.name === "Injected" ? "Other" : x.name}
                  {isLoading && x.id === pendingConnector?.id && ' (connecting)'}
                </button>
              ))}
          </div>
        </Modal>
      )
    }
  </>
  )
}
