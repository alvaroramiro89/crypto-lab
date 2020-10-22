pragma solidity ^0.6.0;

import "./Token.sol";

import "../../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

// Deposit & Withdraw Funds
// Manage & Cancel Orders
// Handle trades & fees

// TODO:
// [X] Set fee account
// [X] Deposit ether
// [X] Withdraw ether
// [X] Deposit token
// [X] Withdraw token
// [X] Check balances
// [] Make orders
// [] Cancel order
// [] Fill order
// [] Charge fees

contract Exchange {

    using SafeMath for uint;
    
    address public feeAccount;
    uint256 public feePercent;
    address constant ETHER = address(0);
    mapping(address => mapping(address => uint256)) public tokens;

    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);

    constructor (address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    fallback() external {
        revert();
    }

    // PAYABLE MEANS MSG.VALUE HOLDS ETHER
    function depositEther() payable public {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) payable public {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    // params: which token & amount to deposit
    function depositToken(address _token, uint256 _amount) public {
        // Don't allow ethereum token
        require(_token != ETHER);
        // Send tokens to this contract
        require (
            Token(_token).transferFrom(msg.sender, address(this), _amount)
        );
        // Manage Deposit
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // Emit event
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) payable public {
        require(_token != ETHER);
        require(tokens[_token][msg.sender] >= _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount));
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256) {
        return tokens[_token][_user];
    }
}
