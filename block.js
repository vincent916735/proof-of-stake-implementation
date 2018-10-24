const crypto = require('crypto');

class Block {
    constructor(index, timestamp, previousHash, data, nounce, generatorId){
        this.index = index;
        this.timestamp = timestamp;
        this.previousHash = previousHash.toString();
        this.data = data;
        this.nounce = 0;
        this.generatorId = generatorId;
        // this.signature = generateSignature(generatorId);
        this.signature = null;

        let hash_data = index+timestamp+previousHash+data+nounce+generatorId;
        this.merkleHash = this.calculateMerkleHash();
        this.hash = Block.calculateHash(hash_data);
    }

    static get genesis(){
        return new Block(
            0,
            1539475200,
            "-1",
            "Genesis Block",
            -1,
            0
        )
    }

    getHash() { return this.hash; }
    getPreviousHash() { return this.previousHash; }
    getIndex() { return this.index; }
    getData() { return this.data; }
    getNounce() { return this.nounce; }
    getTimestamp() { return this.timestamp; }

    // use SHA-256 to hash the essential block information
    static calculateHash(hash_data){
        return crypto
            .createHash("sha256")
            .update(hash_data)
            .digest("hex");
    }

    static calculateHashForBlock(block){
        let hash_data = block.index+block.timestamp
            +block.previousHash+block.data+block.nounce+block.generatorId;
        return this.calculateHash(hash_data);
    }

    //binary merkle tree
    calculateMerkleHash(){

    }
}

module.exports = Block;


