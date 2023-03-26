import { useSwap } from "../contexts/Swap";
import Select, { createFilter } from 'react-select'
import { BaseToken } from "../config/tokens";
import Modal from "./Layout/Modal";
import TokenOption from "./TokenOption";
import TokenCard from "./TokenCard";
import ActionButton from "./ActionButton";
import formatDecimals from "../utils/formatDecimals";
import Transaction from "./Transaction";

const styleTokenSelect = {
  option: () => ({}),
  indicatorSeparator: () => ({}),
  menu: (base: any) => ({
    ...base,
    marginTop: '4px',
    zIndex: 30,
    '::-webkit-scrollbar': {
      width: '4px',
    }
  }),
  indicatorsContainer: () => ({
    display: 'none'
  }),
  menuList: (base: any) => ({
    ...base,
    '::-webkit-scrollbar': {
      width: '4px',
    },
    '::-webkit-scrollbar-track': {
      background: ' #f1f1f1'
    },
    '::-webkit-scrollbar-thumb': {
      background: '#888'
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: '#555'
    },
  })
}

const filtersTokenSelect = createFilter<BaseToken>(
  {
    ignoreCase: true,
    ignoreAccents: true,
    matchFrom: 'any',
    stringify: (option) => `${option.data.symbol} ${option.data.address} ${option.data.name}`,
    trim: true,
  }
)

export default function Swap() {
  const {
    fromToken,
    toToken,
    fromTokensList,
    toTokensList,
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
    swap,
    readySwap,
    steps,
    selectedChain,
    txHashUrl,
    needMoreAllowance,
    insufficientBalance
  } = useSwap();


  return (<>
    <div className="flex flex-col gap-3 mb-4">
      <TokenCard
        showModal={showModalFromToken}
        actionText='You sell'
        token={fromToken}
        openModal={openModalFromToken}
        onChangeTokenAmount={onChangeFromTokenAmount}
        tokenAmount={fromTokenAmount.formated}
      >
        <Modal>
          <div className="h-full rounded-2xl pt-4 px-3 bg-slate-200">
            <Select<BaseToken>
              ref={fromTokenRef}
              menuIsOpen
              isSearchable
              options={fromTokensList.current}
              onChange={onChangeFromToken}
              backspaceRemovesValue={false}
              controlShouldRenderValue={false}
              hideSelectedOptions={false}
              isClearable={false}
              placeholder='Search by name, symbol or paste address'
              tabSelectsValue={false}
              formatOptionLabel={(option) => <TokenOption option={option} />}
              filterOption={filtersTokenSelect}
              styles={styleTokenSelect}
              onMenuScrollToBottom={incrementPageFromTokensList}
            />
          </div>
        </Modal>
      </TokenCard>
      <TokenCard
        showModal={showModalToToken}
        actionText='You buy'
        token={toToken}
        openModal={openModalToToken}
        readOnly={true}
        primary
        tokenAmount={formatDecimals(toTokenAmount.formated)}
      >
        <Modal>
          <div className="h-full rounded-2xl pt-4 px-3 bg-slate-200">
            <Select<BaseToken>
              ref={toTokenRef}
              menuIsOpen
              isSearchable
              options={toTokensList.current}
              onChange={onChangeToToken}
              backspaceRemovesValue={false}
              controlShouldRenderValue={false}
              hideSelectedOptions={false}
              isClearable={false}
              placeholder='Search by name, symbol or paste address'
              tabSelectsValue={false}
              formatOptionLabel={(option) => <TokenOption option={option} />}
              filterOption={filtersTokenSelect}
              styles={styleTokenSelect}
              onMenuScrollToBottom={incrementPageToTokensList}
            />
          </div>
        </Modal>
      </TokenCard>
    </div>
    <ActionButton
      disabled={!readySwap || fromTokenAmount.value.isZero()}
      onClick={swap}
      insufficientBalance={insufficientBalance}
      needMoreAllownce={needMoreAllowance}
    />
    {
      openModalTransaction && (
        <Modal>
          <Transaction
            fromToken={fromToken}
            toToken={toToken}
            steps={steps}
            txHashUrl={txHashUrl}
            openModalTransaction={openModalTransaction}
            onCloseModalTransaction={onCloseModalTransaction}
          />
        </Modal>
      )
    }
  </>
  )
}
