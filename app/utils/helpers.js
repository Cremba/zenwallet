// @flow

import { Buffer } from 'buffer'

import { Data, Chain } from '@zen/zenjs'
import { Spend } from '@zen/zenjs/build/src/Consensus/Types/Spend'
import { Payout, Recipient } from '@zen/zenjs/build//src/Consensus/Types/Payout'
import Address from '@zen/zenjs/build/src/Components/Wallet/Address'
import { ContractId } from '@zen/zenjs/build//src/Consensus/Types/ContractId'
import { sha3_256 as sha } from 'js-sha3'
import BigInteger from 'bigi'

import db from '../services/db'
import { ZEN_ASSET_NAME, ZEN_ASSET_HASH } from '../constants'

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

export const toSpend = (spends: { asset: string, amount: number }[]) => {
  const spendArr: Spend[] = []
  spends.forEach((asset, amount) => spendArr.push(new Spend(asset, amount)))
  return spendArr
}

export const getAddress = (recipient: Recipient) => {
  switch (recipient.kind) {
    case 'PKRecipient':
      return recipient.hash.hash
    case 'ContractRecipient':
      return recipient.contractId
    default:
      return ''
  }
}

export const toPayout
  = (chain, recipient: string, spends: { asset: string, amount: number }[]): Payout => {
    const spendArr = toSpend(spends)
    const address = Address.decode(chain, recipient)
    if (address instanceof ContractId) {
      return new Payout({
        kind: 'PKRecipient',
        hash: address,
      }, spendArr)
    }
    return new Payout({
      kind: 'ContractRecipient',
      contractId: address,
    }, spendArr)
  }

export const checkBallot = (hex: string) => {
  try {
    const payout = Payout.fromHex(hex)
    return 2 * payout.getSize() === hex.length
  } catch (e) {
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
