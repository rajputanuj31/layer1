/* eslint-disable react/no-unescaped-entities */
import { useAnonAadhaar, useProver } from "@anon-aadhaar/react";
import {
  AnonAadhaarCore,
  deserialize,
  packGroth16Proof,
} from "@anon-aadhaar/core";
import { useEffect, useState } from "react";
import { Loader } from "@/components/Loader";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import insurance from "../../public/Insurance.json";
import { writeContract } from "@wagmi/core";
import { wagmiConfig } from "../config";
import { parseEther } from "viem";

export default function GetInsurance() {
  const [anonAadhaar] = useAnonAadhaar();
  const [, latestProof] = useProver();
  const [anonAadhaarCore, setAnonAadhaarCore] = useState<AnonAadhaarCore>();
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const issuePolicy = async (_anonAadhaarCore: AnonAadhaarCore) => {
    const packedGroth16Proof = packGroth16Proof(
      _anonAadhaarCore.proof.groth16Proof
    );
    setIsLoading(true);

    try {
      const contractAddress = "0x81193f978ecd647b6e923bcfa5429728cc49baf8";

      if (!contractAddress) {
        throw new Error("Insurance contract address not configured");
      }

      // Hardcoded services covered
      const servicesCovered = ["Health", "Accident", "Fire", "Flood"];

      // Set coverage amount to 1 ETH and validity for 30 days from now
      const coverageAmount = parseEther("1");
      const validTill = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60); // 30 days from now

      const policyTx = await writeContract(wagmiConfig, {
        abi: insurance,
        address: contractAddress as `0x${string}`,
        functionName: "issuePolicy",
        args: [
          _anonAadhaarCore.proof.nullifierSeed,
          _anonAadhaarCore.proof.nullifier,
          _anonAadhaarCore.proof.timestamp,
          address,
          [
            _anonAadhaarCore.proof.ageAbove18,
            _anonAadhaarCore.proof.gender,
            _anonAadhaarCore.proof.pincode,
            _anonAadhaarCore.proof.state,
          ],
          packedGroth16Proof,
          coverageAmount,
          validTill,
          servicesCovered,
        ],
      });

      setIsLoading(false);
      setIsSuccess(true);
      console.log("Policy transaction: ", policyTx);
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  };

  useEffect(() => {
    // Deserialize the latest proof from local storage
    const aaObj = localStorage.getItem("anonAadhaar");
    const anonAadhaarProofs = JSON.parse(aaObj!).anonAadhaarProofs;

    deserialize(
      anonAadhaarProofs[Object.keys(anonAadhaarProofs).length - 1].pcd
    ).then((result) => {
      console.log(result);
      setAnonAadhaarCore(result);
    });
  }, [anonAadhaar, latestProof]);

  return (
    <>
      <main className="flex flex-col min-h-[75vh] mx-auto justify-center items-center w-full p-4">
        <div className="max-w-4xl w-full">
          <h2 className="text-[90px] font-rajdhani font-medium leading-none">
            GET INSURED NOW
          </h2>
          <div className="text-md mt-4 mb-8 text-[#717686]">
            You're just one step away from securing your future. With your
            verified Anon Aadhaar proof, you can now get instant coverage of 1
            ETH valid for 30 days. Our smart contract ensures your identity
            remains private while providing reliable insurance protection.
          </div>

          <div className="flex flex-col gap-5">
            <div className="text-sm sm:text-lg font-medium font-rajdhani">
              {"SECURE AND PRIVATE BLOCKCHAIN INSURANCE"}
            </div>

            <div>
              {isConnected ? (
                isLoading ? (
                  <Loader />
                ) : (
                  <button
                    type="button"
                    className="inline-block mt-5 bg-[#009A08] rounded-lg text-white px-14 py-1 border-2 border-[#009A08] font-rajdhani font-medium hover:bg-[#007A06] transition-colors"
                    onClick={() => {
                      if (anonAadhaarCore !== undefined)
                        issuePolicy(anonAadhaarCore);
                    }}
                  >
                    GET COVERAGE NOW
                  </button>
                )
              ) : (
                <button
                  disabled={true}
                  type="button"
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
                >
                  Connect wallet to get insured ⬆️
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
