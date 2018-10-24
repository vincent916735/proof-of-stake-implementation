const messageType = {
    INIT_MSG: 4,
    REQ_LAST_BLOCK: 0,
    RECV_LAST_BLOCK: 1,
    REQ_BLOCKCHAIN: 2,
    RECV_BLOCKCHAIN: 3,
    RECV_PUBLIC_KEY: 5,
    EXPOSE_CHEATING_NODE: 6
};

module.exports = messageType;