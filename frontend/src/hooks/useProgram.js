
import idl from "../idl/user.json"
import {AnchorProvider, Program} from "@coral-xyz/anchor"
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react"
export const useProgram = ()=>{
    const { connection } = useConnection()
    const wallet = useAnchorWallet()
    const provider = new AnchorProvider(connection, wallet, {commitment:"confirmed"})

    const program = new Program(idl, provider)
    return {
        program,
        provider
    }
}