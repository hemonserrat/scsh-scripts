/*
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|  
 * |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  --------- 
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 *  Support for card verifiable certificates
 *
 */



//
// Constructor for CVC object from binary data
//
function CVC(value) {
	this.value = new ASN1(value);
}


// Some static configuration tables

CVC.prototype.Profiles = new Array();
CVC.prototype.Profiles[3] = new Array();
CVC.prototype.Profiles[3][0] = { name:"CPI", length:1 };
CVC.prototype.Profiles[3][1] = { name:"CAR", length:8 };
CVC.prototype.Profiles[3][2] = { name:"CHR", length:12 };
CVC.prototype.Profiles[3][3] = { name:"CHA", length:7 };
CVC.prototype.Profiles[3][4] = { name:"OID", length:7 };
CVC.prototype.Profiles[3][5] = { name:"MOD", length:128 };
CVC.prototype.Profiles[3][6] = { name:"EXP", length:4 };
CVC.prototype.Profiles[4] = new Array();
CVC.prototype.Profiles[4][0] = { name:"CPI", length:1 };
CVC.prototype.Profiles[4][1] = { name:"CAR", length:8 };
CVC.prototype.Profiles[4][2] = { name:"CHR", length:12 };
CVC.prototype.Profiles[4][3] = { name:"CHA", length:7 };
CVC.prototype.Profiles[4][4] = { name:"OID", length:6 };
CVC.prototype.Profiles[4][5] = { name:"MOD", length:128 };
CVC.prototype.Profiles[4][6] = { name:"EXP", length:4 };



//
// Verify CVC certificate with public key
//
CVC.prototype.verifyWith = function(puk) {
	// Get signed content
	var signedContent = this.value.get(0).value;

	// Decrypt with public key
	var crypto = new Crypto();
	var plain = crypto.decrypt(puk, Crypto.RSA, signedContent);
	
	// Check prefix and postfix byte
	if ((plain.byteAt(0) != 0x6A) || (plain.byteAt(plain.length - 1) != 0xBC)) {
		throw new GPError("CVC", GPError.CRYPTO_FAILED, 0, "Decrypted CVC shows invalid padding. Probably wrong public key.");
	}
	this.plainContent = plain;
	
	// Extract hash
	this.hash = plain.bytes(plain.length - 21, 20);

	var publicKeyRemainder = this.getPublicKeyRemainder();

	// Input to hash is everything in the signed area plus the data in the public key remainder	
	var certdata = plain.bytes(1, plain.length - 22);
	certdata = certdata.concat(publicKeyRemainder);
	var refhash = crypto.digest(Crypto.SHA_1, certdata);

	if (!refhash.equals(this.hash)) {
		print("   Hash = " + this.hash);
		print("RefHash = " + refhash);
		throw new GPError("CVC", GPError.CRYPTO_FAILED, 0, "Hash value of certificate failed in verification");
	}

	// Split certificate data into components according to profile
	var profile = certdata.byteAt(0);
	var profileTemplate = this.Profiles[profile];
	var offset = 0;
	for (var i = 0; i < profileTemplate.length; i++) {
		var name = profileTemplate[i].name;
		var len = profileTemplate[i].length;
		var val = certdata.bytes(offset, len);
//		print(" " + name + " : " + val);
		offset += len;
		this[name] = val;
	}
	this.certificateData = certdata;
	
	if (!this.CAR.equals(this.value.get(2).value)) {
		print("Warning: CAR in signed area does not match outer CAR");
	}
}



//
// Return signatur data object
//
CVC.prototype.getSignaturDataObject = function() {
	return (this.value.get(0));
}



//
// Return the public key remainder
//
CVC.prototype.getPublicKeyRemainderDataObject = function() {
	return (this.value.get(1));
}



//
// Return the public key remainder
//
CVC.prototype.getPublicKeyRemainder = function() {
	return (this.value.get(1).value);
}



//
// Return the certification authority reference (CAR)
//
CVC.prototype.getCertificationAuthorityReference = function() {
	return (this.value.get(2).value);
}



//
// Return public key from certificate
//
CVC.prototype.getPublicKey = function() {
	if (!this.MOD) {
		throw new GPError("CVC", GPError.INVALID_USAGE, 0, "Must verify certificate before extracting public key");
	}
	var key = new Key();
	key.setType(Key.PUBLIC);
	key.setComponent(Key.MODULUS, this.MOD);
	key.setComponent(Key.EXPONENT, this.EXP);
	return key;
}



//
// Dump content of certificate
//
CVC.prototype.dump = function() {
	print(this.value);
	
	if (this.certificateData) {
		var profile = this.certificateData.byteAt(0);
		var profileTemplate = this.Profiles[profile];
		var offset = 0;
		for (var i = 0; i < profileTemplate.length; i++) {
			print(" " + profileTemplate[i].name + " : " + this.certificateData.bytes(offset, profileTemplate[i].length));
			offset += profileTemplate[i].length;
		}
		print();
	}
}
