const ECDSA = require('elliptic').ec;
const RSA = require('node-rsa');
const crypto = require('crypto');
const buffer = require('buffer');
const sha256 = require('js-sha256');

async function verify(payload, signature, public_key, algorithm){
  if (algorithm === '0'){
    var ec = new ECDSA('p256');
    const ver = crypto.Verify('sha256');
    var buf = new Uint8Array(signature);
    var sig_hex = buffer.Buffer.from(buf).toString("hex");
    const sig = {
      r: sig_hex.slice(0, 64),
      s: sig_hex.slice(64)
    }
    ver.update(payload);
    ver.end();
    buf = ver.verify(public_key, sig).data.subjectPublicKey.data
    var pk_hex = buffer.Buffer.from(buf).toString("hex");
    const key = ec.keyFromPublic(pk_hex, 'hex');
    const pay = sha256(payload);
    return key.verify(pay, sig);
    // modified: function verify (sig, hash, key, signType, tag)
  }
  else if (algorithm === '1'){
    console.log(signature)
    const algo = "RSA-SHA256"
    const ver = crypto.createVerify('RSA-SHA256');
    // var buf = new Uint8Array(signature);
    // var sig_hex = buffer.Buffer.from(buf).toString("hex");
    ver.update(payload)
    ver.end();
    console.log(ver.verify(public_key, sig_hex));
    // const isVerified = crypto.verify(
    //   "RSA-SHA256",
    //   Buffer.from(verifiableData),
    //   {
    //     key: public_key,
    //     padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    //   },
    //   signature
    // );

  }
  return false;
}
window.verify = verify;