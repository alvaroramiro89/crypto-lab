import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers";
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();
const Exchange = artifacts.require("./Exchange");
const Token = artifacts.require("./Token");

contract("Exchange", ([deployer, feeAccount, account1]) => {

    let exchange;
    let token;
    const feePercent = 10;

    beforeEach(async () => {
        token = await Token.new();
        // put some tokens in account1
        token.transfer(account1, tokens(100), { from: deployer });
        exchange = await Exchange.new(feeAccount, feePercent);
    })

    describe("deployment", () => {
        it("Tracks the fee account", async () => {
            const result = await exchange.feeAccount();
            result.should.equal(feeAccount);
        });

        it("Tracks the fee amount", async () => {
            const result = await exchange.feePercent();
            result.toString().should.equal(feePercent.toString());
        });
    });

    describe('fallback', () => {
        it('reverts when Ether is sent', async () => {
          await exchange.sendTransaction({ value: 1, from: account1 }).should.be.rejectedWith(EVM_REVERT);
        });
    });

    describe('depositing Ether', async () => {
        let result;
        let amount;

        beforeEach(async () => {
            amount = ether(1);
            result = await exchange.depositEther({ from: account1, value: amount });
        });

        it('tracks the Ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, account1);
            balance.toString().should.equal(amount.toString());
        });

        it('emits a Deposit event', async () => {
            const log = result.logs[0];
            log.event.should.eq('Deposit');
            const event = log.args;
            event.token.should.equal(ETHER_ADDRESS, 'token address is correct');
            event.user.should.equal(account1, 'user address is correct');
            event.amount.toString().should.equal(amount.toString(), 'amount is correct');
            event.balance.toString().should.equal(amount.toString(), 'balance is correct');
        })
    })

    describe("depositing tokens", () => {
        let result;
        let tokenAmount;

        describe("Success", () => {

            beforeEach(async () => {
                tokenAmount = tokens(10);
                await token.approve(exchange.address, tokenAmount, { from: account1 });
                result = await exchange.depositToken(token.address, tokenAmount, { from: account1 });
            })

            it("tracks the token deposit", async () => {
                let exchangeBalance = await token.balanceOf(exchange.address);
                exchangeBalance.toString().should.equal(tokenAmount.toString());

                let account1Balance = await exchange.tokens(token.address, account1);
                account1Balance.toString().should.equal(tokenAmount.toString());
            });

            it('emits a Deposit event', async () => {
                const log = result.logs[0];
                log.event.should.eq('Deposit', "emited event is OK");
                const event = log.args;
                event.token.should.equal(token.address, 'token is OK');
                event.user.should.equal(account1, 'to is correct');
                event.amount.toString().should.equal(tokens(10).toString(), 'amount is correct');
                event.balance.toString().should.equal(tokens(10).toString(), 'balance is correct');
            });
        });

        describe("Failure", () => {
            it('fails when no tokens are approved', async () => {
                await exchange.depositToken(token.address, tokens(10), { from: account1 }).should.be.rejectedWith(EVM_REVERT);
            });

            it('rejects depositing ethereum', async () => {
                await exchange.depositToken("0x0000000000000000000000000000000000000000", tokens(10), { from: account1 }).should.be.rejectedWith(EVM_REVERT);
            });
        });
    });
})