class Transaction{
    constructor(amount, timestamp, recipient, sender){
        this,amount = amount;
        this.timestamp = timestamp;
        this.recipient = recipient;
        this.sender = sender;

        this.transactions = [];
    }
}