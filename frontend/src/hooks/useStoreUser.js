
import { useWallet } from "@solana/wallet-adapter-react"
import {useMutation} from "@tanstack/react-query"
import { useProgram } from "./useProgram"
import { useGetUserPda } from "./useGetUserPda"
export const useStoreUser =  ()=>{
    const {publicKey} = useWallet()
    const {program} = useProgram()
    const getUserPda = useGetUserPda()
    return useMutation({
        mutationKey:["user",publicKey],
        mutationFn:async({
            name,
            email,
            phoneNumber
        })=>{
            try {
                const userPda = getUserPda()
                const tx = program.methods
                    .createProfile()
            } catch (error) {
                
            }
        }
    })
}