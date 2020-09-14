const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { contracts_build_directory } = require("../truffle-config");
const { iteratee } = require("lodash");

const Token = artifacts.require("./Token");

chai.use(chaiAsPromised).should();

contract("Token", (account) => {
    const symbol = "QTKN";
    describe("deployment", () => {
        it("Should have name QTOKEN", async () => {
            const token = await Token.new();
            const result = await token.name();
            result.should.equal("QTOKEN");
        });
        it('tracks the symbol', async ()  => {
            const token = await Token.new();
            const result = await token.symbol()
            result.should.equal(symbol)
        });
    });
});