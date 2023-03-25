import {
  ChangeEvent,
  createContext,
  MutableRefObject,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { Chain, mainnetChains } from "../config/chains";
import { ActionMeta, SelectInstance, SingleValue } from "react-select";
import { BaseToken, mainnetTokens } from "../config/tokens";
import useList from "../hooks/useList";
import { useApiService } from "./ApiService";
import { formatUnits } from "ethers/lib/utils.js";
import { useModal } from "../hooks/useModal";
import paginateTokensList from "../utils/paginateTokensList";
import { BigNumber, constants } from "ethers";
import {
  prepareSendTransaction,
  sendTransaction,
  fetchFeeData,
  fetchBalance
} from "@wagmi/core";
import Error from "next/error";
import { useNotification } from "./Notification";
import getGasCost from "../utils/getGasCost";
import getNativeTokenId from "../utils/getNativeTokenId";
import getNativeSymbol from "../utils/getNativeSymbol";
import getExplorerUrl from "../utils/getExplorerUrl";
import processTokenAmount from "../utils/processTokenAmount";
import { SwapCallDataParamsV2 } from "../utils/apiClient";
import { useAlchemyService } from "./AlchemyService";

interface SwapContextInterface {
  chains: Chain[];
  onChangeSelectedChain: (newValue: SingleValue<ChainOption>, actionMeta: ActionMeta<ChainOption>) => void;
  fromTokensList: MutableRefObject<BaseToken[] | undefined>;
  toTokensList: MutableRefObject<BaseToken[] | undefined>;
  fromToken?: BaseToken;
  toToken?: BaseToken;
  slippage: string;
  allowPartialFill: boolean;
  onChangeSlippage: (e: ChangeEvent<HTMLInputElement>) => void;
  onCheckedAllowPartialFill: (e: ChangeEvent<HTMLInputElement>) => void;
  fromTokenRef: RefObject<SelectInstance<BaseToken>>
  toTokenRef: RefObject<SelectInstance<BaseToken>>
  fromTokenAmount: Amount;
  toTokenAmount: Amount;
  onChangeFromTokenAmount: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeFromToken: (newValue: SingleValue<BaseToken>, actionMeta: ActionMeta<BaseToken>) => void;
  onChangeToToken: (newValue: SingleValue<BaseToken>, actionMeta: ActionMeta<BaseToken>) => void;
  openModalFromToken: boolean;
  showModalFromToken: () => void;
  openModalToToken: boolean;
  showModalToToken: () => void;
  openModalTransaction: boolean;
  onCloseModalTransaction: () => void;
  incrementPageFromTokensList: () => void;
  incrementPageToTokensList: () => void;
  maxApproveAmount: boolean;
  onChangeMaxApproveAmount: (e: ChangeEvent<HTMLInputElement>) => void;
  steps: Steps;
  readySwap: boolean;
  swap: () => Promise<void>;
  txCost: TxCost;
  selectedChain: Chain;
  txHashUrl: TxHashUrl;
}

export type ChainOption = { label: string; value: number; image: string };

export type Steps = { [key: string]: { state: 'loading' | 'completed' | 'failed' } };

export type TxHashUrl = string;

type TransactionError = { reason: string; step: string };

type TxCost = { value: number; state: 'fetching' | 'done' };

type Amount = { value: BigNumber; raw: string; formated: string; float: number };

interface Props {
  children: ReactNode;
};

const SwapContext = createContext<SwapContextInterface | undefined>(undefined);

const stepsInitialState: Steps = {
  swapBeforeBridge: { state: 'loading' },
  bridge: { state: 'loading' },
  swapAfterBridge: { state: 'loading' }
};


const SwapProvider = ({ children }: Props) => {
  const apiService = useApiService();
  const { chain } = useNetwork();
  const { address } = useAccount();
  const [selectedChain, setSelectedChain] = useState<Chain>(mainnetChains['ethereum']);
  const [fromToken, setFromToken] = useState<BaseToken>();
  const [toToken, setToToken] = useState<BaseToken>();

  const {
    switchNetwork,
    switchNetworkAsync,
    error: errorSwitchNetwork,
    isLoading: isLoadingSwitchNetwork
  } = useSwitchNetwork();

  const {
    list: fromTokensList,
    addItem: addFromTokenToList,
    clear: clearFromTokensList,
    setList: setFromTokensList
  } = useList<BaseToken>();

  const {
    list: toTokensList,
    addItem: addToTokenToList,
    clear: clearToTokensList,
    setList: setToTokensList
  } = useList<BaseToken>();

  const [slippage, setSlippage] = useState("1");
  const [allowPartialFill, setAllowPartialFill] = useState(true);
  const { getTokenAllowance } = useAlchemyService()

  const fromTokenRef = useRef<SelectInstance<BaseToken>>(null);
  const toTokenRef = useRef<SelectInstance<BaseToken>>(null);

  const [fromTokenAmount, setFromTokenAmount] = useState<Amount>(processTokenAmount('1', 6));
  const [fromTokenBalance, setFromTokenBalance] = useState<Amount>(processTokenAmount());

  const [toTokenAmount, setToTokenAmount] = useState<Amount>(processTokenAmount());

  const { open: openModalFromToken, showModal: showModalFromToken, hideModal: hideModalFromToken } = useModal();
  const { open: openModalToToken, showModal: showModalToToken, hideModal: hideModalToToken } = useModal();
  const { open: openModalTransaction, showModal: showModalTransaction, hideModal: hideModalTransaction } = useModal();

  const [steps, setSteps] = useState<Steps>(stepsInitialState)

  const [pageFromToken, setPageFromToken] = useState(1);
  const [pageToToken, setPageToToken] = useState(1);

  const [maxApproveAmount, setMaxApproveAmount] = useState(true);

  const [txCost, setTxCost] = useState<TxCost>({ value: 0, state: 'fetching' })
  const { setNotification } = useNotification();
  const [txHashUrl, setTxHashUrl] = useState<TxHashUrl>('');

  const incrementPageFromTokensList = () => {
    setPageFromToken((prev) => prev + 1);
  };

  const incrementPageToTokensList = () => {
    setPageToToken((prev) => prev + 1);
  };

  const paginate = (listName: 'from' | 'to', chainName: string, page: number) => {
    const tokens = mainnetTokens[chainName];
    const paginatedTokens = paginateTokensList(tokens, page);

    if (listName === 'from') {
      if (page === 1) {
        setFromTokensList(paginatedTokens)
      } else {
        for (const token of paginatedTokens) {
          addFromTokenToList(token)
        }
      }
      return;
    }
    if (listName === 'to') {
      if (page === 1) {
        setToTokensList(paginatedTokens)
      } else {
        for (const token of paginatedTokens) {
          addToTokenToList(token)
        }
      }
      return;
    }
  };

  const changeSteps = (step: string, state: 'loading' | 'completed' | 'failed') => {
    setSteps((prev) => ({ ...prev, [step]: { state } }))
  }

  const resetSteps = () => {
    setSteps(stepsInitialState);
  }

  useEffect(() => {
    paginate('from', selectedChain.name.toLowerCase(), pageFromToken)
  }, [pageFromToken]);

  useEffect(() => {
    paginate('to', selectedChain.name.toLowerCase(), pageToToken)
  }, [pageToToken]);

  const onChangeFromTokenAmount = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value || !(parseInt(e.target.value) > 0) && !e.target.value.includes('.')) {
      setFromTokenAmount(processTokenAmount())
      setFromTokenAmount((prev) => ({ ...prev, formated: '0' }))

      return;
    }
    let currentValue = e.target.value

    const regex = /^\d+\.?\d{0,6}$/;
    if (regex.test(currentValue)) {
      setFromTokenAmount(processTokenAmount(currentValue, fromToken?.decimals))
      setFromTokenAmount((prev) => ({ ...prev, formated: currentValue }))

    }
  }, [fromToken]);

  const onChangeSlippage = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      setSlippage("")
      return
    }
    if (parseInt(e.target.value) > 50) {
      return;
    }
    const regex = /^\d{0,2}\.?\d{0,3}$/
    if (regex.test(e.target.value)) {
      setSlippage(e.target.value)
    }
  };

  const onChangeMaxApproveAmount = (e: ChangeEvent<HTMLInputElement>) => {
    setMaxApproveAmount(e.target.checked)
  };

  const onCheckedAllowPartialFill = (e: ChangeEvent<HTMLInputElement>) => {
    setAllowPartialFill(e.target.checked);
  };

  const onChangeSelectedChain = (newValue: SingleValue<ChainOption>, actionMeta: ActionMeta<ChainOption>) => {
    if (newValue) {
      if (switchNetwork) {
        switchNetwork(newValue.value)
      }
    }
  };

  const onChangeFromToken = (newValue: SingleValue<BaseToken>, actionMeta: ActionMeta<BaseToken>) => {
    if (newValue) {
      if (newValue.symbol == toToken?.symbol) {
        return
      } 
      setFromToken(newValue);
      setFromTokenAmount(processTokenAmount('1', newValue.decimals))
      hideModalFromToken();
      setPageFromToken(1);
    }
  };

  const onChangeToToken = (newValue: SingleValue<BaseToken>, actionMeta: ActionMeta<BaseToken>) => {
    if (newValue) {
      if (newValue.symbol == fromToken?.symbol) {
        return
      } 
      setToToken(newValue);
      hideModalToToken();
      setPageToToken(1);
    }
  };

  const onCloseModalTransaction = () => {
    hideModalTransaction()
    setToTokenAmount(processTokenAmount())
    resetSteps()
    setTxHashUrl('')
  }

  useEffect(() => {
    if(!chain) {
      return;
    }
    const selectedSourceChain = Object.values(mainnetChains).find((x) => x.chainId === (chain?.id ?? 1));
    if (selectedSourceChain) {
      setSelectedChain(selectedSourceChain)
    }
  }, [chain])

  useEffect(() => {
    if (!selectedChain) return;
    const wrapedNative = getNativeSymbol(selectedChain.name.toLocaleLowerCase())
    clearFromTokensList();
    const chainName = selectedChain.name.toLowerCase()
    const tokens = mainnetTokens[chainName];
    setFromTokensList(tokens.slice(0, 50))
    const fromTokenSelected = tokens.find((x) => x.symbol === 'USDT');
    setToTokensList(tokens.slice(0, 50))
    const toTokenSelected = tokens.find((x) => x.symbol === wrapedNative);

    if (fromTokenSelected) {
      fromTokenRef.current?.selectOption(fromTokenSelected)
      setFromToken(fromTokenSelected)
    }

    if (toTokenSelected) {
      toTokenRef.current?.selectOption(toTokenSelected)
      setToToken(toTokenSelected)

    }
  }, [selectedChain])

  useEffect(() => {
    if (!errorSwitchNetwork || !chain) return;
    const _selectedChain = Object.values(mainnetChains).find((x) => x.chainId === chain.id);
    if (_selectedChain) {
      setSelectedChain(_selectedChain)
    }
    setNotification({ title: 'Switch Network', description: errorSwitchNetwork.message, type: 'error' });
  }, [errorSwitchNetwork])

  const fetchTokenBalance = useCallback(async (token: BaseToken) => {
    if (!address || isLoadingSwitchNetwork) return;
    return await fetchBalance({
      address,
      token: token.address !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? token.address as `0x${string}` : undefined,
      chainId: selectedChain.chainId

    })
  }, [address, selectedChain, isLoadingSwitchNetwork]);

  const calculateGasPriceInUsd = useCallback(async (chainId: number, gasLimit: string) => {
    const nativeTokenId = getNativeTokenId(chainId.toString());
    const { gasPrice } = await fetchFeeData({ chainId: chainId });
    let nativeTokenPrice = '0';
    try {
      nativeTokenPrice = (await apiService.getNativeTokenPrice({ ids: nativeTokenId, vs_currencies: 'usd' }))[nativeTokenId]['usd']
    } catch (error) {
      console.log('call coingecko api fail')
    }
    return getGasCost(gasLimit, gasPrice ?? BigNumber.from(formatUnits(20, 'gwei')), nativeTokenPrice)

  }, [apiService])

  const getQuote = useCallback(async () => {

    let txCostValue = 0;
    let txCostState: 'fetching' | 'done' = 'fetching';

    if (
      !fromToken ||
      !toToken ||
      !fromTokenAmount.value.gt(0) ||
      isLoadingSwitchNetwork ||
      openModalFromToken ||
      openModalToToken ||
      openModalTransaction
    ) {
      setToTokenAmount(processTokenAmount())
      setTxCost({ value: txCostValue, state: txCostState });
      return;
    };
    const { gasPrice: gasPriceSource } = await fetchFeeData({ chainId: selectedChain.chainId })

    const preset = 'maxReturnResult'
    setToTokenAmount(processTokenAmount())
    setTxCost({ value: txCostValue, state: txCostState });

    try {
      const response = await apiService.getQuoteV2(
        selectedChain.chainId, {
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: fromTokenAmount.raw,
        preset,
        gasPrice: gasPriceSource?.toString() ?? '150000000000'
      })

      const estimatedGas = await calculateGasPriceInUsd(selectedChain.chainId, response.bestResult.gasUnitsConsumed);

      txCostValue = txCostValue + estimatedGas
      const toTokenAmount = processTokenAmount(BigNumber.from(response.bestResult.toTokenAmount), toToken.decimals)
      setToTokenAmount(toTokenAmount)
    } catch (err: any) {
      txCostState = 'done'
      setNotification({ title: 'getQuote', description: err.data?.reason ?? err.data?.description ?? null, type: 'error' })
      setToTokenAmount(processTokenAmount())
      setTxCost({ value: txCostValue, state: txCostState })
      setToTokenAmount(fromTokenAmount)
      console.log(err)
      return;
    }

  }, [
    fromToken,
    apiService,
    fromTokenAmount,
    toToken,
    isLoadingSwitchNetwork,
    openModalFromToken,
    openModalToToken,
    openModalTransaction,
    selectedChain
  ]);

  useEffect(() => {
    getQuote()
    const interval = setInterval(async () => await getQuote(), 12000)
    return () => {
      clearInterval(interval)
    }
  }, [getQuote])

  const readySwap = useMemo(() => {
    return !!(fromToken && toToken && address && fromTokenAmount.value.gt(0) && selectedChain)
  }, [
    fromToken,
    toToken,
    fromTokenAmount,
    address,
    selectedChain,
  ])

  const needApproveforSwap = useCallback(async (chainId: number, token: BaseToken, owner: string, amount: number) => {
    const { address: spender } = await apiService.getSpenderAddress(chainId)
    const allowance = await getTokenAllowance(chainId, {
      token: token.address,
      owner,
      spender
    }, 
    amount
    )

    console.log('allowance from needApproveforSwap', allowance)
    

    return false

  }, [address, apiService]);

  const getApproveCallData = async (chainId: number, token: BaseToken, amount: string) => {
    let parsedAmount = amount;
    if (maxApproveAmount) {
      parsedAmount = constants.MaxUint256.toString()
    }
    return await apiService.getApproveCallData(chainId, { tokenAddress: token.address, amount: parsedAmount })
  };

  const getSwapCallData = async (chainId: number, params: Omit<SwapCallDataParamsV2, 'minTokensAmount'>) => {
    const slippageInToToken = BigNumber.from(params.guaranteedAmount.slice(0, params.guaranteedAmount.length - 2))

    return await apiService.getSwapCallDataV2(chainId, {
      ...params,
      minTokensAmount: BigNumber.from(params.guaranteedAmount).sub(slippageInToToken).sub(1).toString(),
      ethValue: params.fromTokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? params.amount : undefined,
      allowUnoSwap: true,
      allowPartialFill: true,
      enableEstimate: true,
      protectPMM: true,
    });
  };

  const swap = useCallback(async () => {
    if (!selectedChain || !fromToken || !toToken || !address) throw new Error<{ reason: string }>({ reason: 'missin params', statusCode: 1 });
    let currentStep = ``
    const needApprove = await needApproveforSwap(selectedChain.chainId, fromToken, address, fromTokenAmount.raw);
    console.log('needApprove', needApprove)
    // try {

    //   if (needApprove) {
    //     const approveCallData = await getApproveCallData(selectedChain.chainId, fromToken, fromTokenAmount.raw);
    //     const approveConfig = await prepareSendTransaction({
    //       request: {
    //         to: approveCallData.to,
    //         data: approveCallData.data,
    //         value: approveCallData.value,
    //       }
    //     })
    //     currentStep = `approve ${fromToken.symbol} for swap`;
    //     const approveTx = await sendTransaction(approveConfig);
    //     await approveTx.wait()
    //     console.log('approve hash', approveTx.hash)
    //   }

    //   const { gasPrice } = await fetchFeeData({ chainId: selectedChain.chainId })

    //   const quote = await apiService.getQuoteV2(selectedChain.chainId, {
    //     fromTokenAddress: fromToken.address,
    //     toTokenAddress: toToken.address,
    //     amount: fromTokenAmount.raw,
    //     preset: 'maxReturnResult',
    //     gasPrice: gasPrice?.toString() ?? '150000000000'
    //   })

    //   const swapCallData = await getSwapCallData(selectedChain.chainId, {
    //     fromTokenAddress: fromToken.address,
    //     toTokenAddress: toToken.address,
    //     amount: fromTokenAmount.raw,
    //     guaranteedAmount: quote.bestResult.toTokenAmount,
    //     allowedSlippagePercent: parseFloat(slippage),
    //     walletAddress: address as string,
    //     pathfinderData: {
    //       routes: quote.bestResult.routes,
    //       mainParts: quote.preset.mainParts,
    //       splitParts: quote.preset.subParts,
    //       deepLevel: quote.preset.deepLevel
    //     },
    //     gasPrice: gasPrice?.toString() ?? '150000000000'
    //   });
    //   const spender = await apiService.getSpenderAddress(selectedChain.chainId)
    //   const swapConfig = await prepareSendTransaction({
    //     request: {
    //       data: swapCallData.data,
    //       from: address,
    //       gasLimit: swapCallData.gasLimit,
    //       to: spender.address,
    //       value: swapCallData.ethValue
    //     }
    //   })

    //   currentStep = ``
    //   const swapTx = await sendTransaction(swapConfig);
    //   await swapTx.wait(2)
    //   console.log('swap hash', swapTx.hash)
    //   setTxHashUrl(swapTx.hash);

    // } catch (err: any) {
    //   throw new Error<TransactionError>({ step: 'swap', reason: err.data?.reason ?? err.data?.description ?? err.message ?? currentStep, statusCode: 1 });
    // }

  }, [fromToken, toToken, fromTokenAmount, address, slippage, needApproveforSwap])

  return (
    <SwapContext.Provider value={{
      chains: Object.values(mainnetChains),
      fromTokensList,
      toTokensList,
      fromToken,
      toToken,
      slippage,
      allowPartialFill,
      onChangeSlippage,
      onCheckedAllowPartialFill,
      fromTokenRef,
      toTokenRef,
      fromTokenAmount,
      toTokenAmount,
      onChangeFromTokenAmount,
      onChangeFromToken,
      onChangeToToken,
      openModalFromToken,
      showModalFromToken,
      openModalToToken,
      showModalToToken,
      openModalTransaction,
      onCloseModalTransaction,
      incrementPageFromTokensList,
      incrementPageToTokensList,
      maxApproveAmount,
      onChangeMaxApproveAmount,
      readySwap,
      steps,
      txCost,
      selectedChain,
      onChangeSelectedChain,
      swap,
      txHashUrl
    }}>
      {children}
    </SwapContext.Provider>
  );
};

const useSwap = () => useContext(SwapContext)!;

export { SwapProvider, useSwap };
