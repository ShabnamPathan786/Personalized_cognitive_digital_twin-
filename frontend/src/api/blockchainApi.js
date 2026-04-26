
import {useMutation, useQuery} from "@tanstack/react-query"
import { useProgram } from "../hooks/useProgram"
import { useGetUserPda } from "../hooks/useGetUsePda"
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils"
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system"

export const saveUserOnChain = ()=>{
    const { program } = useProgram()
    const getUserPda = useGetUserPda();

    return useMutation({
        mutationKey:["user"],
        mutationFn: async({
            name,
            email,
            phoneNumber
        })=>{
            try {
                const pda = getUserPda()
                const tx = await program.methods
                    .storeUserInfo(
                        name,
                        email,
                        phoneNumber
                    )
                    .accounts({
                        userInfo:pda,
                        user:publicKey,
                        systemProgram:SYSTEM_PROGRAM_ID
                    })
                    .rpc()
                if(!tx){
                    throw new Error("Instruction not executed!")
                }
                return tx
            } catch (error) {
                console.log(`ERROR:${error.message}`)
                throw error;
            }
        }
    })
}