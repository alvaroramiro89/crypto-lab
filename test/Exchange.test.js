import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers";
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised).should();
const Exchange = artifacts.require("./Exchange");
const Token = artifacts.require("./Token");

contract("Exchange", ([deployer, feeAccount, account1, account2]) => {

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
    });

    describe("withdrawing Ether", () => {
        let result;
        let amount;

        beforeEach(async () => {
            // withdraw some ether
            amount = ether(1);
            result = await exchange.depositEther({ from: account1, value: amount });
        });

        describe("success", async () => {

            beforeEach(async () => {
                result = await exchange.withdrawEther( amount, { from: account1 });
            });

            it('tracks ether withdraw', async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, account1);
                balance.toString().should.equal("0");
            });
            
            it( "emits a Withdraw event", async () => {
                const log = result.logs[0];
                log.event.should.eq('Withdraw', "emited event is OK");
                const event = log.args;
                event.token.should.equal(ETHER_ADDRESS, 'token is OK');
                event.user.should.equal(account1, 'to is correct');
                event.amount.toString().should.equal(amount.toString(), 'amount is correct');
                event.balance.toString().should.equal("0", 'balance is correct');
            });
        });

        describe("failure", async () => {
            it("rejects withdrawing insufficient balance", async () => {
                result = await exchange.withdrawEther( ether(100), { from: account1 }).should.be.rejectedWith(EVM_REVERT);;
            });
        });
    });

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

    describe("withdrawing tokens", () => {
        let result;
        let amount;

        beforeEach(async () => {
            // Deposit some tokens
            amount = tokens(10);
            await token.approve(exchange.address, amount, { from: account1 });
            await exchange.depositToken(token.address, amount, {from: account1});

            // Withdraw tokens
            result = await exchange.withdrawToken(token.address, amount, {from: account1});
        });

        describe("success", async () => {
            it("tracks token withdraw", async () => {
                const balance = await exchange.tokens(token.address, account1);
                balance.toString().should.equal("0");
            });

            it( "emits a Withdraw event", async () => {
                const log = result.logs[0];
                log.event.should.eq('Withdraw', "emited event is OK");
                const event = log.args;
                event.token.should.equal(token.address, 'token is OK');
                event.user.should.equal(account1, 'to is correct');
                event.amount.toString().should.equal(amount.toString(), 'amount is correct');
                event.balance.toString().should.equal("0", 'balance is correct');
            });
        });

        describe("failure", async () => {
            it("rejects withdrawing from ETHER address", async () => {
                result = await exchange.withdrawToken( ETHER_ADDRESS, ether(100), { from: account1 }).should.be.rejectedWith(EVM_REVERT);
            });

            it("rejects withdrawing insufficient balance", async () => {
                result = await exchange.withdrawToken( account1, ether(100), { from: account1 }).should.be.rejectedWith(EVM_REVERT);
            });
        });

        describe("checking balances", async () => {
            beforeEach(async () => {
                // Deposit some tokens
                result = await exchange.depositEther({ from: account1, value: ether(1) });
            });

            it("returns user's balance", async () => {
                result = await exchange.tokens(ETHER_ADDRESS, account1);
                result.toString().should.equal(ether(1).toString());
            });
        });

        describe("making orders", async () => {
            let result;

            beforeEach(async () => {
                result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: account1 });
            });

            it("tracks the newly created order", async () => {
                const orderCount = await exchange.orderCount();
                orderCount.toString().should.equals('1');
                const order = await exchange.orders('1');
                order.id.toString().should.equal('1', "id is correct");
                order.user.should.equal(account1, "user is tracked");
                order.tokenGet.should.equal(token.address, "token is correct");
                order.amountGet.toString().should.equal(tokens(1).toString(), "amount is correct");
                order.tokenGive.should.equal(ETHER_ADDRESS, "token to give is OK");
                order.amountGive.toString().should.equal(ether(1).toString(), "amount to give is OK");
                order.timestamp.toString().length.should.be.at.least(1, "timestamp is present");
            });

            it( "emits an Order event", async () => {
                const log = result.logs[0];
                log.event.should.eq('Order', "emited event is OK");
                const event = log.args;
                event.id.toString().should.equal('1', "id is correct");
                event.user.should.equal(account1, "user is tracked");
                event.tokenGet.should.equal(token.address, "token is correct");
                event.amountGet.toString().should.equal(tokens(1).toString(), "amount is correct");
                event.tokenGive.should.equal(ETHER_ADDRESS, "token to give is OK");
                event.amountGive.toString().should.equal(ether(1).toString(), "amount to give is OK");
                event.timestamp.toString().length.should.be.at.least(1, "timestamp is present");
            });
        });

        describe("order actions", async () => {
            let result;

            beforeEach(async () => {
                //account1 deposits ether
                await exchange.depositEther({from: account1, value: ether(1)});
                //give account2 some tokens
                await token.transfer(account2, tokens(100), { from: deployer });
                // user2 deposits tokens only
                await token.approve(exchange.address, tokens(2), { from: account2 });
                await exchange.depositToken(token.address, tokens(2), { from: account2 });
                // user1 makes an order to buy tokens with Ether
                await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: account1 });
            });

            describe("filling orders", () => {
                let result;

                describe("success", () => {
                    beforeEach(async () => {
                        result = await exchange.fillOrder("1", {from: account2});
                    });

                    it("executes the trade and charge the fees", async () => {
                        let balance;
                        balance = await exchange.balanceOf(token.address, account1);
                        balance.toString().should.equal(tokens(1).toString(), "account1 received token");
                        balance = await exchange.balanceOf(ETHER_ADDRESS, account2);
                        balance.toString().should.equal(ether(1).toString(), "account2 received ether");
                        balance = await exchange.balanceOf(ETHER_ADDRESS, account1);
                        balance.toString().should.equal("0", "deducted ether from account1");
                        balance = await exchange.balanceOf(token.address, account2);
                        balance.toString().should.equal(tokens(0.9).toString(), "account2 tokens deducted and fees paid");
                        const feeAccount = await exchange.feeAccount();
                        balance = await exchange.balanceOf(token.address, feeAccount);
                        balance.toString().should.equal(tokens(0.1).toString(), "feeAccount gain fee");
                    });

                    it('updates filled orders', async () => {
                        const orderFilled = await exchange.ordersFilled(1);
                        orderFilled.should.equal(true);
                    });

                    it('emits a "Trade" event', () => {
                        const log = result.logs[0]
                        log.event.should.eq('Trade')
                        const event = log.args
                        event.id.toString().should.equal('1', 'id is correct')
                        event.user.should.equal(account1, 'user is correct')
                        event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                        event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                        event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                        event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                        event.userFill.should.equal(account2, 'userFill is correct')
                        event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                      });
                });

                describe('failure', () => {
                    it('rejects invalid order ids', () => {
                      const invalidOrderId = 99999;
                      exchange.fillOrder(invalidOrderId, { from: account2 }).should.be.rejectedWith(EVM_REVERT);
                    });
            
                    it('rejects already-filled orders', () => {
                      // Fill the order
                      exchange.fillOrder('1', { from: account2 }).should.be.fulfilled;
                      // Try to fill it again
                      exchange.fillOrder('1', { from: account2 }).should.be.rejectedWith(EVM_REVERT);
                    });
            
                    it('rejects cancelled orders', () => {
                      // Cancel the order
                      exchange.cancelOrder('1', { from: account1 }).should.be.fulfilled;
                      // Try to fill the order
                      exchange.fillOrder('1', { from: account2 }).should.be.rejectedWith(EVM_REVERT);
                    });
                  });
            });

            describe("cancelling orders", async () => {
                let result;

                describe("success", async () => {
                    beforeEach(async () => {
                        result = await exchange.cancelOrder('1', {from: account1});
                    });
        
                    it("tracks the cancelled order", async () => {
                        const isCancelled = await exchange.ordersCancelled(1);
                        isCancelled.should.equal(true);
                    });

                    it( "emits a Cancel event", async () => {
                        const log = result.logs[0];
                        log.event.should.eq('Cancel', "emited event is OK");
                        const event = log.args;
                        event.id.toString().should.equal('1', "id is correct");
                        event.user.should.equal(account1, "user is tracked");
                        event.tokenGet.should.equal(token.address, "token is correct");
                        event.amountGet.toString().should.equal(tokens(1).toString(), "amount is correct");
                        event.tokenGive.should.equal(ETHER_ADDRESS, "token to give is OK");
                        event.amountGive.toString().should.equal(ether(1).toString(), "amount to give is OK");
                        event.timestamp.toString().length.should.be.at.least(1, "timestamp is present");
                    });
                });

                describe("failure", async () => {
                    it("rejects invalid order id ", async () => {
                        const invalidOrderId = 99999;
                        await exchange.cancelOrder(invalidOrderId, {from: account1}).should.be.rejectedWith(EVM_REVERT);
                    });

                    it("rejects unauthorized cancelations ", async () => {
                        await exchange.cancelOrder("1", {from: account2}).should.be.rejectedWith(EVM_REVERT);
                    });
                });
            });
        });
    });
})