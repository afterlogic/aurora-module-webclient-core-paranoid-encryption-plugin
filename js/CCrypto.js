'use strict';

var
	$ = require('jquery'),
	_ = require('underscore'),
	ko = require('knockout'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	FileSaver = require('%PathToCoreWebclientModule%/js/vendors/FileSaver.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CCrypto()
{ 
	this.iChunkNumber = 0;
	this.iChunkSize = 5 * 1024 * 1024;
	this.iChunkHeader = 16;
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = null;
	this.cryptoKey = ko.observable(JscryptoKey.getKey());
	JscryptoKey.getKeyObservable().subscribe(function () {
		this.cryptoKey(JscryptoKey.getKey());
	}, this);
	// Queue of files awaiting upload
	this.oChunkQueue = {
		isProcessed: false,
		aFiles: []
	};
	this.aStopList = [];
	this.fOnUploadCancelCallback = null;
}
CCrypto.prototype.start = function (oFileInfo)
{
	this.oFileInfo = oFileInfo;
	this.oFile = oFileInfo.File;
	this.iChunkNumber = Math.ceil(oFileInfo.File.size/this.iChunkSize);
	this.iCurrChunk = 0;
	this.oChunk = null;
	this.iv = window.crypto.getRandomValues(new Uint8Array(16));
};

CCrypto.prototype.getCryptoKey = function ()
{
	return this.cryptoKey();
};

CCrypto.prototype.readChunk = function (sUid, fOnChunkEncryptCallback)
{
	var
		iStart = this.iChunkSize * this.iCurrChunk,
		iEnd = (this.iCurrChunk < (this.iChunkNumber - 1)) ? this.iChunkSize * (this.iCurrChunk + 1) : this.oFile.size,
		oReader = new FileReader(),
		oBlob = null
	;
	
	if (this.aStopList.indexOf(sUid) !== -1)
	{ // if user canceled uploading file with uid = sUid
		this.aStopList.splice(this.aStopList.indexOf(sUid), 1);
		if (this.fOnUploadCancelCallback !== null)
		{
			this.fOnUploadCancelCallback(sUid, this.oFileInfo.FileName);
		}
		this.checkQueue();
		return;
	}
	else
	{
		// Get file chunk
		if (this.oFile.slice)
		{
			oBlob = this.oFile.slice(iStart, iEnd);
		}
		else if (this.oFile.webkitSlice)
		{
			oBlob = this.oFile.webkitSlice(iStart, iEnd);
		}
		else if (this.oFile.mozSlice)
		{
			oBlob = this.oFile.mozSlice(iStart, iEnd);
		}

		if (oBlob)
		{
			try
			{ //Encrypt file chunk
				oReader.onloadend = _.bind(function(evt) {
					if (evt.target.readyState === FileReader.DONE)
					{
						this.oChunk = evt.target.result;
						this.iCurrChunk++;
						this.encryptChunk(sUid, fOnChunkEncryptCallback);
					}
				}, this);

				oReader.readAsArrayBuffer(oBlob);
			}
			catch(err)
			{
				Screens.showError(err);
			}
		}
	}
};

CCrypto.prototype.encryptChunk = function (sUid, fOnChunkEncryptCallback)
{
	crypto.subtle.encrypt({ name: 'AES-CBC', iv: this.iv }, this.cryptoKey(), this.oChunk)
		.then(_.bind(function (oEncryptedContent) {
			var
				oEncryptedFile = new Blob([oEncryptedContent], {type: "text/plain", lastModified: new Date()}),
				//fProcessNextChunkCallback runs after previous chunk uploading
				fProcessNextChunkCallback = _.bind(function (sUid, fOnChunkEncryptCallback) {
					if (this.iCurrChunk < this.iChunkNumber)
					{// if it was not last chunk - read another chunk
						this.readChunk(sUid, fOnChunkEncryptCallback);
					}
					else
					{// if it was last chunk - check Queue for files awaiting upload
						this.oChunkQueue.isProcessed = false;
						this.checkQueue();
					}
				}, this)
			;
			this.oFileInfo.File = oEncryptedFile;
			// call upload of encrypted chunk
			fOnChunkEncryptCallback(sUid, this.oFileInfo, fProcessNextChunkCallback, this.iCurrChunk, this.iChunkNumber, this.iv);
		}, this))
		.catch(function(err) {
			Screens.showError(err);
		})
	;
};

CCrypto.prototype.downloadDividedFile = function (oFile, iv)
{
	var
		sFileName = oFile.fileName(),
		iFileSize = oFile.size(),
		sDownloadLink = oFile.getActionUrl('download'),
		oWriter = new CWriter(sFileName),
		iCurrChunk = 0,
		iv = new Uint8Array(iv),
		key = this.cryptoKey(),
		iChunkNumber = Math.ceil(iFileSize/this.iChunkSize),
		iChunkSize = this.iChunkSize,
		iChunkHeader = this.iChunkHeader
	;

	function writeChunk(oDecryptedUint8Array)
	{
		if (oFile.downloading() !== true)
		{ // if download was canceled
			return;
		}
		else
		{
			oFile.onDownloadProgress(iCurrChunk, iChunkNumber);
			oWriter.write(oDecryptedUint8Array); //write decrypted chunk
			if (iCurrChunk < iChunkNumber)
			{ //if it was not last chunk - decrypting another chunk
				decryptChunk(getChunkLink(sDownloadLink));
			}
			else
			{
				oFile.stopDownloading();
				oWriter.close();
			}
		}
	}

	function decryptChunk(sDownloadLink)
	{
		var oReq = new XMLHttpRequest();
		oReq.open("GET", sDownloadLink, true);

		oReq.responseType = 'arraybuffer';

		oReq.onload = function (oEvent)
		{
			var oArrayBuffer = oReq.response;
			if (oReq.status === 200 && oArrayBuffer)
			{
				crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, key, oArrayBuffer)
					.then(function (oDecryptedArrayBuffer) {
						var oDecryptedUint8Array = new Uint8Array(oDecryptedArrayBuffer);
						writeChunk(oDecryptedUint8Array);
					})
					.catch(function(err) {
						Screens.showError(err);
					})
				;
			}
		};
		oReq.send(null);
	}

	/**
	 * Writing chunks in file
	 * 
	 * @constructor
	 * @param {String} sFileName
	 */
	function CWriter(sFileName)
	{
		this.sName = sFileName;
		this.aBuffer = [];

	}
	CWriter.prototype.write = function (oDecryptedUint8Array)
	{
		this.aBuffer.push(oDecryptedUint8Array);
	};
	CWriter.prototype.close = function ()
	{
		var file = new Blob(this.aBuffer);
		FileSaver.saveAs(file, this.sName);
		file = null;
	};
	/**
	 * Generate link for downloading current chunk
	 * @param {String} sDownloadLink
	 */
	function getChunkLink (sDownloadLink)
	{
		return sDownloadLink + '/download/' + iCurrChunk++ + '/' + (iChunkSize + iChunkHeader);
	}
	decryptChunk(getChunkLink(sDownloadLink));
};
/**
* Checking Queue for files awaiting upload
*/
CCrypto.prototype.checkQueue = function ()
{
	var aNode = null;
	if (this.oChunkQueue.aFiles.length > 0)
	{
		aNode = this.oChunkQueue.aFiles.shift();
		aNode.fStartUploadCallback.apply(aNode.fStartUploadCallback, [aNode.oFileInfo, aNode.sUid, aNode.fOnChunkEncryptCallback]);
	}
};
/**
* Stop file uploading
* 
* @param {String} sUid
* @param {Function} fOnUploadCancelCallback
*/
CCrypto.prototype.stopUploading = function (sUid, fOnUploadCancelCallback)
{
	var bFileInQueue = false;
	 // If file await to be uploaded - delete it from queue
	this.oChunkQueue.aFiles.forEach(function (oData, index, array) {
		if (oData.sUid === sUid)
		{
			fOnUploadCancelCallback(sUid, oData.oFileInfo.FileName);
			array.splice(index, 1);
			bFileInQueue = true;
		}
	});
	if (!bFileInQueue)
	{
		this.aStopList.push(sUid);
		this.oChunkQueue.isProcessed = false;
		this.fOnUploadCancelCallback = fOnUploadCancelCallback;
	}
};

module.exports = new  CCrypto();