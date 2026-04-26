import { useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "./useProgram"
import {PublicKey} from "@solana/web3.js";

export const useGetUserPda = ()=>{
    const { publicKey } = useWallet();
    const { program } = useProgram() 
    const getUserPda = ()=>{
        if(!publicKey){
            throw new Error("Please connect your wallet!")
        }
        const pda = PublicKey.findProgramAddressSync(
            [
                Buffer.from("user-info"),
                publicKey.toBuffer()
            ],
            program.programId
        );
        return pda
    }
    return getUserPda;
}