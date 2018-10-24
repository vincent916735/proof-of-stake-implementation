
const bigInt = require('big-integer');
const q = bigInt(10079033);
const k = bigInt(2);
const p = bigInt(q * k + 1);
const h = bigInt(Math.floor(Math.random()*(p-2)) + 1);
const g = bigInt(h.modPow((p - 1)/q, p));

class DSA{
    static getKeySet(){

        let x = bigInt(Math.floor(Math.random()*q));
        let y = bigInt(g.modPow(x,p));
      return {
          x: x,
          y: y
      }
    }
  
    static generateSignature(hashedMsg, x){
        let hm = hashedMsg % q;
        let s = bigInt(0);
        let _k = bigInt(Math.floor(Math.random() * q));
        let r = bigInt((g.modPow(_k,p)) % q);
        while (s.equals(0)){
            _k = bigInt(Math.floor(Math.random() * (q-1) + 1));
            r = bigInt((g.modPow(_k,p)) % q);
            s = bigInt((_k.modInv(q) * ((hm + x * r) % q)) % q);
        }

        return {
            r: r,
            s: s
        }

    }

    static getV(hashedMsg, r,s,y) {
        let hm = hashedMsg % q;
        let w = bigInt(s).modInv(q);
        let u1 = (hm * w) % q;
        let u2 = (r * w) % q;
        let v = bigInt(((g.modPow(u1,p) * bigInt(y).modPow(u2,p)) % p) % q);
        return v;
    }

    static encode(str) {
          const codes = str
              .split('')
              .map(i => i.charCodeAt())
              .join('');
          return bigInt(codes);
      }

    static decode(code) {
        const stringified = code.toString();
        let string = '';

        for (let i = 0; i < stringified.length; i += 2) {
            let num = Number(stringified.substr(i, 2));

            if (num <= 30) {
                string += String.fromCharCode(Number(stringified.substr(i, 3)));
                i++;
            } else {
                string += String.fromCharCode(num);
            }
        }
        return string;
    }
}
//
//
// let encodedMsg = DSA.encode("hello world");
//
// let encryptedMsg = DSA.generateSignature(encodedMsg, x);
//
// let v = DSA.getV(encodedMsg, encryptedMsg.r, encryptedMsg.s);
// console.log("v: ");
// console.log(v);

module.exports = DSA;