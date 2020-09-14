const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const { contracts_build_directory } = require("../truffle-config");
const { iteratee } = require("lodash");

const Token = artifacts.require("./Token");

chai.use(chaiAsPromised).should();

contract("Token", (account) => {
    describe("deployment", () => {
        it("Should have name QTOKEN", async () => {
            const token = await Token.new();
            const result = await token.name();
            result.should.equal("QTOKEN");
        });
    });
});