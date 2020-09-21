pragma solidity ^0.6.0;

import "../../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract Token {

    using SafeMath for uint;

    string public name = "QTOKEN";
    string public symbol = "QTKN";
    uint256 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    constructor() public {
        totalSupply = 1000000 * ( 10 ** decimals);
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(_value);
        balanceOf[_to] = balanceOf[_to].add(_value);
        return true;
    }
}