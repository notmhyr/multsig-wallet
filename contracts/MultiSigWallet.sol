// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MultiSigWallet {
    // events
    event Deposit(address indexed sender, uint256 amount);
    event Submit(uint256 txId);
    event Approve(address indexed owner, uint256 txId);
    event Revoke(address indexed owner, uint256 txId);
    event Execute(uint256 txId);

    // type decelerations
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
    }

    // variables & mappings

    uint8 public immutable required; // number of required approvals for tx get executed
    address[] public owners;
    Transaction[] public transactions;
    mapping(address => bool) public isOwner;
    // txId => address of owner => returns bool
    mapping(uint256 => mapping(address => bool)) public approved;

    // modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExist(uint256 txId) {
        require(txId < transactions.length, "tx doesn't exist");
        _;
    }

    modifier notApproved(uint256 txId) {
        require(!approved[txId][msg.sender], "tx already approved");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "tx already executed");
        _;
    }

    constructor(address[] memory _owners, uint8 _required) {
        require(_owners.length > 0, "no owners passed");
        require(
            _required > 0 && _required <= _owners.length,
            "invalid required passed"
        );

        for (uint i; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner address");

            owners.push(owner);
            isOwner[owner] = true;
        }

        required = _required;
    }

    // receive function for receiving ether
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // this function submit a new transaction
    function submit(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyOwner {
        transactions.push(
            Transaction({to: _to, value: _value, data: _data, executed: false})
        );

        emit Submit(transactions.length - 1);
    }

    // this function approve the target transaction
    function approve(
        uint256 _txId
    ) external onlyOwner txExist(_txId) notApproved(_txId) notExecuted(_txId) {
        approved[_txId][msg.sender] = true;
        emit Approve(msg.sender, _txId);
    }

    // this function revoke the approved transaction to unapproved
    function revoke(
        uint256 _txId
    ) external onlyOwner txExist(_txId) notExecuted(_txId) {
        require(approved[_txId][msg.sender], "not approved previously");

        approved[_txId][msg.sender] = false;

        emit Revoke(msg.sender, _txId);
    }

    // this function execute and send the transaction
    function execute(
        uint256 _txId
    ) external onlyOwner txExist(_txId) notExecuted(_txId) {
        require(_getApprovedCount(_txId) >= required, "not enough approval");

        Transaction storage transaction = transactions[_txId];

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );

        require(success, "tx failed");

        emit Execute(_txId);
    }

    // function for getting number of approved for a specific transaction
    function _getApprovedCount(
        uint256 _txId
    ) private view returns (uint8 count) {
        for (uint i; i < owners.length; i++) {
            if (approved[_txId][owners[i]]) {
                count += 1;
            }
        }
    }
}
