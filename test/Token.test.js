const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { contracts_build_directory } = require("../truffle-config");
const { iteratee } = require("lodash");

const Token = artifacts.require("./Token");

chai.use(chaiAsPromised).should();

contract("Token", (account) => {

    let token;
    const symbol = "QTKN";
    const decimals = "18";
    const totalSupply = "1000000000000000000000000";


    beforeEach(async () => {
        token = await Token.new();
    })

    
    describe("deployment", () => {
        it("Should have name QTOKEN", async () => {
            const result = await token.name();
            result.should.equal("QTOKEN");
        });
        it("tracks the symbol", async ()  => {
            const result = await token.symbol();
            result.should.equal(symbol);
        });
        it("tracks the decimals", async () => {
            const result = await token.decimals();
            result.toString().should.equal(decimals);
        });
        it("tracks the total supply", async () => {
            const result = await token.totalSupply();
            result.toString().should.equal(totalSupply);
        });
    });
});