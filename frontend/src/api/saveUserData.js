
import { useWallet } from "@solana/wallet-adapter-react"
import {useMutation} from "@tanstack/react-query"
import { useProgram } from "../hooks/useProgram"
import { useGetUserPda } from "../hooks/useGetUserPda"
import { SystemProgram } from "@solana/web3.js"

export const storeUser = ()=>{
    const {publicKey} = useWallet()
    const {program} = useProgram()
    const getUserPda = useGetUserPda()
    return useMutation({
        mutationKey:["user",publicKey],
        mutationFn:async({
            name,
            email,
            phone
        }) => {
            try {
                if(!publicKey){
                    throw new Error("Please connect your wallet!")
                }
                const userPda = getUserPda()
                const tx = await program.methods
                        .createProfile(name,email,phone)
                        .accounts({
                            profile:userPda,
                            user:publicKey,
                            systemProgram:SystemProgram.programId
                        })
                        .rpc()
                        
                if(!tx){
                    throw new Error("Instruction failed to execute!")
                }
                return tx;
            } catch (error) {
                console.error(`ERROR:${error.message}`)
                throw error
            }
        }
    })
}