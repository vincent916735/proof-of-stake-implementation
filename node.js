const assert = require("assert");
const net = require("net");
const crypto = require('crypto');
const MessageType = require("./message-type.js");
const Peer = require("./peer.js");
const BlockChain = require("./blockchain");
const RSA = require("./rsa");
const DSA = require("./dsa");

const PORT = 10000;
const KEYSIZE = 30;

class Node {
    constructor(id, is_bad, use_rsa, use_dsa, is_double_spending, is_malicious_broadcast){
        this.id = id;
        this.all_peers = {};
        this.all_peerIds = [];
        this.is_bad = is_bad;
        this.rsa_key = null; //n , e , d
        this.dsa_key = null; // pr, pu
        this.all_pub_keys = {}; //size = 20
        this.all_pub_keys[this.id] = this.dsa_key;

        this.startServer(PORT+id, id);
        this.blockchain = new BlockChain(this, use_rsa, use_dsa, is_double_spending, is_malicious_broadcast);
        this.blockchain.on('new_block', this.broadcast.bind(this));
        this.blockchain.on('make_forks', this.splitted_broadcast.bind(this));
    }

    get_public_key(){
        if (this.rsa_key){
            return {
                n: this.rsa_key.n,
                e: this.rsa_key.e
            }
        } else if (this.dsa_key){
            return {
                pub_key: this.dsa_key.y
            }
        }
    }

    /* ----------------------------- RSA ------------------------------------ */

    rsa_key_generation(){
        this.rsa_key = RSA.generate(KEYSIZE);
    }

    generate_rsa_signature(hash){
        //use private key to encrypt the hash value of current new block
        assert(!!this.rsa_key);
        let encoded = RSA.encode(hash);
        return RSA.sign(encoded, this.rsa_key.d, this.rsa_key.n);
    }

    verify_rsa_signature(forger_id, hash, signature){
        let pub_key = this.all_pub_keys[forger_id];
        let calculated = RSA.verify(signature, pub_key.n, pub_key.e);
        let encoded_h_modn = RSA.encode(hash).mod(pub_key.n);

        if (calculated.toString() === encoded_h_modn.toString()){
            return true;
        } else {
            return false;
        }
    }

    /* ----------------------------- DSA ------------------------------------ */
    dsa_key_generation(){
        this.dsa_key = DSA.getKeySet();
        console.log(JSON.stringify(this.dsa_key));
    }

    generate_dsa_signature(hash){
        assert(!!this.dsa_key);
        let encoded_hash = DSA.encode(hash);
        return DSA.generateSignature(encoded_hash, this.dsa_key.x);
    }

    verify_dsa_signature(forger_id, hash, signature){
        let pub_key = this.all_pub_keys[forger_id];
        let encoded_hash = DSA.encode(hash);
        let verifier = DSA.getV(encoded_hash, signature.r, signature.s, pub_key.pub_key);
        if (verifier.toString() === signature.r.toString()){
            return true;
        }
        return false;
    }

    /* ----------------------------- Connection ------------------------------------ */

    startServer(port, id) {
        this.server = net.createServer(this.onConnection.bind(this));  //create TCP server
        this.server.listen(port, function() {
            console.log('node ' + id + ' ready to accept on port ' + port);
        });
    }

    sendPubKey(pub_key){
        let msg = {
            type: MessageType.RECV_PUBLIC_KEY,
            data: {
                id: this.id,
                key: pub_key
            }
        };
        this.broadcast(msg);
    }

    recvPubKey(peer, msg){
        assert(!!msg && !!msg.data);
        let id = msg.data.id;
        let pub_key = msg.data.key;
        let counter = Object.keys(this.all_pub_keys).length;
        if (this.all_pub_keys[id] !== pub_key && counter < 20){
            this.all_pub_keys[id] = pub_key;
            this.broadcast(msg);
        }
        // if (counter === 20){
        //     console.log("All pub keys recv in node: "+this.id+ " --- "+Object.values(this.all_pub_keys));
        // }
    }


    //accept incoming connection and get socket ready for this peer
    //刚加入网络被其他节点发现的时候，接受连接邀请并本地存储该节点信息
    //主动connection
    onConnection(socket){
        //create local reference to this peer on first connection
        let peer = new Peer(socket, this.id);
        peer.setMessageHandler(this.respondToMessage.bind(this));
        peer.setPubKeyHandler(this.recvPubKey.bind(this));
    }

    //when a new node joins, new_conn is the incoming socket
    //active connection action to other nodes
    //被动connection
    initConnection(id){
        if (id !== this.id && !this.all_peers[id]) {
            let new_peer = new Peer(id, PORT+id, this.id);
            new_peer.setMessageHandler(this.respondToMessage.bind(this));
            new_peer.setPubKeyHandler(this.recvPubKey.bind(this));
            this.all_peerIds.push(id);
            this.all_peers[id] = new_peer;
        }
    }

    broadcast(msg) {
        for (let i in this.all_peers){
            this.all_peers[i].sendMessage(msg);
        }
    }
    
    splitted_broadcast(msg1, msg2){
        for (let i in this.all_peers){
            let peer = this.all_peers[i];
           if (peer.id % 2 === 0){
               peer.sendMessage(msg1);
           } else {
               peer.sendMessage(msg2);
           }
        }
    }

    respondToMessage(peer, msg){
        if (typeof peer !== 'undefined') {
            let peerId = peer.getId();
            if (!this.all_peers[peerId]) {
                this.all_peers[peerId] = peer;
            }
        }
        if (typeof msg !== 'undefined'){
            this.blockchain.respondToMessage(msg);
        }
    }

    start(){
        this.blockchain.loop();
    }

    startPoS(next_forger){
        this.blockchain.runPoS(next_forger);
    }

    //for blockchain activity controls
}

module.exports = Node;