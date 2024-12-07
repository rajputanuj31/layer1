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
import { writeContract, readContract } from "@wagmi/core";
import { wagmiConfig } from "../config";
import { parseEther, formatEther } from "viem";

export default function GetInsurance() {
  const [anonAadhaar] = useAnonAadhaar();
  const [, latestProof] = useProver();
  const [anonAadhaarCore, setAnonAadhaarCore] = useState<AnonAadhaarCore>();
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showPolicyDetails, setShowPolicyDetails] = useState<boolean>(false);
  const [showServicesCovered, setShowServicesCovered] = useState<boolean>(false);
  const [showServicesInput, setShowServicesInput] = useState<boolean>(false);
  const [policyIdInput, setPolicyIdInput] = useState<string>("");
  const [servicesCoveredList, setServicesCoveredList] = useState<string[]>([]);
  const [policyDetails, setPolicyDetails] = useState<{
    policyId: bigint;
    coverageAmount: bigint;
    validTill: bigint;
    active: boolean;
  } | null>(null);
  const [policyExists, setPolicyExists] = useState<boolean>(false);

  
  const getPolicy = async (_anonAadhaarCore: AnonAadhaarCore) => {
    try {
      const contractAddress = "0x81193f978ecd647b6e923bcfa5429728cc49baf8";
      
      const result = await readContract(wagmiConfig, {
        abi: insurance,
        address: contractAddress as `0x${string}`,
        functionName: "getPolicy",
        args: [_anonAadhaarCore.proof.nullifier],
      }) as [bigint, bigint, bigint, boolean];

      if(result[0] !== 0n) { // If policyId exists
        setPolicyExists(true);
        setPolicyDetails({
          policyId: result[0],
          coverageAmount: result[1],
          validTill: result[2],
          active: result[3]
        });
      } else {
        setPolicyExists(false);
        setPolicyDetails(null);
      }

    } catch (e) {
      console.log("Error fetching policy:", e);
      setPolicyExists(false);
    }
  };

  const getServicesCovered = async (_anonAadhaarCore: AnonAadhaarCore, policyId: string) => {
    try {
      const contractAddress = "0x81193f978ecd647b6e923bcfa5429728cc49baf8";
      
      const result = await readContract(wagmiConfig, {
        abi: insurance,
        address: contractAddress as `0x${string}`,
        functionName: "getServicesCovered",
        args: [_anonAadhaarCore.proof.nullifier, BigInt(policyId)],
      }) as string[];

      setServicesCoveredList(result);
    } catch (e) {
      console.log("Error fetching services covered:", e);
    }
  };

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
      
      // Fetch policy details after successful creation
      await getPolicy(_anonAadhaarCore);
    } catch (e) {
      setIsLoading(false);
      console.log(e);
    }
  };

  useEffect(() => {
    // Deserialize the latest proof from local storage
    const aaObj = localStorage.getItem("anonAadhaar");
    if (aaObj) {
      const anonAadhaarProofs = JSON.parse(aaObj).anonAadhaarProofs;
      deserialize(
        anonAadhaarProofs[Object.keys(anonAadhaarProofs).length - 1].pcd
      ).then((result) => {
        console.log(result);
        setAnonAadhaarCore(result);
        getPolicy(result); // Fetch policy details when component mounts
      });
    }
  }, [anonAadhaar, latestProof]);

  const handleServicesClick = () => {
    if (showServicesCovered) {
      // If services are currently shown, hide everything
      setShowServicesCovered(false);
      setShowServicesInput(false);
      setPolicyIdInput("");
      setServicesCoveredList([]);
    } else if (!showServicesInput) {
      // First click - show input field
      setShowServicesInput(true);
      setShowServicesCovered(false);
      setShowPolicyDetails(false);
    } else if (policyIdInput) {
      // Second click with input value - show services
      if (anonAadhaarCore) {
        getServicesCovered(anonAadhaarCore, policyIdInput);
        setShowServicesCovered(true);
      }
    }
  };

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
              {policyExists ? "POLICY CREATED SUCCESSFULLY" : "SECURE AND PRIVATE BLOCKCHAIN INSURANCE"}
            </div>

            <div>
              {isConnected ? (
                isLoading ? (
                  <Loader />
                ) : (
                  !policyExists && (
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
        {policyExists && policyDetails && (
            <div className="mb-8">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPolicyDetails(!showPolicyDetails);
                    setShowServicesCovered(false);
                    setShowServicesInput(false);
                    setPolicyIdInput("");
                    setServicesCoveredList([]);
                  }}
                  className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-rajdhani transition-colors"
                >
                  {showPolicyDetails ? "Hide Policy Details" : "Show Policy Details"}
                </button>

                <button
                  onClick={handleServicesClick}
                  className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-rajdhani transition-colors"
                >
                  {showServicesCovered ? "Hide Services" : "Show Services"}
                </button>
              </div>

              {showServicesInput && (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={policyIdInput}
                    onChange={(e) => setPolicyIdInput(e.target.value)}
                    placeholder="Enter Policy ID"
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              
              {showPolicyDetails && (
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-rajdhani font-medium mb-4">Your Policy Details</h3>
                  <div className="space-y-2">
                    <p>Policy ID: {policyDetails.policyId.toString()}</p>
                    <p>Coverage Amount: {formatEther(policyDetails.coverageAmount)} ETH</p>
                    <p>Valid Till: {new Date(Number(policyDetails.validTill) * 1000).toLocaleDateString()}</p>
                    <p>Status: {policyDetails.active ? "Active" : "Inactive"}</p>
                  </div>
                </div>
              )}

              {showServicesCovered && servicesCoveredList.length > 0 && (
                <div className="p-6 bg-gray-50 rounded-lg mt-4">
                  <h3 className="text-xl font-rajdhani font-medium mb-4">Services Covered</h3>
                  <ul className="list-disc pl-5">
                    {servicesCoveredList.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </>
  );
}
