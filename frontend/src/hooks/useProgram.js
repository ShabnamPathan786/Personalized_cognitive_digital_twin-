
import idl from "../idl/user.json"
import {AnchorProvider, Program} from "@coral-xyz/anchor"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
export const useProgram = ()=>{
    const connection = useConnection()
    const {wallet} = useWallet()
    const provider = new AnchorProvider(connection,wallet,{commitment:"confirmed"})

    const program = new Program(idl,provider)
    return {
        program,
        provider
    }
}