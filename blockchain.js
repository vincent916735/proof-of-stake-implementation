const EventEmitter = require('events');
const util = require('util');
const Block = require('./block');
const MessageType = require("./message-type");
const TimeSlot = require("./timeslot");
const assert = require("assert");
const async = require("async");
const waitUntil = require("wait-until");
const {performance} = require('perf_hooks');

class BlockChain {

    constructor(node, use_rsa, use_dsa, is_double_spending, is_malicious_broadcast){
        EventEmitter.call(this);
        this.blockchain = [Block.genesis];
        this.node = node; //node
        this.winners_pool = [];
        this.recv_hashes_in_one_timeslot = [];
        this.valid_forgers = {};
        this.use_rsa = use_rsa;
        this.use_dsa = use_dsa;
        this.is_double_spending = is_double_spending;
        this.is_malicious_broadcast = is_malicious_broadcast;

        util.inherits(BlockChain, EventEmitter);
    }

    getBlockchain(){
        return this.blockchain;
    }

    getChainLength(){
        return this.blockchain.length;
    }

    getLastBlock(){
        return this.blockchain[this.blockchain.length-1];
    }

    isValidNextBlock(prev_block, block){
        let blockHash = Block.calculateHashForBlock(block);
        if (!BlockChain.isHashesConsecutive(prev_block, block)){
            // console.log("in node: "+this.node.id +" bad two ");
            // console.log(prev_block.data);
            // console.log(block.previousHash);
            return false;
        } else if (prev_block.index + 1 !== block.index){
            // console.log("bad index");
            return false;
        } else if (block.hash !== blockHash){
            return false;
        } else {
            return true;
        }
    }

    static isValidBlockchain(blockchain){
        if (BlockChain.isGenesisMatched(blockchain)){
            let prev_block = blockchain[0];
            for (let i=1; i<blockchain.getChainLength(); i++){
                if (this.isValidNextBlock(prev_block, blockchain[i])){
                    prev_block = blockchain[i];
                } else {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    static isGenesisMatched(chain){
        return JSON.stringify(chain[0]) === JSON.stringify(Block.genesis);
    }

    static isHashesConsecutive(prev, next){
        return prev.hash === next.previousHash;
    }

    generateNextBlock(data){
        let index = this.getLastBlock().index + 1;
        let previousHash = this.getLastBlock().hash;
        let timestamp = Math.floor(Date.now() / 1000);
        let nounce = 0;

        var t0 = performance.now();

        let new_block = new Block(
            index,
            timestamp,
            previousHash,
            data,
            nounce,
            this.node.id
        );

        var t1 = performance.now();
        new_block.generation_time = t1-t0;

        //add signature into the block
        if (this.use_rsa) {
            new_block.signature = this.node.generate_rsa_signature(new_block.hash);
        } else if (this.use_dsa){
            new_block.signature = this.node.generate_dsa_signature(new_block.hash);
        }


        return new_block;
    }

    isChainLonger(blockchain){
        return blockchain.getChainLength() > this.blockchain.getChainLength();
    }

    replaceChain(blockchain){
        if (BlockChain.isValidBlockchain(blockchain) && this.isChainLonger(blockchain)){
            this.blockchain = JSON.parse(JSON.stringify(blockchain));
        } else {
            throw "Error: invalid blockchain"
        }
    }

    addBlock(block){
        if (this.isValidNextBlock(this.getLastBlock(), block)){
            this.blockchain.push(block);
        } else {
            throw "Error: invalid block";
        }
    }

    //blockchain running
    runBlockchain(timeoutFunction) {
        let current_slot = TimeSlot.convertToSlotNumber();
        let last_block = this.getLastBlock();

        assert(!!last_block);
        var last_slot = TimeSlot.convertToSlotNumber(
            TimeSlot.converToEpochTime(last_block.timestamp * 1000));

        if (current_slot === last_slot || Date.now() % 10000 > 5000){
            return timeoutFunction();
        } else {
            let current_forger = current_slot % 20;

            if (this.node.id === current_forger){
                //mock a chain fork, say node 10 is bad node, generating two blocks and send them each to half of the network nodes
                // if (this.node.id === 10 || this.node.id === 4 || this.node.id === 16){
                if (this.node.is_bad){
                    this.chainForking();
                } else {
                    this.perform_forging();
                }
            }
            timeoutFunction();
        }
    }

    runPoS(next_forger){
        let current_slot = TimeSlot.convertToSlotNumber();
        let last_block = this.getLastBlock();

        assert(!!last_block);
        let last_slot = TimeSlot.convertToSlotNumber(
            TimeSlot.converToEpochTime(last_block.timestamp * 1000));

        if (current_slot === last_slot || Date.now() % 10000 > 5000){
            return;
        } else {
            this.valid_forgers[current_slot] = next_forger;
            this.recv_hashes_in_one_timeslot = []; //reset the hashes collector before next timeslot
            if (this.node.id === next_forger){
                // this.perform_forging();
                if (this.is_double_spending){
                    if (this.node.is_bad){
                        this.chainForking();
                    } else {
                        this.perform_forging();
                    }
                } else {
                    this.perform_forging();
                }
            }

            return;
        }
    }

    //1. generate new block ; 2. verify block ; 3. add block to chain ; 4. broadcast new block
    perform_forging(){
        let data = "a new block";
        let block = this.generateNextBlock(data);
        console.log('New block with hash: %s, current chain length: %d, generated by nodeId: %d', block.getHash().substr(0, 6),
            this.getChainLength(), this.node.id);
        this.addBlock(block);
        let msg = {
            type: MessageType.RECV_LAST_BLOCK,
            data: block
        };
        this.emit('new_block', msg);
    }

    chainForking(){
        let blk1 = this.generateNextBlock("block 1");
        let blk2 = this.generateNextBlock("block 2");
        console.log("***** node "+this.node.id+" created chain forks");
        this.addBlock(blk1);
        let msg1 = {
            type: MessageType.RECV_LAST_BLOCK,
            data: blk1
        };
        let msg2 = {
            type: MessageType.RECV_LAST_BLOCK,
            data: blk2
        };
        this.emit('make_forks', msg1, msg2);
    }

    loop(){
        let self = this;
        setImmediate(function nextLoop(){
            self.runBlockchain(function() {
                    setTimeout(nextLoop, 1000);
                }
            )
        });
    }

    printBlockchain(){
        let output = '';
        let self = this;
        this.blockchain.forEach(function(block, i){
            // output += util.format('(%d:%s:%d) -> ', i, block.hash.substr(0, 6), block.generatorId);
            if (self.is_double_spending){
                output += util.format('(height:%d-hash:%s-forgerId:%d) -> ', i, block.hash.substr(0, 6), block.generatorId);
            } else {
                output += util.format('(height:%d-forgerId:%d) -> ', i, block.generatorId);
            }
        });
        console.log("node: " + this.node.id, output);
    }

    hasBlock(hash){
        let found = false;
        this.blockchain.forEach(function(block){
           if (block.hash === hash){
               found = true;
           }
        });
        return found;
    }

    onRecvBlock(msg){
        let new_block = msg.data;
        let my_last_block = this.getLastBlock();

        //1. whether eligible to add to current chain
        if (!this.isValidNextBlock(my_last_block, new_block)) {
            return;
        }

        let current_slot = TimeSlot.convertToSlotNumber();
        let valid_forger = this.valid_forgers[current_slot];

        if (this.use_rsa) {
            let rsa_verifier = this.node.verify_rsa_signature(valid_forger, new_block.hash, new_block.signature);
            this.onSuccessfulVerification(rsa_verifier, new_block, msg);
        } else if (this.use_dsa) {
            let t0 = performance.now();
            let dsa_verifier = this.node.verify_dsa_signature(valid_forger, new_block.hash, new_block.signature);
            let t1 = performance.now();
            new_block.ver_time = t1-t0;
            this.onSuccessfulVerification(dsa_verifier, new_block, msg);
        } else {
            this.onSuccessfulVerification(true, new_block, msg);
        }

    }

    onSuccessfulVerification(verifier, new_block, msg){
        if (verifier) {
            if (this.is_malicious_broadcast){
                if (this.node.is_bad) {
                    if (!this.hasBlock(new_block.hash)) {
                        this.blockchain.push(new_block);
                        this.broadcast_altered_blk(msg);
                    }
                } else {
                    this.commitBlock(msg, new_block);
                }
            } else {
                this.commitBlock(msg, new_block);
            }

        } else {
            console.log("Block with hash %s failed validation processed by node: %d", new_block.hash.substr(0, 6), this.node.id);
        }
    }

    commitBlock(msg, new_block){
        if (!this.hasBlock(new_block.hash)) {
            this.node.broadcast(msg);
            this.blockchain.push(new_block);
        }
    }

    //bad node will modify the information on first receipt of the new block
    broadcast_altered_blk(msg){
        let new_blk = msg.data;

        if (!this.recv_hashes_in_one_timeslot.includes(new_blk.hash)){
            this.recv_hashes_in_one_timeslot.push(new_blk.hash);
                //modify block data and broadcast the modified block
            let altered_blk = new Block(
                new_blk.index,
                new_blk.timestamp,
                new_blk.previousHash,
                "modified data",
                new_blk.nounce,
                this.node.id
            );
            if (this.use_rsa){
                altered_blk.signature = this.node.generate_rsa_signature(altered_blk.hash);
            } else if (this.use_dsa){
                altered_blk.signature = this.node.generate_dsa_signature(altered_blk.hash);
            }
            console.log('*** Modified block with hash: %s, current chain length: %d, altered by malicious nodeId: %d',
                altered_blk.getHash().substr(0, 6), this.getChainLength(), this.node.id);
            let altered_msg = {
                type: MessageType.RECV_LAST_BLOCK,
                data: altered_blk
            };
            this.node.broadcast(altered_msg);
        }
    }

    onRecvBlockchain(msg){
        let recv_blockchain = msg.data;
        try {
            this.replaceChain(recv_blockchain);
        } catch(err) {
            console.log("Error: invalid blockchain on node "+ this.node.id);
            throw err;
        }
    }

    sendLastBlock(){
        let msg = {
            type: MessageType.REQ_LAST_BLOCK,
            data: this.getLastBlock()
        };
        this.node.broadcast(msg);
    }

    sendBlockchain(){
        let msg = {
            type: MessageType.REQ_BLOCKCHAIN,
            data: this.getBlockchain()
        }
        this.node.broadcast(msg);
    }

    respondToMessage(msg){
        switch(msg.type){
            case MessageType.REQ_LAST_BLOCK:
                this.sendLastBlock();
                break;
            case MessageType.REQ_BLOCKCHAIN:
                this.sendBlockchain();
                break;
            case MessageType.RECV_LAST_BLOCK:
                this.onRecvBlock(msg);
                break;
            case MessageType.RECV_BLOCKCHAIN:
                this.onRecvBlockchain(msg);
                break;
            default:
                break;
        }
    }
}

module.exports = BlockChain;