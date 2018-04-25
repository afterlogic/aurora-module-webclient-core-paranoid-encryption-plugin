'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CImportKeyStringPopup()
{
	CAbstractPopup.call(this);

	this.keyName = ko.observable(App.getUserPublicId());
	this.newKey = ko.observable('');
}

_.extendOwn(CImportKeyStringPopup.prototype, CAbstractPopup.prototype);

CImportKeyStringPopup.prototype.PopupTemplate = '%ModuleName%_ImportKeyStringPopup';

CImportKeyStringPopup.prototype.onOpen = function ()
{
	this.newKey('');
};

CImportKeyStringPopup.prototype.importKey = function ()
{
	JscryptoKey.importKeyFromString(this.keyName(), this.newKey());
	this.closePopup();
};

module.exports = new CImportKeyStringPopup();
