const Node = require('./node');
const async = require('async');
const assert = require('assert');
const Flags = require('commander');

const total_nodes = 20;
const conn_num = 5;

var all_nodes = [];
var bad_nodes = []; //index of bad nodes
var lottery_pool = []; // each node has id+1 as it proportional amount of staked tokens in the system
// each node has id+1 number of entries in the lottery pool

function init_lottery_pool(){
    for (let i=0; i<total_nodes; i++){
        for (let j=0; j<(i+1)*(i+1); j++){
            lottery_pool.push(i+1);
        }
    }
}

function pick_lottery_winner(){
    assert(!!lottery_pool);
    let rand = Math.floor(Math.random() * lottery_pool.length);
    return lottery_pool[rand];
}

function Pos_main() {
    Flags
        .option('-r, --rsa', 'Turn on auth using RSA')
        .option('-d, --dsa', 'Turn on auth using DSA')
        .option('-s, --doubleSpending', 'Mock double-spending attack')
        .option('-m, --maliciousBroadcast', 'Mock malicious broadcasting attack')
        .option('-n, --badNodes [value]', 'Specify bad nodes (id), etc 1,2,3')
        .parse(process.argv);
    global.Flags = Flags;

    if (Flags.badNodes){
        bad_nodes = Flags.badNodes.split(',').map(function(e){
            return Number(e);
        });
    }
    Flags.rsa = !!Flags.rsa;
    Flags.dsa = !!Flags.dsa;
    Flags.is_double_spending = !!Flags.doubleSpending;
    Flags.is_malicious_broadcast = !!Flags.maliciousBroadcast;


    async.series([
        (next) => {
            console.log("------------------------");
            console.log('step 1 initiating nodes: ');
            for (let i=0; i<total_nodes; i++){
                if (bad_nodes.includes(i)){
                    all_nodes[i] = new Node(i, true,
                        Flags.rsa, Flags.dsa, Flags.is_double_spending, Flags.is_malicious_broadcast);
                } else {
                    all_nodes[i] = new Node(i, false,
                        Flags.rsa, Flags.dsa, Flags.is_double_spending, Flags.is_malicious_broadcast);
                }
            }
            if (Flags.rsa){
                all_nodes.forEach(function(node) {
                    node.rsa_key_generation();
                });
            } else if (Flags.dsa){
                all_nodes.forEach(function(node) {
                    node.dsa_key_generation();
                });
            }
            init_lottery_pool();
            setTimeout(next, 1000);
        },
        (next) => {
            console.log("------------------------");
            console.log('step 2 initiating p2p network: ');
            all_nodes.forEach(function(node) {
                    for (let i = 0; i < conn_num; ++i) {
                        let rand = Math.floor(Math.random() * 20);
                        while (rand === i){
                            rand = Math.floor(Math.random() * 20);
                        }
                        node.initConnection(rand);
                    }
                }
            );
            setTimeout(next, 1000);
        },
        (next) => {
            console.log("------------------------");
            console.log('step 3 broadcast public keys: ');
            all_nodes.forEach(function(node) {
                node.sendPubKey(node.get_public_key());
            });
            next();
        }
    ], function (err, results) {
        setInterval(function(){
            all_nodes.forEach(node => node.blockchain.printBlockchain());
            //pick winner from lottery pool
            let next_forger = pick_lottery_winner();

            all_nodes.forEach((node => node.startPoS(next_forger)));
        }, 5000);
    });
}

Pos_main();
