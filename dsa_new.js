const bigInt = require('big-integer');
const q = bigInt(10079033);
const k = bigInt(2);
const p = bigInt(q * k + 1);
const h = bigInt(Math.floor(Math.random()*(p-2)) + 1);
const g = bigInt(h.modPow((p - 1)/q, p));
const priKey = bigInt(Math.floor(Math.random()*q));
const pubKey = bigInt(g.modPow(priKey,p));



class DSA{
    static getKeySet(){
      return{priKey, pubKey};
    }
  
    static generateSignature(hashedMsg, priKey){
        let hm = hashedMsg % q;
        let s = bigInt(0);
        let _k = bigInt(Math.floor(Math.random() * q));
        let r = bigInt((g.modPow(_k,p)) % q);
        while (s.equals(0)){
            _k = bigInt(Math.floor(Math.random() * (q-1) + 1));
            r = bigInt((g.modPow(_k,p)) % q);
            s = bigInt((_k.modInv(q) * ((hm + priKey * r) % q)) % q);
        }

        return {r,s};     //{r,s} is the signature
    }

    static getValidator(hashedMsg, r,s) {
        let hm = hashedMsg % q;
        let w = bigInt(s).modInv(q);
        let u1 = (hm * w) % q;
        let u2 = (r * w) % q;
        let validator = bigInt(((g.modPow(u1,p) * pubKey.modPow(u2,p)) % p) % q);
        return validator;
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
// let hashedMsg = DSA.encode("hello world");
//
// let signature = DSA.generateSignature(hashedMsg, priKey);
//
// let validator = DSA.getValidator(hashedMsg, signature.r, signature.s);
// console.log("v: ");
// console.log(validator);

module.exports = DSA;