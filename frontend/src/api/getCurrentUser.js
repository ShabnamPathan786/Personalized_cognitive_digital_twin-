import { useWallet } from "@solana/wallet-adapter-react"
import { useQuery } from "@tanstack/react-query"
import { useProgram } from "../hooks/useProgram"
import {PublicKey} from "@solana/web3.js"

export const getUserData = ()=>{
    const {publicKey} = useWallet()
    const { program} = useProgram()
    return useQuery({
        queryKey:["user",publicKey],
        queryFn:async()=>{
            try {
                if(!publicKey){
                    console.error("please connect your wallet!!")
                    throw new Error("Please connect your wallet!!")
                }
                const [pda] = PublicKey.findProgramAddressSync(
                    [
                        Buffer.from("profile"),
                        publicKey.toBuffer()
                    ],
                    program.programId
                )
                const data = await program.account.userProfile.fetch(pda)
                console.log("user data:",data);
                return data
            } catch (error) {
                console.error("ERROR:",error)
                return null
            }
        }
    })
}