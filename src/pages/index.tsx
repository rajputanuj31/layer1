/* eslint-disable react/no-unescaped-entities */
import { LaunchProveModal, useAnonAadhaar } from "@anon-aadhaar/react";
import { useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { AppContext } from "./_app";
import { useWeb3Modal } from "@web3modal/wagmi/react";

// This is a trick to enable having both modes in under the same page.
// This could be removed and only the <LaunchProveModal /> could be displayed.
const LaunchMode = ({
  isTest,
  setIsTestMode,
  address,
  buttonTitle,
}: {
  isTest: boolean;
  setIsTestMode: (isTest: boolean) => void;
  address: string;
  buttonTitle: string;
}) => {
  return (
    <span onClick={() => setIsTestMode(isTest)}>
      <LaunchProveModal
        nullifierSeed={12345678983762535}
        signal={address}
        buttonStyle={{
          borderRadius: "8px",
          border: "solid",
          borderWidth: "1px",
          boxShadow: "none",
          fontWeight: 500,
          borderColor: "#009A08",
          color: "#009A08",
          fontFamily: "rajdhani",
        }}
        buttonTitle={buttonTitle}
        useTestAadhaar={isTest}
      />
    </span>
  );
};

export default function Home() {
  const [anonAadhaar] = useAnonAadhaar();
  const { setIsTestMode } = useContext(AppContext);
  const { isConnected, address } = useAccount();
  const { open } = useWeb3Modal();
  const router = useRouter();

  useEffect(() => {
    if (anonAadhaar.status === "logged-in") {
      router.push("./insurance");
    }
  }, [anonAadhaar, router]);

  return (
    <>
      <main className="flex flex-col min-h-[75vh] mx-auto justify-center items-center w-full p-4">
        <div className="max-w-4xl w-full">
          <h6 className="text-[36px] font-rajdhani font-medium leading-none">
            ANON AADHAAR
          </h6>
          <h2 className="text-[90px] font-rajdhani font-medium leading-none">
            DECENTRALIZED INSURANCE
          </h2>
          <div className="text-md mt-4 mb-8 text-[#717686]">
            Get instant insurance coverage by verifying your identity with Anon Aadhaar. 
            Our platform ensures complete privacy using zero-knowledge proofs while providing 
            reliable insurance protection. Simply connect your wallet and verify your identity 
            to get started.
          </div>

          <div className="flex w-full gap-8 mb-8">
            {isConnected ? (
              <div>
                <div className="flex gap-4 place-content-center">
                  <LaunchMode
                    isTest={false}
                    setIsTestMode={setIsTestMode}
                    address={address as string}
                    buttonTitle="VERIFY WITH AADHAAR"
                  />
                  <LaunchMode
                    isTest={true}
                    setIsTestMode={setIsTestMode}
                    address={address as string}
                    buttonTitle="USE TEST VERIFICATION"
                  />
                </div>
              </div>
            ) : (
              <button
                className="bg-[#009A08] rounded-lg text-white px-6 py-1 font-rajdhani font-medium"
                onClick={() => open()}
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
