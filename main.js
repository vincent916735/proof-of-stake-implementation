const Node = require('./node');
const async = require('async');

const total_nodes = 20;
const conn_num = 5;

var all_nodes = [];
var bad_nodes = [4, 10, 16]; //index of bad nodes

function main() {
    async.series([
        (next) => {
            console.log('step 1 initiating nodes: ');
            for (let i=0; i<total_nodes; i++){
                if (bad_nodes.includes(i)){
                    all_nodes[i] = new Node(i, true);
                } else {
                    all_nodes[i] = new Node(i, false);
                }
            }
            setTimeout(next, 1000);
        },
        (next) => {
            console.log('step 2 initiating p2p network: ');
            all_nodes.forEach(function(node) {
                    for (let i = 0; i < conn_num; ++i) {
                        let rand = Math.floor(Math.random() * 20);
                        node.initConnection(rand);
                    }
                }
            );
            setTimeout(next, 2000);
        },
        (next) => {
            console.log('step 3 start forging...');
            all_nodes.forEach(node => node.start());
            next();
        }
    ], function (err, results) {
        setInterval(function(){
            all_nodes.forEach(node => node.blockchain.printBlockchain());
        }, 7000);
    });
}

main();
