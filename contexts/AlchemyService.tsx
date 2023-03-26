import { createContext, ReactNode, useContext, useRef } from "react";
import { AlchemyService, createAlchemyClient, getApiKeyByNetwork } from "../lib/AlchemyClient";
import { mainnetChains } from "../config/chains"
import { BigNumber } from "ethers";

interface AlchemyServiceInterface {
  getTokenAllowance: (
    id: number,
    amount: string,
    params: {
      token: string,
      owner: string,
      spender: string
    }
  ) => Promise<boolean>;
}

export const AlchemyServiceContext = createContext<AlchemyServiceInterface | undefined>(undefined);
interface Props {
  network: string;
  children: ReactNode;
}
const AlchemyServiceProvider = ({ network, children }: Props) => {
  console.log(network)
  const service = useRef(createAlchemyClient(network.toLocaleLowerCase()));

  async function getTokenAllowance(
    id: number,
    amount: string,
    params: {
      token: string,
      owner: string,
      spender: string
    }
  ): Promise<boolean> {
    const { owner, spender, token } = params;

    try {
      const response = await service.current.post<any>({
        url: '',
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        data: {
          id,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenAllowance',
          params: [
            {
              contract: token,
              owner,
              spender,
            }
          ]
        }
      })
      return BigNumber.from(response.result).lte(amount)

    } catch (error) {
      console.log('error on getTokenAllowance', error)
      return false
    }

  }




  return (
    <AlchemyServiceContext.Provider value={{
      getTokenAllowance
    }}
    >
      {children}
    </AlchemyServiceContext.Provider>
  )
}

const useAlchemyService = () => useContext(AlchemyServiceContext)!;

export { AlchemyServiceProvider, useAlchemyService };