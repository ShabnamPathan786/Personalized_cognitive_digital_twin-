
import { useWallet } from "@solana/wallet-adapter-react"
import {PublicKey} from "@solana/web3.js"
import { useProgram } from "./useProgram"

export const useGetUserPda = ()=>{
    const {publicKey} = useWallet()
    const {program} = useProgram()
    const getUserPda = ()=>{
        const [pda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("profile"),
                publicKey.toBuffer()
            ],
            program.programId
        );
        return pda
    }
    return getUserPda
}