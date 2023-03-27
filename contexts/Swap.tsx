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
import { formatEther, formatUnits, parseEther } from "ethers/lib/utils.js";
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
import { Transaction, useAlchemyService } from "./AlchemyService";

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
  needMoreAllowance: boolean;
  insufficientBalance: boolean;
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
  approve: { state: 'loading' },
  swap: { state: 'loading' }
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

  const {
    list: latestTransactionsList,
    addItem: addLatestTransactionsList,
    clear: clearLatestTransactionsList,
    setList: setLatestTransactionsList
  } = useList<Transaction>();

  const [slippage, setSlippage] = useState("1");
  const [allowPartialFill, setAllowPartialFill] = useState(true);
  const { 
    getTokenAllowance, 
    getTokenBalance, 
    getEthBalance,
    getLastestTransactions
  } = useAlchemyService()

  const fromTokenRef = useRef<SelectInstance<BaseToken>>(null);
  const toTokenRef = useRef<SelectInstance<BaseToken>>(null);
  const [fromTokenAmount, setFromTokenAmount] = useState<Amount>(processTokenAmount());
  const [fromTokenBalance, setFromTokenBalance] = useState<Amount>(processTokenAmount());
  const [needMoreAllowance, setNeedMoreAllowance] = useState(false)
  const [insufficientBalance, setInsufficientBalance] = useState(false)

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
      setToTokenAmount(processTokenAmount())
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
    if (!chain) {
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
    clearFromTokensList()
    clearToTokensList()
    const tokens = mainnetTokens[chainName];
    setFromTokensList(tokens.slice(0, 50))
    setToTokensList(tokens.slice(0, 50))
    const fromTokenSelected = tokens.find((x) => x.symbol === wrapedNative);
    const usdtTokenIndex = tokens.findIndex((x) => x.symbol === 'USDT');
    const usdcTokenIndex = tokens.findIndex((x) => x.symbol === 'USDC');
    const daiTokenIndex = tokens.findIndex((x) => x.symbol === 'DAI');

    if (fromTokenSelected) {
      fromTokenRef.current?.selectOption(fromTokenSelected)
      setFromToken(fromTokenSelected)
      setFromTokenAmount(processTokenAmount(parseEther('1'), fromToken?.decimals))
    }
    if (usdtTokenIndex !== -1){
      toTokenRef.current?.selectOption(tokens[usdtTokenIndex])
      setToToken(tokens[usdtTokenIndex])
    } else if (usdtTokenIndex === -1 && usdcTokenIndex !== -1) {
      toTokenRef.current?.selectOption(tokens[usdcTokenIndex])
      setToToken(tokens[usdcTokenIndex])
    } else if (daiTokenIndex != -1 && usdcTokenIndex === -1 && usdtTokenIndex === -1) {
      toTokenRef.current?.selectOption(tokens[daiTokenIndex])
      setToToken(tokens[daiTokenIndex])
    } else {
      toTokenRef.current?.selectOption(tokens[0])
      setToToken(tokens[0])
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


  // fetch balance hook
  useEffect(() => {
    if (!address || isLoadingSwitchNetwork || !fromToken) {
      return;
    } 
    if (fromToken.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      getEthBalance(selectedChain.chainId, {
        owner: address
      }).then((response) => {
        console.log('response from getEthBalance', response)
        setFromTokenBalance(response)
        setInsufficientBalance(fromTokenAmount.value.gt(response.value))
      })
    } else {
      getTokenBalance(selectedChain.chainId, {
        owner: address,
        token: fromToken
      }).then((response) => {
        console.log('response from getTokenBalance', response)
        setFromTokenBalance(response)
        setInsufficientBalance(fromTokenAmount.value.gt(response.value))
      })
    }

    getLastestTransactions(selectedChain.chainId, {
      owner: address
    }).then((result) => {
      console.log('result from getLastestTransactions', result)
    })
  }, [address, selectedChain, fromToken, isLoadingSwitchNetwork, fromTokenAmount]);

  const calculateGasPriceInUsd = useCallback(async (chainId: number, gasLimit: string | BigNumber) => {
    const nativeTokenId = getNativeTokenId(chainId);
    try {
      const { gasPrice } = await fetchFeeData({ chainId: chainId });
      if (!gasPrice) {
        return 0
      }
      const nativeTokenPrice = (await apiService.getNativeTokenPrice({ ids: nativeTokenId, vs_currencies: 'usd' }))[nativeTokenId]['usd']
      const estimatedGas = parseFloat(formatEther(gasPrice.mul(gasLimit)))
      return estimatedGas * nativeTokenPrice
    } catch (error) {
      console.log('call coingecko api fail')
      return 0
    }

    //getGasCost(gasLimit, gasPrice ?? BigNumber.from(formatUnits(20, 'gwei')), nativeTokenPrice)

  }, [apiService])

  const getQuote = useCallback(async () => {

    let txCostValue = 0;
    let txCostState: 'fetching' | 'done' = 'fetching';

    if (
      !fromToken ||
      !toToken ||
      fromTokenAmount.value.isZero() ||
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

      const estimatedGasValue = await calculateGasPriceInUsd(selectedChain.chainId, response.bestResult.gasUnitsConsumed);

      txCostValue = txCostValue + estimatedGasValue
      const toTokenAmount = processTokenAmount(BigNumber.from(response.bestResult.toTokenAmount), toToken.decimals)
      setToTokenAmount(toTokenAmount)

      txCostState = 'done'
      setTxCost({ value: txCostValue, state: txCostState });

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
    return !!(fromToken && toToken && address && selectedChain && txCost.state === 'done' && !insufficientBalance)
  }, [
    fromToken,
    toToken,
    address,
    selectedChain,
    txCost,
    insufficientBalance
  ])


  useEffect(() => {
    if (!fromToken || !address || fromTokenAmount.value.isZero()) {
      return
    }

    if (fromToken.symbol === "ETH" || fromToken.symbol === "MATIC") {
      setNeedMoreAllowance(false)
      return;
    }

    apiService.getSpenderAddress(selectedChain.chainId)
      .then(async (response) => {
        const spender = response.address;
        const needMoreAllowance = await getTokenAllowance(
          selectedChain.chainId,
          fromTokenAmount.raw,
          {
            token: fromToken.address,
            owner: address,
            spender
          }
        )
        setNeedMoreAllowance(needMoreAllowance)
      })


  }, [address, apiService, fromToken, address, fromTokenAmount, selectedChain]);

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
     try {

      if (needMoreAllowance) {
        const approveCallData = await getApproveCallData(selectedChain.chainId, fromToken, fromTokenAmount.raw);
        const approveConfig = await prepareSendTransaction({
          request: {
            to: approveCallData.to,
            data: approveCallData.data,
            value: approveCallData.value,
          }
        })
        currentStep = `approve ${fromToken.symbol} for swap`;
        const approveTx = await sendTransaction(approveConfig);
        await approveTx.wait(2)
        console.log('approve hash', approveTx.hash)
        changeSteps('approve', 'completed')

      }

       const { gasPrice } = await fetchFeeData({ chainId: selectedChain.chainId })

      const quote = await apiService.getQuoteV2(selectedChain.chainId, {
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: fromTokenAmount.raw,
        preset: 'maxReturnResult',
        gasPrice: gasPrice?.toString() ?? '50000000000'
      })

      const swapCallData = await getSwapCallData(selectedChain.chainId, {
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: fromTokenAmount.raw,
        guaranteedAmount: quote.bestResult.toTokenAmount,
        allowedSlippagePercent: parseFloat(slippage),
        walletAddress: address as string,
        pathfinderData: {
          routes: quote.bestResult.routes,
          mainParts: quote.preset.mainParts,
          splitParts: quote.preset.subParts,
          deepLevel: quote.preset.deepLevel
        },
        gasPrice: gasPrice?.toString() ?? '50000000000'
      });
      const spender = await apiService.getSpenderAddress(selectedChain.chainId)
      const swapConfig = await prepareSendTransaction({
        request: {
          data: swapCallData.data,
          from: address,
          gasLimit: swapCallData.gasLimit,
          to: spender.address,
          value: swapCallData.ethValue
        }
      })

       currentStep = `swap ${fromToken.symbol} to  ${toToken.symbol}`
      const swapTx = await sendTransaction(swapConfig);
      await swapTx.wait(2)
      console.log('swap hash', swapTx.hash)
      changeSteps('swap', 'completed')
      setTxHashUrl(`${getExplorerUrl(selectedChain.chainId)}/tx/${swapTx.hash}`);
       currentStep = `swap succesfully`
     } catch (err: any) {
       changeSteps('swap', 'failed')

       throw new Error<TransactionError>({ step: 'swap', reason: err.data?.reason ?? err.data?.description ?? err.message ?? currentStep, statusCode: 1 });
     }

  }, [fromToken, toToken, fromTokenAmount, address, slippage, needMoreAllowance, selectedChain])

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
      txHashUrl,
      needMoreAllowance,
      insufficientBalance
    }}>
      {children}
    </SwapContext.Provider>
  );
};

const useSwap = () => useContext(SwapContext)!;

export { SwapProvider, useSwap };
