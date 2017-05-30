'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CImportKeyStringPopup()
{
	CAbstractPopup.call(this);
	
	this.newKey = ko.observable('');
}

_.extendOwn(CImportKeyStringPopup.prototype, CAbstractPopup.prototype);

CImportKeyStringPopup.prototype.PopupTemplate = '%ModuleName%_ImportKeyStringPopup';

CImportKeyStringPopup.prototype.onShow = function ()
{
	this.newKey('');
};

CImportKeyStringPopup.prototype.importKey = function ()
{	
	JscryptoKey.importKeyFromString(this.newKey());
	this.closePopup();
};

module.exports = new CImportKeyStringPopup();
