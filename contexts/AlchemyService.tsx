import { createContext, ReactNode, useContext, useRef } from "react";
import { AlchemyService, createAlchemyClient, getApiKeyByNetwork } from "../lib/AlchemyClient";
import { mainnetChains } from "../config/chains"
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils.js";
import processTokenAmount from "../utils/processTokenAmount";
import { BaseToken } from "../config/tokens";

export interface Transaction {
  blockNum: string;
  uniqueId: string;
  hash: string;
  from: string;
  to: string;
  value: number,
  erc721TokenId: any,
  erc1155Metadata: any,
  tokenId: any,
  asset: string;
  category: string;
  rawContract: {
    value: string;
    address: string;
    decimal: string;
  }
}


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
  getTokenBalance: (
    id: number,
    params: {
      owner: string;
      token: BaseToken;
    }
  ) => Promise<any>;
  getEthBalance: (
    id: number,
    params: {
      owner: string;
      blockNumber?: string;
    }
  ) => Promise<any>;
  getLastestTransactions: (
    id: number,
    params: {
      owner: string
    }
  ) => Promise<any>
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

  async function getTokenBalance(
    id: number,
    params: {
      owner: string,
      token: BaseToken
    }
  ): Promise<any> {
    const { owner, token } = params;

    try {
      const { result } = await service.current.post<any>({
        url: '',
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        data: {
          id,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [
            owner,
            [token.address]
          ]
        }
      })
      const balance = result.tokenBalances[0].tokenBalance
      if (balance === '0x') {
        return processTokenAmount(BigNumber.from(0), token.decimals)

      } else {
        return processTokenAmount(BigNumber.from(balance), token.decimals)

      }

      1
    } catch (error) {
      console.log('error on getTokenBalance', error)
      return processTokenAmount(BigNumber.from(0), token.decimals)

    }

  }

  async function getEthBalance(
    id: number,
    params: {
      owner: string,
      blockNumber?: string;
    }
  ): Promise<any> {
    const { owner, blockNumber } = params;

    try {
      const { result } = await service.current.post<any>({
        url: '',
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        data: {
          id,
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [
            owner,
            blockNumber ? blockNumber : 'latest'
          ]
        }
      })
      return processTokenAmount(BigNumber.from(result), 18)

    } catch (error) {
      console.log('error on getTokenBalance', error)
      return false
    }

  }

  async function getLastestTransactions(
    id: number,
    params: {
      owner: string
    }
  ): Promise<any> {
    const { owner } = params;

    try {
      const { result } = await service.current.post<{
        jsonrpc: string,
        id: number,
        result: {
          transfers: Transaction[]
        }
      }>({
        url: '',
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        data: {
          id,
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              fromAddress: owner,

              category: [
                "erc20",
                "external"
              ],
              withMetadata: false,
              excludeZeroValue: false,
              maxCount: "0xA"
            }
          ]
        }
      })
      
      console.log('result.transfers',result.transfers)

    } catch (error) {
      console.log('error on getTokenBalance', error)
      return false
    }

  }



  return (
    <AlchemyServiceContext.Provider value={{
      getTokenAllowance,
      getTokenBalance,
      getEthBalance,
      getLastestTransactions
    }}
    >
      {children}
    </AlchemyServiceContext.Provider>
  )
}

const useAlchemyService = () => useContext(AlchemyServiceContext)!;

export { AlchemyServiceProvider, useAlchemyService };