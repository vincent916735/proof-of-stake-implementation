const md5 = require('md5');

let string = (Math.random() * 10).toString();
let complete = false;
let n = 0;
let counter = 0;
while(complete === false){
    let currString = string + n.toString();
    let currHash = md5(currString);
    n = n + Math.floor(Math.random() * 10);
    counter = counter + 1;
    console.log(counter);
    if(currHash.startsWith("0000")){
        console.log(currString);
        console.log(currHash);
        complete = true;
    }
}