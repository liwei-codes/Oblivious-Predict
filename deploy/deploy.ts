import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  const deployedCoin = await deploy("ObliviousCoin", {
    from: deployer,
    args: [deployer],
    log: true,
  });

  const deployedPredict = await deploy("ObliviousPredict", {
    from: deployer,
    args: [deployedCoin.address],
    log: true,
  });

  const coin = await ethers.getContractAt("ObliviousCoin", deployedCoin.address);
  const currentOwner: string = await coin.owner();
  if (currentOwner.toLowerCase() !== deployedPredict.address.toLowerCase()) {
    const tx = await coin.transferOwnership(deployedPredict.address);
    await tx.wait();
  }

  console.log(`ObliviousCoin contract: `, deployedCoin.address);
  console.log(`ObliviousPredict contract: `, deployedPredict.address);
};
export default func;
func.id = "deploy_oblivious"; // id required to prevent reexecution
func.tags = ["Oblivious"];
