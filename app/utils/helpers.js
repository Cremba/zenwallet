// @flow

import { Buffer } from 'buffer'

import bech32 from 'bech32'
import { Data, Address, Chain } from '@zen/zenjs'
import { sha3_256 as sha } from 'js-sha3'
import BigInteger from 'bigi'

import db from '../services/db'
import { ZEN_ASSET_NAME, ZEN_ASSET_HASH } from '../constants'

const validPrefixes = ['zen', 'tzn', 'czen', 'ctzn']
const savedContracts = db.get('savedContracts').value()

export const isDev = () => process.env.NODE_ENV === 'development'

// TODO use exposed asset names from stores instead
export const getAssetName = (asset: ?string) => {
  if (asset === ZEN_ASSET_HASH) { return ZEN_ASSET_NAME }
  const contractFromDb = savedContracts.find(contract => contract.contractId === asset)
  if (contractFromDb && contractFromDb.name) {
    return contractFromDb.name
  }
  return ''
}

export const truncateString = (string: ?string) => {
  if (string) {
    return string.length > 12
      ? `${string.substr(0, 6)}...${string.substr(string.length - 6)}`
      : string
  }
}

export const convertAllocation = (allocation: number): number => (Math.floor(allocation) / 50) * 100

export const serialize = (data) => {
  const buffer = Buffer.alloc(data.getSize())
  data.write(buffer, 0)

  return buffer.toString('hex')
}

export const stringToNumber = (str: ?string) => str && parseFloat(str.replace(/,/g, ''))

export const isValidAddress = (address: ?string, chain?: Chain = 'test'): boolean => {
  try {
    Address.decode(chain, address)
    return true
  } catch (err) {
    // uncomment for debugging, this throws many errors from the bech32 package
    // console.error('validateAddress err', err)
    return false
  }
}

export const isValidAddressOrContract = (address: ?string): boolean => {
  try {
    const { prefix, words } = bech32.decode(address)
    const pkHash = bech32.fromWords(words.slice(1))
    const isPrefixValid = (validPrefixes.indexOf(prefix) > -1)
    return (pkHash.length === 36 || pkHash.length === 32) && isPrefixValid
  } catch (err) {
    // uncomment for debugging, this throws many errors from the bech32 package
    // console.error('validateAddress err', err)
    return false
  }
}

export const isValidHex = (hex: string): boolean => /[0-9a-f]{40}/g.test(hex)

export const hashVoteData = (commitID: string, interval = 1) => Buffer.from(sha
  .update(sha(Data.serialize(new Data.UInt32(BigInteger.valueOf(interval)))))
  .update(sha(Data.serialize(new Data.String(commitID)))).toString(), 'hex')

export const payloadData = (address, messageBody, command) => {
  const data = {
    address,
    command,
    options: {
      returnAddress: false,
    },
    messageBody: Data.serialize(messageBody),
  }
  return data
}

export const getNamefromCodeComment = (code: string) => {
  const startRegex = /NAME_START:/
  const endRegex = /:NAME_END/

  const startIsPresent = startRegex.test(code)
  const endIsPresent = endRegex.test(code)

  if (startIsPresent && endIsPresent) {
    const indexOfStart = code.indexOf('NAME_START:') + 11
    const indexOfEnd = code.indexOf(':NAME_END')
    const length = indexOfEnd - indexOfStart
    const name = code.substr(indexOfStart, length).trim()
    return name
  }
  return false
}

export const minimumDecimalPoints = (num: string | number, decimalPoints: number): string => {
  num = Number(num)
  return num.toFixed(Math.max(decimalPoints, (num.toString().split('.')[1] || []).length))
}

export const numberWithCommas = (x: number | string): string => {
  const parts = x.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}
