import React, { RefObject, useEffect, useRef } from 'react'
import { ChainOption, useSwap } from '../contexts/Swap'
import Select, { ActionMeta, SelectInstance, SingleValue } from 'react-select'
import { mainnetChains } from '../config/chains';

const options = Object.values(mainnetChains).map((x) => {
  return { label: x.name, value: x.chainId, image: x.image }
});

export default function NetworkSwitcher() {
  const chainRef = useRef<SelectInstance<ChainOption>>(null);
  const { selectedChain, onChangeSelectedChain } = useSwap()

  useEffect(() => {
    if(!selectedChain) {
      return
    }
    chainRef.current?.selectOption({
      label: selectedChain.name,
      value: selectedChain.chainId,
      image: selectedChain.image
    })
  }, [selectedChain])
  
  return (
    <div className="w-36">
      <Select<ChainOption>
        options={options}
        ref={chainRef}
        onChange={onChangeSelectedChain}
        isSearchable={false}
        formatOptionLabel={(option) => (
          <div className="flex gap-1 items-center">
            <img src={option.image} className="h-5 w-5" alt="" />
            <p className='ml-1 text-slate-800 text-sm font-medium'>{option.label}</p>
          </div>
        )}
        styles={{
          control: (baseStyle) => ({
            ...baseStyle,
            borderRadius: '12px',
            backgroundColor: 'transparent',
            ':hover': {
              cursor: 'pointer'
            }
          }),
          singleValue: (baseStyle) => ({
            ...baseStyle,
            color: '#f8fafc'
          }),
          indicatorSeparator: () => ({
            display: 'none'
          }),
          menu: (baseStyle) => ({
            ...baseStyle,
            backgroundColor: '#e2e8f0',
            marginTop: '4px'
          }),
          option: (baseStyle, state) => ({
            ...baseStyle,
            backgroundColor: state.isSelected ? '#0284c7' : 'transparent',
            ':hover': {
              backgroundColor: '#f1f5f9'
            }
          }),
          valueContainer: (baseStyle) => ({
            ...baseStyle,
            padding: '0px 4px'
          })
        }}
      />
    </div>
  )
}
