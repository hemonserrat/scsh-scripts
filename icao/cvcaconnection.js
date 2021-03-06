/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|  
 * |#       #|  Copyright (c) 1999-2010 CardContact Software & System Consulting
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
 * @fileoverview Connector implementing a web service interface to a CVCA as defined in TR-03129
 */


load("cvc.js");


/**
 * Creates a web service connector to access services of a CVCA as defined in TR-03129
 *
 * @class Class implementing a CVCA web service connector
 * @constructor
 * @param {String} url the web service endpoint
 */
function CVCAConnection(url) {
	this.url = url;
	this.soapcon = new SOAPConnection(SOAPConnection.SOAP11);
	this.verbose = true;
	this.lastError = null;
}



/**
 * Get the last error return code
 *
 * @returns the last error return code received or null if none defined
 * @type String
 */
CVCAConnection.prototype.getLastError = function() {
	return this.lastError;
}



/**
 * Close the connector and release allocated resources
 */
CVCAConnection.prototype.close = function() {
	this.soapcon.close();
}



/**
 * Obtain a list of certificates from the CVCA
 *
 * @returns a lists of card verifiable certificates from the CVCA or null in case of error
 * @type CVC[]
 */
CVCAConnection.prototype.getCACertificates = function() {
	
	this.lastError = null;

	var ns = new Namespace("uri:EAC-PKI-CVCA-Protocol/1.0");
	var ns1 = new Namespace("uri:eacBT/1.0");

	var request =
		<ns:GetCACertificates xmlns:ns={ns} xmlns:ns1={ns1}>
			<callbackIndicator>callback_not_possible</callbackIndicator>
			<messageID>
			</messageID>
			<responseURL>
			</responseURL>
		</ns:GetCACertificates>;

	if (this.verbose) {
		GPSystem.trace(request.toXMLString());
	}

	try	 {
		var response = this.soapcon.call(this.url, request);
		if (this.verbose) {
			GPSystem.trace(response.toXMLString());
		}
	}
	catch(e) {
		GPSystem.trace("SOAP call to " + this.url + " failed : " + e);
		throw new GPError("CVCAConnection", GPError.DEVICE_ERROR, 0, "getCACertificates failed with : " + e);
	}
	
	var certlist = [];

	if (response.Result.ns1::returnCode.toString() == "ok_cert_available") {
		GPSystem.trace("Received certificates from CVCA:");
		for each (var c in response.Result.ns1::certificateSeq.ns1::certificate) {
			var cvc = new CVC(new ByteString(c, BASE64));
			certlist.push(cvc);
			GPSystem.trace(cvc);
		}
	} else {
		this.lastError = response.Result.ns1::returnCode.toString();
		return null;
	}

	return certlist;
}



/**
 * Request a certificate from the parent CA using a web service
 *
 * @param {ServiceRequest} serviceRequest the underlying request
 * @returns the new certificates
 * @type CVC[]
 */
CVCAConnection.prototype.requestCertificate = function(certreq) {

	var soapConnection = new SOAPConnection();

	var ns = new Namespace("uri:EAC-PKI-CVCA-Protocol/1.0");
	var ns1 = new Namespace("uri:eacBT/1.0");

	var request =
		<ns:RequestCertificate xmlns:ns={ns} xmlns:ns1={ns1}>
			<callbackIndicator>callback_not_possible</callbackIndicator>
			<messageID>
			</messageID>
			<responseURL>
			</responseURL>
			<certReq>{certreq.getBytes().toString(BASE64)}</certReq>
		</ns:RequestCertificate>

	if (this.verbose) {
		GPSystem.trace(request.toXMLString());
	}

	try	{
		var response = this.soapcon.call(this.url, request);
		if (this.verbose) {
			GPSystem.trace(response.toXMLString());
		}
	}
	catch(e) {
		GPSystem.trace("SOAP call to " + this.url + " failed : " + e);
		throw new GPError("CVCAConnection", GPError.DEVICE_ERROR, 0, "RequestCertificate failed with : " + e);
	}
	
	var certlist = [];

	if (response.Result.ns1::returnCode.substr(0, 3) == "ok_") {
		GPSystem.trace("Received certificates from CVCA:");
		for each (var c in response.Result.ns1::certificateSeq.ns1::certificate) {
			var cvc = new CVC(new ByteString(c, BASE64));
			certlist.push(cvc);
			GPSystem.trace(cvc);
		}
	} else {
		this.lastError = response.Result.ns1::returnCode.toString();
		return null;
	}

	return certlist;
}



CVCAConnection.test = function() {
	var c = new CVCAConnection("http://localhost:8080/se/cvca");
	c.verbose = true;
	var certlist = c.getCACertificates();
}
