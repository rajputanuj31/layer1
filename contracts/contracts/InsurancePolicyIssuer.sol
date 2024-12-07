// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "@anon-aadhaar/contracts/interfaces/IAnonAadhaar.sol";

/// @title InsurancePolicyIssuer
/// @notice Issues insurance policies to users after verifying them with Anon Aadhaar ZK proofs.
contract InsurancePolicyIssuer {
    // Struct representing a policy
    struct Policy {
        uint256 policyId;         // Unique ID for the policy
        uint256 nullifier;        // Unique identifier derived from Aadhaar proof (ZK nullifier)
        uint256 coverageAmount;   // Maximum coverage amount (in wei or token base unit)
        uint256 validTill;        // Unix timestamp until which the policy is valid
        bool active;              // Indicates if policy is active
    }

    address public anonAadhaarVerifierAddr;
    mapping(uint256 => mapping(uint256 => string[])) public servicesCovered; // nullifier => policyId => servicesCovered
    mapping(uint256 => Policy) public policies; // nullifier => Policy
    mapping(uint256 => bool) public policyIssued; // Prevent issuing multiple policies to the same nullifier

    uint256 public nextPolicyId; // Counter for generating unique policy IDs

    event PolicyIssued(
        uint256 indexed policyId,
        address indexed issuer,
        uint256 indexed nullifier,
        uint256 coverageAmount,
        uint256 validTill,
        string[] servicesCovered
    );

    constructor(address _verifierAddr) {
        anonAadhaarVerifierAddr = _verifierAddr;
        nextPolicyId = 1; // Start policy IDs from 1
    }

    /// @dev Convert an address to uint256, used to compare with signal.
    function addressToUint256(address _addr) private pure returns (uint256) {
        return uint256(uint160(_addr));
    }

    /// @dev Checks if a given timestamp is no older than 3 hours.
    /// This ensures the Aadhaar proof is recent.
    function isLessThan3HoursAgo(uint timestamp) public view returns (bool) {
        return timestamp > (block.timestamp - 3 hours);
    }

    /// @notice Issue a new insurance policy to a user after verifying their Aadhaar-based proof.
    /// @param nullifierSeed: Nullifier seed used when generating the proof.
    /// @param nullifier: Unique nullifier derived from user’s Aadhaar data.
    /// @param timestamp: Timestamp of Aadhaar data generation (QR code).
    /// @param signal: Must match the msg.sender address converted to uint256.
    /// @param revealArray: Fields to reveal (e.g., [revealAgeAbove18, revealGender, revealPinCode, revealState]).
    /// @param groth16Proof: The ZK SNARK proof array [8].
    /// @param coverageAmount: Maximum coverage provided by this policy.
    /// @param validTill: The Unix time until which the policy is valid.
    /// @param servicesCoveredList: List of services covered under this policy.
    function issuePolicy(
        uint256 nullifierSeed,
        uint256 nullifier,
        uint256 timestamp,
        uint256 signal,
        uint256[4] memory revealArray,
        uint256[8] memory groth16Proof,
        uint256 coverageAmount,
        uint256 validTill,
        string[] memory servicesCoveredList
    ) public {
        require(
            addressToUint256(msg.sender) == signal,
            "[InsurancePolicyIssuer]: Wrong user signal."
        );
        require(
            isLessThan3HoursAgo(timestamp),
            "[InsurancePolicyIssuer]: Aadhaar proof data must be less than 3 hours old."
        );
        require(
            coverageAmount > 0,
            "[InsurancePolicyIssuer]: Coverage amount must be greater than zero."
        );
        require(
            validTill > block.timestamp,
            "[InsurancePolicyIssuer]: validTill must be a future timestamp."
        );

        // Verify the user's Aadhaar proof
        bool proofValid = IAnonAadhaar(anonAadhaarVerifierAddr)
            .verifyAnonAadhaarProof(
                nullifierSeed,
                nullifier,
                timestamp,
                signal,
                revealArray,
                groth16Proof
            );
        require(proofValid, "[InsurancePolicyIssuer]: Invalid Aadhaar proof.");

        // Check that a policy for this nullifier does not already exist
        require(
            !policyIssued[nullifier],
            "[InsurancePolicyIssuer]: Policy already issued for this nullifier."
        );

        // Create and store the policy
        uint256 policyId = nextPolicyId++;
        Policy memory newPolicy = Policy({
            policyId: policyId,
            nullifier: nullifier,
            coverageAmount: coverageAmount,
            validTill: validTill,
            active: true
        });

        policies[nullifier] = newPolicy;
        servicesCovered[nullifier][policyId] = servicesCoveredList;
        policyIssued[nullifier] = true;

        emit PolicyIssued(policyId, msg.sender, nullifier, coverageAmount, validTill, servicesCoveredList);
    }

    /// @notice Retrieve policy details by nullifier
    /// @param _nullifier: The unique nullifier of the policy.
    /// @return policyId, coverageAmount, validTill, active
    function getPolicy(
        uint256 _nullifier
    ) public view returns (uint256, uint256, uint256, bool) {
        Policy memory policy = policies[_nullifier];
        return (
            policy.policyId,
            policy.coverageAmount,
            policy.validTill,
            policy.active
        );
    }

    /// @notice Retrieve services covered for a specific nullifier and policyId
    /// @param _nullifier: The unique nullifier.
    /// @param _policyId: The policy ID.
    /// @return List of services covered.
    function getServicesCovered(
        uint256 _nullifier,
        uint256 _policyId
    ) public view returns (string[] memory) {
        return servicesCovered[_nullifier][_policyId];
    }

    /// @notice Check if a policy is active and valid at the current time.
    /// @param _nullifier: The nullifier of the policy.
    /// @return bool indicating if policy is currently valid.
    function isPolicyValid(uint256 _nullifier) public view returns (bool) {
        Policy memory policy = policies[_nullifier];
        return (policy.active && block.timestamp < policy.validTill);
    }

    /// @notice Deactivate a policy (e.g., after it expires or coverage is exhausted).
    /// @param _nullifier: The nullifier of the policy to deactivate.
    function deactivatePolicy(uint256 _nullifier) public {
        require(
            policyIssued[_nullifier],
            "[InsurancePolicyIssuer]: No policy found for this nullifier."
        );
        policies[_nullifier].active = false;
    }
}
