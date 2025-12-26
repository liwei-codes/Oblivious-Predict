// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

contract ObliviousCoin is ERC7984, ZamaEthereumConfig, Ownable {
    constructor(address initialOwner) ERC7984("ObliviousCoin", "OBCOIN", "") Ownable(initialOwner) {}

    function mint(address to, euint64 amount) external onlyOwner returns (euint64 transferred) {
        transferred = _mint(to, amount);
    }
}
