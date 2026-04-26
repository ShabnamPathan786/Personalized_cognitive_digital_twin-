import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import {AnchorProvider, Program}  from "@coral-xyz/anchor"
import idl from "../idl/on_chain_data.json"
export const useProgram = ()=>{
    const {wallet} = useWallet()
    const {connection} = useConnection()
    const provider = new AnchorProvider(connection,wallet,{commitment:"confirmed"})
    const program = new Program(
        idl,
        provider
    )
    return {
        program,
        provider
    }
}