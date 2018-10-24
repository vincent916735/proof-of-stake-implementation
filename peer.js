const net = require("net");
const assert = require("assert");
const MessageType = require("./message-type");
const BlockChain = require("./blockchain");

class Peer {
    constructor(id, port, localId){
        if (typeof id === 'number'){
            this.id = id;
            this.localId = localId;
            this.remotePort = port;
            this.socket = net.connect(port, this.onConnected.bind(this));  //create socket object
        } else if (typeof id === 'object'){
            this.socket = id; //my listening socket
            this.localId = port; //my id referring to my node
            this.onIncomingMessage(this.socket);
            this.onConnectionClosed(this.socket);
        } else {
            assert(false);
        }
    }

    getId(){
        return this.id;
    }

    setMessageHandler(msgHandler){
        assert(typeof msgHandler === 'function');
        this.messageHandler = msgHandler;
    }

    setPubKeyHandler(pubKeyHandler) {
        assert(typeof pubKeyHandler === 'function');
        this.pubKeyHandler = pubKeyHandler;
    }


    onConnected(){
        console.log('peer ' + this.id + ' connected with peer ' + this.localId);
        this.socket.setEncoding('utf8');
        this.onIncomingMessage(this.socket);
        //send an initial message with my last block
        this.sendMessage({type: MessageType.INIT_MSG, data: this.localId});
    }

    onIncomingMessage(peer){
        // peer.on('data', this.incomingMessageHandler.bind(this.socket));
        peer.on('data', this.incomingMessageHandler.bind(this));
    }

    onConnectionClosed(peer){
        peer.on('end', function(){
            console.log("connection "+this.id+" -> "+this.localId+" closed");
        })
    }

    onConnectionError(peer) {
        peer.on("error", err => {
            console.log(peer, err);
            throw err;
        });
    }

    pubkey_msg_cleaning(msg){

    }

    incomingMessageHandler(msg){
        let self = this;
        msg = msg.toString();
        if (typeof msg !== 'undefined'){
            let arr = msg.split("}{");
            arr.forEach(function(message, i){
                if (arr.length > 1){
                    if (i === 0){
                        message = message + "}";
                    } else if (i === arr.length-1){
                        message = "{" + message;
                    } else {
                        message = "{" + message + "}";
                    }
                }
                msg = message;

                let msg_json = JSON.parse(msg);
                switch (msg_json.type) {
                    case MessageType.INIT_MSG:
                        self.id = msg_json.data;
                        console.log("peer " + self.id + " accepted on " + self.localId);
                        break;
                    case MessageType.REQ_LAST_BLOCK:
                    case MessageType.REQ_BLOCKCHAIN:
                    case MessageType.RECV_LAST_BLOCK:
                    case MessageType.RECV_BLOCKCHAIN:
                        self.messageHandler(self, msg_json);
                        break;
                    case MessageType.RECV_PUBLIC_KEY:
                        self.pubKeyHandler(self, msg_json);
                        break;
                    default:
                        throw "Invalid Message Type"
                }
            });
        }
    }

    sendMessage(msg){
        let data = JSON.stringify(msg);
        this.socket.write(data);
    }
}

module.exports = Peer;
