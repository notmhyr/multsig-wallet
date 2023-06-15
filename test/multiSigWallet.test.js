const { deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");

describe("multi sig wallet", () => {
  let wallet,
    acc1Address,
    acc2Address,
    acc1,
    acc2,
    connectedAcc2,
    connectedAcc3,
    amount;

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    const accounts = await ethers.getSigners();
    acc1Address = accounts[0].address;
    acc2Address = accounts[1].address;
    acc1 = accounts[0];
    acc2 = accounts[1];
    const acc3 = accounts[2];
    wallet = await ethers.getContract("MultiSigWallet");
    connectedAcc2 = wallet.connect(acc2);
    connectedAcc3 = wallet.connect(acc3);

    amount = ethers.utils.parseEther("1");
  });

  describe("constructor", () => {
    it("initialize the contract correctly", async () => {
      const owner1 = await wallet.owners(0);
      const owner2 = await wallet.owners(1);
      const required = await wallet.required();

      assert.equal(owner1, acc1Address);
      assert.equal(owner2, acc2Address);
      assert.equal(required.toString(), "2");
    });
  });

  describe("receive", () => {
    it("invoke the receive function for receiving ether", async () => {
      // invoke the receive function
      const tx = acc1.sendTransaction({
        to: wallet.address,
        value: amount,
        data: "0x",
      });

      await expect(tx).to.emit(wallet, "Deposit");
    });
  });

  describe("submit", () => {
    it("fails if not owner", async () => {
      await expect(
        connectedAcc3.submit(acc1Address, 1000, [])
      ).to.be.revertedWith("not owner");
    });

    it("submit a new transaction successfully", async () => {
      await expect(wallet.submit(acc1Address, 1000, [])).to.emit(
        wallet,
        "Submit"
      );

      const transaction = await wallet.transactions(0);

      assert.equal(transaction.to, acc1Address);
      assert.equal(transaction.value.toString(), "1000");
    });
  });

  describe("approve", () => {
    it("fails if not owner", async () => {
      await expect(connectedAcc3.approve(0)).to.be.revertedWith("not owner");
    });

    it("fails if tx id doesn't exist", async () => {
      await expect(wallet.approve(3)).to.be.revertedWith("tx doesn't exist");
    });

    it("approve the tx successfully", async () => {
      await wallet.submit(acc1Address, 1000, []);

      await expect(wallet.approve(0)).to.emit(wallet, "Approve");

      const isApproved = await wallet.approved(0, acc1Address);

      assert.equal(isApproved, true);
    });

    it("fails if already approved", async () => {
      await wallet.submit(acc1Address, 1000, []);
      await wallet.approve(0);

      await expect(wallet.approve(0)).to.be.revertedWith("tx already approved");
    });
  });

  describe("revoke", () => {
    beforeEach(async () => {
      await acc1.sendTransaction({
        to: wallet.address,
        value: amount,
        data: "0x",
      });
    });

    it("fails if not owner", async () => {
      await expect(connectedAcc3.revoke(0)).to.be.revertedWith("not owner");
    });

    it("fails if tx id doesn't exist", async () => {
      await expect(wallet.revoke(3)).to.be.revertedWith("tx doesn't exist");
    });

    it("fails if tx is executed", async () => {
      await wallet.submit(acc1Address, 1000, []);
      await wallet.approve(0);
      await connectedAcc2.approve(0);
      await wallet.execute(0);

      await expect(wallet.revoke(0)).to.be.revertedWith("tx already executed");
    });

    it("fails if caller have not approved the tx yet", async () => {
      await wallet.submit(acc1Address, 1000, []);

      await expect(wallet.revoke(0)).to.be.revertedWith(
        "not approved previously"
      );
    });

    it("revoke the approval successfully", async () => {
      await wallet.submit(acc1Address, 1000, []);
      await wallet.approve(0);

      await expect(wallet.revoke(0)).to.emit(wallet, "Revoke");

      const isApproved = await wallet.approved(0, acc1Address);
      assert.equal(isApproved, false);
    });
  });

  describe("execute", () => {
    beforeEach(async () => {
      await acc1.sendTransaction({
        to: wallet.address,
        value: amount,
        data: "0x",
      });
    });

    it("fails if not owner", async () => {
      await expect(connectedAcc3.execute(0)).to.be.revertedWith("not owner");
    });

    it("fails if tx id doesn't exist", async () => {
      await expect(wallet.execute(3)).to.be.revertedWith("tx doesn't exist");
    });

    it("fails if not enough approval", async () => {
      await wallet.submit(acc2Address, 1000, []);
      await wallet.approve(0);

      await expect(wallet.execute(0)).to.be.revertedWith("not enough approval");
    });

    it("execute and send tx successfully", async () => {
      await wallet.submit(acc2Address, amount, []);
      await wallet.approve(0);
      await connectedAcc2.approve(0);

      const acc2BalanceBefore = await acc2.getBalance();
      await expect(wallet.execute(0)).to.emit(wallet, "Execute");
      const acc2BalanceAfter = await acc2.getBalance();

      const transaction = await wallet.transactions(0);

      assert.equal(transaction.executed, true);
      assert.equal(
        acc2BalanceBefore.add(amount).toString(),
        acc2BalanceAfter.toString()
      );
    });
  });
});
